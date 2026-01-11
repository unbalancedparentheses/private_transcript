use crate::models::TranscriptionProgress;
use crate::services::whisper;
use crate::utils::IntoTauriResult;
use once_cell::sync::Lazy;
use parking_lot::Mutex;
use std::collections::HashMap;
use tauri::AppHandle;

/// Track active transcription progress
static TRANSCRIPTION_PROGRESS: Lazy<Mutex<HashMap<String, TranscriptionProgress>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

/// Update transcription progress (called from whisper service via events)
pub fn update_progress(session_id: &str, progress: f32, status: &str) {
    println!(
        "[TranscriptionCmd] Updating progress: session={}, progress={:.1}%, status={}",
        session_id, progress, status
    );
    let mut map = TRANSCRIPTION_PROGRESS.lock();
    map.insert(
        session_id.to_string(),
        TranscriptionProgress {
            session_id: session_id.to_string(),
            progress,
            status: status.to_string(),
        },
    );
    println!(
        "[TranscriptionCmd] Progress map now has {} entries",
        map.len()
    );
}

/// Clear transcription progress when done
pub fn clear_progress(session_id: &str) {
    println!(
        "[TranscriptionCmd] Clearing progress for session: {}",
        session_id
    );
    let mut map = TRANSCRIPTION_PROGRESS.lock();
    map.remove(session_id);
    println!(
        "[TranscriptionCmd] Progress map now has {} entries",
        map.len()
    );
}

#[tauri::command]
pub async fn transcribe_audio(
    app: AppHandle,
    session_id: String,
    audio_path: String,
) -> Result<String, String> {
    println!(
        "[Transcription] Starting transcription for session: {}",
        session_id
    );
    println!("[Transcription] Audio path: {}", audio_path);

    // Initialize progress tracking
    update_progress(&session_id, 0.0, "starting");

    // Check if file exists
    let path = std::path::Path::new(&audio_path);
    if !path.exists() {
        let err = format!("Audio file does not exist: {}", audio_path);
        println!("[Transcription] ERROR: {}", err);
        update_progress(&session_id, 0.0, "error");
        return Err(err);
    }

    let file_size = std::fs::metadata(&audio_path)
        .map(|m| m.len())
        .unwrap_or(0);
    println!(
        "[Transcription] Audio file exists, size: {} bytes",
        file_size
    );

    // WhisperKit auto-downloads models, so we can transcribe directly
    // Set a default model if none is loaded (for UI compatibility)
    if !whisper::is_model_loaded() {
        println!("[Transcription] Setting default WhisperKit model...");
        whisper::load_model(&app, "whisperkit-base")
            .await
            .map_err(|e| {
                let err = format!("Failed to set model: {}", e);
                println!("[Transcription] ERROR: {}", err);
                update_progress(&session_id, 0.0, "error");
                err
            })?;
    }

    update_progress(&session_id, 10.0, "transcribing");
    println!("[Transcription] Starting WhisperKit transcription...");
    let result = whisper::transcribe(&app, &session_id, &audio_path).await;

    match &result {
        Ok(transcript) => {
            println!(
                "[Transcription] SUCCESS! Transcript length: {} chars",
                transcript.len()
            );
            println!(
                "[Transcription] First 200 chars: {}",
                &transcript.chars().take(200).collect::<String>()
            );
            update_progress(&session_id, 100.0, "complete");
        }
        Err(e) => {
            println!("[Transcription] ERROR during transcription: {}", e);
            update_progress(&session_id, 0.0, "error");
        }
    }

    // Clean up progress tracking after a short delay
    let session_id_clone = session_id.clone();
    tokio::spawn(async move {
        tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
        clear_progress(&session_id_clone);
    });

    result.into_tauri_result()
}

#[tauri::command]
pub async fn get_transcription_progress(
    _app: AppHandle,
    session_id: String,
) -> Result<TranscriptionProgress, String> {
    let map = TRANSCRIPTION_PROGRESS.lock();
    Ok(map
        .get(&session_id)
        .cloned()
        .unwrap_or_else(|| TranscriptionProgress {
            session_id,
            progress: 0.0,
            status: "pending".to_string(),
        }))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_update_progress() {
        let session_id = "test-session-1";
        update_progress(session_id, 50.0, "transcribing");

        let map = TRANSCRIPTION_PROGRESS.lock();
        let progress = map.get(session_id).unwrap();
        assert_eq!(progress.progress, 50.0);
        assert_eq!(progress.status, "transcribing");
    }

    #[test]
    fn test_clear_progress() {
        let session_id = "test-session-2";
        update_progress(session_id, 100.0, "complete");
        clear_progress(session_id);

        let map = TRANSCRIPTION_PROGRESS.lock();
        assert!(map.get(session_id).is_none());
    }
}
