//! Streaming transcription service
//!
//! Manages a long-running whisperkit-worker subprocess in streaming mode,
//! handling bidirectional IPC for real-time transcription.

use anyhow::{anyhow, Result};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use once_cell::sync::OnceCell;
use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use std::io::{BufRead, BufReader, Write};
use std::path::PathBuf;
use std::process::{Child, ChildStdin, Command, Stdio};
use std::sync::Arc;
use std::thread;
use tauri::AppHandle;
use tauri::{Emitter, Manager};

// MARK: - Configuration Types

/// Configuration for starting a live transcription session
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LiveTranscriptionConfig {
    pub model: Option<String>,
    pub language: Option<String>,
    pub use_vad: Option<bool>,
    pub confirmation_threshold: Option<u32>,
}

impl Default for LiveTranscriptionConfig {
    fn default() -> Self {
        Self {
            model: None,
            language: None,
            use_vad: Some(true),
            confirmation_threshold: Some(2),
        }
    }
}

// MARK: - Event Types (for frontend)

/// Live transcription event sent to frontend
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LiveTranscriptionEvent {
    pub session_id: String,
    pub text: String,
    pub is_final: bool,
    pub timestamp: f64,
}

/// Transcription complete event
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TranscriptionCompleteEvent {
    pub session_id: String,
    pub full_text: String,
}

/// Transcription error event
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TranscriptionErrorEvent {
    pub session_id: Option<String>,
    pub message: String,
    pub code: String,
}

/// Worker ready event
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkerReadyEvent {
    pub model: String,
    pub model_path: Option<String>,
}

// MARK: - Command Types (to worker)

/// Commands sent to the worker via stdin
#[derive(Debug, Clone, Serialize)]
#[serde(tag = "cmd", rename_all = "camelCase")]
enum WorkerCommand {
    Init {
        model: Option<String>,
        language: Option<String>,
    },
    Start {
        #[serde(rename = "sessionId")]
        session_id: String,
        #[serde(rename = "useVAD")]
        use_vad: bool,
        #[serde(rename = "confirmationThreshold")]
        confirmation_threshold: u32,
    },
    Audio {
        #[serde(rename = "sessionId")]
        session_id: String,
        samples: String,
        #[serde(rename = "sampleCount")]
        sample_count: usize,
    },
    Stop {
        #[serde(rename = "sessionId")]
        session_id: String,
    },
    Shutdown,
}

// MARK: - Worker Event Types (from worker)

/// Events received from the worker via stdout
#[derive(Debug, Clone, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
enum WorkerEvent {
    Ready {
        model: String,
        model_path: Option<String>,
    },
    Tentative {
        session_id: String,
        text: String,
        timestamp: f64,
    },
    Confirmed {
        session_id: String,
        text: String,
        start_time: f64,
        end_time: f64,
    },
    Complete {
        session_id: String,
        full_text: String,
    },
    Error {
        session_id: Option<String>,
        message: String,
        code: String,
    },
    Status {
        state: String,
        session_id: Option<String>,
    },
}

// MARK: - Manager State

/// State of the streaming transcription worker
#[derive(Debug, Clone, PartialEq)]
pub enum WorkerState {
    NotStarted,
    Starting,
    Ready,
    Transcribing(String), // session_id
    Stopping,
    Error(String),
}

/// Active worker state
struct ActiveWorker {
    child: Child,
    stdin: ChildStdin,
    state: WorkerState,
    current_model: Option<String>,
}

/// Global worker state
static WORKER_STATE: OnceCell<Arc<Mutex<Option<ActiveWorker>>>> = OnceCell::new();

fn get_worker_state() -> &'static Arc<Mutex<Option<ActiveWorker>>> {
    WORKER_STATE.get_or_init(|| Arc::new(Mutex::new(None)))
}

// MARK: - Worker Path Resolution

/// Get path to the whisperkit-worker binary
fn get_worker_path(app: &AppHandle) -> Result<PathBuf> {
    // Try Tauri's sidecar resolution first (works in production)
    if let Ok(sidecar) = app.path().resolve(
        "binaries/whisperkit-worker",
        tauri::path::BaseDirectory::Resource,
    ) {
        if sidecar.exists() {
            println!("[StreamingTranscription] Found bundled worker at: {:?}", sidecar);
            return Ok(sidecar);
        }
    }

    // Get the architecture suffix for the current platform
    let arch_suffix = if cfg!(target_arch = "aarch64") {
        "aarch64-apple-darwin"
    } else if cfg!(target_arch = "x86_64") {
        "x86_64-apple-darwin"
    } else {
        "unknown"
    };

    // Try various locations for the worker binary
    let possible_paths = [
        // Development: binaries folder with architecture suffix
        Some(PathBuf::from(format!(
            "binaries/whisperkit-worker-{}",
            arch_suffix
        ))),
        // Development: built whisperkit-worker in the whisperkit-worker folder
        Some(PathBuf::from(
            "whisperkit-worker/.build/release/whisperkit-worker",
        )),
        // Development: relative from src-tauri
        Some(PathBuf::from(
            "../whisperkit-worker/.build/release/whisperkit-worker",
        )),
        // Development: same directory as main binary
        std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(|d| d.join("whisperkit-worker"))),
    ];

    for path in possible_paths.iter().flatten() {
        if path.exists() {
            println!("[StreamingTranscription] Found worker at: {:?}", path);
            return Ok(path.clone());
        }
    }

    Err(anyhow!(
        "whisperkit-worker binary not found. Build it with: cd whisperkit-worker && swift build -c release"
    ))
}

// MARK: - Public API

/// Start the streaming transcription worker
pub fn start_worker(app: &AppHandle) -> Result<()> {
    let mut state = get_worker_state().lock();

    // Check if already running
    if let Some(ref worker) = *state {
        if worker.state != WorkerState::Error("".to_string()) {
            println!("[StreamingTranscription] Worker already running");
            return Ok(());
        }
    }

    let worker_path = get_worker_path(app)?;
    println!("[StreamingTranscription] Starting worker: {:?}", worker_path);

    let mut child = Command::new(&worker_path)
        .arg("stream")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| anyhow!("Failed to spawn worker: {}", e))?;

    let stdin = child.stdin.take().ok_or_else(|| anyhow!("Failed to get stdin"))?;
    let stdout = child.stdout.take().ok_or_else(|| anyhow!("Failed to get stdout"))?;
    let stderr = child.stderr.take();

    // Spawn thread to read stdout events
    let app_clone = app.clone();
    thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines() {
            match line {
                Ok(line) if !line.is_empty() => {
                    if let Err(e) = handle_worker_event(&app_clone, &line) {
                        println!("[StreamingTranscription] Error handling event: {}", e);
                    }
                }
                Err(e) => {
                    println!("[StreamingTranscription] Error reading stdout: {}", e);
                    break;
                }
                _ => {}
            }
        }
        println!("[StreamingTranscription] Stdout reader thread exiting");
    });

    // Spawn thread to read stderr logs
    if let Some(stderr) = stderr {
        thread::spawn(move || {
            let reader = BufReader::new(stderr);
            for line in reader.lines() {
                match line {
                    Ok(text) => println!("[WhisperKit-Worker] {}", text),
                    Err(_) => break, // Stop on read error
                }
            }
        });
    }

    *state = Some(ActiveWorker {
        child,
        stdin,
        state: WorkerState::Starting,
        current_model: None,
    });

    println!("[StreamingTranscription] Worker started successfully");
    Ok(())
}

/// Initialize the worker with a model
pub fn initialize_worker(app: &AppHandle, model: Option<String>, language: Option<String>) -> Result<()> {
    println!("[StreamingTranscription] initialize_worker: model={:?}, language={:?}", model, language);

    // Ensure worker is running
    start_worker(app)?;

    let mut state = get_worker_state().lock();
    let worker = state.as_mut().ok_or_else(|| anyhow!("Worker not started"))?;

    let cmd = WorkerCommand::Init {
        model: model.clone(),
        language,
    };

    println!("[StreamingTranscription] Sending init command to worker...");
    send_command(&mut worker.stdin, &cmd)?;
    worker.current_model = model;
    println!("[StreamingTranscription] Init command sent successfully");

    Ok(())
}

/// Start a live transcription session
pub fn start_session(
    app: &AppHandle,
    session_id: &str,
    config: &LiveTranscriptionConfig,
) -> Result<()> {
    println!("[StreamingTranscription] start_session: session_id={}, config={:?}", session_id, config);

    // Ensure worker is initialized
    initialize_worker(app, config.model.clone(), config.language.clone())?;

    let mut state = get_worker_state().lock();
    let worker = state.as_mut().ok_or_else(|| anyhow!("Worker not started"))?;

    let cmd = WorkerCommand::Start {
        session_id: session_id.to_string(),
        use_vad: config.use_vad.unwrap_or(true),
        confirmation_threshold: config.confirmation_threshold.unwrap_or(2),
    };

    println!("[StreamingTranscription] Sending start command to worker...");
    send_command(&mut worker.stdin, &cmd)?;
    worker.state = WorkerState::Transcribing(session_id.to_string());

    println!("[StreamingTranscription] Started session: {}", session_id);
    Ok(())
}

/// Feed audio samples to the worker
pub fn feed_audio(session_id: &str, samples: &[f32]) -> Result<()> {
    let mut state = get_worker_state().lock();
    let worker = state.as_mut().ok_or_else(|| anyhow!("Worker not started"))?;

    // Encode samples as base64
    let bytes: Vec<u8> = samples
        .iter()
        .flat_map(|f| f.to_le_bytes())
        .collect();
    let encoded = BASE64.encode(&bytes);

    let cmd = WorkerCommand::Audio {
        session_id: session_id.to_string(),
        samples: encoded,
        sample_count: samples.len(),
    };

    send_command(&mut worker.stdin, &cmd)?;
    Ok(())
}

/// Stop a live transcription session
pub fn stop_session(session_id: &str) -> Result<()> {
    let mut state = get_worker_state().lock();
    let worker = state.as_mut().ok_or_else(|| anyhow!("Worker not started"))?;

    let cmd = WorkerCommand::Stop {
        session_id: session_id.to_string(),
    };

    send_command(&mut worker.stdin, &cmd)?;
    worker.state = WorkerState::Stopping;

    println!("[StreamingTranscription] Stopping session: {}", session_id);
    Ok(())
}

/// Shutdown the worker
pub fn shutdown_worker() -> Result<()> {
    let mut state = get_worker_state().lock();

    if let Some(mut worker) = state.take() {
        let cmd = WorkerCommand::Shutdown;
        let _ = send_command(&mut worker.stdin, &cmd);
        let _ = worker.child.wait();
        println!("[StreamingTranscription] Worker shut down");
    }

    Ok(())
}

/// Check if worker is running and healthy
pub fn is_worker_running() -> bool {
    let mut state = get_worker_state().lock();
    if let Some(ref mut worker) = *state {
        // Actually check if the process is still running
        match worker.child.try_wait() {
            Ok(Some(_status)) => {
                // Process has exited
                println!("[StreamingTranscription] Worker process has exited");
                worker.state = WorkerState::Error("Worker process exited".to_string());
                false
            }
            Ok(None) => {
                // Process still running
                matches!(
                    worker.state,
                    WorkerState::Ready | WorkerState::Transcribing(_) | WorkerState::Starting
                )
            }
            Err(e) => {
                println!("[StreamingTranscription] Error checking worker status: {}", e);
                false
            }
        }
    } else {
        false
    }
}

/// Get current worker state
pub fn get_state() -> WorkerState {
    let state = get_worker_state().lock();
    if let Some(ref worker) = *state {
        worker.state.clone()
    } else {
        WorkerState::NotStarted
    }
}

/// Ensure the worker is running, restarting if necessary
pub fn ensure_worker_running(app: &AppHandle) -> Result<()> {
    // Check current state
    let needs_restart = {
        let mut state = get_worker_state().lock();
        if let Some(ref mut worker) = *state {
            // Check if process is still alive
            match worker.child.try_wait() {
                Ok(Some(_)) => {
                    // Process exited, need to restart
                    println!("[StreamingTranscription] Worker exited unexpectedly, will restart");
                    true
                }
                Ok(None) => {
                    // Process running, check state
                    matches!(worker.state, WorkerState::Error(_))
                }
                Err(e) => {
                    println!("[StreamingTranscription] Error checking worker: {}", e);
                    true
                }
            }
        } else {
            true // No worker, need to start
        }
    };

    if needs_restart {
        // Clear old state
        {
            let mut state = get_worker_state().lock();
            if let Some(mut worker) = state.take() {
                let _ = worker.child.kill();
                let _ = worker.child.wait();
            }
        }
        // Start new worker
        start_worker(app)?;
    }

    Ok(())
}

// MARK: - Internal Functions

/// Send a command to the worker via stdin
fn send_command(stdin: &mut ChildStdin, cmd: &WorkerCommand) -> Result<()> {
    let json = serde_json::to_string(cmd)?;
    // Log non-audio commands (audio commands are too frequent)
    match cmd {
        WorkerCommand::Audio { .. } => {}
        _ => println!("[StreamingTranscription] Sending command: {}", json),
    }
    writeln!(stdin, "{}", json)?;
    stdin.flush()?;
    Ok(())
}

/// Handle an event from the worker
fn handle_worker_event(app: &AppHandle, line: &str) -> Result<()> {
    println!("[StreamingTranscription] Received from worker: {}", line);
    let event: WorkerEvent = serde_json::from_str(line)
        .map_err(|e| anyhow!("Failed to parse worker event: {} - line: {}", e, line))?;

    match event {
        WorkerEvent::Ready { model, model_path } => {
            println!("[StreamingTranscription] Worker ready with model: {}", model);

            // Update state
            {
                let mut state = get_worker_state().lock();
                if let Some(ref mut worker) = *state {
                    worker.state = WorkerState::Ready;
                }
            }

            let _ = app.emit(
                "streaming-transcription-ready",
                WorkerReadyEvent { model, model_path },
            );
        }

        WorkerEvent::Tentative {
            session_id,
            text,
            timestamp,
        } => {
            println!("[LIVE] (tentative) \"{}\"", text);
            let _ = app.emit(
                "live-transcription",
                LiveTranscriptionEvent {
                    session_id,
                    text,
                    is_final: false,
                    timestamp,
                },
            );
        }

        WorkerEvent::Confirmed {
            session_id,
            text,
            start_time,
            end_time,
        } => {
            println!(
                "[LIVE] ✓ CONFIRMED: \"{}\" ({:.2}s - {:.2}s)",
                text, start_time, end_time
            );
            let _ = app.emit(
                "live-transcription",
                LiveTranscriptionEvent {
                    session_id,
                    text,
                    is_final: true,
                    timestamp: start_time,
                },
            );
        }

        WorkerEvent::Complete {
            session_id,
            full_text,
        } => {
            println!("[LIVE] === SESSION COMPLETE ===");
            println!("[LIVE] Full transcript: \"{}\"", full_text);
            println!(
                "[StreamingTranscription] Session complete: {} ({} chars)",
                session_id,
                full_text.len()
            );

            // Update state
            {
                let mut state = get_worker_state().lock();
                if let Some(ref mut worker) = *state {
                    worker.state = WorkerState::Ready;
                }
            }

            let _ = app.emit(
                "transcription-complete",
                TranscriptionCompleteEvent {
                    session_id,
                    full_text,
                },
            );
        }

        WorkerEvent::Error {
            session_id,
            message,
            code,
        } => {
            println!(
                "[StreamingTranscription] Error: {} (code: {})",
                message, code
            );

            let _ = app.emit(
                "transcription-error",
                TranscriptionErrorEvent {
                    session_id,
                    message,
                    code,
                },
            );
        }

        WorkerEvent::Status { state, session_id } => {
            println!(
                "[StreamingTranscription] Status: {} (session: {:?})",
                state, session_id
            );
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    // ==========================================
    // Command Serialization Tests
    // ==========================================

    #[test]
    fn test_worker_command_init_serialization() {
        let cmd = WorkerCommand::Init {
            model: Some("base".to_string()),
            language: None,
        };
        let json = serde_json::to_string(&cmd).unwrap();
        assert!(json.contains("\"cmd\":\"init\""));
        assert!(json.contains("\"model\":\"base\""));
        assert!(json.contains("\"language\":null"));
    }

    #[test]
    fn test_worker_command_init_with_language() {
        let cmd = WorkerCommand::Init {
            model: Some("large".to_string()),
            language: Some("en".to_string()),
        };
        let json = serde_json::to_string(&cmd).unwrap();
        assert!(json.contains("\"model\":\"large\""));
        assert!(json.contains("\"language\":\"en\""));
    }

    #[test]
    fn test_worker_command_start_serialization() {
        let cmd = WorkerCommand::Start {
            session_id: "test-session-123".to_string(),
            use_vad: true,
            confirmation_threshold: 3,
        };
        let json = serde_json::to_string(&cmd).unwrap();
        assert!(json.contains("\"cmd\":\"start\""));
        assert!(json.contains("\"sessionId\":\"test-session-123\""));
        assert!(json.contains("\"useVAD\":true"));
        assert!(json.contains("\"confirmationThreshold\":3"));
    }

    #[test]
    fn test_worker_command_audio_serialization() {
        let cmd = WorkerCommand::Audio {
            session_id: "session-1".to_string(),
            samples: "AAAA".to_string(),
            sample_count: 100,
        };
        let json = serde_json::to_string(&cmd).unwrap();
        assert!(json.contains("\"cmd\":\"audio\""));
        assert!(json.contains("\"sessionId\":\"session-1\""));
        assert!(json.contains("\"samples\":\"AAAA\""));
        assert!(json.contains("\"sampleCount\":100"));
    }

    #[test]
    fn test_worker_command_stop_serialization() {
        let cmd = WorkerCommand::Stop {
            session_id: "session-to-stop".to_string(),
        };
        let json = serde_json::to_string(&cmd).unwrap();
        assert!(json.contains("\"cmd\":\"stop\""));
        assert!(json.contains("\"sessionId\":\"session-to-stop\""));
    }

    #[test]
    fn test_worker_command_shutdown_serialization() {
        let cmd = WorkerCommand::Shutdown;
        let json = serde_json::to_string(&cmd).unwrap();
        assert!(json.contains("\"cmd\":\"shutdown\""));
    }

    // ==========================================
    // Audio Encoding Tests
    // ==========================================

    #[test]
    fn test_audio_encoding() {
        let samples: Vec<f32> = vec![0.0, 0.5, -0.5, 1.0];
        let bytes: Vec<u8> = samples.iter().flat_map(|f| f.to_le_bytes()).collect();
        let encoded = BASE64.encode(&bytes);
        assert!(!encoded.is_empty());

        // Verify decoding
        let decoded = BASE64.decode(&encoded).unwrap();
        assert_eq!(decoded.len(), samples.len() * 4);
    }

    #[test]
    fn test_audio_encoding_roundtrip() {
        let original_samples: Vec<f32> = vec![0.0, 0.25, 0.5, 0.75, 1.0, -0.5, -1.0];
        let bytes: Vec<u8> = original_samples.iter().flat_map(|f| f.to_le_bytes()).collect();
        let encoded = BASE64.encode(&bytes);
        let decoded = BASE64.decode(&encoded).unwrap();

        // Convert bytes back to f32
        let recovered_samples: Vec<f32> = decoded
            .chunks(4)
            .map(|chunk| f32::from_le_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]))
            .collect();

        assert_eq!(original_samples.len(), recovered_samples.len());
        for (orig, recov) in original_samples.iter().zip(recovered_samples.iter()) {
            assert!((orig - recov).abs() < f32::EPSILON);
        }
    }

    #[test]
    fn test_audio_encoding_empty() {
        let samples: Vec<f32> = vec![];
        let bytes: Vec<u8> = samples.iter().flat_map(|f| f.to_le_bytes()).collect();
        let encoded = BASE64.encode(&bytes);
        assert!(encoded.is_empty());
    }

    #[test]
    fn test_audio_encoding_large_buffer() {
        // Simulate 100ms of audio at 16kHz
        let samples: Vec<f32> = (0..1600).map(|i| (i as f32 / 1600.0).sin()).collect();
        let bytes: Vec<u8> = samples.iter().flat_map(|f| f.to_le_bytes()).collect();
        let encoded = BASE64.encode(&bytes);

        assert!(!encoded.is_empty());
        let decoded = BASE64.decode(&encoded).unwrap();
        assert_eq!(decoded.len(), samples.len() * 4);
    }

    // ==========================================
    // Worker Event Deserialization Tests
    // ==========================================

    #[test]
    fn test_worker_event_ready_deserialization() {
        let json = r#"{"type":"ready","model":"base","model_path":null}"#;
        let event: WorkerEvent = serde_json::from_str(json).unwrap();
        match event {
            WorkerEvent::Ready { model, model_path } => {
                assert_eq!(model, "base");
                assert!(model_path.is_none());
            }
            _ => panic!("Expected Ready event"),
        }
    }

    #[test]
    fn test_worker_event_ready_with_path() {
        let json = r#"{"type":"ready","model":"large-v3","model_path":"/path/to/model"}"#;
        let event: WorkerEvent = serde_json::from_str(json).unwrap();
        match event {
            WorkerEvent::Ready { model, model_path } => {
                assert_eq!(model, "large-v3");
                assert_eq!(model_path, Some("/path/to/model".to_string()));
            }
            _ => panic!("Expected Ready event"),
        }
    }

    #[test]
    fn test_worker_event_tentative_deserialization() {
        let json = r#"{"type":"tentative","session_id":"sess-1","text":"Hello wor","timestamp":1.5}"#;
        let event: WorkerEvent = serde_json::from_str(json).unwrap();
        match event {
            WorkerEvent::Tentative { session_id, text, timestamp } => {
                assert_eq!(session_id, "sess-1");
                assert_eq!(text, "Hello wor");
                assert!((timestamp - 1.5).abs() < f64::EPSILON);
            }
            _ => panic!("Expected Tentative event"),
        }
    }

    #[test]
    fn test_worker_event_confirmed_deserialization() {
        let json = r#"{"type":"confirmed","session_id":"sess-1","text":"Hello world","start_time":0.5,"end_time":1.5}"#;
        let event: WorkerEvent = serde_json::from_str(json).unwrap();
        match event {
            WorkerEvent::Confirmed { session_id, text, start_time, end_time } => {
                assert_eq!(session_id, "sess-1");
                assert_eq!(text, "Hello world");
                assert!((start_time - 0.5).abs() < f64::EPSILON);
                assert!((end_time - 1.5).abs() < f64::EPSILON);
            }
            _ => panic!("Expected Confirmed event"),
        }
    }

    #[test]
    fn test_worker_event_complete_deserialization() {
        let json = r#"{"type":"complete","session_id":"sess-1","full_text":"Hello world. This is a test."}"#;
        let event: WorkerEvent = serde_json::from_str(json).unwrap();
        match event {
            WorkerEvent::Complete { session_id, full_text } => {
                assert_eq!(session_id, "sess-1");
                assert_eq!(full_text, "Hello world. This is a test.");
            }
            _ => panic!("Expected Complete event"),
        }
    }

    #[test]
    fn test_worker_event_error_deserialization() {
        let json = r#"{"type":"error","session_id":"sess-1","message":"Model not found","code":"MODEL_NOT_FOUND"}"#;
        let event: WorkerEvent = serde_json::from_str(json).unwrap();
        match event {
            WorkerEvent::Error { session_id, message, code } => {
                assert_eq!(session_id, Some("sess-1".to_string()));
                assert_eq!(message, "Model not found");
                assert_eq!(code, "MODEL_NOT_FOUND");
            }
            _ => panic!("Expected Error event"),
        }
    }

    #[test]
    fn test_worker_event_error_without_session() {
        let json = r#"{"type":"error","session_id":null,"message":"Worker crashed","code":"FATAL"}"#;
        let event: WorkerEvent = serde_json::from_str(json).unwrap();
        match event {
            WorkerEvent::Error { session_id, message, code } => {
                assert!(session_id.is_none());
                assert_eq!(message, "Worker crashed");
                assert_eq!(code, "FATAL");
            }
            _ => panic!("Expected Error event"),
        }
    }

    #[test]
    fn test_worker_event_status_deserialization() {
        let json = r#"{"type":"status","state":"transcribing","session_id":"sess-1"}"#;
        let event: WorkerEvent = serde_json::from_str(json).unwrap();
        match event {
            WorkerEvent::Status { state, session_id } => {
                assert_eq!(state, "transcribing");
                assert_eq!(session_id, Some("sess-1".to_string()));
            }
            _ => panic!("Expected Status event"),
        }
    }

    // ==========================================
    // Configuration Tests
    // ==========================================

    #[test]
    fn test_live_transcription_config_default() {
        let config = LiveTranscriptionConfig::default();
        assert!(config.model.is_none());
        assert!(config.language.is_none());
        assert_eq!(config.use_vad, Some(true));
        assert_eq!(config.confirmation_threshold, Some(2));
    }

    #[test]
    fn test_live_transcription_config_serialization() {
        let config = LiveTranscriptionConfig {
            model: Some("small".to_string()),
            language: Some("es".to_string()),
            use_vad: Some(false),
            confirmation_threshold: Some(5),
        };
        let json = serde_json::to_string(&config).unwrap();
        assert!(json.contains("\"model\":\"small\""));
        assert!(json.contains("\"language\":\"es\""));
        assert!(json.contains("\"useVad\":false"));
        assert!(json.contains("\"confirmationThreshold\":5"));
    }

    #[test]
    fn test_live_transcription_config_deserialization() {
        let json = r#"{"model":"tiny","language":"fr","useVad":true,"confirmationThreshold":3}"#;
        let config: LiveTranscriptionConfig = serde_json::from_str(json).unwrap();
        assert_eq!(config.model, Some("tiny".to_string()));
        assert_eq!(config.language, Some("fr".to_string()));
        assert_eq!(config.use_vad, Some(true));
        assert_eq!(config.confirmation_threshold, Some(3));
    }

    // ==========================================
    // Worker State Tests
    // ==========================================

    #[test]
    fn test_worker_state_equality() {
        assert_eq!(WorkerState::NotStarted, WorkerState::NotStarted);
        assert_eq!(WorkerState::Ready, WorkerState::Ready);
        assert_ne!(WorkerState::Ready, WorkerState::NotStarted);
        assert_eq!(
            WorkerState::Transcribing("sess-1".to_string()),
            WorkerState::Transcribing("sess-1".to_string())
        );
        assert_ne!(
            WorkerState::Transcribing("sess-1".to_string()),
            WorkerState::Transcribing("sess-2".to_string())
        );
    }

    #[test]
    fn test_worker_state_clone() {
        let state = WorkerState::Transcribing("session-123".to_string());
        let cloned = state.clone();
        assert_eq!(state, cloned);
    }

    // ==========================================
    // Event Structure Tests
    // ==========================================

    #[test]
    fn test_live_transcription_event_serialization() {
        let event = LiveTranscriptionEvent {
            session_id: "sess-1".to_string(),
            text: "Hello world".to_string(),
            is_final: true,
            timestamp: 2.5,
        };
        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains("\"sessionId\":\"sess-1\""));
        assert!(json.contains("\"text\":\"Hello world\""));
        assert!(json.contains("\"isFinal\":true"));
        assert!(json.contains("\"timestamp\":2.5"));
    }

    #[test]
    fn test_transcription_complete_event_serialization() {
        let event = TranscriptionCompleteEvent {
            session_id: "sess-1".to_string(),
            full_text: "The complete transcription.".to_string(),
        };
        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains("\"sessionId\":\"sess-1\""));
        assert!(json.contains("\"fullText\":\"The complete transcription.\""));
    }

    #[test]
    fn test_transcription_error_event_serialization() {
        let event = TranscriptionErrorEvent {
            session_id: Some("sess-1".to_string()),
            message: "Failed to load model".to_string(),
            code: "MODEL_LOAD_FAILED".to_string(),
        };
        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains("\"sessionId\":\"sess-1\""));
        assert!(json.contains("\"message\":\"Failed to load model\""));
        assert!(json.contains("\"code\":\"MODEL_LOAD_FAILED\""));
    }

    #[test]
    fn test_worker_ready_event_serialization() {
        let event = WorkerReadyEvent {
            model: "base".to_string(),
            model_path: Some("/models/base".to_string()),
        };
        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains("\"model\":\"base\""));
        assert!(json.contains("\"modelPath\":\"/models/base\""));
    }

    // ==========================================
    // Global State Tests (without AppHandle)
    // ==========================================

    #[test]
    fn test_get_state_when_not_started() {
        // Clear any existing state
        {
            let mut state = get_worker_state().lock();
            *state = None;
        }

        let state = get_state();
        assert_eq!(state, WorkerState::NotStarted);
    }

    #[test]
    fn test_is_worker_running_when_not_started() {
        // Clear any existing state
        {
            let mut state = get_worker_state().lock();
            *state = None;
        }

        assert!(!is_worker_running());
    }
}
