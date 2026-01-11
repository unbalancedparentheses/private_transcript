use crate::services::audio;
use crate::utils::IntoTauriResult;
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
        .into_tauri_result()
}

#[tauri::command]
pub async fn get_audio_path(app: AppHandle, session_id: String) -> Result<String, String> {
    audio::get_audio_path(&app, &session_id)
        .await
        .into_tauri_result()
}
