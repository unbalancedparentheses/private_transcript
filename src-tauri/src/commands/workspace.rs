use crate::models::{CreateWorkspaceRequest, UpdateWorkspaceRequest, Workspace};
use crate::services::database;
use crate::utils::IntoTauriResult;
use tauri::AppHandle;

#[tauri::command]
pub async fn create_workspace(
    app: AppHandle,
    request: CreateWorkspaceRequest,
) -> Result<Workspace, String> {
    database::create_workspace(&app, request)
        .await
        .into_tauri_result()
}

#[tauri::command]
pub async fn get_workspaces(app: AppHandle) -> Result<Vec<Workspace>, String> {
    database::get_workspaces(&app).await.into_tauri_result()
}

#[tauri::command]
pub async fn update_workspace(
    app: AppHandle,
    request: UpdateWorkspaceRequest,
) -> Result<Workspace, String> {
    database::update_workspace(&app, request)
        .await
        .into_tauri_result()
}

#[tauri::command]
pub async fn delete_workspace(app: AppHandle, id: String) -> Result<(), String> {
    database::delete_workspace(&app, &id)
        .await
        .into_tauri_result()
}
