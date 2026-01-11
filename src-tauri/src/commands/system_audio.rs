use crate::services::system_audio::{
    AudioDevice, AudioPermissions, RecordingConfig, RecordingStatus,
};
use crate::utils::IntoTauriResult;
use tauri::AppHandle;

/// List available audio input devices
#[tauri::command]
pub fn get_audio_devices(app: AppHandle) -> Result<Vec<AudioDevice>, String> {
    crate::services::system_audio::list_devices(&app).into_tauri_result()
}

/// Start system audio recording
#[tauri::command]
pub fn start_system_recording(
    app: AppHandle,
    session_id: String,
    config: RecordingConfig,
) -> Result<(), String> {
    crate::services::system_audio::start_recording(&app, &session_id, config).into_tauri_result()
}

/// Stop system audio recording
#[tauri::command]
pub fn stop_system_recording() -> Result<String, String> {
    crate::services::system_audio::stop_recording().into_tauri_result()
}

/// Get current recording status
#[tauri::command]
pub fn get_recording_status() -> RecordingStatus {
    crate::services::system_audio::get_status()
}

/// Check audio permissions
#[tauri::command]
pub fn check_audio_permissions(app: AppHandle) -> Result<AudioPermissions, String> {
    crate::services::system_audio::check_permissions(&app).into_tauri_result()
}

/// Open System Settings to Screen Recording pane
#[tauri::command]
pub fn open_screen_recording_settings(app: AppHandle) -> Result<(), String> {
    crate::services::system_audio::open_screen_recording_settings(&app).into_tauri_result()
}
