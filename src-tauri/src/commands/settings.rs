use crate::models::{AppSettings, UpdateSettingsRequest};
use crate::services::database;
use crate::utils::IntoTauriResult;
use tauri::AppHandle;

#[tauri::command]
pub async fn get_settings(app: AppHandle) -> Result<AppSettings, String> {
    database::get_settings(&app).await.into_tauri_result()
}

#[tauri::command]
pub async fn update_settings(
    app: AppHandle,
    request: UpdateSettingsRequest,
) -> Result<AppSettings, String> {
    database::update_settings(&app, request)
        .await
        .into_tauri_result()
}
