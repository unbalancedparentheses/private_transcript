//! Integration tests for model management and settings persistence
//!
//! Tests model downloading, loading, switching, and settings CRUD operations.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ============================================================================
// Types (matching the Rust implementations)
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
struct WhisperModel {
    id: String,
    name: String,
    size_mb: u64,
    description: String,
    languages: Vec<String>,
    is_downloaded: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
struct LlmModel {
    id: String,
    name: String,
    size_mb: u64,
    context_length: u32,
    quantization: String,
    is_downloaded: bool,
    is_loaded: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
struct EmbeddingModel {
    id: String,
    name: String,
    size_mb: u64,
    dimensions: u32,
    is_downloaded: bool,
    is_loaded: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
struct DownloadProgress {
    model_id: String,
    progress: f32,
    downloaded_bytes: u64,
    total_bytes: u64,
    status: DownloadStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
enum DownloadStatus {
    Pending,
    Downloading,
    Extracting,
    Complete,
    Error,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AppSettings {
    // Theme
    theme: String,

    // Transcription
    whisper_model: String,
    enable_live_transcription: bool,
    remove_filler_words: bool,

    // LLM
    llm_provider: String,
    llm_model: Option<String>,
    ollama_endpoint: Option<String>,
    openrouter_api_key: Option<String>,
    openrouter_model: Option<String>,

    // Export
    export_format: String,
    include_timestamps: bool,
    include_speakers: bool,

    // Storage
    auto_delete_audio: bool,
    max_storage_gb: Option<u32>,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            theme: "system".to_string(),
            whisper_model: "base".to_string(),
            enable_live_transcription: false,
            remove_filler_words: true,
            llm_provider: "bundled".to_string(),
            llm_model: Some("llama-3.2-1b".to_string()),
            ollama_endpoint: Some("http://localhost:11434".to_string()),
            openrouter_api_key: None,
            openrouter_model: None,
            export_format: "markdown".to_string(),
            include_timestamps: true,
            include_speakers: true,
            auto_delete_audio: false,
            max_storage_gb: None,
        }
    }
}

// ============================================================================
// Mock Model Manager
// ============================================================================

struct MockModelManager {
    whisper_models: HashMap<String, WhisperModel>,
    llm_models: HashMap<String, LlmModel>,
    embedding_models: HashMap<String, EmbeddingModel>,
    downloads_in_progress: HashMap<String, DownloadProgress>,
    loaded_llm: Option<String>,
    loaded_embedding: Option<String>,
}

impl MockModelManager {
    fn new() -> Self {
        let mut manager = Self {
            whisper_models: HashMap::new(),
            llm_models: HashMap::new(),
            embedding_models: HashMap::new(),
            downloads_in_progress: HashMap::new(),
            loaded_llm: None,
            loaded_embedding: None,
        };

        // Initialize with available models
        manager.init_whisper_models();
        manager.init_llm_models();
        manager.init_embedding_models();

        manager
    }

    fn init_whisper_models(&mut self) {
        let models = [
            ("tiny", "Tiny", 39, "Fastest, lowest accuracy"),
            ("base", "Base", 74, "Good balance of speed and accuracy"),
            ("small", "Small", 244, "Better accuracy, slower"),
            ("medium", "Medium", 769, "High accuracy"),
            ("large", "Large", 1550, "Best accuracy, slowest"),
            ("large-v3-turbo", "Large v3 Turbo", 809, "Fast with high accuracy"),
        ];

        for (id, name, size, desc) in models {
            self.whisper_models.insert(
                id.to_string(),
                WhisperModel {
                    id: id.to_string(),
                    name: name.to_string(),
                    size_mb: size,
                    description: desc.to_string(),
                    languages: vec!["en".to_string(), "es".to_string(), "fr".to_string()],
                    is_downloaded: false,
                },
            );
        }
    }

    fn init_llm_models(&mut self) {
        let models = [
            ("llama-3.2-1b", "Llama 3.2 1B", 750, 8192, "Q4_K_M"),
            ("llama-3.2-3b", "Llama 3.2 3B", 1800, 8192, "Q4_K_M"),
            ("phi-3-mini", "Phi-3 Mini", 2300, 4096, "Q4_K_M"),
        ];

        for (id, name, size, ctx, quant) in models {
            self.llm_models.insert(
                id.to_string(),
                LlmModel {
                    id: id.to_string(),
                    name: name.to_string(),
                    size_mb: size,
                    context_length: ctx,
                    quantization: quant.to_string(),
                    is_downloaded: false,
                    is_loaded: false,
                },
            );
        }
    }

    fn init_embedding_models(&mut self) {
        self.embedding_models.insert(
            "all-minilm-l6-v2".to_string(),
            EmbeddingModel {
                id: "all-minilm-l6-v2".to_string(),
                name: "all-MiniLM-L6-v2".to_string(),
                size_mb: 90,
                dimensions: 384,
                is_downloaded: false,
                is_loaded: false,
            },
        );
    }

    // Whisper model operations
    fn get_whisper_models(&self) -> Vec<&WhisperModel> {
        self.whisper_models.values().collect()
    }

    fn download_whisper_model(&mut self, model_id: &str) -> Result<(), &'static str> {
        let model = self.whisper_models.get_mut(model_id).ok_or("Model not found")?;

        if model.is_downloaded {
            return Err("Model already downloaded");
        }

        // Simulate download (in real code this would be async)
        model.is_downloaded = true;
        Ok(())
    }

    fn delete_whisper_model(&mut self, model_id: &str) -> Result<(), &'static str> {
        let model = self.whisper_models.get_mut(model_id).ok_or("Model not found")?;
        model.is_downloaded = false;
        Ok(())
    }

    fn is_whisper_model_ready(&self, model_id: &str) -> bool {
        self.whisper_models
            .get(model_id)
            .map(|m| m.is_downloaded)
            .unwrap_or(false)
    }

    // LLM model operations
    fn get_llm_models(&self) -> Vec<&LlmModel> {
        self.llm_models.values().collect()
    }

    fn download_llm_model(&mut self, model_id: &str) -> Result<(), &'static str> {
        let model = self.llm_models.get_mut(model_id).ok_or("Model not found")?;

        if model.is_downloaded {
            return Err("Model already downloaded");
        }

        model.is_downloaded = true;
        Ok(())
    }

    fn load_llm_model(&mut self, model_id: &str) -> Result<(), &'static str> {
        // Unload current model
        if let Some(current) = &self.loaded_llm {
            if let Some(model) = self.llm_models.get_mut(current) {
                model.is_loaded = false;
            }
        }

        let model = self.llm_models.get_mut(model_id).ok_or("Model not found")?;

        if !model.is_downloaded {
            return Err("Model not downloaded");
        }

        model.is_loaded = true;
        self.loaded_llm = Some(model_id.to_string());
        Ok(())
    }

    fn unload_llm_model(&mut self) {
        if let Some(current) = &self.loaded_llm {
            if let Some(model) = self.llm_models.get_mut(current) {
                model.is_loaded = false;
            }
        }
        self.loaded_llm = None;
    }

    fn get_loaded_llm(&self) -> Option<&str> {
        self.loaded_llm.as_deref()
    }

    // Embedding model operations
    fn load_embedding_model(&mut self, model_id: &str) -> Result<(), &'static str> {
        let model = self.embedding_models.get_mut(model_id).ok_or("Model not found")?;

        if !model.is_downloaded {
            // Auto-download if needed
            model.is_downloaded = true;
        }

        model.is_loaded = true;
        self.loaded_embedding = Some(model_id.to_string());
        Ok(())
    }

    fn unload_embedding_model(&mut self) {
        if let Some(current) = &self.loaded_embedding {
            if let Some(model) = self.embedding_models.get_mut(current) {
                model.is_loaded = false;
            }
        }
        self.loaded_embedding = None;
    }

    fn is_embedding_model_ready(&self) -> bool {
        self.loaded_embedding.is_some()
    }

    // Download progress
    fn start_download(&mut self, model_id: &str, total_bytes: u64) {
        self.downloads_in_progress.insert(
            model_id.to_string(),
            DownloadProgress {
                model_id: model_id.to_string(),
                progress: 0.0,
                downloaded_bytes: 0,
                total_bytes,
                status: DownloadStatus::Downloading,
            },
        );
    }

    fn update_download_progress(&mut self, model_id: &str, downloaded_bytes: u64) {
        if let Some(progress) = self.downloads_in_progress.get_mut(model_id) {
            progress.downloaded_bytes = downloaded_bytes;
            progress.progress = downloaded_bytes as f32 / progress.total_bytes as f32;
        }
    }

    fn complete_download(&mut self, model_id: &str) {
        if let Some(progress) = self.downloads_in_progress.get_mut(model_id) {
            progress.progress = 1.0;
            progress.downloaded_bytes = progress.total_bytes;
            progress.status = DownloadStatus::Complete;
        }
    }

    fn get_download_progress(&self, model_id: &str) -> Option<&DownloadProgress> {
        self.downloads_in_progress.get(model_id)
    }

    // Storage calculations
    fn get_total_downloaded_size_mb(&self) -> u64 {
        let whisper_size: u64 = self
            .whisper_models
            .values()
            .filter(|m| m.is_downloaded)
            .map(|m| m.size_mb)
            .sum();

        let llm_size: u64 = self
            .llm_models
            .values()
            .filter(|m| m.is_downloaded)
            .map(|m| m.size_mb)
            .sum();

        let embedding_size: u64 = self
            .embedding_models
            .values()
            .filter(|m| m.is_downloaded)
            .map(|m| m.size_mb)
            .sum();

        whisper_size + llm_size + embedding_size
    }
}

// ============================================================================
// Mock Settings Store
// ============================================================================

struct MockSettingsStore {
    settings: AppSettings,
    history: Vec<AppSettings>,
}

impl MockSettingsStore {
    fn new() -> Self {
        Self {
            settings: AppSettings::default(),
            history: Vec::new(),
        }
    }

    fn get(&self) -> &AppSettings {
        &self.settings
    }

    fn update(&mut self, updates: SettingsUpdate) -> &AppSettings {
        // Save current state to history
        self.history.push(self.settings.clone());

        if let Some(theme) = updates.theme {
            self.settings.theme = theme;
        }
        if let Some(whisper_model) = updates.whisper_model {
            self.settings.whisper_model = whisper_model;
        }
        if let Some(enable_live) = updates.enable_live_transcription {
            self.settings.enable_live_transcription = enable_live;
        }
        if let Some(remove_filler) = updates.remove_filler_words {
            self.settings.remove_filler_words = remove_filler;
        }
        if let Some(llm_provider) = updates.llm_provider {
            self.settings.llm_provider = llm_provider;
        }
        if let Some(llm_model) = updates.llm_model {
            self.settings.llm_model = llm_model;
        }
        if let Some(endpoint) = updates.ollama_endpoint {
            self.settings.ollama_endpoint = endpoint;
        }
        if let Some(format) = updates.export_format {
            self.settings.export_format = format;
        }
        if let Some(timestamps) = updates.include_timestamps {
            self.settings.include_timestamps = timestamps;
        }
        if let Some(speakers) = updates.include_speakers {
            self.settings.include_speakers = speakers;
        }

        &self.settings
    }

    fn reset(&mut self) {
        self.settings = AppSettings::default();
    }

    fn get_history(&self) -> &[AppSettings] {
        &self.history
    }
}

#[derive(Default)]
struct SettingsUpdate {
    theme: Option<String>,
    whisper_model: Option<String>,
    enable_live_transcription: Option<bool>,
    remove_filler_words: Option<bool>,
    llm_provider: Option<String>,
    llm_model: Option<Option<String>>,
    ollama_endpoint: Option<Option<String>>,
    export_format: Option<String>,
    include_timestamps: Option<bool>,
    include_speakers: Option<bool>,
}

// ============================================================================
// Whisper Model Tests
// ============================================================================

mod whisper_model_tests {
    use super::*;

    #[test]
    fn test_list_available_models() {
        let manager = MockModelManager::new();
        let models = manager.get_whisper_models();

        assert!(models.len() >= 5);
        assert!(models.iter().any(|m| m.id == "tiny"));
        assert!(models.iter().any(|m| m.id == "base"));
        assert!(models.iter().any(|m| m.id == "large"));
    }

    #[test]
    fn test_model_sizes_ordered() {
        let manager = MockModelManager::new();
        let mut models: Vec<_> = manager.get_whisper_models();
        models.sort_by_key(|m| m.size_mb);

        // Tiny should be smallest, large should be biggest
        assert_eq!(models[0].id, "tiny");
    }

    #[test]
    fn test_download_model() {
        let mut manager = MockModelManager::new();

        assert!(!manager.is_whisper_model_ready("base"));

        manager.download_whisper_model("base").unwrap();

        assert!(manager.is_whisper_model_ready("base"));
    }

    #[test]
    fn test_download_already_downloaded() {
        let mut manager = MockModelManager::new();

        manager.download_whisper_model("base").unwrap();
        assert!(manager.download_whisper_model("base").is_err());
    }

    #[test]
    fn test_download_nonexistent_model() {
        let mut manager = MockModelManager::new();
        assert!(manager.download_whisper_model("nonexistent").is_err());
    }

    #[test]
    fn test_delete_model() {
        let mut manager = MockModelManager::new();

        manager.download_whisper_model("base").unwrap();
        assert!(manager.is_whisper_model_ready("base"));

        manager.delete_whisper_model("base").unwrap();
        assert!(!manager.is_whisper_model_ready("base"));
    }

    #[test]
    fn test_model_languages() {
        let manager = MockModelManager::new();
        let models = manager.get_whisper_models();

        for model in models {
            assert!(!model.languages.is_empty());
            assert!(model.languages.contains(&"en".to_string()));
        }
    }
}

// ============================================================================
// LLM Model Tests
// ============================================================================

mod llm_model_tests {
    use super::*;

    #[test]
    fn test_list_llm_models() {
        let manager = MockModelManager::new();
        let models = manager.get_llm_models();

        assert!(!models.is_empty());
        assert!(models.iter().any(|m| m.id.contains("llama")));
    }

    #[test]
    fn test_download_and_load_llm() {
        let mut manager = MockModelManager::new();

        // Download first
        manager.download_llm_model("llama-3.2-1b").unwrap();

        // Then load
        manager.load_llm_model("llama-3.2-1b").unwrap();

        assert_eq!(manager.get_loaded_llm(), Some("llama-3.2-1b"));
    }

    #[test]
    fn test_load_without_download() {
        let mut manager = MockModelManager::new();
        assert!(manager.load_llm_model("llama-3.2-1b").is_err());
    }

    #[test]
    fn test_switch_llm_models() {
        let mut manager = MockModelManager::new();

        // Download both models
        manager.download_llm_model("llama-3.2-1b").unwrap();
        manager.download_llm_model("llama-3.2-3b").unwrap();

        // Load first model
        manager.load_llm_model("llama-3.2-1b").unwrap();
        assert_eq!(manager.get_loaded_llm(), Some("llama-3.2-1b"));

        // Switch to second model
        manager.load_llm_model("llama-3.2-3b").unwrap();
        assert_eq!(manager.get_loaded_llm(), Some("llama-3.2-3b"));

        // First model should be unloaded
        assert!(!manager.llm_models.get("llama-3.2-1b").unwrap().is_loaded);
    }

    #[test]
    fn test_unload_llm() {
        let mut manager = MockModelManager::new();

        manager.download_llm_model("llama-3.2-1b").unwrap();
        manager.load_llm_model("llama-3.2-1b").unwrap();

        manager.unload_llm_model();

        assert!(manager.get_loaded_llm().is_none());
    }

    #[test]
    fn test_llm_context_length() {
        let manager = MockModelManager::new();
        let models = manager.get_llm_models();

        for model in models {
            assert!(model.context_length >= 2048);
        }
    }

    #[test]
    fn test_llm_quantization() {
        let manager = MockModelManager::new();
        let models = manager.get_llm_models();

        for model in models {
            assert!(!model.quantization.is_empty());
        }
    }
}

// ============================================================================
// Embedding Model Tests
// ============================================================================

mod embedding_model_tests {
    use super::*;

    #[test]
    fn test_load_embedding_model() {
        let mut manager = MockModelManager::new();

        assert!(!manager.is_embedding_model_ready());

        manager.load_embedding_model("all-minilm-l6-v2").unwrap();

        assert!(manager.is_embedding_model_ready());
    }

    #[test]
    fn test_unload_embedding_model() {
        let mut manager = MockModelManager::new();

        manager.load_embedding_model("all-minilm-l6-v2").unwrap();
        manager.unload_embedding_model();

        assert!(!manager.is_embedding_model_ready());
    }

    #[test]
    fn test_embedding_dimensions() {
        let manager = MockModelManager::new();
        let model = manager.embedding_models.get("all-minilm-l6-v2").unwrap();

        assert_eq!(model.dimensions, 384);
    }
}

// ============================================================================
// Download Progress Tests
// ============================================================================

mod download_progress_tests {
    use super::*;

    #[test]
    fn test_download_progress_tracking() {
        let mut manager = MockModelManager::new();

        // Start download
        manager.start_download("base", 100_000_000);

        let progress = manager.get_download_progress("base").unwrap();
        assert_eq!(progress.status, DownloadStatus::Downloading);
        assert_eq!(progress.progress, 0.0);

        // Update progress
        manager.update_download_progress("base", 50_000_000);

        let progress = manager.get_download_progress("base").unwrap();
        assert!((progress.progress - 0.5).abs() < 0.01);

        // Complete download
        manager.complete_download("base");

        let progress = manager.get_download_progress("base").unwrap();
        assert_eq!(progress.status, DownloadStatus::Complete);
        assert_eq!(progress.progress, 1.0);
    }

    #[test]
    fn test_download_status_serialization() {
        let progress = DownloadProgress {
            model_id: "test".to_string(),
            progress: 0.5,
            downloaded_bytes: 50_000_000,
            total_bytes: 100_000_000,
            status: DownloadStatus::Downloading,
        };

        let json = serde_json::to_string(&progress).unwrap();
        let restored: DownloadProgress = serde_json::from_str(&json).unwrap();

        assert_eq!(progress, restored);
    }

    #[test]
    fn test_multiple_concurrent_downloads() {
        let mut manager = MockModelManager::new();

        manager.start_download("tiny", 50_000_000);
        manager.start_download("base", 100_000_000);

        manager.update_download_progress("tiny", 25_000_000);
        manager.update_download_progress("base", 10_000_000);

        let tiny_progress = manager.get_download_progress("tiny").unwrap();
        let base_progress = manager.get_download_progress("base").unwrap();

        assert!((tiny_progress.progress - 0.5).abs() < 0.01);
        assert!((base_progress.progress - 0.1).abs() < 0.01);
    }
}

// ============================================================================
// Storage Tests
// ============================================================================

mod storage_tests {
    use super::*;

    #[test]
    fn test_total_storage_calculation() {
        let mut manager = MockModelManager::new();

        assert_eq!(manager.get_total_downloaded_size_mb(), 0);

        manager.download_whisper_model("base").unwrap(); // 74 MB
        assert_eq!(manager.get_total_downloaded_size_mb(), 74);

        manager.download_llm_model("llama-3.2-1b").unwrap(); // 750 MB
        assert_eq!(manager.get_total_downloaded_size_mb(), 74 + 750);
    }

    #[test]
    fn test_storage_after_delete() {
        let mut manager = MockModelManager::new();

        manager.download_whisper_model("base").unwrap();
        manager.download_whisper_model("small").unwrap();

        let size_before = manager.get_total_downloaded_size_mb();

        manager.delete_whisper_model("base").unwrap();

        let size_after = manager.get_total_downloaded_size_mb();
        assert!(size_after < size_before);
    }
}

// ============================================================================
// Settings Tests
// ============================================================================

mod settings_tests {
    use super::*;

    #[test]
    fn test_default_settings() {
        let store = MockSettingsStore::new();
        let settings = store.get();

        assert_eq!(settings.theme, "system");
        assert_eq!(settings.whisper_model, "base");
        assert_eq!(settings.llm_provider, "bundled");
        assert!(settings.remove_filler_words);
    }

    #[test]
    fn test_update_theme() {
        let mut store = MockSettingsStore::new();

        store.update(SettingsUpdate {
            theme: Some("dark".to_string()),
            ..Default::default()
        });

        assert_eq!(store.get().theme, "dark");
    }

    #[test]
    fn test_update_whisper_model() {
        let mut store = MockSettingsStore::new();

        store.update(SettingsUpdate {
            whisper_model: Some("large".to_string()),
            ..Default::default()
        });

        assert_eq!(store.get().whisper_model, "large");
    }

    #[test]
    fn test_update_llm_provider() {
        let mut store = MockSettingsStore::new();

        store.update(SettingsUpdate {
            llm_provider: Some("local".to_string()),
            ollama_endpoint: Some(Some("http://localhost:11434".to_string())),
            ..Default::default()
        });

        assert_eq!(store.get().llm_provider, "local");
    }

    #[test]
    fn test_update_export_settings() {
        let mut store = MockSettingsStore::new();

        store.update(SettingsUpdate {
            export_format: Some("pdf".to_string()),
            include_timestamps: Some(false),
            include_speakers: Some(false),
            ..Default::default()
        });

        let settings = store.get();
        assert_eq!(settings.export_format, "pdf");
        assert!(!settings.include_timestamps);
        assert!(!settings.include_speakers);
    }

    #[test]
    fn test_partial_update() {
        let mut store = MockSettingsStore::new();

        // Only update theme
        store.update(SettingsUpdate {
            theme: Some("light".to_string()),
            ..Default::default()
        });

        let settings = store.get();
        assert_eq!(settings.theme, "light");
        // Other settings unchanged
        assert_eq!(settings.whisper_model, "base");
        assert!(settings.remove_filler_words);
    }

    #[test]
    fn test_reset_settings() {
        let mut store = MockSettingsStore::new();

        // Make changes
        store.update(SettingsUpdate {
            theme: Some("dark".to_string()),
            whisper_model: Some("large".to_string()),
            ..Default::default()
        });

        // Reset
        store.reset();

        // Should be back to defaults
        let settings = store.get();
        assert_eq!(settings.theme, "system");
        assert_eq!(settings.whisper_model, "base");
    }

    #[test]
    fn test_settings_history() {
        let mut store = MockSettingsStore::new();

        store.update(SettingsUpdate {
            theme: Some("dark".to_string()),
            ..Default::default()
        });

        store.update(SettingsUpdate {
            theme: Some("light".to_string()),
            ..Default::default()
        });

        let history = store.get_history();
        assert_eq!(history.len(), 2);
        assert_eq!(history[0].theme, "system");
        assert_eq!(history[1].theme, "dark");
    }

    #[test]
    fn test_valid_themes() {
        let mut store = MockSettingsStore::new();

        for theme in ["system", "light", "dark"] {
            store.update(SettingsUpdate {
                theme: Some(theme.to_string()),
                ..Default::default()
            });
            assert_eq!(store.get().theme, theme);
        }
    }

    #[test]
    fn test_valid_export_formats() {
        let mut store = MockSettingsStore::new();

        for format in ["txt", "markdown", "pdf", "docx", "srt", "vtt"] {
            store.update(SettingsUpdate {
                export_format: Some(format.to_string()),
                ..Default::default()
            });
            assert_eq!(store.get().export_format, format);
        }
    }

    #[test]
    fn test_valid_llm_providers() {
        let mut store = MockSettingsStore::new();

        for provider in ["bundled", "local", "cloud"] {
            store.update(SettingsUpdate {
                llm_provider: Some(provider.to_string()),
                ..Default::default()
            });
            assert_eq!(store.get().llm_provider, provider);
        }
    }

    #[test]
    fn test_settings_serialization() {
        let settings = AppSettings::default();
        let json = serde_json::to_string(&settings).unwrap();
        let restored: AppSettings = serde_json::from_str(&json).unwrap();

        assert_eq!(settings.theme, restored.theme);
        assert_eq!(settings.whisper_model, restored.whisper_model);
    }
}

// ============================================================================
// Integration Scenarios
// ============================================================================

mod integration_scenarios {
    use super::*;

    #[test]
    fn test_first_run_setup() {
        let mut manager = MockModelManager::new();
        let mut settings = MockSettingsStore::new();

        // 1. Check no models downloaded
        assert_eq!(manager.get_total_downloaded_size_mb(), 0);

        // 2. Download default whisper model
        manager.download_whisper_model("base").unwrap();

        // 3. Download default LLM
        manager.download_llm_model("llama-3.2-1b").unwrap();
        manager.load_llm_model("llama-3.2-1b").unwrap();

        // 4. Load embedding model
        manager.load_embedding_model("all-minilm-l6-v2").unwrap();

        // 5. Verify all ready
        assert!(manager.is_whisper_model_ready("base"));
        assert!(manager.get_loaded_llm().is_some());
        assert!(manager.is_embedding_model_ready());
    }

    #[test]
    fn test_model_upgrade_flow() {
        let mut manager = MockModelManager::new();

        // Start with tiny model
        manager.download_whisper_model("tiny").unwrap();

        // User decides to upgrade
        manager.download_whisper_model("base").unwrap();

        // Delete old model to save space
        manager.delete_whisper_model("tiny").unwrap();

        assert!(manager.is_whisper_model_ready("base"));
        assert!(!manager.is_whisper_model_ready("tiny"));
    }

    #[test]
    fn test_settings_for_different_use_cases() {
        let mut settings = MockSettingsStore::new();

        // Therapy use case
        settings.update(SettingsUpdate {
            whisper_model: Some("base".to_string()),
            llm_provider: Some("bundled".to_string()),
            export_format: Some("pdf".to_string()),
            include_timestamps: Some(false),
            include_speakers: Some(true),
            remove_filler_words: Some(true),
            ..Default::default()
        });

        let therapy_settings = settings.get().clone();
        assert_eq!(therapy_settings.export_format, "pdf");
        assert!(!therapy_settings.include_timestamps);
        assert!(therapy_settings.include_speakers);

        // Research use case
        settings.reset();
        settings.update(SettingsUpdate {
            whisper_model: Some("large".to_string()),
            export_format: Some("markdown".to_string()),
            include_timestamps: Some(true),
            include_speakers: Some(true),
            remove_filler_words: Some(false), // Keep for linguistic analysis
            ..Default::default()
        });

        let research_settings = settings.get();
        assert_eq!(research_settings.whisper_model, "large");
        assert!(!research_settings.remove_filler_words);
    }

    #[test]
    fn test_offline_mode() {
        let mut manager = MockModelManager::new();
        let mut settings = MockSettingsStore::new();

        // Pre-download everything needed for offline
        manager.download_whisper_model("base").unwrap();
        manager.download_llm_model("llama-3.2-1b").unwrap();
        manager.load_llm_model("llama-3.2-1b").unwrap();
        manager.load_embedding_model("all-minilm-l6-v2").unwrap();

        // Configure for local-only
        settings.update(SettingsUpdate {
            llm_provider: Some("bundled".to_string()),
            ..Default::default()
        });

        // All features should work offline
        assert!(manager.is_whisper_model_ready("base"));
        assert!(manager.get_loaded_llm().is_some());
        assert!(manager.is_embedding_model_ready());
        assert_eq!(settings.get().llm_provider, "bundled");
    }
}
