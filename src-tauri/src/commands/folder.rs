use crate::models::{CreateFolderRequest, Folder, UpdateFolderRequest};
use crate::services::database;
use crate::utils::IntoTauriResult;
use tauri::AppHandle;

#[tauri::command]
pub async fn create_folder(app: AppHandle, request: CreateFolderRequest) -> Result<Folder, String> {
    database::create_folder(&app, request)
        .await
        .into_tauri_result()
}

#[tauri::command]
pub async fn get_folders(app: AppHandle, workspace_id: String) -> Result<Vec<Folder>, String> {
    database::get_folders(&app, &workspace_id)
        .await
        .into_tauri_result()
}

#[tauri::command]
pub async fn update_folder(app: AppHandle, request: UpdateFolderRequest) -> Result<Folder, String> {
    database::update_folder(&app, request)
        .await
        .into_tauri_result()
}

#[tauri::command]
pub async fn delete_folder(app: AppHandle, id: String) -> Result<(), String> {
    database::delete_folder(&app, &id).await.into_tauri_result()
}
