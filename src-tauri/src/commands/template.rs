use crate::models::Template;
use crate::services::database;
use crate::utils::IntoTauriResult;
use tauri::AppHandle;

#[tauri::command]
pub async fn get_templates(
    app: AppHandle,
    workspace_type: Option<String>,
) -> Result<Vec<Template>, String> {
    database::get_templates(&app, workspace_type.as_deref())
        .await
        .into_tauri_result()
}

#[tauri::command]
pub async fn get_template(app: AppHandle, id: String) -> Result<Template, String> {
    database::get_template(&app, &id).await.into_tauri_result()
}
