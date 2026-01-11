use anyhow::{anyhow, Result};
use once_cell::sync::OnceCell;
use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::Arc;
use std::thread;
use tauri::AppHandle;
use tauri::{Emitter, Manager};

/// Audio device information
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioDevice {
    pub id: String,
    pub name: String,
    pub is_default: bool,
}

/// Recording configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordingConfig {
    pub mic_device_id: Option<String>,
    pub capture_system_audio: bool,
    pub sample_rate: u32,
    pub mic_volume: f32,
    pub system_volume: f32,
}

impl Default for RecordingConfig {
    fn default() -> Self {
        Self {
            mic_device_id: None,
            capture_system_audio: false,
            sample_rate: 16000,
            mic_volume: 1.0,
            system_volume: 0.7,
        }
    }
}

/// Recording state
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum RecordingState {
    Idle,
    Recording,
    Stopping,
}

/// Recording status sent to frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordingStatus {
    pub state: RecordingState,
    pub duration_ms: u64,
    pub mic_level: f32,
    pub system_level: f32,
}

impl Default for RecordingStatus {
    fn default() -> Self {
        Self {
            state: RecordingState::Idle,
            duration_ms: 0,
            mic_level: 0.0,
            system_level: 0.0,
        }
    }
}

/// Recording progress event sent to frontend
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordingProgressEvent {
    pub session_id: String,
    pub state: String,
    pub duration_ms: u64,
    pub mic_level: f32,
    pub system_level: f32,
}

/// Audio permissions status
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioPermissions {
    pub microphone: bool,
    pub screen_recording: bool,
}

/// Messages from the audio-capture-worker stdout
#[derive(Debug, Clone, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
enum WorkerMessage {
    Status {
        #[serde(rename = "state")]
        _state: String, // Required for deserialization but not used
        #[serde(rename = "duration_ms")]
        duration_ms: u64,
        #[serde(rename = "mic_level")]
        mic_level: f32,
        #[serde(rename = "system_level")]
        system_level: f32,
    },
    Complete {
        #[serde(rename = "output_path")]
        _output_path: String, // Required for deserialization but not used
        #[serde(rename = "duration_ms")]
        duration_ms: u64,
    },
    Error {
        message: String,
    },
    Devices {
        devices: Vec<AudioDevice>,
    },
}

/// Active recording state
struct ActiveRecording {
    output_path: PathBuf,
    child: Child,
    status: RecordingStatus,
}

/// Global recorder state
static RECORDER_STATE: OnceCell<Arc<Mutex<Option<ActiveRecording>>>> = OnceCell::new();

fn get_recorder_state() -> &'static Arc<Mutex<Option<ActiveRecording>>> {
    RECORDER_STATE.get_or_init(|| Arc::new(Mutex::new(None)))
}

/// Get path to the audio-capture-worker binary
fn get_worker_path(app: &AppHandle) -> Result<PathBuf> {
    // Try Tauri's sidecar resolution first (works in production)
    if let Ok(sidecar) = app.path().resolve(
        "binaries/audio-capture-worker",
        tauri::path::BaseDirectory::Resource,
    ) {
        if sidecar.exists() {
            println!("[SystemAudio] Found bundled worker at: {:?}", sidecar);
            return Ok(sidecar);
        }
    }

    // Get the manifest directory for development paths
    let manifest_dir = std::env::var("CARGO_MANIFEST_DIR").ok();

    // Try various locations for the worker binary
    let mut possible_paths: Vec<PathBuf> = vec![];

    if let Some(ref dir) = manifest_dir {
        // Development: binaries folder with platform suffix
        possible_paths.push(PathBuf::from(dir).join("binaries/audio-capture-worker-aarch64-apple-darwin"));
        // Development: built audio-capture-worker in the bins folder
        possible_paths.push(PathBuf::from(dir).join("bins/audio-capture-worker/.build/release/audio-capture-worker"));
        possible_paths.push(PathBuf::from(dir).join("bins/audio-capture-worker/.build/debug/audio-capture-worker"));
    }

    // Development: relative paths
    possible_paths.push(PathBuf::from("binaries/audio-capture-worker-aarch64-apple-darwin"));
    possible_paths.push(PathBuf::from("bins/audio-capture-worker/.build/release/audio-capture-worker"));
    possible_paths.push(PathBuf::from("bins/audio-capture-worker/.build/debug/audio-capture-worker"));

    // Development: same directory as main binary
    if let Ok(exe) = std::env::current_exe() {
        if let Some(parent) = exe.parent() {
            possible_paths.push(parent.join("audio-capture-worker"));
            possible_paths.push(parent.join("audio-capture-worker-aarch64-apple-darwin"));
        }
    }

    for path in &possible_paths {
        if path.exists() {
            println!("[SystemAudio] Found worker at: {:?}", path);
            return Ok(path.clone());
        }
    }

    Err(anyhow!(
        "Audio capture worker binary not found. Build it with: cd src-tauri/bins/audio-capture-worker && swift build -c release"
    ))
}

/// List available audio input devices
pub fn list_devices(app: &AppHandle) -> Result<Vec<AudioDevice>> {
    let worker_path = get_worker_path(app)?;

    let output = Command::new(&worker_path)
        .arg("list-devices")
        .output()
        .map_err(|e| anyhow!("Failed to run worker: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(anyhow!("Worker failed: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);

    // Parse the JSON output
    let message: WorkerMessage =
        serde_json::from_str(&stdout).map_err(|e| anyhow!("Failed to parse worker output: {}", e))?;

    match message {
        WorkerMessage::Devices { devices } => Ok(devices),
        WorkerMessage::Error { message } => Err(anyhow!("Worker error: {}", message)),
        _ => Err(anyhow!("Unexpected response from worker")),
    }
}

/// Start recording audio
pub fn start_recording(
    app: &AppHandle,
    session_id: &str,
    config: RecordingConfig,
) -> Result<()> {
    let mut state = get_recorder_state().lock();

    if state.is_some() {
        return Err(anyhow!("Recording already in progress"));
    }

    let worker_path = get_worker_path(app)?;

    // Get app data directory for output file
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| anyhow!("Failed to get app data dir: {}", e))?;
    let audio_dir = app_data_dir.join("audio");
    std::fs::create_dir_all(&audio_dir)?;

    let output_path = audio_dir.join(format!("{}.wav", session_id));

    println!(
        "[SystemAudio] Starting recording: session={}, output={:?}, system_audio={}",
        session_id,
        output_path,
        config.capture_system_audio
    );

    // Build command arguments
    let mut cmd = Command::new(&worker_path);
    cmd.arg("--output")
        .arg(&output_path)
        .arg("--sample-rate")
        .arg(config.sample_rate.to_string())
        .arg("--mic-volume")
        .arg(config.mic_volume.to_string())
        .arg("--system-volume")
        .arg(config.system_volume.to_string())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    if config.capture_system_audio {
        cmd.arg("--system-audio");
    }

    if let Some(ref mic_id) = config.mic_device_id {
        cmd.arg("--mic-device").arg(mic_id);
    }

    // Start the process
    let mut child = cmd.spawn().map_err(|e| anyhow!("Failed to start worker: {}", e))?;

    // Get stdout for reading progress
    let stdout = child.stdout.take().ok_or_else(|| anyhow!("Failed to get stdout from worker process"))?;

    // Store the active recording
    *state = Some(ActiveRecording {
        output_path: output_path.clone(),
        child,
        status: RecordingStatus {
            state: RecordingState::Recording,
            ..Default::default()
        },
    });

    // Spawn a thread to read stdout and emit progress events
    let app_clone = app.clone();
    let session_id_clone = session_id.to_string();
    let recorder_state = get_recorder_state().clone();

    thread::spawn(move || {
        let reader = BufReader::new(stdout);

        for line in reader.lines() {
            if let Ok(line) = line {
                if let Ok(msg) = serde_json::from_str::<WorkerMessage>(&line) {
                    match msg {
                        WorkerMessage::Status {
                            _state: _,
                            duration_ms,
                            mic_level,
                            system_level,
                        } => {
                            // Update status
                            {
                                let mut lock = recorder_state.lock();
                                if let Some(ref mut recording) = *lock {
                                    recording.status.duration_ms = duration_ms;
                                    recording.status.mic_level = mic_level;
                                    recording.status.system_level = system_level;
                                }
                            }

                            // Emit progress event
                            let event = RecordingProgressEvent {
                                session_id: session_id_clone.clone(),
                                state: "recording".to_string(),
                                duration_ms,
                                mic_level,
                                system_level,
                            };

                            let _ = app_clone.emit("recording-progress", &event);
                        }
                        WorkerMessage::Complete {
                            _output_path: _,
                            duration_ms,
                        } => {
                            println!(
                                "[SystemAudio] Recording complete: {} ms",
                                duration_ms
                            );

                            // Update status
                            {
                                let mut lock = recorder_state.lock();
                                if let Some(ref mut recording) = *lock {
                                    recording.status.state = RecordingState::Idle;
                                }
                            }

                            // Emit complete event
                            let event = RecordingProgressEvent {
                                session_id: session_id_clone.clone(),
                                state: "complete".to_string(),
                                duration_ms,
                                mic_level: 0.0,
                                system_level: 0.0,
                            };

                            let _ = app_clone.emit("recording-progress", &event);
                            break;
                        }
                        WorkerMessage::Error { message } => {
                            println!("[SystemAudio] Worker error: {}", message);

                            // Emit error event
                            let event = RecordingProgressEvent {
                                session_id: session_id_clone.clone(),
                                state: "error".to_string(),
                                duration_ms: 0,
                                mic_level: 0.0,
                                system_level: 0.0,
                            };

                            let _ = app_clone.emit("recording-progress", &event);
                        }
                        _ => {}
                    }
                }
            }
        }
    });

    println!("[SystemAudio] Recording started successfully");
    Ok(())
}

/// Stop recording and return the audio file path
pub fn stop_recording() -> Result<String> {
    let mut state = get_recorder_state().lock();

    match state.take() {
        Some(mut recording) => {
            println!("[SystemAudio] Stopping recording...");

            // Send SIGTERM to gracefully stop the worker
            #[cfg(unix)]
            {
                // Use kill command to send SIGTERM
                let _ = Command::new("kill")
                    .arg("-TERM")
                    .arg(recording.child.id().to_string())
                    .output();
            }

            #[cfg(windows)]
            {
                // On Windows, we'll just kill the process
                let _ = recording.child.kill();
            }

            // Wait for the process to exit
            let _ = recording.child.wait();

            let path = recording.output_path.to_string_lossy().to_string();
            println!("[SystemAudio] Recording stopped, file: {}", path);

            Ok(path)
        }
        None => Err(anyhow!("No recording in progress")),
    }
}

/// Get current recording status
pub fn get_status() -> RecordingStatus {
    let state = get_recorder_state().lock();

    match &*state {
        Some(recording) => recording.status.clone(),
        None => RecordingStatus::default(),
    }
}

/// Check audio permissions (platform-specific)
pub fn check_permissions(app: &AppHandle) -> Result<AudioPermissions> {
    let worker_path = get_worker_path(app)?;

    let output = Command::new(&worker_path)
        .arg("check-permission")
        .output()
        .map_err(|e| anyhow!("Failed to run worker: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);

    // Parse JSON response
    if let Ok(json) = serde_json::from_str::<serde_json::Value>(&stdout) {
        let granted = json.get("granted").and_then(|v| v.as_bool()).unwrap_or(false);
        return Ok(AudioPermissions {
            microphone: true, // Mic permission is checked separately by the OS
            screen_recording: granted,
        });
    }

    Ok(AudioPermissions {
        microphone: true,
        screen_recording: false,
    })
}

/// Open System Settings to Screen Recording pane
pub fn open_screen_recording_settings(app: &AppHandle) -> Result<()> {
    let worker_path = get_worker_path(app)?;

    Command::new(&worker_path)
        .arg("open-settings")
        .output()
        .map_err(|e| anyhow!("Failed to open settings: {}", e))?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_recording_config_default() {
        let config = RecordingConfig::default();
        assert!(config.mic_device_id.is_none());
        assert!(!config.capture_system_audio);
        assert_eq!(config.sample_rate, 16000);
        assert_eq!(config.mic_volume, 1.0);
        assert_eq!(config.system_volume, 0.7);
    }

    #[test]
    fn test_recording_status_default() {
        let status = RecordingStatus::default();
        assert_eq!(status.state, RecordingState::Idle);
        assert_eq!(status.duration_ms, 0);
        assert_eq!(status.mic_level, 0.0);
        assert_eq!(status.system_level, 0.0);
    }

    #[test]
    fn test_recording_state_serialization() {
        let idle_json = serde_json::to_string(&RecordingState::Idle).unwrap();
        assert_eq!(idle_json, "\"idle\"");

        let recording_json = serde_json::to_string(&RecordingState::Recording).unwrap();
        assert_eq!(recording_json, "\"recording\"");

        let stopping_json = serde_json::to_string(&RecordingState::Stopping).unwrap();
        assert_eq!(stopping_json, "\"stopping\"");
    }

    #[test]
    fn test_audio_device_serialization() {
        let device = AudioDevice {
            id: "device-1".to_string(),
            name: "Built-in Microphone".to_string(),
            is_default: true,
        };

        let json = serde_json::to_string(&device).unwrap();
        assert!(json.contains("\"id\":\"device-1\""));
        assert!(json.contains("\"name\":\"Built-in Microphone\""));
        assert!(json.contains("\"isDefault\":true"));
    }

    #[test]
    fn test_audio_permissions_serialization() {
        let perms = AudioPermissions {
            microphone: true,
            screen_recording: false,
        };

        let json = serde_json::to_string(&perms).unwrap();
        assert!(json.contains("\"microphone\":true"));
        assert!(json.contains("\"screenRecording\":false"));
    }

    #[test]
    fn test_recording_progress_event_serialization() {
        let event = RecordingProgressEvent {
            session_id: "test-session".to_string(),
            state: "recording".to_string(),
            duration_ms: 5000,
            mic_level: 0.75,
            system_level: 0.5,
        };

        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains("\"sessionId\":\"test-session\""));
        assert!(json.contains("\"state\":\"recording\""));
        assert!(json.contains("\"durationMs\":5000"));
        assert!(json.contains("\"micLevel\":0.75"));
        assert!(json.contains("\"systemLevel\":0.5"));
    }

    #[test]
    fn test_get_status_returns_default_when_idle() {
        // When no recording is in progress, get_status should return default
        let status = get_status();
        assert_eq!(status.state, RecordingState::Idle);
    }

    #[test]
    fn test_stop_recording_when_not_recording() {
        // Stopping when not recording should return an error
        let result = stop_recording();
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("No recording in progress"));
    }

    #[test]
    fn test_recording_config_deserialization() {
        let json = r#"{"micDeviceId":"device-1","captureSystemAudio":true,"sampleRate":44100,"micVolume":0.8,"systemVolume":0.6}"#;
        let config: RecordingConfig = serde_json::from_str(json).unwrap();

        assert_eq!(config.mic_device_id, Some("device-1".to_string()));
        assert!(config.capture_system_audio);
        assert_eq!(config.sample_rate, 44100);
        assert_eq!(config.mic_volume, 0.8);
        assert_eq!(config.system_volume, 0.6);
    }
}
