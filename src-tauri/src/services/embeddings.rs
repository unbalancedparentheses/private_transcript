use anyhow::{anyhow, Result};
use llama_cpp_2::context::params::LlamaContextParams;
use llama_cpp_2::llama_backend::LlamaBackend;
use llama_cpp_2::model::params::LlamaModelParams;
use llama_cpp_2::model::LlamaModel;
use once_cell::sync::OnceCell;
use parking_lot::Mutex;
use std::path::PathBuf;
use std::sync::Arc;

/// Embedding model info
#[allow(dead_code)]
pub const EMBEDDING_MODEL_ID: &str = "all-minilm-l6-v2";
pub const EMBEDDING_MODEL_FILENAME: &str = "all-MiniLM-L6-v2.Q4_K_M.gguf";
#[allow(dead_code)]
pub const EMBEDDING_MODEL_URL: &str = "https://huggingface.co/leliuga/all-MiniLM-L6-v2-GGUF/resolve/main/all-MiniLM-L6-v2.Q4_K_M.gguf";
pub const EMBEDDING_DIM: usize = 384;

/// Global embedding model state
static EMBEDDING_MODEL: OnceCell<Arc<Mutex<Option<EmbeddingModel>>>> = OnceCell::new();

/// Global app data directory (set during app init)
static APP_DATA_DIR: OnceCell<PathBuf> = OnceCell::new();

struct EmbeddingModel {
    _backend: LlamaBackend,
    model: LlamaModel,
}

fn get_embedding_state() -> &'static Arc<Mutex<Option<EmbeddingModel>>> {
    EMBEDDING_MODEL.get_or_init(|| Arc::new(Mutex::new(None)))
}

/// Set the app data directory for auto-loading
pub fn set_app_data_dir(path: PathBuf) {
    let _ = APP_DATA_DIR.set(path);
}

/// Get the stored app data directory
fn get_app_data_dir() -> Option<&'static PathBuf> {
    APP_DATA_DIR.get()
}

/// Get the path where embedding models are stored
pub fn get_embedding_model_dir(app_data_dir: &PathBuf) -> PathBuf {
    app_data_dir.join("models").join("embedding")
}

/// Check if the embedding model is downloaded
pub fn is_embedding_model_available(app_data_dir: &PathBuf) -> bool {
    let model_path = get_embedding_model_dir(app_data_dir).join(EMBEDDING_MODEL_FILENAME);
    model_path.exists()
}

/// Load the embedding model into memory
pub fn load_embedding_model(app_data_dir: &PathBuf) -> Result<()> {
    let mut state = get_embedding_state().lock();

    if state.is_some() {
        println!("[Embeddings] Model already loaded");
        return Ok(());
    }

    let model_path = get_embedding_model_dir(app_data_dir).join(EMBEDDING_MODEL_FILENAME);

    if !model_path.exists() {
        return Err(anyhow!(
            "Embedding model not found. Please download it first."
        ));
    }

    println!("[Embeddings] Loading model from: {:?}", model_path);

    // Initialize llama backend
    let backend = LlamaBackend::init().map_err(|e| anyhow!("Failed to init backend: {}", e))?;

    // Create model params - enable embeddings mode
    let model_params = LlamaModelParams::default();

    // Load the model
    let model = LlamaModel::load_from_file(&backend, &model_path, &model_params)
        .map_err(|e| anyhow!("Failed to load model: {}", e))?;

    *state = Some(EmbeddingModel {
        _backend: backend,
        model,
    });

    println!("[Embeddings] Model loaded successfully");
    Ok(())
}

/// Unload the embedding model from memory
pub fn unload_embedding_model() {
    let mut state = get_embedding_state().lock();
    *state = None;
    println!("[Embeddings] Model unloaded");
}

/// Ensure embedding model is loaded (auto-loads if needed)
fn ensure_model_loaded() -> Result<()> {
    let state = get_embedding_state().lock();
    if state.is_some() {
        return Ok(());
    }
    drop(state); // Release lock before loading

    // Try to auto-load if app data dir is set
    if let Some(app_data_dir) = get_app_data_dir() {
        // Check if model file exists before trying to load
        if !is_embedding_model_available(app_data_dir) {
            return Err(anyhow!(
                "Embedding model not downloaded. Please download it from Settings → Models."
            ));
        }
        println!("[Embeddings] Auto-loading embedding model...");
        load_embedding_model(app_data_dir)?;
        Ok(())
    } else {
        Err(anyhow!("App data directory not initialized"))
    }
}

/// Generate embedding for a single text
pub fn generate_embedding(text: &str) -> Result<Vec<f32>> {
    // Auto-load model if needed
    ensure_model_loaded()?;

    let state = get_embedding_state().lock();

    let model = state
        .as_ref()
        .ok_or_else(|| anyhow!("Embedding model not loaded"))?;

    // Create context for embedding
    let ctx_params = LlamaContextParams::default()
        .with_n_ctx(Some(std::num::NonZeroU32::new(512).unwrap()))
        .with_embeddings(true);

    let mut ctx = model
        .model
        .new_context(&model._backend, ctx_params)
        .map_err(|e| anyhow!("Failed to create context: {}", e))?;

    // Tokenize the input
    let tokens = model
        .model
        .str_to_token(text, llama_cpp_2::model::AddBos::Always)
        .map_err(|e| anyhow!("Failed to tokenize: {}", e))?;

    if tokens.is_empty() {
        // Return zero vector for empty input
        return Ok(vec![0.0; EMBEDDING_DIM]);
    }

    // Create batch with tokens
    let mut batch = llama_cpp_2::llama_batch::LlamaBatch::new(512, 1);

    for (i, token) in tokens.iter().enumerate() {
        let is_last = i == tokens.len() - 1;
        batch
            .add(*token, i as i32, &[0], is_last)
            .map_err(|e| anyhow!("Failed to add token to batch: {}", e))?;
    }

    // Decode the batch
    ctx.decode(&mut batch)
        .map_err(|e| anyhow!("Failed to decode: {}", e))?;

    // Get embeddings - use the last token's embedding
    let embeddings = ctx
        .embeddings_seq_ith(0)
        .map_err(|e| anyhow!("Failed to get embeddings: {}", e))?;

    // Normalize the embedding vector
    let embedding_vec: Vec<f32> = embeddings.to_vec();
    Ok(normalize_vector(&embedding_vec))
}

/// Generate embeddings for multiple texts (batch processing)
#[allow(dead_code)]
pub fn generate_embeddings_batch(texts: &[String]) -> Result<Vec<Vec<f32>>> {
    texts.iter().map(|t| generate_embedding(t)).collect()
}

/// Normalize a vector to unit length (L2 normalization)
fn normalize_vector(v: &[f32]) -> Vec<f32> {
    let norm: f32 = v.iter().map(|x| x * x).sum::<f32>().sqrt();
    if norm > 0.0 {
        v.iter().map(|x| x / norm).collect()
    } else {
        v.to_vec()
    }
}

/// Calculate cosine similarity between two vectors
pub fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
    if a.len() != b.len() {
        return 0.0;
    }

    let dot_product: f32 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();

    // If vectors are already normalized, dot product is cosine similarity
    // Otherwise, we need to normalize
    let norm_a: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
    let norm_b: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();

    if norm_a > 0.0 && norm_b > 0.0 {
        dot_product / (norm_a * norm_b)
    } else {
        0.0
    }
}

/// Find top-k most similar vectors
#[allow(dead_code)]
pub fn find_top_k_similar(
    query_embedding: &[f32],
    embeddings: &[(String, Vec<f32>)], // (id, embedding)
    k: usize,
) -> Vec<(String, f32)> {
    let mut similarities: Vec<(String, f32)> = embeddings
        .iter()
        .map(|(id, emb)| (id.clone(), cosine_similarity(query_embedding, emb)))
        .collect();

    // Sort by similarity (descending)
    similarities.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));

    // Return top k
    similarities.into_iter().take(k).collect()
}

/// Serialize embedding to bytes for storage
pub fn embedding_to_bytes(embedding: &[f32]) -> Vec<u8> {
    embedding
        .iter()
        .flat_map(|f| f.to_le_bytes())
        .collect()
}

/// Deserialize embedding from bytes
pub fn bytes_to_embedding(bytes: &[u8]) -> Vec<f32> {
    bytes
        .chunks_exact(4)
        .map(|chunk| {
            let arr: [u8; 4] = chunk.try_into().unwrap_or([0; 4]);
            f32::from_le_bytes(arr)
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cosine_similarity_identical() {
        let v = vec![1.0, 2.0, 3.0];
        let similarity = cosine_similarity(&v, &v);
        assert!((similarity - 1.0).abs() < 0.001);
    }

    #[test]
    fn test_cosine_similarity_orthogonal() {
        let a = vec![1.0, 0.0, 0.0];
        let b = vec![0.0, 1.0, 0.0];
        let similarity = cosine_similarity(&a, &b);
        assert!(similarity.abs() < 0.001);
    }

    #[test]
    fn test_cosine_similarity_opposite() {
        let a = vec![1.0, 2.0, 3.0];
        let b = vec![-1.0, -2.0, -3.0];
        let similarity = cosine_similarity(&a, &b);
        assert!((similarity + 1.0).abs() < 0.001);
    }

    #[test]
    fn test_normalize_vector() {
        let v = vec![3.0, 4.0];
        let normalized = normalize_vector(&v);
        let length: f32 = normalized.iter().map(|x| x * x).sum::<f32>().sqrt();
        assert!((length - 1.0).abs() < 0.001);
    }

    #[test]
    fn test_normalize_zero_vector() {
        let v = vec![0.0, 0.0, 0.0];
        let normalized = normalize_vector(&v);
        assert_eq!(normalized, v);
    }

    #[test]
    fn test_embedding_serialization() {
        let embedding = vec![0.1, 0.2, 0.3, 0.4];
        let bytes = embedding_to_bytes(&embedding);
        let recovered = bytes_to_embedding(&bytes);

        for (a, b) in embedding.iter().zip(recovered.iter()) {
            assert!((a - b).abs() < 0.0001);
        }
    }

    #[test]
    fn test_find_top_k_similar() {
        let query = vec![1.0, 0.0, 0.0];
        let embeddings = vec![
            ("a".to_string(), vec![1.0, 0.0, 0.0]),  // identical
            ("b".to_string(), vec![0.0, 1.0, 0.0]),  // orthogonal
            ("c".to_string(), vec![0.9, 0.1, 0.0]), // similar
        ];

        let results = find_top_k_similar(&query, &embeddings, 2);

        assert_eq!(results.len(), 2);
        assert_eq!(results[0].0, "a"); // Most similar
        assert_eq!(results[1].0, "c"); // Second most similar
    }

    #[test]
    fn test_embedding_model_path() {
        let app_data = PathBuf::from("/test/data");
        let model_dir = get_embedding_model_dir(&app_data);
        assert_eq!(model_dir, PathBuf::from("/test/data/models/embedding"));
    }
}
