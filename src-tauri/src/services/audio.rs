use anyhow::Result;
use std::path::PathBuf;
use tauri::AppHandle;
use tauri::Manager;

/// Get the audio directory for storing recordings
fn get_audio_dir(app: &AppHandle) -> Result<PathBuf> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| anyhow::anyhow!("Failed to get app data dir: {}", e))?;
    let audio_dir = app_data_dir.join("audio");
    std::fs::create_dir_all(&audio_dir)?;
    Ok(audio_dir)
}

/// Save audio data to a file
pub async fn save_audio_file(
    app: &AppHandle,
    session_id: &str,
    audio_data: &[u8],
    format: &str,
) -> Result<String> {
    let audio_dir = get_audio_dir(app)?;
    let filename = format!("{}.{}", session_id, format);
    let file_path = audio_dir.join(&filename);

    tokio::fs::write(&file_path, audio_data).await?;

    Ok(file_path.to_string_lossy().to_string())
}

/// Get the path to an audio file for a session
pub async fn get_audio_path(app: &AppHandle, session_id: &str) -> Result<String> {
    let audio_dir = get_audio_dir(app)?;

    // Try common formats
    for ext in &["webm", "wav", "mp3", "m4a", "ogg"] {
        let path = audio_dir.join(format!("{}.{}", session_id, ext));
        if path.exists() {
            return Ok(path.to_string_lossy().to_string());
        }
    }

    Err(anyhow::anyhow!("Audio file not found for session {}", session_id))
}

/// Convert audio to WAV format (required for Whisper)
pub async fn convert_to_wav(_input_path: &str, _output_path: &str) -> Result<()> {
    // TODO: Implement audio conversion using symphonia or ffmpeg
    // For now, we assume the audio is already in a compatible format
    Ok(())
}

/// Get audio duration in seconds
pub async fn get_duration(_audio_path: &str) -> Result<i64> {
    // TODO: Implement using symphonia
    Ok(0)
}
