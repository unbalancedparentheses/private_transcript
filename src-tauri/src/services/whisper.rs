use anyhow::{anyhow, Result};
use std::path::Path;
use std::process::Command;
use tauri::AppHandle;
use tauri::Manager;

/// Transcribe audio file using whisper.cpp
pub async fn transcribe(app: &AppHandle, _session_id: &str, audio_path: &str) -> Result<String> {
    // Get the app data directory for model storage
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| anyhow!("Failed to get app data dir: {}", e))?;

    let models_dir = app_data_dir.join("models");
    std::fs::create_dir_all(&models_dir)?;

    // Check if whisper is available
    let whisper_path = find_whisper_binary()?;

    // Convert audio to WAV format if needed (whisper.cpp requires WAV)
    let wav_path = convert_to_wav(audio_path).await?;

    // Run whisper transcription
    let model_path = get_model_path(&models_dir)?;
    eprintln!("Using whisper model: {}", model_path);
    eprintln!("Transcribing file: {}", wav_path);

    let output = Command::new(&whisper_path)
        .args([
            "--model", &model_path,
            "--output-txt",
            "--no-prints",
            "--language", "auto",
            &wav_path,  // file as positional argument
        ])
        .output()
        .map_err(|e| anyhow!("Failed to run whisper: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        eprintln!("Whisper stderr: {}", stderr);
        eprintln!("Whisper stdout: {}", stdout);
        return Err(anyhow!("Whisper failed: {}", stderr));
    }

    // Read the output text file (whisper-cli creates {input}.txt)
    let txt_path = format!("{}.txt", wav_path);
    eprintln!("Looking for transcript at: {}", txt_path);

    let transcript = if Path::new(&txt_path).exists() {
        let content = std::fs::read_to_string(&txt_path)?;
        let _ = std::fs::remove_file(&txt_path);
        content.trim().to_string()
    } else {
        // Fallback to stdout
        eprintln!("Txt file not found, using stdout");
        String::from_utf8_lossy(&output.stdout).trim().to_string()
    };

    // Clean up temp WAV file if we created one
    if wav_path != audio_path {
        let _ = std::fs::remove_file(&wav_path);
    }

    if transcript.is_empty() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        let stderr = String::from_utf8_lossy(&output.stderr);
        eprintln!("Empty transcript. stdout: {}, stderr: {}", stdout, stderr);
        return Err(anyhow!("Transcription produced no output"));
    }

    Ok(transcript)
}

fn find_whisper_binary() -> Result<String> {
    // Check common locations for whisper-cli binary (from brew install whisper-cpp)
    let candidates = [
        "whisper-cli",
        "/opt/homebrew/bin/whisper-cli",
        "/usr/local/bin/whisper-cli",
    ];

    for candidate in candidates {
        if Command::new(candidate).arg("--help").output().is_ok() {
            return Ok(candidate.to_string());
        }
    }

    Err(anyhow!(
        "Whisper not found. Install with: brew install whisper-cpp"
    ))
}

fn get_model_path(models_dir: &Path) -> Result<String> {
    // Look for existing models in order of preference
    let model_names = [
        "ggml-large-v3-turbo.bin",
        "ggml-large-v3.bin",
        "ggml-medium.bin",
        "ggml-small.bin",
        "ggml-base.bin",
        "ggml-tiny.bin",
    ];

    for name in model_names {
        let path = models_dir.join(name);
        if path.exists() {
            return Ok(path.to_string_lossy().to_string());
        }
    }

    // Check homebrew model location
    let homebrew_models = Path::new("/opt/homebrew/share/whisper-cpp/models");
    if homebrew_models.exists() {
        for name in model_names {
            let path = homebrew_models.join(name);
            if path.exists() {
                return Ok(path.to_string_lossy().to_string());
            }
        }
    }

    Err(anyhow!(
        "No Whisper model found. Download with: whisper-cpp-download-ggml-model base"
    ))
}

async fn convert_to_wav(audio_path: &str) -> Result<String> {
    // If already WAV, return as-is
    if audio_path.ends_with(".wav") {
        return Ok(audio_path.to_string());
    }

    // Use ffmpeg to convert to WAV (16kHz mono, required by whisper)
    let wav_path = format!("{}.wav", audio_path);

    let output = Command::new("ffmpeg")
        .args([
            "-y",           // Overwrite output
            "-i", audio_path,
            "-ar", "16000", // 16kHz sample rate
            "-ac", "1",     // Mono
            "-c:a", "pcm_s16le", // 16-bit PCM
            &wav_path,
        ])
        .output()
        .map_err(|e| anyhow!("Failed to run ffmpeg: {}. Install with: brew install ffmpeg", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(anyhow!("ffmpeg conversion failed: {}", stderr));
    }

    Ok(wav_path)
}

/// Get available Whisper models
pub fn get_available_models() -> Vec<&'static str> {
    vec![
        "tiny",
        "base",
        "small",
        "medium",
        "large-v3",
        "large-v3-turbo",
    ]
}

/// Download Whisper model if not present
pub async fn ensure_model(model: &str) -> Result<String> {
    // Try to download model using whisper-cpp's download script
    let output = Command::new("whisper-cpp-download-ggml-model")
        .arg(model)
        .output();

    match output {
        Ok(o) if o.status.success() => Ok(format!("Model {} downloaded successfully", model)),
        Ok(o) => Err(anyhow!(
            "Failed to download model: {}",
            String::from_utf8_lossy(&o.stderr)
        )),
        Err(_) => Err(anyhow!(
            "Download script not found. Install whisper-cpp with: brew install whisper-cpp"
        )),
    }
}
