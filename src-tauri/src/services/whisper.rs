use anyhow::{anyhow, Result};
use once_cell::sync::OnceCell;
use parking_lot::Mutex;
use std::path::PathBuf;
use std::process::Command;
use std::sync::Arc;
use tauri::AppHandle;
use tauri::Manager;

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

    // Try various locations for the worker binary
    let possible_paths = [
        // Development: built whisperkit-worker in the whisperkit-worker folder
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

/// Transcribe audio file using whisperkit-worker subprocess
/// WhisperKit provides fast CoreML/Metal-accelerated transcription
pub async fn transcribe(app: &AppHandle, _session_id: &str, audio_path: &str) -> Result<String> {
    println!("[WhisperKit] transcribe() called for: {}", audio_path);

    // Verify audio file exists
    let audio_file = std::path::Path::new(audio_path);
    if !audio_file.exists() {
        return Err(anyhow!("Audio file not found: {}", audio_path));
    }

    // Get worker binary path
    let worker_path = get_worker_path(app)?;

    println!("[WhisperKit] Running whisperkit-worker subprocess...");

    // Spawn worker process
    // WhisperKit will auto-download and cache the model on first run
    let audio_path_str = audio_path.to_string();
    let worker_path_clone = worker_path.clone();

    let output = tokio::task::spawn_blocking(move || {
        Command::new(&worker_path_clone)
            .arg(&audio_path_str)
            .output()
    })
    .await
    .map_err(|e| anyhow!("Task join error: {}", e))?
    .map_err(|e| anyhow!("Failed to run whisperkit-worker: {}", e))?;

    // Check for errors
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        println!("[WhisperKit] Worker failed with stderr: {}", stderr);
        return Err(anyhow!("Transcription failed: {}", stderr));
    }

    // Get transcript from stdout
    let transcript = String::from_utf8_lossy(&output.stdout).trim().to_string();

    if transcript.is_empty() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        println!("[WhisperKit] Worker stderr: {}", stderr);
        return Err(anyhow!("Transcription produced no output"));
    }

    println!(
        "[WhisperKit] Transcription complete: {} chars",
        transcript.len()
    );
    println!("[WhisperKit] Result: {}", transcript);

    Ok(transcript)
}
