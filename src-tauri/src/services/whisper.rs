use anyhow::{anyhow, Result};
use once_cell::sync::OnceCell;
use parking_lot::Mutex;
use std::sync::Arc;
use tauri::AppHandle;
use whisper_rs::{FullParams, SamplingStrategy, WhisperContext, WhisperContextParameters};

use super::audio::decode_audio_to_whisper_format;
use super::model_manager::{get_whisper_models, ModelManager};

/// Global whisper context (lazy loaded, shared across transcriptions)
static WHISPER_CONTEXT: OnceCell<Arc<Mutex<Option<WhisperContext>>>> = OnceCell::new();

/// Currently loaded model ID
static LOADED_MODEL_ID: OnceCell<Arc<Mutex<Option<String>>>> = OnceCell::new();

/// Get or initialize the whisper context holder
fn get_whisper_context() -> &'static Arc<Mutex<Option<WhisperContext>>> {
    WHISPER_CONTEXT.get_or_init(|| Arc::new(Mutex::new(None)))
}

/// Get or initialize the loaded model ID holder
fn get_loaded_model_id() -> &'static Arc<Mutex<Option<String>>> {
    LOADED_MODEL_ID.get_or_init(|| Arc::new(Mutex::new(None)))
}

/// Load whisper model into memory
pub async fn load_model(app: &AppHandle, model_id: &str) -> Result<()> {
    let model_info = get_whisper_models()
        .into_iter()
        .find(|m| m.id == model_id)
        .ok_or_else(|| anyhow!("Unknown whisper model: {}", model_id))?;

    let model_manager = ModelManager::new(app).await?;

    let model_path = model_manager
        .get_model_path(&model_info)
        .ok_or_else(|| anyhow!("Model not downloaded: {}. Please download it first.", model_id))?;

    let model_path_str = model_path.to_string_lossy().to_string();
    let model_id_owned = model_id.to_string();

    // Load model in a blocking task (whisper-rs is not async)
    tokio::task::spawn_blocking(move || {
        // Create context parameters
        let ctx_params = WhisperContextParameters::default();

        // Load the model
        let ctx = WhisperContext::new_with_params(&model_path_str, ctx_params)
            .map_err(|e| anyhow!("Failed to load whisper model: {}", e))?;

        // Store in global state
        {
            let mut lock = get_whisper_context().lock();
            *lock = Some(ctx);
        }
        {
            let mut lock = get_loaded_model_id().lock();
            *lock = Some(model_id_owned);
        }

        Ok::<(), anyhow::Error>(())
    })
    .await
    .map_err(|e| anyhow!("Task join error: {}", e))??;

    Ok(())
}

/// Unload whisper model from memory
pub fn unload_model() {
    {
        let mut lock = get_whisper_context().lock();
        *lock = None;
    }
    {
        let mut lock = get_loaded_model_id().lock();
        *lock = None;
    }
}

/// Check if a model is loaded
pub fn is_model_loaded() -> bool {
    let lock = get_whisper_context().lock();
    lock.is_some()
}

/// Get the currently loaded model ID
pub fn get_loaded_model() -> Option<String> {
    let lock = get_loaded_model_id().lock();
    lock.clone()
}

/// Transcribe audio file using whisper-rs native bindings
pub async fn transcribe(_app: &AppHandle, _session_id: &str, audio_path: &str) -> Result<String> {
    // First check if model is loaded
    if !is_model_loaded() {
        return Err(anyhow!(
            "Whisper model not loaded. Please select and load a model first."
        ));
    }

    let audio_path_owned = audio_path.to_string();

    // Decode audio to f32 samples at 16kHz mono (blocking operation)
    let audio_data = tokio::task::spawn_blocking(move || {
        decode_audio_to_whisper_format(&audio_path_owned)
    })
    .await
    .map_err(|e| anyhow!("Task join error: {}", e))??;

    if audio_data.is_empty() {
        return Err(anyhow!("No audio data decoded from file"));
    }

    // Run transcription (blocking operation)
    let transcript = tokio::task::spawn_blocking(move || {
        transcribe_sync(&audio_data)
    })
    .await
    .map_err(|e| anyhow!("Task join error: {}", e))??;

    Ok(transcript)
}

/// Synchronous transcription (called from blocking task)
fn transcribe_sync(audio_data: &[f32]) -> Result<String> {
    let ctx_lock = get_whisper_context().lock();
    let ctx = ctx_lock
        .as_ref()
        .ok_or_else(|| anyhow!("Whisper model not loaded"))?;

    // Create transcription parameters
    let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });

    // Configure for best quality
    params.set_language(Some("auto"));
    params.set_translate(false);
    params.set_no_timestamps(true);
    params.set_print_special(false);
    params.set_print_progress(false);
    params.set_print_realtime(false);
    params.set_print_timestamps(false);
    params.set_single_segment(false);

    // Create state and run transcription
    let mut state = ctx
        .create_state()
        .map_err(|e| anyhow!("Failed to create whisper state: {}", e))?;

    state
        .full(params, audio_data)
        .map_err(|e| anyhow!("Transcription failed: {}", e))?;

    // Extract segments
    let num_segments = state
        .full_n_segments()
        .map_err(|e| anyhow!("Failed to get segments: {}", e))?;

    let mut transcript = String::new();

    for i in 0..num_segments {
        let segment_text = state
            .full_get_segment_text(i)
            .map_err(|e| anyhow!("Failed to get segment {}: {}", i, e))?;

        // Add space between segments
        if !transcript.is_empty() && !segment_text.starts_with(' ') {
            transcript.push(' ');
        }
        transcript.push_str(&segment_text);
    }

    let result = transcript.trim().to_string();

    if result.is_empty() {
        return Err(anyhow!("Transcription produced no output"));
    }

    Ok(result)
}

