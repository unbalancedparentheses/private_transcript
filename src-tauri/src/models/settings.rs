use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub theme: String,
    pub whisper_model: String,
    pub llm_provider: String,  // "bundled" | "local" | "cloud"
    pub llm_model: String,
    pub ollama_endpoint: String,
    pub openrouter_api_key: Option<String>,
    pub openrouter_model: Option<String>,
    pub default_workspace_id: Option<String>,
    pub audio_input_device: Option<String>,
    pub export_format: String,
    pub auto_save: bool,
    // Bundled model settings
    pub bundled_whisper_model: Option<String>,
    pub bundled_llm_model: Option<String>,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            theme: "system".to_string(),
            whisper_model: "whisper-base".to_string(),
            llm_provider: "bundled".to_string(),  // Default to bundled for offline use
            llm_model: "llama-3.2-3b".to_string(),
            ollama_endpoint: "http://localhost:11434".to_string(),
            openrouter_api_key: None,
            openrouter_model: Some("anthropic/claude-3.5-sonnet".to_string()),
            default_workspace_id: None,
            audio_input_device: None,
            export_format: "markdown".to_string(),
            auto_save: true,
            bundled_whisper_model: Some("whisper-base".to_string()),
            bundled_llm_model: Some("llama-3.2-3b".to_string()),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSettingsRequest {
    pub theme: Option<String>,
    pub whisper_model: Option<String>,
    pub llm_provider: Option<String>,
    pub llm_model: Option<String>,
    pub ollama_endpoint: Option<String>,
    pub openrouter_api_key: Option<String>,
    pub openrouter_model: Option<String>,
    pub default_workspace_id: Option<String>,
    pub audio_input_device: Option<String>,
    pub export_format: Option<String>,
    pub auto_save: Option<bool>,
    pub bundled_whisper_model: Option<String>,
    pub bundled_llm_model: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OllamaStatus {
    pub connected: bool,
    pub models: Vec<String>,
    pub error: Option<String>,
}
