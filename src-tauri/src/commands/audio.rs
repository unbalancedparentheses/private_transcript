use crate::services::audio;
use tauri::AppHandle;

#[tauri::command]
pub async fn save_audio_file(
    app: AppHandle,
    session_id: String,
    audio_data: Vec<u8>,
    format: String,
) -> Result<String, String> {
    audio::save_audio_file(&app, &session_id, &audio_data, &format)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_audio_path(app: AppHandle, session_id: String) -> Result<String, String> {
    audio::get_audio_path(&app, &session_id)
        .await
        .map_err(|e| e.to_string())
}
