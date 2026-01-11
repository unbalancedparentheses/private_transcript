use crate::services::export;
use tauri::AppHandle;

#[tauri::command]
pub async fn export_markdown(
    _app: AppHandle,
    content: String,
    filename: String,
) -> Result<String, String> {
    export::export_markdown(&content, &filename)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn export_to_obsidian(
    _app: AppHandle,
    content: String,
    filename: String,
    vault_path: String,
    tags: Vec<String>,
) -> Result<String, String> {
    export::export_to_obsidian(&content, &filename, &vault_path, tags)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn export_pdf(
    _app: AppHandle,
    content: String,
    filename: String,
) -> Result<String, String> {
    export::export_pdf(&content, &filename)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn export_docx(
    _app: AppHandle,
    content: String,
    filename: String,
) -> Result<String, String> {
    export::export_docx(&content, &filename)
        .await
        .map_err(|e| e.to_string())
}
