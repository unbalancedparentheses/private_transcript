use crate::services::local_llm;
use crate::services::model_manager::{
    get_all_models, get_llm_models, get_whisper_models, ModelInfo, ModelManager,
};
use crate::services::whisper;
use crate::utils::IntoTauriResult;
use tauri::AppHandle;

/// Get all available Whisper models
#[tauri::command]
pub async fn get_available_whisper_models() -> Result<Vec<ModelInfo>, String> {
    Ok(get_whisper_models())
}

/// Get all available LLM models
#[tauri::command]
pub async fn get_available_llm_models() -> Result<Vec<ModelInfo>, String> {
    Ok(get_llm_models())
}

/// Get all available models (both Whisper and LLM)
#[tauri::command]
pub async fn get_all_available_models() -> Result<Vec<ModelInfo>, String> {
    Ok(get_all_models())
}

/// Get list of downloaded model IDs
#[tauri::command]
pub async fn get_downloaded_models(app: AppHandle) -> Result<Vec<String>, String> {
    let manager = ModelManager::new(&app).await.into_tauri_result()?;
    Ok(manager.get_downloaded_models())
}

/// Download a model by ID
#[tauri::command]
pub async fn download_model(app: AppHandle, model_id: String) -> Result<String, String> {
    let model_info = ModelManager::get_model_info(&model_id)
        .ok_or_else(|| format!("Unknown model: {}", model_id))?;

    let manager = ModelManager::new(&app).await.into_tauri_result()?;

    let path = manager
        .download_model(&app, &model_info)
        .await
        .into_tauri_result()?;

    Ok(path.to_string_lossy().to_string())
}

/// Delete a downloaded model
#[tauri::command]
pub async fn delete_model(app: AppHandle, model_id: String) -> Result<(), String> {
    let model_info = ModelManager::get_model_info(&model_id)
        .ok_or_else(|| format!("Unknown model: {}", model_id))?;

    let manager = ModelManager::new(&app).await.into_tauri_result()?;

    manager.delete_model(&model_info).await.into_tauri_result()
}

/// Load a Whisper model into memory
#[tauri::command]
pub async fn load_whisper_model(app: AppHandle, model_id: String) -> Result<(), String> {
    whisper::load_model(&app, &model_id)
        .await
        .into_tauri_result()
}

/// Unload the currently loaded Whisper model
#[tauri::command]
pub fn unload_whisper_model() -> Result<(), String> {
    whisper::unload_model();
    Ok(())
}

/// Check if a Whisper model is loaded
#[tauri::command]
pub fn is_whisper_model_loaded() -> bool {
    whisper::is_model_loaded()
}

/// Get the currently loaded Whisper model ID
#[tauri::command]
pub fn get_loaded_whisper_model() -> Option<String> {
    whisper::get_loaded_model()
}

/// Load an LLM model into memory
#[tauri::command]
pub async fn load_llm_model(app: AppHandle, model_id: String) -> Result<(), String> {
    local_llm::load_model(&app, &model_id)
        .await
        .into_tauri_result()
}

/// Unload the currently loaded LLM model
#[tauri::command]
pub fn unload_llm_model() -> Result<(), String> {
    local_llm::unload_model();
    Ok(())
}

/// Check if an LLM model is loaded
#[tauri::command]
pub fn is_llm_model_loaded() -> bool {
    local_llm::is_model_loaded()
}

/// Get the currently loaded LLM model ID
#[tauri::command]
pub fn get_loaded_llm_model() -> Option<String> {
    local_llm::get_loaded_model()
}

/// Get total size of downloaded models in bytes
#[tauri::command]
pub async fn get_models_total_size(app: AppHandle) -> Result<u64, String> {
    let manager = ModelManager::new(&app).await.into_tauri_result()?;
    manager.get_total_size().await.into_tauri_result()
}

/// Check if models are ready (at least one Whisper and one LLM downloaded)
#[tauri::command]
pub async fn are_models_ready(app: AppHandle) -> Result<bool, String> {
    let manager = ModelManager::new(&app).await.into_tauri_result()?;
    let downloaded = manager.get_downloaded_models();

    let has_whisper = downloaded.iter().any(|id| id.starts_with("whisper-"));
    let has_llm = downloaded
        .iter()
        .any(|id| id.starts_with("llama-") || id.starts_with("mistral-"));

    Ok(has_whisper && has_llm)
}
