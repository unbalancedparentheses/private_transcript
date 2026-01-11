use crate::models::TranscriptionProgress;
use crate::services::model_manager::{get_whisper_models, ModelManager};
use crate::services::whisper;
use tauri::AppHandle;

#[tauri::command]
pub async fn transcribe_audio(
    app: AppHandle,
    session_id: String,
    audio_path: String,
) -> Result<String, String> {
    println!("[Transcription] Starting transcription for session: {}", session_id);
    println!("[Transcription] Audio path: {}", audio_path);

    // Check if file exists
    let path = std::path::Path::new(&audio_path);
    if !path.exists() {
        let err = format!("Audio file does not exist: {}", audio_path);
        println!("[Transcription] ERROR: {}", err);
        return Err(err);
    }
    println!("[Transcription] Audio file exists, size: {} bytes",
        std::fs::metadata(&audio_path).map(|m| m.len()).unwrap_or(0));

    // Auto-load whisper model if not already loaded
    println!("[Transcription] Checking if whisper model is loaded: {}", whisper::is_model_loaded());
    if !whisper::is_model_loaded() {
        println!("[Transcription] Whisper model not loaded, attempting to auto-load...");

        // Find the first downloaded whisper model
        let manager = ModelManager::new(&app).await.map_err(|e| {
            let err = format!("Failed to create ModelManager: {}", e);
            println!("[Transcription] ERROR: {}", err);
            err
        })?;

        let downloaded = manager.get_downloaded_models();
        println!("[Transcription] Downloaded models: {:?}", downloaded);

        let whisper_models = get_whisper_models();
        println!("[Transcription] Available whisper models: {:?}", whisper_models.iter().map(|m| &m.id).collect::<Vec<_>>());

        let whisper_model_id = whisper_models
            .iter()
            .find(|m| downloaded.contains(&m.id))
            .map(|m| m.id.clone())
            .ok_or_else(|| {
                let err = "No whisper model downloaded. Please download a model first.".to_string();
                println!("[Transcription] ERROR: {}", err);
                err
            })?;

        println!("[Transcription] Auto-loading whisper model: {}", whisper_model_id);
        whisper::load_model(&app, &whisper_model_id)
            .await
            .map_err(|e| {
                let err = format!("Failed to load whisper model: {}", e);
                println!("[Transcription] ERROR: {}", err);
                err
            })?;
        println!("[Transcription] Whisper model loaded successfully");
    } else {
        println!("[Transcription] Whisper model already loaded: {:?}", whisper::get_loaded_model());
    }

    println!("[Transcription] Starting whisper transcription...");
    let result = whisper::transcribe(&app, &session_id, &audio_path).await;

    match &result {
        Ok(transcript) => {
            println!("[Transcription] SUCCESS! Transcript length: {} chars", transcript.len());
            println!("[Transcription] First 200 chars: {}", &transcript.chars().take(200).collect::<String>());
        }
        Err(e) => {
            println!("[Transcription] ERROR during transcription: {}", e);
        }
    }

    result.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_transcription_progress(
    _app: AppHandle,
    session_id: String,
) -> Result<TranscriptionProgress, String> {
    // TODO: Implement progress tracking
    Ok(TranscriptionProgress {
        session_id,
        progress: 0.0,
        status: "pending".to_string(),
    })
}
