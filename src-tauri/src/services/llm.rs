use crate::models::OllamaStatus;
use crate::services::database;
use anyhow::Result;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use tauri::AppHandle;

#[derive(Debug, Serialize)]
struct OllamaGenerateRequest {
    model: String,
    prompt: String,
    stream: bool,
}

#[derive(Debug, Deserialize)]
struct OllamaGenerateResponse {
    response: String,
    done: bool,
}

#[derive(Debug, Deserialize)]
struct OllamaTagsResponse {
    models: Vec<OllamaModel>,
}

#[derive(Debug, Deserialize)]
struct OllamaModel {
    name: String,
}

/// Generate a note from transcript using the configured LLM
pub async fn generate_note(app: &AppHandle, transcript: &str, template_id: &str) -> Result<String> {
    let settings = database::get_settings(app).await?;
    let template = database::get_template(app, template_id).await?;

    let prompt = template.prompt.replace("{transcript}", transcript);

    match settings.llm_provider.as_str() {
        "local" => generate_with_ollama(&settings.ollama_endpoint, &settings.llm_model, &prompt).await,
        "cloud" => {
            if let (Some(api_key), Some(model)) = (&settings.openrouter_api_key, &settings.openrouter_model) {
                generate_with_openrouter(api_key, model, &prompt).await
            } else {
                Err(anyhow::anyhow!("OpenRouter not configured"))
            }
        }
        _ => Err(anyhow::anyhow!("Unknown LLM provider")),
    }
}

/// Generate text using local Ollama
async fn generate_with_ollama(endpoint: &str, model: &str, prompt: &str) -> Result<String> {
    let client = Client::new();

    let request = OllamaGenerateRequest {
        model: model.to_string(),
        prompt: prompt.to_string(),
        stream: false,
    };

    let response = client
        .post(format!("{}/api/generate", endpoint))
        .json(&request)
        .send()
        .await?;

    if !response.status().is_success() {
        return Err(anyhow::anyhow!(
            "Ollama request failed: {}",
            response.status()
        ));
    }

    let result: OllamaGenerateResponse = response.json().await?;
    Ok(result.response)
}

/// Generate text using OpenRouter API
async fn generate_with_openrouter(api_key: &str, model: &str, prompt: &str) -> Result<String> {
    let client = Client::new();

    let body = serde_json::json!({
        "model": model,
        "messages": [
            {"role": "user", "content": prompt}
        ]
    });

    let response = client
        .post("https://openrouter.ai/api/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", api_key))
        .header("HTTP-Referer", "https://privatetranscript.app")
        .header("X-Title", "Private Transcript")
        .json(&body)
        .send()
        .await?;

    if !response.status().is_success() {
        return Err(anyhow::anyhow!(
            "OpenRouter request failed: {}",
            response.status()
        ));
    }

    let result: serde_json::Value = response.json().await?;
    let content = result["choices"][0]["message"]["content"]
        .as_str()
        .ok_or_else(|| anyhow::anyhow!("Invalid response format"))?;

    Ok(content.to_string())
}

/// Check if Ollama is running and get available models
pub async fn check_ollama_status() -> Result<OllamaStatus> {
    let client = Client::new();

    let response = client
        .get("http://localhost:11434/api/tags")
        .send()
        .await;

    match response {
        Ok(res) if res.status().is_success() => {
            let tags: OllamaTagsResponse = res.json().await?;
            let models: Vec<String> = tags.models.into_iter().map(|m| m.name).collect();
            Ok(OllamaStatus {
                connected: true,
                models,
                error: None,
            })
        }
        Ok(res) => Ok(OllamaStatus {
            connected: false,
            models: vec![],
            error: Some(format!("Ollama returned status: {}", res.status())),
        }),
        Err(e) => Ok(OllamaStatus {
            connected: false,
            models: vec![],
            error: Some(format!("Cannot connect to Ollama: {}", e)),
        }),
    }
}
