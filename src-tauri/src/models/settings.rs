use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub theme: String,
    pub whisper_model: String,
    pub llm_provider: String,
    pub llm_model: String,
    pub ollama_endpoint: String,
    pub openrouter_api_key: Option<String>,
    pub openrouter_model: Option<String>,
    pub default_workspace_id: Option<String>,
    pub audio_input_device: Option<String>,
    pub export_format: String,
    pub auto_save: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            theme: "system".to_string(),
            whisper_model: "large-v3-turbo".to_string(),
            llm_provider: "local".to_string(),
            llm_model: "llama3.1:8b".to_string(),
            ollama_endpoint: "http://localhost:11434".to_string(),
            openrouter_api_key: None,
            openrouter_model: Some("anthropic/claude-3.5-sonnet".to_string()),
            default_workspace_id: None,
            audio_input_device: None,
            export_format: "markdown".to_string(),
            auto_save: true,
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
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OllamaStatus {
    pub connected: bool,
    pub models: Vec<String>,
    pub error: Option<String>,
}
