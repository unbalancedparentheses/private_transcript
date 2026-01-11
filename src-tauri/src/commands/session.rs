use crate::models::{CreateSessionRequest, Session, UpdateSessionRequest};
use crate::services::database;
use crate::utils::IntoTauriResult;
use tauri::AppHandle;

#[tauri::command]
pub async fn create_session(
    app: AppHandle,
    request: CreateSessionRequest,
) -> Result<Session, String> {
    database::create_session(&app, request)
        .await
        .into_tauri_result()
}

#[tauri::command]
pub async fn get_sessions(app: AppHandle, folder_id: String) -> Result<Vec<Session>, String> {
    database::get_sessions(&app, &folder_id)
        .await
        .into_tauri_result()
}

#[tauri::command]
pub async fn get_session(app: AppHandle, id: String) -> Result<Session, String> {
    database::get_session(&app, &id).await.into_tauri_result()
}

#[tauri::command]
pub async fn update_session(
    app: AppHandle,
    request: UpdateSessionRequest,
) -> Result<Session, String> {
    database::update_session(&app, request)
        .await
        .into_tauri_result()
}

#[tauri::command]
pub async fn delete_session(app: AppHandle, id: String) -> Result<(), String> {
    database::delete_session(&app, &id)
        .await
        .into_tauri_result()
}

#[tauri::command]
pub async fn search_sessions(
    app: AppHandle,
    query: String,
    limit: Option<i32>,
) -> Result<Vec<Session>, String> {
    database::search_sessions(&app, &query, limit.unwrap_or(50))
        .await
        .into_tauri_result()
}
