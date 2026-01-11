use crate::models::{LlmStreamEvent, OllamaStatus};
use crate::services::database;
use crate::services::local_llm;
use anyhow::Result;
use futures::StreamExt;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};

#[derive(Debug, Serialize)]
struct OllamaGenerateRequest {
    model: String,
    prompt: String,
    stream: bool,
}

#[derive(Debug, Deserialize)]
struct OllamaGenerateResponse {
    response: String,
    #[allow(dead_code)]
    done: bool,
}

#[derive(Debug, Deserialize)]
struct OllamaStreamResponse {
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
        "bundled" => {
            // Use bundled local LLM (llama-cpp-2)
            local_llm::generate(&prompt, 2048).await
        }
        "local" => {
            // Use external Ollama server
            // Auto-select model if not set
            let model = if settings.llm_model.is_empty() {
                let status = check_ollama_status().await?;
                if !status.connected {
                    return Err(anyhow::anyhow!("Ollama is not running"));
                }
                if status.models.is_empty() {
                    return Err(anyhow::anyhow!("No models available in Ollama"));
                }
                status.models[0].clone()
            } else {
                settings.llm_model.clone()
            };
            generate_with_ollama(&settings.ollama_endpoint, &model, &prompt).await
        }
        "cloud" => {
            // Use OpenRouter cloud API
            if let (Some(api_key), Some(model)) =
                (&settings.openrouter_api_key, &settings.openrouter_model)
            {
                generate_with_openrouter(api_key, model, &prompt).await
            } else {
                Err(anyhow::anyhow!("OpenRouter not configured"))
            }
        }
        _ => Err(anyhow::anyhow!("Unknown LLM provider: {}", settings.llm_provider)),
    }
}

/// Generate a note with streaming (emits events as tokens are generated)
pub async fn generate_note_streaming(
    app: &AppHandle,
    session_id: &str,
    transcript: &str,
    template_id: &str,
) -> Result<String> {
    let settings = database::get_settings(app).await?;
    let template = database::get_template(app, template_id).await?;

    let prompt = template.prompt.replace("{transcript}", transcript);

    let result = match settings.llm_provider.as_str() {
        "bundled" => {
            // Use bundled local LLM with streaming
            local_llm::generate_streaming(app, session_id, &prompt, 2048).await
        }
        "local" => {
            // Use external Ollama server with streaming
            // Auto-select model if not set or not available
            let model = if settings.llm_model.is_empty() {
                // No model configured, try to auto-select
                let status = check_ollama_status().await?;
                if !status.connected {
                    return Err(anyhow::anyhow!(
                        "Ollama is not running. Please start Ollama first."
                    ));
                }
                if status.models.is_empty() {
                    return Err(anyhow::anyhow!(
                        "No models available in Ollama. Please pull a model first (e.g., 'ollama pull llama3.2')"
                    ));
                }
                println!("[LLM] Auto-selected model: {}", status.models[0]);
                status.models[0].clone()
            } else {
                settings.llm_model.clone()
            };

            generate_with_ollama_streaming(
                app,
                session_id,
                &settings.ollama_endpoint,
                &model,
                &prompt,
            )
            .await
        }
        "cloud" => {
            // Use OpenRouter cloud API with streaming
            if let (Some(api_key), Some(model)) =
                (&settings.openrouter_api_key, &settings.openrouter_model)
            {
                generate_with_openrouter_streaming(app, session_id, api_key, model, &prompt).await
            } else {
                Err(anyhow::anyhow!("OpenRouter not configured"))
            }
        }
        _ => Err(anyhow::anyhow!(
            "Unknown LLM provider: {}",
            settings.llm_provider
        )),
    };

    // Emit error event if generation failed
    if let Err(ref e) = result {
        let _ = app.emit(
            "llm-stream",
            LlmStreamEvent {
                session_id: session_id.to_string(),
                token: String::new(),
                done: true,
                error: Some(e.to_string()),
            },
        );
    }

    result
}

/// Generate text using current LLM provider with streaming (for RAG chat)
pub async fn generate_with_current_provider(
    app: &AppHandle,
    session_id: &str,
    prompt: &str,
    max_tokens: u32,
) -> Result<String> {
    let settings = database::get_settings(app).await?;

    let result = match settings.llm_provider.as_str() {
        "bundled" => local_llm::generate_streaming(app, session_id, prompt, max_tokens as usize).await,
        "local" => {
            let model = if settings.llm_model.is_empty() {
                let status = check_ollama_status().await?;
                if !status.connected {
                    return Err(anyhow::anyhow!("Ollama is not running"));
                }
                if status.models.is_empty() {
                    return Err(anyhow::anyhow!("No models available in Ollama"));
                }
                status.models[0].clone()
            } else {
                settings.llm_model.clone()
            };
            generate_with_ollama_streaming(app, session_id, &settings.ollama_endpoint, &model, prompt)
                .await
        }
        "cloud" => {
            if let (Some(api_key), Some(model)) =
                (&settings.openrouter_api_key, &settings.openrouter_model)
            {
                generate_with_openrouter_streaming(app, session_id, api_key, model, prompt).await
            } else {
                Err(anyhow::anyhow!("OpenRouter not configured"))
            }
        }
        _ => Err(anyhow::anyhow!("No LLM provider configured")),
    };

    // Emit error event if generation failed
    if let Err(ref e) = result {
        let _ = app.emit(
            "llm-stream",
            LlmStreamEvent {
                session_id: session_id.to_string(),
                token: String::new(),
                done: true,
                error: Some(e.to_string()),
            },
        );
    }

    result
}

/// Generate text using local Ollama (non-streaming)
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

/// Generate text using local Ollama with streaming
async fn generate_with_ollama_streaming(
    app: &AppHandle,
    session_id: &str,
    endpoint: &str,
    model: &str,
    prompt: &str,
) -> Result<String> {
    let client = Client::new();

    let request = OllamaGenerateRequest {
        model: model.to_string(),
        prompt: prompt.to_string(),
        stream: true,
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

    let mut full_response = String::new();
    let mut stream = response.bytes_stream();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk?;
        let text = String::from_utf8_lossy(&chunk);

        // Ollama streams NDJSON (one JSON object per line)
        for line in text.lines() {
            if line.is_empty() {
                continue;
            }
            if let Ok(parsed) = serde_json::from_str::<OllamaStreamResponse>(line) {
                if !parsed.response.is_empty() {
                    full_response.push_str(&parsed.response);

                    // Emit streaming event
                    let _ = app.emit(
                        "llm-stream",
                        LlmStreamEvent {
                            session_id: session_id.to_string(),
                            token: parsed.response,
                            done: false,
                            error: None,
                        },
                    );
                }

                if parsed.done {
                    break;
                }
            }
        }
    }

    // Emit done event
    let _ = app.emit(
        "llm-stream",
        LlmStreamEvent {
            session_id: session_id.to_string(),
            token: String::new(),
            done: true,
            error: None,
        },
    );

    Ok(full_response)
}

/// Generate text using OpenRouter API (non-streaming)
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

/// Generate text using OpenRouter API with streaming (SSE)
async fn generate_with_openrouter_streaming(
    app: &AppHandle,
    session_id: &str,
    api_key: &str,
    model: &str,
    prompt: &str,
) -> Result<String> {
    let client = Client::new();

    let body = serde_json::json!({
        "model": model,
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "stream": true
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

    let mut full_response = String::new();
    let mut stream = response.bytes_stream();
    let mut buffer = String::new();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk?;
        buffer.push_str(&String::from_utf8_lossy(&chunk));

        // Process complete SSE events in buffer
        while let Some(pos) = buffer.find("\n\n") {
            let event = buffer[..pos].to_string();
            buffer = buffer[pos + 2..].to_string();

            // Parse SSE event
            for line in event.lines() {
                if let Some(data) = line.strip_prefix("data: ") {
                    if data == "[DONE]" {
                        // Stream complete
                        break;
                    }

                    if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(data) {
                        if let Some(content) = parsed["choices"][0]["delta"]["content"].as_str() {
                            if !content.is_empty() {
                                full_response.push_str(content);

                                // Emit streaming event
                                let _ = app.emit(
                                    "llm-stream",
                                    LlmStreamEvent {
                                        session_id: session_id.to_string(),
                                        token: content.to_string(),
                                        done: false,
                                        error: None,
                                    },
                                );
                            }
                        }
                    }
                }
            }
        }
    }

    // Emit done event
    let _ = app.emit(
        "llm-stream",
        LlmStreamEvent {
            session_id: session_id.to_string(),
            token: String::new(),
            done: true,
            error: None,
        },
    );

    Ok(full_response)
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ollama_generate_request_serialization() {
        let request = OllamaGenerateRequest {
            model: "llama2".to_string(),
            prompt: "Hello, world!".to_string(),
            stream: false,
        };

        let json = serde_json::to_string(&request).unwrap();
        assert!(json.contains("\"model\":\"llama2\""));
        assert!(json.contains("\"prompt\":\"Hello, world!\""));
        assert!(json.contains("\"stream\":false"));
    }

    #[test]
    fn test_ollama_status_not_connected() {
        let status = OllamaStatus {
            connected: false,
            models: vec![],
            error: Some("Connection refused".to_string()),
        };

        assert!(!status.connected);
        assert!(status.models.is_empty());
        assert!(status.error.is_some());
    }

    #[test]
    fn test_ollama_status_connected() {
        let status = OllamaStatus {
            connected: true,
            models: vec!["llama2".to_string(), "mistral".to_string()],
            error: None,
        };

        assert!(status.connected);
        assert_eq!(status.models.len(), 2);
        assert!(status.error.is_none());
    }

    #[tokio::test]
    async fn test_check_ollama_status_handles_offline() {
        // This test verifies that check_ollama_status doesn't panic
        // when Ollama is not running (which is expected in CI)
        let result = check_ollama_status().await;
        assert!(result.is_ok());

        let status = result.unwrap();
        // If Ollama is not running, we should get a connection error
        // If it is running, we should get a successful connection
        // Either way, the function should not panic
        if !status.connected {
            assert!(status.error.is_some());
        }
    }
}
