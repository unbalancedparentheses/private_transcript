use crate::services::system_audio::{
    AudioDevice, AudioPermissions, RecordingConfig, RecordingStatus,
};
use tauri::AppHandle;

/// List available audio input devices
#[tauri::command]
pub fn get_audio_devices(app: AppHandle) -> Result<Vec<AudioDevice>, String> {
    crate::services::system_audio::list_devices(&app).map_err(|e| e.to_string())
}

/// Start system audio recording
#[tauri::command]
pub fn start_system_recording(
    app: AppHandle,
    session_id: String,
    config: RecordingConfig,
) -> Result<(), String> {
    crate::services::system_audio::start_recording(&app, &session_id, config)
        .map_err(|e| e.to_string())
}

/// Stop system audio recording
#[tauri::command]
pub fn stop_system_recording() -> Result<String, String> {
    crate::services::system_audio::stop_recording().map_err(|e| e.to_string())
}

/// Get current recording status
#[tauri::command]
pub fn get_recording_status() -> RecordingStatus {
    crate::services::system_audio::get_status()
}

/// Check audio permissions
#[tauri::command]
pub fn check_audio_permissions() -> AudioPermissions {
    crate::services::system_audio::check_permissions()
}
