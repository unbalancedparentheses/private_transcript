use crate::models::TranscriptionProgress;
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

    // WhisperKit auto-downloads models, so we can transcribe directly
    // Set a default model if none is loaded (for UI compatibility)
    if !whisper::is_model_loaded() {
        println!("[Transcription] Setting default WhisperKit model...");
        whisper::load_model(&app, "whisperkit-base")
            .await
            .map_err(|e| {
                let err = format!("Failed to set model: {}", e);
                println!("[Transcription] ERROR: {}", err);
                err
            })?;
    }

    println!("[Transcription] Starting WhisperKit transcription...");
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
