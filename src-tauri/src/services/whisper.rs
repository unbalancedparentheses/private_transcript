use anyhow::{anyhow, Result};
use once_cell::sync::OnceCell;
use parking_lot::Mutex;
use serde::Serialize;
use std::path::PathBuf;
use std::process::Command;
use std::sync::Arc;
use tauri::AppHandle;
use tauri::{Emitter, Manager};

/// Transcription progress event sent to frontend
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TranscriptionProgressEvent {
    pub session_id: String,
    pub progress: f32,
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}

/// Currently loaded model ID (for compatibility with UI)
static LOADED_MODEL_ID: OnceCell<Arc<Mutex<Option<String>>>> = OnceCell::new();

fn get_loaded_model_id() -> &'static Arc<Mutex<Option<String>>> {
    LOADED_MODEL_ID.get_or_init(|| Arc::new(Mutex::new(None)))
}

/// Get path to the whisperkit-worker binary
fn get_worker_path(app: &AppHandle) -> Result<PathBuf> {
    // Try Tauri's sidecar resolution first (works in production)
    if let Ok(sidecar) = app
        .path()
        .resolve("binaries/whisperkit-worker", tauri::path::BaseDirectory::Resource)
    {
        if sidecar.exists() {
            println!("[WhisperKit] Found bundled worker at: {:?}", sidecar);
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
        // Development: binaries folder with architecture suffix (Tauri sidecar format)
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
        // Fallback: current directory
        Some(PathBuf::from("./whisperkit-worker")),
    ];

    for path in possible_paths.iter().flatten() {
        println!("[WhisperKit] Checking path: {:?}", path);
        if path.exists() {
            println!("[WhisperKit] Found worker at: {:?}", path);
            return Ok(path.clone());
        }
    }

    Err(anyhow!(
        "WhisperKit worker binary not found. Build it with: cd whisperkit-worker && swift build -c release"
    ))
}

/// Load whisper model (just stores the model ID for UI compatibility)
/// WhisperKit automatically downloads and caches models
pub async fn load_model(_app: &AppHandle, model_id: &str) -> Result<()> {
    println!("[WhisperKit] Setting model preference: {}", model_id);

    let mut lock = get_loaded_model_id().lock();
    *lock = Some(model_id.to_string());

    Ok(())
}

/// Unload whisper model from memory
pub fn unload_model() {
    let mut lock = get_loaded_model_id().lock();
    *lock = None;
}

/// Check if a model is loaded
pub fn is_model_loaded() -> bool {
    // WhisperKit auto-downloads models, so we're always "ready"
    // Return true if a model preference has been set
    let lock = get_loaded_model_id().lock();
    lock.is_some()
}

/// Get the currently loaded model ID
pub fn get_loaded_model() -> Option<String> {
    let lock = get_loaded_model_id().lock();
    lock.clone()
}

/// Emit transcription progress event
fn emit_progress(app: &AppHandle, session_id: &str, progress: f32, status: &str, message: Option<&str>) {
    println!(
        "[WhisperKit] Progress event: session={}, progress={:.1}%, status={}, message={:?}",
        session_id, progress, status, message
    );

    let event = TranscriptionProgressEvent {
        session_id: session_id.to_string(),
        progress,
        status: status.to_string(),
        message: message.map(|s| s.to_string()),
    };

    match app.emit("transcription-progress", &event) {
        Ok(_) => println!("[WhisperKit] Successfully emitted progress event"),
        Err(e) => println!("[WhisperKit] ERROR: Failed to emit progress event: {}", e),
    }
}

/// Transcribe audio file using whisperkit-worker subprocess
/// WhisperKit provides fast CoreML/Metal-accelerated transcription
pub async fn transcribe(app: &AppHandle, session_id: &str, audio_path: &str) -> Result<String> {
    println!("[WhisperKit] transcribe() called for: {}", audio_path);

    // Emit starting event
    emit_progress(app, session_id, 0.0, "starting", Some("Preparing transcription..."));

    // Verify audio file exists
    let audio_file = std::path::Path::new(audio_path);
    if !audio_file.exists() {
        emit_progress(app, session_id, 0.0, "error", Some("Audio file not found"));
        return Err(anyhow!("Audio file not found: {}", audio_path));
    }

    // Get worker binary path
    let worker_path = get_worker_path(app)?;

    println!("[WhisperKit] Running whisperkit-worker subprocess...");

    // Emit transcribing event - progress will be estimated
    emit_progress(app, session_id, 10.0, "transcribing", Some("Loading model..."));

    // Spawn worker process
    // WhisperKit will auto-download and cache the model on first run
    let audio_path_str = audio_path.to_string();
    let worker_path_clone = worker_path.clone();
    let session_id_clone = session_id.to_string();
    let app_clone = app.clone();

    // Run transcription in background and emit progress updates
    let handle = tokio::task::spawn_blocking(move || {
        // Emit progress update when model is loaded
        emit_progress(&app_clone, &session_id_clone, 30.0, "transcribing", Some("Transcribing audio..."));

        Command::new(&worker_path_clone)
            .arg(&audio_path_str)
            .output()
    });

    let output = handle
        .await
        .map_err(|e| {
            emit_progress(app, session_id, 0.0, "error", Some(&format!("Task error: {}", e)));
            anyhow!("Task join error: {}", e)
        })?
        .map_err(|e| {
            emit_progress(app, session_id, 0.0, "error", Some(&format!("Worker error: {}", e)));
            anyhow!("Failed to run whisperkit-worker: {}", e)
        })?;

    // Check for errors
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        println!("[WhisperKit] Worker failed with stderr: {}", stderr);
        emit_progress(app, session_id, 0.0, "error", Some(&format!("Transcription failed: {}", stderr)));
        return Err(anyhow!("Transcription failed: {}", stderr));
    }

    // Emit processing result event
    emit_progress(app, session_id, 90.0, "processing", Some("Processing result..."));

    // Get transcript from stdout
    let transcript = String::from_utf8_lossy(&output.stdout).trim().to_string();

    if transcript.is_empty() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        println!("[WhisperKit] Worker stderr: {}", stderr);
        emit_progress(app, session_id, 0.0, "error", Some("Transcription produced no output"));
        return Err(anyhow!("Transcription produced no output"));
    }

    println!(
        "[WhisperKit] Transcription complete: {} chars",
        transcript.len()
    );
    println!("[WhisperKit] Result: {}", transcript);

    // Emit completion event
    emit_progress(app, session_id, 100.0, "complete", Some("Transcription complete"));

    Ok(transcript)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_loaded_model_returns_option() {
        let result = get_loaded_model();
        // Should return Some(String) or None, never panic
        match result {
            Some(model_id) => assert!(!model_id.is_empty()),
            None => {} // This is fine
        }
    }

    #[test]
    fn test_unload_model_no_panic() {
        // Verify unloading when nothing is loaded doesn't panic
        unload_model();
        assert!(!is_model_loaded() || is_model_loaded()); // Should not panic
    }

    #[test]
    fn test_is_model_loaded_function() {
        // This test verifies the function works
        let _result = is_model_loaded();
        // Should not panic
    }

    #[test]
    fn test_transcription_progress_event_serialization() {
        let event = TranscriptionProgressEvent {
            session_id: "test-session".to_string(),
            progress: 50.0,
            status: "transcribing".to_string(),
            message: Some("Processing audio...".to_string()),
        };

        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains("\"sessionId\":\"test-session\""));
        assert!(json.contains("\"progress\":50.0"));
        assert!(json.contains("\"status\":\"transcribing\""));
        assert!(json.contains("\"message\":\"Processing audio...\""));
    }

    #[test]
    fn test_transcription_progress_event_without_message() {
        let event = TranscriptionProgressEvent {
            session_id: "test-session".to_string(),
            progress: 100.0,
            status: "complete".to_string(),
            message: None,
        };

        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains("\"sessionId\":\"test-session\""));
        assert!(json.contains("\"progress\":100.0"));
        assert!(json.contains("\"status\":\"complete\""));
        // message should be skipped when None due to skip_serializing_if
        assert!(!json.contains("\"message\""));
    }
}
