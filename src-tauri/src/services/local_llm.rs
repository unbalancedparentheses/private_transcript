use crate::models::LlmStreamEvent;
use anyhow::{anyhow, Result};
use llama_cpp_2::context::params::LlamaContextParams;
use llama_cpp_2::llama_backend::LlamaBackend;
use llama_cpp_2::llama_batch::LlamaBatch;
use llama_cpp_2::model::params::LlamaModelParams;
use llama_cpp_2::model::{AddBos, LlamaModel, Special};
use llama_cpp_2::sampling::LlamaSampler;
use once_cell::sync::OnceCell;
use parking_lot::Mutex;
use std::num::NonZeroU32;
use std::sync::mpsc;
use std::sync::Arc;
use tauri::{AppHandle, Emitter};

use super::model_manager::{get_llm_models, ModelManager};

/// Global LLM state (model + backend)
struct LlmState {
    #[allow(dead_code)]
    backend: LlamaBackend,
    model: LlamaModel,
}

// LlamaBackend is not Send, so we need to handle this carefully
// We use a static that's initialized once and accessed from blocking tasks
static LLM_STATE: OnceCell<Arc<Mutex<Option<LlmState>>>> = OnceCell::new();
static LOADED_MODEL_ID: OnceCell<Arc<Mutex<Option<String>>>> = OnceCell::new();

fn get_llm_state() -> &'static Arc<Mutex<Option<LlmState>>> {
    LLM_STATE.get_or_init(|| Arc::new(Mutex::new(None)))
}

fn get_loaded_model_id() -> &'static Arc<Mutex<Option<String>>> {
    LOADED_MODEL_ID.get_or_init(|| Arc::new(Mutex::new(None)))
}

/// Load LLM model into memory
pub async fn load_model(app: &AppHandle, model_id: &str) -> Result<()> {
    let model_info = get_llm_models()
        .into_iter()
        .find(|m| m.id == model_id)
        .ok_or_else(|| anyhow!("Unknown LLM model: {}", model_id))?;

    let model_manager = ModelManager::new(app).await?;

    let model_path = model_manager
        .get_model_path(&model_info)
        .ok_or_else(|| anyhow!("Model not downloaded: {}. Please download it first.", model_id))?;

    let model_path_str = model_path.to_string_lossy().to_string();
    let model_id_owned = model_id.to_string();

    // Load model in a blocking task
    tokio::task::spawn_blocking(move || {
        // Initialize backend
        let backend = LlamaBackend::init()
            .map_err(|e| anyhow!("Failed to init llama backend: {}", e))?;

        // Load model with GPU acceleration (automatic on macOS with Metal)
        let model_params = LlamaModelParams::default().with_n_gpu_layers(1000); // Offload all layers to GPU

        let model = LlamaModel::load_from_file(&backend, &model_path_str, &model_params)
            .map_err(|e| anyhow!("Failed to load LLM model: {}", e))?;

        // Store in global state
        {
            let mut lock = get_llm_state().lock();
            *lock = Some(LlmState { backend, model });
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

/// Unload LLM model from memory
pub fn unload_model() {
    {
        let mut lock = get_llm_state().lock();
        *lock = None;
    }
    {
        let mut lock = get_loaded_model_id().lock();
        *lock = None;
    }
}

/// Check if model is loaded
pub fn is_model_loaded() -> bool {
    let lock = get_llm_state().lock();
    lock.is_some()
}

/// Get the currently loaded model ID
pub fn get_loaded_model() -> Option<String> {
    let lock = get_loaded_model_id().lock();
    lock.clone()
}

/// Generate text using local LLM
pub async fn generate(prompt: &str, max_tokens: usize) -> Result<String> {
    if !is_model_loaded() {
        return Err(anyhow!(
            "LLM model not loaded. Please select and load a model first."
        ));
    }

    let prompt_owned = prompt.to_string();

    tokio::task::spawn_blocking(move || generate_sync(&prompt_owned, max_tokens, None))
        .await
        .map_err(|e| anyhow!("Task join error: {}", e))?
}

/// Generate text using local LLM with streaming (emits tokens as events)
pub async fn generate_streaming(
    app: &AppHandle,
    session_id: &str,
    prompt: &str,
    max_tokens: usize,
) -> Result<String> {
    if !is_model_loaded() {
        return Err(anyhow!(
            "LLM model not loaded. Please select and load a model first."
        ));
    }

    let prompt_owned = prompt.to_string();
    let session_id_owned = session_id.to_string();
    let app_clone = app.clone();

    // Use a channel to receive tokens from the blocking task
    let (tx, rx) = mpsc::channel::<String>();

    // Spawn the blocking generation task
    let generate_handle = tokio::task::spawn_blocking(move || {
        generate_sync(&prompt_owned, max_tokens, Some(tx))
    });

    // Spawn a task to forward tokens as events and wait for it
    let session_id_for_events = session_id_owned.clone();
    let forward_handle = tokio::task::spawn_blocking(move || {
        while let Ok(token) = rx.recv() {
            let _ = app_clone.emit(
                "llm-stream",
                LlmStreamEvent {
                    session_id: session_id_for_events.clone(),
                    token,
                    done: false,
                    error: None,
                },
            );
        }
    });

    // Wait for generation to complete
    let result = generate_handle
        .await
        .map_err(|e| anyhow!("Task join error: {}", e))??;

    // Wait for all tokens to be forwarded
    let _ = forward_handle.await;

    // Emit done event
    let _ = app.emit(
        "llm-stream",
        LlmStreamEvent {
            session_id: session_id_owned,
            token: String::new(),
            done: true,
            error: None,
        },
    );

    Ok(result)
}

/// Synchronous generation (called from blocking task)
/// If `token_sender` is provided, tokens are sent through the channel for streaming.
fn generate_sync(
    prompt: &str,
    max_tokens: usize,
    token_sender: Option<mpsc::Sender<String>>,
) -> Result<String> {
    let state_lock = get_llm_state().lock();
    let state = state_lock
        .as_ref()
        .ok_or_else(|| anyhow!("LLM model not loaded"))?;

    // Create context with reasonable defaults
    let ctx_params = LlamaContextParams::default()
        .with_n_ctx(Some(NonZeroU32::new(4096).unwrap()))
        .with_n_batch(512);

    let mut ctx = state
        .model
        .new_context(&state.backend, ctx_params)
        .map_err(|e| anyhow!("Failed to create context: {}", e))?;

    // Tokenize prompt
    let tokens = state
        .model
        .str_to_token(prompt, AddBos::Always)
        .map_err(|e| anyhow!("Failed to tokenize: {}", e))?;

    if tokens.is_empty() {
        return Err(anyhow!("Empty prompt after tokenization"));
    }

    // Create batch and add tokens
    let mut batch = LlamaBatch::new(512, 1);
    for (i, token) in tokens.iter().enumerate() {
        let is_last = i == tokens.len() - 1;
        batch
            .add(*token, i as i32, &[0], is_last)
            .map_err(|e| anyhow!("Failed to add token to batch: {}", e))?;
    }

    // Process prompt
    ctx.decode(&mut batch)
        .map_err(|e| anyhow!("Failed to decode prompt: {}", e))?;

    // Generate tokens
    let mut sampler = LlamaSampler::chain_simple([
        LlamaSampler::temp(0.7),
        LlamaSampler::top_p(0.9, 1),
        LlamaSampler::dist(42),
    ]);

    let mut output = String::new();
    let mut n_cur = batch.n_tokens();
    // Track the index for sampling - after initial decode it's the last token,
    // after subsequent single-token decodes it's always 0
    let mut logits_idx = (batch.n_tokens() - 1) as i32;

    for _ in 0..max_tokens {
        let new_token = sampler.sample(&ctx, logits_idx);
        sampler.accept(new_token);

        // Check for end of generation
        if state.model.is_eog_token(new_token) {
            break;
        }

        // Decode token to string
        let token_str = state
            .model
            .token_to_str(new_token, Special::Tokenize)
            .map_err(|e| anyhow!("Failed to decode token: {}", e))?;
        output.push_str(&token_str);

        // Send token through channel if streaming
        if let Some(ref sender) = token_sender {
            let _ = sender.send(token_str);
        }

        // Add token to batch for next iteration
        batch.clear();
        batch
            .add(new_token, n_cur, &[0], true)
            .map_err(|e| anyhow!("Failed to add generated token: {}", e))?;

        ctx.decode(&mut batch)
            .map_err(|e| anyhow!("Failed to decode: {}", e))?;

        n_cur += 1;
        // After clearing and adding one token, logits are at index 0
        logits_idx = 0;
    }

    Ok(output.trim().to_string())
}

