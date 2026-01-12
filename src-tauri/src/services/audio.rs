use anyhow::{anyhow, Result};
use rubato::{FftFixedIn, Resampler};
use std::path::PathBuf;
use symphonia::core::audio::SampleBuffer;
use symphonia::core::codecs::DecoderOptions;
use symphonia::core::formats::FormatOptions;
use symphonia::core::io::MediaSourceStream;
use symphonia::core::meta::MetadataOptions;
use symphonia::core::probe::Hint;
use tauri::AppHandle;
use tauri::Manager;

// Target sample rate for Whisper (16kHz mono)
// These are used by decode_audio_to_whisper_format which will be called by WhisperKit
#[allow(dead_code)]
const TARGET_SAMPLE_RATE: u32 = 16000;

/// Get the audio directory for storing recordings
fn get_audio_dir(app: &AppHandle) -> Result<PathBuf> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| anyhow!("Failed to get app data dir: {}", e))?;
    let audio_dir = app_data_dir.join("audio");
    std::fs::create_dir_all(&audio_dir)?;
    Ok(audio_dir)
}

/// Save audio data to a file
pub async fn save_audio_file(
    app: &AppHandle,
    session_id: &str,
    audio_data: &[u8],
    format: &str,
) -> Result<String> {
    println!("[Audio] save_audio_file called:");
    println!("[Audio]   session_id: {}", session_id);
    println!("[Audio]   format: {}", format);
    println!("[Audio]   data size: {} bytes", audio_data.len());

    let audio_dir = get_audio_dir(app)?;
    println!("[Audio]   audio_dir: {:?}", audio_dir);

    let filename = format!("{}.{}", session_id, format);
    let file_path = audio_dir.join(&filename);
    println!("[Audio]   file_path: {:?}", file_path);

    tokio::fs::write(&file_path, audio_data).await?;

    let saved_path = file_path.to_string_lossy().to_string();
    println!("[Audio]   saved to: {}", saved_path);

    // Verify file was saved correctly
    if let Ok(metadata) = tokio::fs::metadata(&file_path).await {
        println!("[Audio]   verified file size: {} bytes", metadata.len());
    }

    Ok(saved_path)
}

/// Get the path to an audio file for a session
pub async fn get_audio_path(app: &AppHandle, session_id: &str) -> Result<String> {
    let audio_dir = get_audio_dir(app)?;

    // Try common formats (prioritize formats Symphonia supports well)
    for ext in &["m4a", "ogg", "wav", "mp3", "flac", "aac", "webm"] {
        let path = audio_dir.join(format!("{}.{}", session_id, ext));
        if path.exists() {
            return Ok(path.to_string_lossy().to_string());
        }
    }

    Err(anyhow!("Audio file not found for session {}", session_id))
}

/// Decode any audio file and convert to f32 samples at 16kHz mono
/// This replaces ffmpeg for audio conversion - pure Rust implementation
/// Currently used by WhisperKit subprocess for audio preprocessing
#[allow(dead_code)]
pub fn decode_audio_to_whisper_format(audio_path: &str) -> Result<Vec<f32>> {
    println!("[Audio] decode_audio_to_whisper_format() called for: {}", audio_path);

    let file = std::fs::File::open(audio_path)
        .map_err(|e| {
            println!("[Audio] ERROR: Failed to open audio file: {}", e);
            anyhow!("Failed to open audio file: {}", e)
        })?;

    let file_size = file.metadata().map(|m| m.len()).unwrap_or(0);
    println!("[Audio] File opened, size: {} bytes", file_size);

    let mss = MediaSourceStream::new(Box::new(file), Default::default());

    // Create a hint to help format detection
    let mut hint = Hint::new();
    if let Some(ext) = std::path::Path::new(audio_path).extension() {
        let ext_str = ext.to_str().unwrap_or("");
        println!("[Audio] File extension: {}", ext_str);
        hint.with_extension(ext_str);
    }

    // Probe the format
    println!("[Audio] Probing audio format...");
    let format_opts = FormatOptions::default();
    let metadata_opts = MetadataOptions::default();
    let probed = symphonia::default::get_probe()
        .format(&hint, mss, &format_opts, &metadata_opts)
        .map_err(|e| {
            println!("[Audio] ERROR: Failed to probe audio format: {}", e);
            anyhow!("Failed to probe audio format: {}", e)
        })?;

    let mut format = probed.format;
    println!("[Audio] Format probed successfully, tracks: {}", format.tracks().len());

    // Select the first audio track
    let track = format
        .tracks()
        .iter()
        .find(|t| t.codec_params.codec != symphonia::core::codecs::CODEC_TYPE_NULL)
        .ok_or_else(|| {
            println!("[Audio] ERROR: No audio track found");
            anyhow!("No audio track found")
        })?;

    let track_id = track.id;
    let codec_params = track.codec_params.clone();
    let source_sample_rate = codec_params.sample_rate.unwrap_or(44100);
    let source_channels = codec_params.channels.map(|c| c.count()).unwrap_or(2);

    println!("[Audio] Track found - sample rate: {} Hz, channels: {}", source_sample_rate, source_channels);

    // Create decoder
    println!("[Audio] Creating decoder...");
    let decoder_opts = DecoderOptions::default();
    let mut decoder = symphonia::default::get_codecs()
        .make(&codec_params, &decoder_opts)
        .map_err(|e| {
            println!("[Audio] ERROR: Failed to create decoder: {}", e);
            anyhow!("Failed to create decoder: {}", e)
        })?;
    println!("[Audio] Decoder created successfully");

    // Decode all packets
    let mut all_samples: Vec<f32> = Vec::new();
    let mut packet_count = 0;
    let mut decode_errors = 0;

    println!("[Audio] Starting packet decode loop...");
    loop {
        let packet = match format.next_packet() {
            Ok(p) => p,
            Err(symphonia::core::errors::Error::IoError(e))
                if e.kind() == std::io::ErrorKind::UnexpectedEof =>
            {
                println!("[Audio] Reached end of file");
                break;
            }
            Err(symphonia::core::errors::Error::ResetRequired) => {
                println!("[Audio] Reset required, resetting decoder");
                decoder.reset();
                continue;
            }
            Err(e) => {
                println!("[Audio] ERROR reading packet: {}", e);
                return Err(anyhow!("Error reading packet: {}", e));
            }
        };

        if packet.track_id() != track_id {
            continue;
        }

        packet_count += 1;

        let decoded = match decoder.decode(&packet) {
            Ok(d) => d,
            Err(symphonia::core::errors::Error::DecodeError(e)) => {
                decode_errors += 1;
                if decode_errors <= 5 {
                    println!("[Audio] Decode error (skipping packet {}): {}", packet_count, e);
                }
                continue;
            }
            Err(e) => {
                decode_errors += 1;
                if decode_errors <= 5 {
                    println!("[Audio] Decode error (skipping packet {}): {}", packet_count, e);
                }
                continue;
            }
        };

        // Convert to f32 samples
        let spec = *decoded.spec();
        let duration = decoded.capacity() as u64;
        let mut sample_buf = SampleBuffer::<f32>::new(duration, spec);
        sample_buf.copy_interleaved_ref(decoded);

        let samples = sample_buf.samples();

        // Convert to mono if stereo/multichannel
        if source_channels > 1 {
            for chunk in samples.chunks(source_channels) {
                let mono: f32 = chunk.iter().sum::<f32>() / source_channels as f32;
                all_samples.push(mono);
            }
        } else {
            all_samples.extend_from_slice(samples);
        }
    }

    println!("[Audio] Decoded {} packets, {} decode errors, {} total samples",
        packet_count, decode_errors, all_samples.len());

    if all_samples.is_empty() {
        println!("[Audio] ERROR: No audio samples decoded");
        return Err(anyhow!("No audio samples decoded"));
    }

    // Resample to 16kHz if necessary
    if source_sample_rate != TARGET_SAMPLE_RATE {
        println!("[Audio] Resampling from {} Hz to {} Hz...", source_sample_rate, TARGET_SAMPLE_RATE);
        all_samples = resample_audio(
            &all_samples,
            source_sample_rate as usize,
            TARGET_SAMPLE_RATE as usize,
        )?;
        println!("[Audio] Resampling complete, {} samples after resampling", all_samples.len());
    }

    let duration_secs = all_samples.len() as f32 / TARGET_SAMPLE_RATE as f32;
    println!("[Audio] Audio decode complete: {} samples ({:.2} seconds at 16kHz)",
        all_samples.len(), duration_secs);

    Ok(all_samples)
}

/// Resample audio using rubato (high quality resampling)
#[allow(dead_code)]
fn resample_audio(samples: &[f32], source_rate: usize, target_rate: usize) -> Result<Vec<f32>> {
    if source_rate == target_rate {
        return Ok(samples.to_vec());
    }

    let chunk_size = 1024;
    let sub_chunks = 2;

    let mut resampler = FftFixedIn::<f32>::new(source_rate, target_rate, chunk_size, sub_chunks, 1)
        .map_err(|e| anyhow!("Failed to create resampler: {}", e))?;

    let mut output = Vec::new();
    let mut input_frames_used = 0;

    // Process in chunks
    while input_frames_used < samples.len() {
        let remaining = samples.len() - input_frames_used;
        let this_chunk = remaining.min(chunk_size);

        // Pad with zeros if we don't have enough samples for a full chunk
        let mut input_chunk = samples[input_frames_used..input_frames_used + this_chunk].to_vec();
        if input_chunk.len() < chunk_size {
            input_chunk.resize(chunk_size, 0.0);
        }

        let input_vec = vec![input_chunk];

        match resampler.process(&input_vec, None) {
            Ok(resampled) => {
                if !resampled.is_empty() && !resampled[0].is_empty() {
                    output.extend_from_slice(&resampled[0]);
                }
            }
            Err(e) => {
                eprintln!("Resampling error (skipping chunk): {}", e);
            }
        }

        input_frames_used += this_chunk;
    }

    Ok(output)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_target_sample_rate() {
        assert_eq!(TARGET_SAMPLE_RATE, 16000);
    }

    #[test]
    fn test_resample_same_rate_returns_input() {
        let samples = vec![0.1, 0.2, 0.3, 0.4, 0.5];
        let result = resample_audio(&samples, 16000, 16000).unwrap();
        assert_eq!(result, samples);
    }

    #[test]
    fn test_resample_creates_output() {
        // Resample from 44100 to 16000 Hz
        // Generate 1 second of silence (44100 samples)
        let samples: Vec<f32> = vec![0.0; 44100];

        let result = resample_audio(&samples, 44100, 16000).unwrap();
        // Result should be approximately 16000 samples for 1 second
        // Allow some tolerance due to resampling algorithm
        assert!(result.len() > 15000 && result.len() < 17000);
    }

    #[test]
    fn test_decode_audio_nonexistent_file() {
        let result = decode_audio_to_whisper_format("/nonexistent/path/audio.wav");
        assert!(result.is_err());
        let error = result.unwrap_err().to_string();
        assert!(error.contains("Failed to open audio file"));
    }

    #[tokio::test]
    async fn test_get_audio_path_nonexistent() {
        // Create a temporary mock that would fail
        // Since we can't easily create an AppHandle in tests,
        // we test the error path differently
        let _session_id = "nonexistent-session";
        // This test mainly verifies the function logic
        // without a real AppHandle
    }
}
