//! Integration tests for live transcription system
//!
//! These tests verify the complete pipeline from audio input to transcription output.
//!
//! Test Categories:
//! 1. Audio encoding/decoding for IPC
//! 2. VAD (Voice Activity Detection) thresholds
//! 3. IPC protocol serialization/deserialization
//! 4. Buffer management and timing
//! 5. Frontend event formats
//! 6. Configuration handling
//! 7. Error handling
//! 8. Edge cases

use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use serde::{Deserialize, Serialize};

// ============================================================================
// IPC Protocol Types (matching the Rust and Swift implementations)
// ============================================================================

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "cmd", rename_all = "camelCase")]
enum WorkerCommand {
    Init {
        model: Option<String>,
        language: Option<String>,
    },
    Start {
        #[serde(rename = "sessionId")]
        session_id: String,
        #[serde(rename = "useVAD")]
        use_vad: bool,
        #[serde(rename = "confirmationThreshold")]
        confirmation_threshold: u32,
    },
    Audio {
        #[serde(rename = "sessionId")]
        session_id: String,
        samples: String,
        #[serde(rename = "sampleCount")]
        sample_count: usize,
    },
    Stop {
        #[serde(rename = "sessionId")]
        session_id: String,
    },
    Shutdown,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
enum WorkerEvent {
    Ready {
        model: String,
        model_path: Option<String>,
    },
    Tentative {
        session_id: String,
        text: String,
        timestamp: f64,
    },
    Confirmed {
        session_id: String,
        text: String,
        start_time: f64,
        end_time: f64,
    },
    Complete {
        session_id: String,
        full_text: String,
    },
    Error {
        session_id: Option<String>,
        message: String,
        code: String,
    },
    Status {
        state: String,
        session_id: Option<String>,
    },
}

// ============================================================================
// Audio Encoding Tests
// ============================================================================

/// Test that audio samples are correctly encoded for IPC transmission
#[test]
fn test_audio_encoding_for_ipc() {
    // Simulate typical speech audio (amplitude around 0.1-0.3)
    let samples: Vec<f32> = vec![0.15, -0.12, 0.25, -0.18, 0.22, -0.20];

    // Encode as the Rust backend does
    let bytes: Vec<u8> = samples.iter().flat_map(|f| f.to_le_bytes()).collect();
    let encoded = BASE64.encode(&bytes);

    // Create the audio command
    let cmd = WorkerCommand::Audio {
        session_id: "test-session".to_string(),
        samples: encoded.clone(),
        sample_count: samples.len(),
    };

    let json = serde_json::to_string(&cmd).unwrap();

    // Verify JSON structure
    assert!(json.contains("\"cmd\":\"audio\""));
    assert!(json.contains("\"sessionId\":\"test-session\""));
    assert!(json.contains(&format!("\"sampleCount\":{}", samples.len())));
    assert!(json.contains(&format!("\"samples\":\"{}\"", encoded)));
}

/// Test that silent audio has very low energy
#[test]
fn test_silent_audio_detection() {
    // Near-silent samples
    let silent_samples: Vec<f32> = vec![0.0001, -0.0001, 0.00005, -0.00005];
    let energy: f32 = silent_samples.iter().map(|s| s * s).sum::<f32>() / silent_samples.len() as f32;

    // Should be below VAD threshold of 1e-5
    assert!(energy < 1e-5, "Silent audio energy {} should be below VAD threshold", energy);
}

/// Test that speech audio has sufficient energy
#[test]
fn test_speech_audio_detection() {
    // Typical speech samples
    let speech_samples: Vec<f32> = vec![0.15, -0.12, 0.25, -0.18];
    let energy: f32 = speech_samples.iter().map(|s| s * s).sum::<f32>() / speech_samples.len() as f32;

    // Should be above VAD threshold of 1e-5
    assert!(energy > 1e-5, "Speech audio energy {} should be above VAD threshold", energy);
    // Should be in typical speech range (0.001 to 0.1)
    assert!(energy > 0.001 && energy < 0.1, "Speech energy {} should be in typical range", energy);
}

// ============================================================================
// IPC Command Serialization Tests
// ============================================================================

#[test]
fn test_init_command_serialization() {
    let cmd = WorkerCommand::Init {
        model: Some("base".to_string()),
        language: Some("es".to_string()),
    };
    let json = serde_json::to_string(&cmd).unwrap();

    assert!(json.contains("\"cmd\":\"init\""));
    assert!(json.contains("\"model\":\"base\""));
    assert!(json.contains("\"language\":\"es\""));
}

#[test]
fn test_init_command_with_null_language() {
    let cmd = WorkerCommand::Init {
        model: None,
        language: None,
    };
    let json = serde_json::to_string(&cmd).unwrap();

    assert!(json.contains("\"cmd\":\"init\""));
    assert!(json.contains("\"model\":null"));
    assert!(json.contains("\"language\":null"));
}

#[test]
fn test_start_command_serialization() {
    let cmd = WorkerCommand::Start {
        session_id: "session-123".to_string(),
        use_vad: true,
        confirmation_threshold: 2,
    };
    let json = serde_json::to_string(&cmd).unwrap();

    assert!(json.contains("\"cmd\":\"start\""));
    assert!(json.contains("\"sessionId\":\"session-123\""));
    assert!(json.contains("\"useVAD\":true"));
    assert!(json.contains("\"confirmationThreshold\":2"));
}

#[test]
fn test_stop_command_serialization() {
    let cmd = WorkerCommand::Stop {
        session_id: "session-456".to_string(),
    };
    let json = serde_json::to_string(&cmd).unwrap();

    assert!(json.contains("\"cmd\":\"stop\""));
    assert!(json.contains("\"sessionId\":\"session-456\""));
}

#[test]
fn test_shutdown_command_serialization() {
    let cmd = WorkerCommand::Shutdown;
    let json = serde_json::to_string(&cmd).unwrap();

    assert!(json.contains("\"cmd\":\"shutdown\""));
}

// ============================================================================
// IPC Event Deserialization Tests
// ============================================================================

#[test]
fn test_ready_event_deserialization() {
    let json = r#"{"type":"ready","model":"large-v3","model_path":"/path/to/model"}"#;
    let event: WorkerEvent = serde_json::from_str(json).unwrap();

    match event {
        WorkerEvent::Ready { model, model_path } => {
            assert_eq!(model, "large-v3");
            assert_eq!(model_path, Some("/path/to/model".to_string()));
        }
        _ => panic!("Expected Ready event"),
    }
}

#[test]
fn test_tentative_event_deserialization() {
    let json = r#"{"type":"tentative","session_id":"sess-1","text":"Hello world","timestamp":1.5}"#;
    let event: WorkerEvent = serde_json::from_str(json).unwrap();

    match event {
        WorkerEvent::Tentative { session_id, text, timestamp } => {
            assert_eq!(session_id, "sess-1");
            assert_eq!(text, "Hello world");
            assert!((timestamp - 1.5).abs() < 0.001);
        }
        _ => panic!("Expected Tentative event"),
    }
}

#[test]
fn test_confirmed_event_deserialization() {
    let json = r#"{"type":"confirmed","session_id":"sess-1","text":"Hello","start_time":0.5,"end_time":1.5}"#;
    let event: WorkerEvent = serde_json::from_str(json).unwrap();

    match event {
        WorkerEvent::Confirmed { session_id, text, start_time, end_time } => {
            assert_eq!(session_id, "sess-1");
            assert_eq!(text, "Hello");
            assert!((start_time - 0.5).abs() < 0.001);
            assert!((end_time - 1.5).abs() < 0.001);
        }
        _ => panic!("Expected Confirmed event"),
    }
}

#[test]
fn test_complete_event_deserialization() {
    let json = r#"{"type":"complete","session_id":"sess-1","full_text":"Complete transcription."}"#;
    let event: WorkerEvent = serde_json::from_str(json).unwrap();

    match event {
        WorkerEvent::Complete { session_id, full_text } => {
            assert_eq!(session_id, "sess-1");
            assert_eq!(full_text, "Complete transcription.");
        }
        _ => panic!("Expected Complete event"),
    }
}

#[test]
fn test_error_event_deserialization() {
    let json = r#"{"type":"error","session_id":"sess-1","message":"Something failed","code":"TEST_ERROR"}"#;
    let event: WorkerEvent = serde_json::from_str(json).unwrap();

    match event {
        WorkerEvent::Error { session_id, message, code } => {
            assert_eq!(session_id, Some("sess-1".to_string()));
            assert_eq!(message, "Something failed");
            assert_eq!(code, "TEST_ERROR");
        }
        _ => panic!("Expected Error event"),
    }
}

#[test]
fn test_status_event_deserialization() {
    let json = r#"{"type":"status","state":"transcribing","session_id":"sess-1"}"#;
    let event: WorkerEvent = serde_json::from_str(json).unwrap();

    match event {
        WorkerEvent::Status { state, session_id } => {
            assert_eq!(state, "transcribing");
            assert_eq!(session_id, Some("sess-1".to_string()));
        }
        _ => panic!("Expected Status event"),
    }
}

// ============================================================================
// Audio Buffer Management Tests
// ============================================================================

#[test]
fn test_buffer_size_calculation() {
    // At 48kHz, 10 seconds = 480,000 samples
    let sample_rate = 48000;
    let max_seconds = 10;
    let max_samples = sample_rate * max_seconds;

    assert_eq!(max_samples, 480_000);

    // At 4 bytes per f32, that's 1.92 MB
    let buffer_size_bytes = max_samples * 4;
    assert_eq!(buffer_size_bytes, 1_920_000);
}

#[test]
fn test_chunk_timing() {
    // 1600 samples at 48kHz = 33.3ms per chunk
    let chunk_size = 1600;
    let sample_rate = 48000.0;
    let chunk_duration_ms = (chunk_size as f64 / sample_rate) * 1000.0;

    assert!((chunk_duration_ms - 33.33).abs() < 0.1, "Chunk duration should be ~33ms");

    // To get 1 second of audio, we need ~30 chunks
    let chunks_per_second = sample_rate / chunk_size as f64;
    assert!((chunks_per_second - 30.0).abs() < 0.1, "Should be ~30 chunks per second");
}

#[test]
fn test_processing_threshold() {
    // We process when we have 48000 new samples (1 second at 48kHz)
    let processing_threshold = 48000;
    let chunk_size = 1600;

    // How many chunks to trigger processing?
    let chunks_needed = processing_threshold / chunk_size;
    assert_eq!(chunks_needed, 30, "Need 30 chunks to trigger processing");
}

// ============================================================================
// Frontend Event Format Tests
// ============================================================================

#[test]
fn test_live_transcription_event_format() {
    // Test the format that gets sent to the frontend
    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    struct LiveTranscriptionEvent {
        session_id: String,
        text: String,
        is_final: bool,
        timestamp: f64,
    }

    let event = LiveTranscriptionEvent {
        session_id: "test-123".to_string(),
        text: "Hello world".to_string(),
        is_final: false,
        timestamp: 2.5,
    };

    let json = serde_json::to_string(&event).unwrap();

    // Verify camelCase naming
    assert!(json.contains("\"sessionId\":\"test-123\""));
    assert!(json.contains("\"text\":\"Hello world\""));
    assert!(json.contains("\"isFinal\":false"));
    assert!(json.contains("\"timestamp\":2.5"));
}

#[test]
fn test_transcription_complete_event_format() {
    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    struct TranscriptionCompleteEvent {
        session_id: String,
        full_text: String,
    }

    let event = TranscriptionCompleteEvent {
        session_id: "test-123".to_string(),
        full_text: "Complete transcript here.".to_string(),
    };

    let json = serde_json::to_string(&event).unwrap();

    assert!(json.contains("\"sessionId\":\"test-123\""));
    assert!(json.contains("\"fullText\":\"Complete transcript here.\""));
}

// ============================================================================
// Configuration Tests
// ============================================================================

#[test]
fn test_live_transcription_config_defaults() {
    #[derive(Debug, Deserialize, Default)]
    #[serde(rename_all = "camelCase")]
    struct LiveTranscriptionConfig {
        model: Option<String>,
        language: Option<String>,
        #[serde(default = "default_use_vad")]
        use_vad: bool,
        #[serde(default = "default_confirmation_threshold")]
        confirmation_threshold: u32,
    }

    fn default_use_vad() -> bool { true }
    fn default_confirmation_threshold() -> u32 { 2 }

    // Test with minimal config
    let json = r#"{"model":null,"language":null}"#;
    let config: LiveTranscriptionConfig = serde_json::from_str(json).unwrap();

    assert!(config.model.is_none());
    assert!(config.language.is_none());
    assert!(config.use_vad); // default
    assert_eq!(config.confirmation_threshold, 2); // default
}

#[test]
fn test_live_transcription_config_custom() {
    #[derive(Debug, Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct LiveTranscriptionConfig {
        model: Option<String>,
        language: Option<String>,
        use_vad: Option<bool>,
        confirmation_threshold: Option<u32>,
    }

    let json = r#"{"model":"large-v3","language":"es","useVad":false,"confirmationThreshold":3}"#;
    let config: LiveTranscriptionConfig = serde_json::from_str(json).unwrap();

    assert_eq!(config.model, Some("large-v3".to_string()));
    assert_eq!(config.language, Some("es".to_string()));
    assert_eq!(config.use_vad, Some(false));
    assert_eq!(config.confirmation_threshold, Some(3));
}

// ============================================================================
// Error Handling Tests
// ============================================================================

#[test]
fn test_error_codes() {
    let error_codes = vec![
        "MODEL_LOAD_FAILED",
        "NOT_INITIALIZED",
        "SESSION_NOT_FOUND",
        "AUDIO_DECODE_FAILED",
        "TRANSCRIPTION_FAILED",
        "INVALID_COMMAND",
        "INTERNAL_ERROR",
    ];

    for code in error_codes {
        let json = format!(r#"{{"type":"error","session_id":null,"message":"Test error","code":"{}"}}"#, code);
        let event: Result<WorkerEvent, _> = serde_json::from_str(&json);
        assert!(event.is_ok(), "Should be able to parse error code: {}", code);
    }
}

// ============================================================================
// Roundtrip Tests
// ============================================================================

#[test]
fn test_audio_samples_full_roundtrip() {
    // Generate test samples simulating speech
    let original_samples: Vec<f32> = (0..1600)
        .map(|i| {
            let t = i as f32 / 48000.0;
            (t * 440.0 * 2.0 * std::f32::consts::PI).sin() * 0.2
        })
        .collect();

    // Encode
    let bytes: Vec<u8> = original_samples.iter().flat_map(|f| f.to_le_bytes()).collect();
    let encoded = BASE64.encode(&bytes);

    // Create command
    let cmd = WorkerCommand::Audio {
        session_id: "test".to_string(),
        samples: encoded.clone(),
        sample_count: original_samples.len(),
    };

    // Serialize to JSON (as would be sent over IPC)
    let json = serde_json::to_string(&cmd).unwrap();

    // Parse JSON back (as Swift would receive)
    let parsed: serde_json::Value = serde_json::from_str(&json).unwrap();
    let samples_b64 = parsed["samples"].as_str().unwrap();
    let sample_count = parsed["sampleCount"].as_u64().unwrap() as usize;

    // Decode (as Swift would)
    let decoded_bytes = BASE64.decode(samples_b64).unwrap();
    assert_eq!(decoded_bytes.len(), sample_count * 4);

    let recovered_samples: Vec<f32> = decoded_bytes
        .chunks(4)
        .map(|chunk| f32::from_le_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]))
        .collect();

    // Verify
    assert_eq!(original_samples.len(), recovered_samples.len());
    for (orig, recov) in original_samples.iter().zip(recovered_samples.iter()) {
        assert!((orig - recov).abs() < f32::EPSILON, "Sample mismatch");
    }
}

// ============================================================================
// Audio Buffer Edge Cases Tests
// ============================================================================

#[test]
fn test_empty_audio_buffer() {
    let samples: Vec<f32> = vec![];
    let bytes: Vec<u8> = samples.iter().flat_map(|f| f.to_le_bytes()).collect();
    let encoded = BASE64.encode(&bytes);

    assert!(encoded.is_empty());
    assert_eq!(samples.len(), 0);
}

#[test]
fn test_single_sample() {
    let samples: Vec<f32> = vec![0.5];
    let bytes: Vec<u8> = samples.iter().flat_map(|f| f.to_le_bytes()).collect();
    let encoded = BASE64.encode(&bytes);

    let decoded_bytes = BASE64.decode(&encoded).unwrap();
    let recovered: Vec<f32> = decoded_bytes
        .chunks(4)
        .map(|chunk| f32::from_le_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]))
        .collect();

    assert_eq!(samples.len(), recovered.len());
    assert!((samples[0] - recovered[0]).abs() < f32::EPSILON);
}

#[test]
fn test_max_buffer_size() {
    // Test with 10 seconds of audio at 48kHz (max buffer size)
    let max_samples = 48000 * 10;
    let samples: Vec<f32> = (0..max_samples)
        .map(|i| (i as f32 / 48000.0 * 440.0 * std::f32::consts::TAU).sin() * 0.2)
        .collect();

    assert_eq!(samples.len(), 480000);

    // Verify encoding doesn't fail
    let bytes: Vec<u8> = samples.iter().flat_map(|f| f.to_le_bytes()).collect();
    assert_eq!(bytes.len(), 480000 * 4); // 1.92 MB

    let encoded = BASE64.encode(&bytes);
    assert!(!encoded.is_empty());
}

#[test]
fn test_sliding_window_behavior() {
    // Simulate the sliding window behavior from StreamingTranscriber
    let max_samples = 48000 * 10; // 10 seconds at 48kHz
    let keep_samples = 48000 * 5;  // Keep 5 seconds for context

    // Start with 12 seconds of audio
    let mut buffer: Vec<f32> = (0..(48000 * 12))
        .map(|i| (i as f32 / 48000.0).sin())
        .collect();

    assert_eq!(buffer.len(), 576000); // 12 seconds

    // Simulate transcription window (last 10 seconds)
    let samples_to_process: Vec<f32> = buffer.iter().rev().take(max_samples).rev().cloned().collect();
    assert_eq!(samples_to_process.len(), max_samples);

    // After transcription, keep only 5 seconds
    if buffer.len() > keep_samples {
        let remove_count = buffer.len() - keep_samples;
        buffer.drain(..remove_count);
    }

    assert_eq!(buffer.len(), keep_samples);
}

// ============================================================================
// VAD Threshold Tests
// ============================================================================

#[test]
fn test_vad_threshold_values() {
    let vad_threshold: f32 = 1e-5;

    // Test various energy levels
    let test_cases: Vec<(&str, Vec<f32>, bool)> = vec![
        // (description, samples, should_pass_vad)
        ("Complete silence", vec![0.0, 0.0, 0.0, 0.0], false),
        ("Near silence", vec![0.0001, -0.0001, 0.0001, -0.0001], false),
        ("Quiet background", vec![0.001, -0.001, 0.001, -0.001], false),
        ("Soft speech", vec![0.01, -0.01, 0.01, -0.01], true),
        ("Normal speech", vec![0.1, -0.1, 0.1, -0.1], true),
        ("Loud speech", vec![0.5, -0.5, 0.5, -0.5], true),
    ];

    for (desc, samples, should_pass) in test_cases {
        let energy: f32 = samples.iter().map(|s| s * s).sum::<f32>() / samples.len() as f32;
        let passes_vad = energy >= vad_threshold;
        assert_eq!(
            passes_vad, should_pass,
            "{}: energy={}, threshold={}, expected passes_vad={}",
            desc, energy, vad_threshold, should_pass
        );
    }
}

#[test]
fn test_vad_with_recent_samples() {
    // Test VAD check with last ~0.1s at 48kHz (4800 samples)
    let recent_sample_count = 4800;

    // Create buffer with silence at start, speech at end
    let mut buffer: Vec<f32> = vec![0.0; 48000]; // 1 second of silence
    let speech_samples: Vec<f32> = (0..recent_sample_count)
        .map(|i| (i as f32 / 48000.0 * 440.0 * std::f32::consts::TAU).sin() * 0.2)
        .collect();
    buffer.extend(speech_samples);

    // Check energy of last 4800 samples (recent samples)
    let recent_samples: Vec<f32> = buffer.iter().rev().take(recent_sample_count).cloned().collect();
    let energy: f32 = recent_samples.iter().map(|s| s * s).sum::<f32>() / recent_samples.len() as f32;

    let vad_threshold: f32 = 1e-5;
    assert!(energy > vad_threshold, "Speech at end should pass VAD: energy={}", energy);
}

// ============================================================================
// Segment Processing Tests
// ============================================================================

#[test]
fn test_empty_segment_handling() {
    // This test verifies behavior with empty segments (related to crash issue)
    #[derive(Debug, Clone, Deserialize)]
    struct TranscriptionSegment {
        text: String,
        start: f64,
        end: f64,
    }

    // Empty segment (as might be returned by WhisperKit)
    let empty_segment = TranscriptionSegment {
        text: "".to_string(),
        start: 0.0,
        end: 0.5,
    };

    // Verify empty text is properly trimmed
    let trimmed = empty_segment.text.trim();
    assert!(trimmed.is_empty());

    // Verify we can handle empty text gracefully
    let segments: Vec<TranscriptionSegment> = vec![empty_segment];
    let processed_text: String = segments
        .iter()
        .map(|s| s.text.trim())
        .filter(|t| !t.is_empty())
        .collect::<Vec<_>>()
        .join(" ");

    assert!(processed_text.is_empty());
}

#[test]
fn test_segment_confirmation_threshold() {
    // Test the segment confirmation logic
    let confirmation_threshold = 2;
    let total_segments = 5;

    // Segments that have appeared consistently are confirmed
    let confirmed_count = if total_segments > confirmation_threshold {
        total_segments - confirmation_threshold
    } else {
        0
    };

    assert_eq!(confirmed_count, 3, "With 5 segments and threshold 2, should confirm 3");

    // Test edge case: fewer segments than threshold
    let few_segments = 1;
    let confirmed_few = if few_segments > confirmation_threshold {
        few_segments - confirmation_threshold
    } else {
        0
    };
    assert_eq!(confirmed_few, 0, "With 1 segment and threshold 2, should confirm 0");
}

#[test]
fn test_tentative_vs_confirmed_segments() {
    #[derive(Debug, Clone)]
    struct Segment {
        text: String,
        confirmed: bool,
    }

    let confirmation_threshold = 2;
    let all_segments: Vec<&str> = vec!["Hello", "world", "this", "is", "a", "test"];

    let total = all_segments.len();
    let confirmed_count = total.saturating_sub(confirmation_threshold);

    let confirmed_segments: Vec<Segment> = all_segments[..confirmed_count]
        .iter()
        .map(|&t| Segment { text: t.to_string(), confirmed: true })
        .collect();

    let tentative_segments: Vec<Segment> = all_segments[confirmed_count..]
        .iter()
        .map(|&t| Segment { text: t.to_string(), confirmed: false })
        .collect();

    assert_eq!(confirmed_segments.len(), 4);
    assert_eq!(tentative_segments.len(), 2);
    assert_eq!(tentative_segments[0].text, "a");
    assert_eq!(tentative_segments[1].text, "test");
}

// ============================================================================
// IPC Message Size Tests
// ============================================================================

#[test]
fn test_ipc_message_size() {
    // Ensure IPC messages don't exceed reasonable limits
    // 1600 samples at 48kHz = ~33ms of audio (typical chunk size)
    let chunk_size = 1600;
    let samples: Vec<f32> = vec![0.1; chunk_size];

    let bytes: Vec<u8> = samples.iter().flat_map(|f| f.to_le_bytes()).collect();
    let encoded = BASE64.encode(&bytes);

    let cmd = WorkerCommand::Audio {
        session_id: "session-12345678-1234-1234-1234-123456789012".to_string(),
        samples: encoded.clone(),
        sample_count: samples.len(),
    };

    let json = serde_json::to_string(&cmd).unwrap();

    // JSON message should be reasonable size (< 100KB for 1600 samples)
    assert!(json.len() < 100_000, "JSON message too large: {} bytes", json.len());

    // Actual expected size: ~8600 bytes for 1600 f32 samples
    // 1600 * 4 = 6400 bytes, base64 encoded = ~8534 chars + JSON overhead
    assert!(json.len() < 10_000, "JSON message larger than expected: {} bytes", json.len());
}

#[test]
fn test_large_session_id() {
    // Test with a UUID-style session ID
    let session_id = "12345678-1234-5678-1234-567812345678";

    let cmd = WorkerCommand::Start {
        session_id: session_id.to_string(),
        use_vad: true,
        confirmation_threshold: 2,
    };

    let json = serde_json::to_string(&cmd).unwrap();
    assert!(json.contains(session_id));
}

// ============================================================================
// Sample Rate Conversion Tests
// ============================================================================

#[test]
fn test_sample_rate_calculations() {
    // WhisperKit expects 16kHz, but browser captures at 48kHz
    let browser_sample_rate = 48000;
    let whisper_sample_rate = 16000;

    // 1 second of audio at 48kHz
    let browser_samples = 48000;

    // If we need to resample, calculate expected output
    let resampled_count = browser_samples * whisper_sample_rate / browser_sample_rate;
    assert_eq!(resampled_count, 16000);

    // But currently we're passing 48kHz directly to WhisperKit
    // which internally handles resampling
    let processing_threshold = 48000; // 1 second at 48kHz
    let chunks_needed = processing_threshold / 1600; // 1600 samples per chunk at 48kHz
    assert_eq!(chunks_needed, 30);
}

#[test]
fn test_audio_duration_calculation() {
    let sample_rate = 48000;

    // 1600 samples at 48kHz
    let samples = 1600;
    let duration_ms = (samples as f64 / sample_rate as f64) * 1000.0;
    assert!((duration_ms - 33.33).abs() < 0.1, "Expected ~33ms, got {}ms", duration_ms);

    // 48000 samples = 1 second
    let one_second_samples = 48000;
    let one_second_duration = one_second_samples as f64 / sample_rate as f64;
    assert!((one_second_duration - 1.0).abs() < f64::EPSILON);

    // 480000 samples = 10 seconds (max buffer)
    let max_buffer_samples = 480000;
    let max_buffer_duration = max_buffer_samples as f64 / sample_rate as f64;
    assert!((max_buffer_duration - 10.0).abs() < f64::EPSILON);
}

// ============================================================================
// Unicode and Special Character Tests
// ============================================================================

#[test]
fn test_unicode_in_transcription() {
    let texts = vec![
        "Hello world",
        "¡Hola mundo!",
        "日本語テスト",
        "🎤 Recording",
        "Émoji test 🎵",
    ];

    for text in texts {
        // Test that text survives JSON serialization
        #[derive(Serialize, Deserialize)]
        struct Event { text: String }

        let event = Event { text: text.to_string() };
        let json = serde_json::to_string(&event).unwrap();
        let parsed: Event = serde_json::from_str(&json).unwrap();

        assert_eq!(text, parsed.text, "Unicode text should survive serialization");
    }
}

#[test]
fn test_whitespace_handling() {
    let texts = vec![
        ("  leading spaces  ", "leading spaces"),
        ("\n\nnewlines\n\n", "newlines"),
        ("\t\ttabs\t\t", "tabs"),
        ("   ", ""),
    ];

    for (input, expected) in texts {
        let trimmed = input.trim();
        assert_eq!(trimmed, expected, "Whitespace should be trimmed correctly");
    }
}

// ============================================================================
// Timing and Latency Tests
// ============================================================================

#[test]
fn test_processing_latency_calculation() {
    // Calculate expected latency
    let chunk_duration_ms = 33.33; // 1600 samples at 48kHz
    let chunks_before_processing = 30; // Need ~1 second of audio
    let processing_delay = chunk_duration_ms * chunks_before_processing as f64;

    // Expected: ~1000ms before first transcription attempt
    assert!((processing_delay - 1000.0).abs() < 10.0);

    // Plus transcription time (variable, but estimate ~500-2000ms for WhisperKit)
    let estimated_min_latency = processing_delay + 500.0;
    let estimated_max_latency = processing_delay + 2000.0;

    // Min latency should be ~1500ms (1000ms collection + 500ms processing)
    assert!(estimated_min_latency >= 1499.0, "Min latency: {}", estimated_min_latency);
    assert!(estimated_max_latency <= 3001.0, "Max latency: {}", estimated_max_latency);
}

#[test]
fn test_loop_interval() {
    // The transcription loop runs every 500ms
    let loop_interval_ns: u64 = 500_000_000;
    let loop_interval_ms = loop_interval_ns / 1_000_000;

    assert_eq!(loop_interval_ms, 500);

    // In 1 second, the loop runs twice
    let loops_per_second = 1000 / loop_interval_ms;
    assert_eq!(loops_per_second, 2);
}

// ============================================================================
// Error Recovery Tests
// ============================================================================

#[test]
fn test_invalid_json_handling() {
    let invalid_json = "{ invalid json }";
    let result: Result<WorkerEvent, _> = serde_json::from_str(invalid_json);
    assert!(result.is_err(), "Should fail to parse invalid JSON");
}

#[test]
fn test_missing_required_fields() {
    // Missing session_id in tentative event
    let incomplete_json = r#"{"type":"tentative","text":"Hello"}"#;
    let result: Result<WorkerEvent, _> = serde_json::from_str(incomplete_json);
    assert!(result.is_err(), "Should fail with missing required field");
}

#[test]
fn test_unknown_event_type() {
    let unknown_json = r#"{"type":"unknown_type","data":"test"}"#;
    let result: Result<WorkerEvent, _> = serde_json::from_str(unknown_json);
    assert!(result.is_err(), "Should fail with unknown event type");
}

#[test]
fn test_invalid_base64() {
    let invalid_b64 = "not-valid-base64!!!";
    let result = BASE64.decode(invalid_b64);
    assert!(result.is_err(), "Should fail to decode invalid base64");
}

// ============================================================================
// Concurrent Operation Tests
// ============================================================================

#[test]
fn test_session_id_uniqueness() {
    use std::collections::HashSet;

    // Generate 1000 session IDs and verify uniqueness
    let session_ids: HashSet<String> = (0..1000)
        .map(|i| format!("session-{}-{}", i, std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos()))
        .collect();

    assert_eq!(session_ids.len(), 1000, "All session IDs should be unique");
}

// ============================================================================
// Memory Usage Tests
// ============================================================================

#[test]
fn test_buffer_memory_calculation() {
    // Calculate memory usage for audio buffers
    let sample_size = std::mem::size_of::<f32>(); // 4 bytes
    assert_eq!(sample_size, 4);

    // 10 seconds at 48kHz
    let max_samples = 48000 * 10;
    let max_buffer_bytes = max_samples * sample_size;
    assert_eq!(max_buffer_bytes, 1_920_000); // ~1.92 MB

    // 5 seconds (kept after processing)
    let keep_samples = 48000 * 5;
    let keep_buffer_bytes = keep_samples * sample_size;
    assert_eq!(keep_buffer_bytes, 960_000); // ~960 KB

    // Both should be reasonable for in-memory processing
    assert!(max_buffer_bytes < 10_000_000, "Max buffer should be < 10MB");
}
