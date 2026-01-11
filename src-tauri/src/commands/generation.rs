use crate::models::OllamaStatus;
use crate::services::llm;
use tauri::AppHandle;

#[tauri::command]
pub async fn generate_note(
    app: AppHandle,
    transcript: String,
    template_id: String,
) -> Result<String, String> {
    llm::generate_note(&app, &transcript, &template_id)
        .await
        .map_err(|e| e.to_string())
}

/// Generate note with streaming - emits "llm-stream" events as tokens are generated.
/// Returns the full generated text when complete.
#[tauri::command]
pub async fn generate_note_streaming(
    app: AppHandle,
    session_id: String,
    transcript: String,
    template_id: String,
) -> Result<String, String> {
    llm::generate_note_streaming(&app, &session_id, &transcript, &template_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn check_ollama_status(_app: AppHandle) -> Result<OllamaStatus, String> {
    llm::check_ollama_status()
        .await
        .map_err(|e| e.to_string())
}
