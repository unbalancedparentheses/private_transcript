use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::{AppHandle, Emitter, Manager};
use tokio::io::AsyncWriteExt;

use crate::services::{local_llm, whisper};

/// Model types supported by the application
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ModelType {
    Whisper,
    Llm,
}

/// Information about a downloadable model
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelInfo {
    pub id: String,
    pub name: String,
    pub model_type: ModelType,
    pub repo_id: String,
    pub filename: String,
    pub size_bytes: u64,
    pub description: String,
}

/// Download progress event sent to frontend
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadProgress {
    pub model_id: String,
    pub downloaded_bytes: u64,
    pub total_bytes: u64,
    pub percent: f32,
    pub status: DownloadStatus,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error_message: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum DownloadStatus {
    Downloading,
    Verifying,
    Complete,
    Error,
}

/// Get available Whisper models
pub fn get_whisper_models() -> Vec<ModelInfo> {
    vec![
        ModelInfo {
            id: "whisper-tiny".into(),
            name: "Whisper Tiny".into(),
            model_type: ModelType::Whisper,
            repo_id: "ggerganov/whisper.cpp".into(),
            filename: "ggml-tiny.bin".into(),
            size_bytes: 77_691_713,
            description: "Fastest, basic accuracy (~75MB)".into(),
        },
        ModelInfo {
            id: "whisper-base".into(),
            name: "Whisper Base".into(),
            model_type: ModelType::Whisper,
            repo_id: "ggerganov/whisper.cpp".into(),
            filename: "ggml-base.bin".into(),
            size_bytes: 147_964_211,
            description: "Good balance of speed and accuracy (~150MB)".into(),
        },
        ModelInfo {
            id: "whisper-small".into(),
            name: "Whisper Small".into(),
            model_type: ModelType::Whisper,
            repo_id: "ggerganov/whisper.cpp".into(),
            filename: "ggml-small.bin".into(),
            size_bytes: 487_601_967,
            description: "Better accuracy, moderate speed (~500MB)".into(),
        },
        ModelInfo {
            id: "whisper-medium".into(),
            name: "Whisper Medium".into(),
            model_type: ModelType::Whisper,
            repo_id: "ggerganov/whisper.cpp".into(),
            filename: "ggml-medium.bin".into(),
            size_bytes: 1_533_774_781,
            description: "High accuracy, slower (~1.5GB)".into(),
        },
        ModelInfo {
            id: "whisper-large-v3-turbo".into(),
            name: "Whisper Large V3 Turbo".into(),
            model_type: ModelType::Whisper,
            repo_id: "ggerganov/whisper.cpp".into(),
            filename: "ggml-large-v3-turbo.bin".into(),
            size_bytes: 1_620_345_811,
            description: "Best quality, optimized for speed (~1.6GB)".into(),
        },
    ]
}

/// Get available LLM models
pub fn get_llm_models() -> Vec<ModelInfo> {
    vec![
        ModelInfo {
            id: "llama-3.2-1b".into(),
            name: "Llama 3.2 1B".into(),
            model_type: ModelType::Llm,
            repo_id: "bartowski/Llama-3.2-1B-Instruct-GGUF".into(),
            filename: "Llama-3.2-1B-Instruct-Q4_K_M.gguf".into(),
            size_bytes: 775_841_024,
            description: "Fast and lightweight (~750MB)".into(),
        },
        ModelInfo {
            id: "llama-3.2-3b".into(),
            name: "Llama 3.2 3B".into(),
            model_type: ModelType::Llm,
            repo_id: "bartowski/Llama-3.2-3B-Instruct-GGUF".into(),
            filename: "Llama-3.2-3B-Instruct-Q4_K_M.gguf".into(),
            size_bytes: 2_019_540_096,
            description: "Good balance, recommended (~2GB)".into(),
        },
        ModelInfo {
            id: "llama-3.1-8b".into(),
            name: "Llama 3.1 8B".into(),
            model_type: ModelType::Llm,
            repo_id: "bartowski/Meta-Llama-3.1-8B-Instruct-GGUF".into(),
            filename: "Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf".into(),
            size_bytes: 4_920_733_952,
            description: "High quality output (~5GB)".into(),
        },
    ]
}

/// Get all available models
pub fn get_all_models() -> Vec<ModelInfo> {
    let mut models = get_whisper_models();
    models.extend(get_llm_models());
    models
}

/// Model manager for downloading and managing models
pub struct ModelManager {
    models_dir: PathBuf,
}

impl ModelManager {
    pub async fn new(app: &AppHandle) -> Result<Self> {
        let app_data_dir = app
            .path()
            .app_data_dir()
            .map_err(|e| anyhow!("Failed to get app data dir: {}", e))?;

        let models_dir = app_data_dir.join("models");
        tokio::fs::create_dir_all(&models_dir).await?;
        tokio::fs::create_dir_all(models_dir.join("whisper")).await?;
        tokio::fs::create_dir_all(models_dir.join("llm")).await?;

        Ok(Self { models_dir })
    }

    /// Get path to a model file if it exists
    pub fn get_model_path(&self, model_info: &ModelInfo) -> Option<PathBuf> {
        let subdir = match model_info.model_type {
            ModelType::Whisper => "whisper",
            ModelType::Llm => "llm",
        };
        let path = self.models_dir.join(subdir).join(&model_info.filename);
        if path.exists() {
            Some(path)
        } else {
            None
        }
    }

    /// Get model info by ID
    pub fn get_model_info(model_id: &str) -> Option<ModelInfo> {
        get_all_models().into_iter().find(|m| m.id == model_id)
    }

    /// Download a model with progress updates
    pub async fn download_model(
        &self,
        app: &AppHandle,
        model_info: &ModelInfo,
    ) -> Result<PathBuf> {
        use futures::StreamExt;

        println!("[ModelManager] Starting download for: {}", model_info.id);

        let subdir = match model_info.model_type {
            ModelType::Whisper => "whisper",
            ModelType::Llm => "llm",
        };
        let target_dir = self.models_dir.join(subdir);
        tokio::fs::create_dir_all(&target_dir).await?;

        let target_path = target_dir.join(&model_info.filename);

        // Check if already downloaded - try to load it to verify it works
        if target_path.exists() {
            println!("[ModelManager] Model {} exists, trying to load to verify...", model_info.id);

            let load_result = match model_info.model_type {
                ModelType::Whisper => whisper::load_model(app, &model_info.id).await,
                ModelType::Llm => local_llm::load_model(app, &model_info.id).await,
            };

            match load_result {
                Ok(_) => {
                    println!("[ModelManager] Model {} loaded successfully, no download needed", model_info.id);
                    let _ = app.emit(
                        "model-download-progress",
                        DownloadProgress {
                            model_id: model_info.id.clone(),
                            downloaded_bytes: model_info.size_bytes,
                            total_bytes: model_info.size_bytes,
                            percent: 100.0,
                            status: DownloadStatus::Complete,
                            error_message: None,
                        },
                    );
                    return Ok(target_path);
                }
                Err(e) => {
                    // Model failed to load - delete and re-download
                    println!("[ModelManager] Model {} failed to load ({}), deleting and re-downloading", model_info.id, e);
                    let _ = tokio::fs::remove_file(&target_path).await;
                }
            }
        }

        // Also delete any partial download file
        let partial_path = target_path.with_extension("download");
        if partial_path.exists() {
            let _ = tokio::fs::remove_file(&partial_path).await;
        }

        // Emit starting event
        println!("[ModelManager] Emitting download start event for: {}", model_info.id);
        let _ = app.emit(
            "model-download-progress",
            DownloadProgress {
                model_id: model_info.id.clone(),
                downloaded_bytes: 0,
                total_bytes: model_info.size_bytes,
                percent: 0.0,
                status: DownloadStatus::Downloading,
                error_message: None,
            },
        );

        // Build direct download URL for HuggingFace
        let url = format!(
            "https://huggingface.co/{}/resolve/main/{}",
            model_info.repo_id, model_info.filename
        );

        // Download with progress using reqwest streaming
        let client = reqwest::Client::new();
        let response = client
            .get(&url)
            .send()
            .await
            .map_err(|e| anyhow!("Failed to start download: {}", e))?;

        if !response.status().is_success() {
            return Err(anyhow!(
                "Download failed with status: {}",
                response.status()
            ));
        }

        let total_size = response
            .content_length()
            .unwrap_or(model_info.size_bytes);

        // Create temp file for download
        let temp_path = target_path.with_extension("download");
        let mut file = tokio::fs::File::create(&temp_path).await?;
        let mut downloaded: u64 = 0;

        // Stream the download with throttled progress updates
        let mut stream = response.bytes_stream();
        let mut last_emit = std::time::Instant::now();
        let emit_interval = std::time::Duration::from_millis(100); // Update every 100ms

        while let Some(chunk_result) = stream.next().await {
            let chunk = chunk_result.map_err(|e| anyhow!("Download error: {}", e))?;

            tokio::io::AsyncWriteExt::write_all(&mut file, &chunk).await?;
            downloaded += chunk.len() as u64;

            // Throttle progress updates to avoid overwhelming the frontend
            if last_emit.elapsed() >= emit_interval || downloaded >= total_size {
                let percent = (downloaded as f32 / total_size as f32) * 100.0;

                println!(
                    "[ModelManager] Progress: {} - {:.1}% ({}/{})",
                    model_info.id, percent, downloaded, total_size
                );

                let _ = app.emit(
                    "model-download-progress",
                    DownloadProgress {
                        model_id: model_info.id.clone(),
                        downloaded_bytes: downloaded,
                        total_bytes: total_size,
                        percent,
                        status: DownloadStatus::Downloading,
                        error_message: None,
                    },
                );

                last_emit = std::time::Instant::now();
            }
        }

        file.flush().await?;
        drop(file);

        // Rename temp file to final path
        println!("[ModelManager] Download complete, renaming temp file for: {}", model_info.id);
        tokio::fs::rename(&temp_path, &target_path).await?;

        // Emit verifying status
        println!("[ModelManager] Emitting verifying status for: {}", model_info.id);
        let _ = app.emit(
            "model-download-progress",
            DownloadProgress {
                model_id: model_info.id.clone(),
                downloaded_bytes: total_size,
                total_bytes: total_size,
                percent: 100.0,
                status: DownloadStatus::Verifying,
                error_message: None,
            },
        );

        // Verify downloaded file size
        let metadata = tokio::fs::metadata(&target_path).await?;
        let actual_size = metadata.len();
        let min_size = (model_info.size_bytes as f64 * 0.95) as u64;

        println!(
            "[ModelManager] Verifying size: {} bytes (expected >= {} bytes)",
            actual_size, min_size
        );

        if actual_size < min_size {
            // File is corrupted or incomplete
            let _ = tokio::fs::remove_file(&target_path).await;
            let error_msg = format!(
                "Download verification failed: expected at least {} bytes, got {} bytes",
                min_size, actual_size
            );
            println!("[ModelManager] Verification failed: {}", error_msg);
            let _ = app.emit(
                "model-download-progress",
                DownloadProgress {
                    model_id: model_info.id.clone(),
                    downloaded_bytes: actual_size,
                    total_bytes: model_info.size_bytes,
                    percent: 0.0,
                    status: DownloadStatus::Error,
                    error_message: Some(error_msg.clone()),
                },
            );
            return Err(anyhow!(error_msg));
        }

        // Load the model to verify it works and keep it loaded
        println!("[ModelManager] Loading freshly downloaded model: {}", model_info.id);
        let load_result = match model_info.model_type {
            ModelType::Whisper => whisper::load_model(app, &model_info.id).await,
            ModelType::Llm => local_llm::load_model(app, &model_info.id).await,
        };

        if let Err(e) = load_result {
            let _ = tokio::fs::remove_file(&target_path).await;
            let error_msg = format!("Downloaded model failed to load: {}", e);
            println!("[ModelManager] Load verification failed: {}", error_msg);
            let _ = app.emit(
                "model-download-progress",
                DownloadProgress {
                    model_id: model_info.id.clone(),
                    downloaded_bytes: actual_size,
                    total_bytes: model_info.size_bytes,
                    percent: 0.0,
                    status: DownloadStatus::Error,
                    error_message: Some(error_msg.clone()),
                },
            );
            return Err(anyhow!(error_msg));
        }

        println!("[ModelManager] Model {} loaded and verified successfully", model_info.id);

        // Emit completion
        println!("[ModelManager] Emitting complete status for: {}", model_info.id);
        let _ = app.emit(
            "model-download-progress",
            DownloadProgress {
                model_id: model_info.id.clone(),
                downloaded_bytes: actual_size,
                total_bytes: model_info.size_bytes,
                percent: 100.0,
                status: DownloadStatus::Complete,
                error_message: None,
            },
        );

        Ok(target_path)
    }

    /// Check which models are downloaded
    pub fn get_downloaded_models(&self) -> Vec<String> {
        let mut downloaded = Vec::new();

        for model in get_all_models() {
            if self.get_model_path(&model).is_some() {
                downloaded.push(model.id);
            }
        }

        downloaded
    }

    /// Delete a downloaded model
    pub async fn delete_model(&self, model_info: &ModelInfo) -> Result<()> {
        if let Some(path) = self.get_model_path(model_info) {
            tokio::fs::remove_file(path).await?;
        }
        Ok(())
    }

    /// Get total size of downloaded models
    pub async fn get_total_size(&self) -> Result<u64> {
        let mut total: u64 = 0;

        for model in get_all_models() {
            if let Some(path) = self.get_model_path(&model) {
                if let Ok(metadata) = tokio::fs::metadata(&path).await {
                    total += metadata.len();
                }
            }
        }

        Ok(total)
    }
}
