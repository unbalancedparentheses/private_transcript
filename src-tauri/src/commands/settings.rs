use crate::models::{AppSettings, UpdateSettingsRequest};
use crate::services::database;
use tauri::AppHandle;

#[tauri::command]
pub async fn get_settings(app: AppHandle) -> Result<AppSettings, String> {
    database::get_settings(&app)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_settings(
    app: AppHandle,
    request: UpdateSettingsRequest,
) -> Result<AppSettings, String> {
    database::update_settings(&app, request)
        .await
        .map_err(|e| e.to_string())
}
