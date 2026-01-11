//! Tauri commands for streaming transcription

use crate::services::streaming_transcription::{self, LiveTranscriptionConfig};
use tauri::AppHandle;

/// Start the streaming transcription worker
#[tauri::command]
pub async fn start_streaming_worker(app: AppHandle) -> Result<(), String> {
    println!("[Command] start_streaming_worker");
    streaming_transcription::start_worker(&app).map_err(|e| e.to_string())
}

/// Initialize the worker with a specific model
#[tauri::command]
pub async fn initialize_streaming_worker(
    app: AppHandle,
    model: Option<String>,
    language: Option<String>,
) -> Result<(), String> {
    println!(
        "[Command] initialize_streaming_worker: model={:?}, language={:?}",
        model, language
    );
    streaming_transcription::initialize_worker(&app, model, language).map_err(|e| e.to_string())
}

/// Start a live transcription session
#[tauri::command]
#[allow(non_snake_case)]
pub async fn start_live_transcription(
    app: AppHandle,
    sessionId: String,
    config: Option<LiveTranscriptionConfig>,
) -> Result<(), String> {
    println!("[Command] start_live_transcription: session={}", sessionId);
    let config = config.unwrap_or_default();
    streaming_transcription::start_session(&app, &sessionId, &config).map_err(|e| e.to_string())
}

/// Feed audio samples to the live transcription
#[tauri::command]
#[allow(non_snake_case)]
pub async fn feed_live_audio(sessionId: String, samples: Vec<f32>) -> Result<(), String> {
    // Don't log every audio chunk - too noisy
    streaming_transcription::feed_audio(&sessionId, &samples).map_err(|e| e.to_string())
}

/// Stop a live transcription session
#[tauri::command]
#[allow(non_snake_case)]
pub async fn stop_live_transcription(sessionId: String) -> Result<(), String> {
    println!("[Command] stop_live_transcription: session={}", sessionId);
    streaming_transcription::stop_session(&sessionId).map_err(|e| e.to_string())
}

/// Shutdown the streaming worker
#[tauri::command]
pub async fn shutdown_streaming_worker() -> Result<(), String> {
    println!("[Command] shutdown_streaming_worker");
    streaming_transcription::shutdown_worker().map_err(|e| e.to_string())
}

/// Check if the streaming worker is running
#[tauri::command]
pub fn is_streaming_worker_running() -> bool {
    streaming_transcription::is_worker_running()
}

/// Get the current state of the streaming worker
#[tauri::command]
pub fn get_streaming_worker_state() -> String {
    format!("{:?}", streaming_transcription::get_state())
}

/// Ensure the streaming worker is running, restarting if necessary
/// This can be called before starting a transcription session to recover from crashes
#[tauri::command]
pub async fn ensure_streaming_worker_running(app: AppHandle) -> Result<(), String> {
    println!("[Command] ensure_streaming_worker_running");
    streaming_transcription::ensure_worker_running(&app).map_err(|e| e.to_string())
}
