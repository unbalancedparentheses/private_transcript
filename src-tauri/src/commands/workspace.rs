use crate::models::{CreateWorkspaceRequest, UpdateWorkspaceRequest, Workspace};
use crate::services::database;
use tauri::AppHandle;

#[tauri::command]
pub async fn create_workspace(
    app: AppHandle,
    request: CreateWorkspaceRequest,
) -> Result<Workspace, String> {
    database::create_workspace(&app, request)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_workspaces(app: AppHandle) -> Result<Vec<Workspace>, String> {
    database::get_workspaces(&app)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_workspace(
    app: AppHandle,
    request: UpdateWorkspaceRequest,
) -> Result<Workspace, String> {
    database::update_workspace(&app, request)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_workspace(app: AppHandle, id: String) -> Result<(), String> {
    database::delete_workspace(&app, &id)
        .await
        .map_err(|e| e.to_string())
}
