use crate::models::TranscriptionProgress;
use crate::services::whisper;
use tauri::AppHandle;

#[tauri::command]
pub async fn transcribe_audio(
    app: AppHandle,
    session_id: String,
    audio_path: String,
) -> Result<String, String> {
    whisper::transcribe(&app, &session_id, &audio_path)
        .await
        .map_err(|e| e.to_string())
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
