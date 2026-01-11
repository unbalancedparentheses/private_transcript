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
    println!("[Whisper] transcribe() called for: {}", audio_path);

    // First check if model is loaded
    if !is_model_loaded() {
        println!("[Whisper] ERROR: Model not loaded!");
        return Err(anyhow!(
            "Whisper model not loaded. Please select and load a model first."
        ));
    }
    println!("[Whisper] Model is loaded, proceeding with transcription");

    let audio_path_owned = audio_path.to_string();

    // Decode audio to f32 samples at 16kHz mono (blocking operation)
    println!("[Whisper] Decoding audio file to 16kHz mono f32...");
    let audio_data = tokio::task::spawn_blocking(move || {
        println!("[Whisper] Starting audio decode in blocking task");
        let result = decode_audio_to_whisper_format(&audio_path_owned);
        match &result {
            Ok(data) => println!("[Whisper] Audio decoded successfully: {} samples ({:.2} seconds)",
                data.len(), data.len() as f32 / 16000.0),
            Err(e) => println!("[Whisper] Audio decode failed: {}", e),
        }
        result
    })
    .await
    .map_err(|e| anyhow!("Task join error: {}", e))??;

    if audio_data.is_empty() {
        println!("[Whisper] ERROR: No audio data decoded from file");
        return Err(anyhow!("No audio data decoded from file"));
    }

    println!("[Whisper] Audio data ready: {} samples", audio_data.len());

    // Run transcription (blocking operation with panic catching)
    println!("[Whisper] Starting whisper inference...");
    let transcript = tokio::task::spawn_blocking(move || {
        println!("[Whisper] Running transcribe_sync with {} samples", audio_data.len());

        // Catch panics to prevent app crash
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            transcribe_sync(&audio_data)
        }));

        match result {
            Ok(Ok(text)) => {
                println!("[Whisper] Transcription complete: {} chars", text.len());
                Ok(text)
            }
            Ok(Err(e)) => {
                println!("[Whisper] Transcription error: {}", e);
                Err(e)
            }
            Err(panic_info) => {
                let panic_msg = if let Some(s) = panic_info.downcast_ref::<&str>() {
                    s.to_string()
                } else if let Some(s) = panic_info.downcast_ref::<String>() {
                    s.clone()
                } else {
                    "Unknown panic".to_string()
                };
                println!("[Whisper] PANIC during transcription: {}", panic_msg);
                Err(anyhow!("Whisper crashed: {}", panic_msg))
            }
        }
    })
    .await
    .map_err(|e| anyhow!("Task join error: {}", e))??;

    println!("[Whisper] Returning transcript: {} chars", transcript.len());
    Ok(transcript)
}

/// Synchronous transcription (called from blocking task)
fn transcribe_sync(audio_data: &[f32]) -> Result<String> {
    println!("[Whisper] transcribe_sync: acquiring context lock...");
    let ctx_lock = get_whisper_context().lock();
    let ctx = ctx_lock
        .as_ref()
        .ok_or_else(|| anyhow!("Whisper model not loaded"))?;
    println!("[Whisper] transcribe_sync: context acquired");

    // Create transcription parameters
    println!("[Whisper] transcribe_sync: creating params...");
    let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });

    // Configure for best quality
    params.set_language(Some("en")); // Use English explicitly to avoid auto-detect issues
    params.set_translate(false);
    params.set_no_timestamps(true);
    params.set_print_special(false);
    params.set_print_progress(true); // Enable progress printing for debugging
    params.set_print_realtime(false);
    params.set_print_timestamps(false);
    params.set_single_segment(false);
    params.set_n_threads(4); // Limit threads to avoid issues

    println!("[Whisper] transcribe_sync: creating state...");
    // Create state and run transcription
    let mut state = ctx
        .create_state()
        .map_err(|e| {
            println!("[Whisper] ERROR: Failed to create state: {}", e);
            anyhow!("Failed to create whisper state: {}", e)
        })?;
    println!("[Whisper] transcribe_sync: state created, running inference on {} samples...", audio_data.len());

    // Ensure audio data is valid
    let min_val = audio_data.iter().cloned().fold(f32::INFINITY, f32::min);
    let max_val = audio_data.iter().cloned().fold(f32::NEG_INFINITY, f32::max);
    println!("[Whisper] Audio data range: min={:.4}, max={:.4}", min_val, max_val);

    // Run the actual transcription
    println!("[Whisper] transcribe_sync: calling state.full()...");
    state
        .full(params, audio_data)
        .map_err(|e| {
            println!("[Whisper] ERROR: Transcription failed: {}", e);
            anyhow!("Transcription failed: {}", e)
        })?;
    println!("[Whisper] transcribe_sync: inference complete");

    // Extract segments
    println!("[Whisper] transcribe_sync: getting segments...");
    let num_segments = state
        .full_n_segments()
        .map_err(|e| anyhow!("Failed to get segments: {}", e))?;
    println!("[Whisper] transcribe_sync: found {} segments", num_segments);

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
    println!("[Whisper] transcribe_sync: result = '{}'", result);

    if result.is_empty() {
        println!("[Whisper] WARNING: Transcription produced no output");
        return Err(anyhow!("Transcription produced no output"));
    }

    Ok(result)
}

