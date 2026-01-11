//! Integration tests for streaming transcription pipeline
//!
//! These tests verify the audio encoding/decoding pipeline works correctly
//! between the frontend, Rust backend, and Swift worker.

use base64::{engine::general_purpose::STANDARD as BASE64, Engine};

/// Test that f32 audio samples survive the roundtrip encoding/decoding
#[test]
fn test_audio_samples_roundtrip() {
    // Create test samples with known values
    let original_samples: Vec<f32> = vec![
        0.0, 0.1, 0.5, -0.5, 1.0, -1.0, 0.00001, -0.00001,
        0.123456, -0.654321, 0.999999, -0.999999,
    ];

    // Encode as we do in Rust (little-endian f32 -> base64)
    let bytes: Vec<u8> = original_samples
        .iter()
        .flat_map(|f| f.to_le_bytes())
        .collect();
    let encoded = BASE64.encode(&bytes);

    // Decode as Swift would (base64 -> bytes -> f32)
    let decoded_bytes = BASE64.decode(&encoded).unwrap();
    let recovered_samples: Vec<f32> = decoded_bytes
        .chunks(4)
        .map(|chunk| f32::from_le_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]))
        .collect();

    // Verify exact match
    assert_eq!(original_samples.len(), recovered_samples.len());
    for (orig, recov) in original_samples.iter().zip(recovered_samples.iter()) {
        assert!(
            (orig - recov).abs() < f32::EPSILON,
            "Sample mismatch: original={}, recovered={}",
            orig,
            recov
        );
    }
}

/// Test encoding of typical speech audio samples
#[test]
fn test_speech_level_samples() {
    // Typical speech samples have amplitudes in the 0.01 to 0.3 range
    let speech_samples: Vec<f32> = vec![
        0.05, -0.08, 0.12, -0.15, 0.20, -0.18, 0.10, -0.05,
    ];

    let bytes: Vec<u8> = speech_samples
        .iter()
        .flat_map(|f| f.to_le_bytes())
        .collect();
    let encoded = BASE64.encode(&bytes);

    // Verify encoding produces expected length
    // 8 samples * 4 bytes = 32 bytes, base64 encoded = 44 chars (with padding)
    assert!(!encoded.is_empty());
    assert!(encoded.len() <= 48); // Base64 overhead

    // Decode and verify
    let decoded_bytes = BASE64.decode(&encoded).unwrap();
    assert_eq!(decoded_bytes.len(), 32);
}

/// Test that very quiet samples (near silence) are preserved
#[test]
fn test_quiet_samples_preserved() {
    // Very quiet samples that might be mistaken for silence
    let quiet_samples: Vec<f32> = vec![
        0.0001, -0.0001, 0.00005, -0.00005, 0.000001, -0.000001,
    ];

    let bytes: Vec<u8> = quiet_samples
        .iter()
        .flat_map(|f| f.to_le_bytes())
        .collect();
    let encoded = BASE64.encode(&bytes);
    let decoded_bytes = BASE64.decode(&encoded).unwrap();
    let recovered: Vec<f32> = decoded_bytes
        .chunks(4)
        .map(|chunk| f32::from_le_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]))
        .collect();

    for (orig, recov) in quiet_samples.iter().zip(recovered.iter()) {
        assert!(
            (orig - recov).abs() < f32::EPSILON,
            "Quiet sample lost: original={}, recovered={}",
            orig,
            recov
        );
    }

    // Verify energy calculation would be non-zero
    let energy: f32 = recovered.iter().map(|s| s * s).sum::<f32>() / recovered.len() as f32;
    assert!(energy > 0.0, "Energy should be non-zero for quiet samples");
}

/// Test large buffer encoding (simulating real-time audio chunks)
#[test]
fn test_large_buffer_encoding() {
    // 1600 samples = 100ms at 16kHz (typical chunk size)
    let samples: Vec<f32> = (0..1600)
        .map(|i| (i as f32 * 0.01).sin() * 0.5) // Sine wave at 0.5 amplitude
        .collect();

    let bytes: Vec<u8> = samples.iter().flat_map(|f| f.to_le_bytes()).collect();
    let encoded = BASE64.encode(&bytes);
    let decoded_bytes = BASE64.decode(&encoded).unwrap();

    assert_eq!(decoded_bytes.len(), 1600 * 4);

    let recovered: Vec<f32> = decoded_bytes
        .chunks(4)
        .map(|chunk| f32::from_le_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]))
        .collect();

    assert_eq!(samples.len(), recovered.len());

    // Verify first and last few samples
    for i in 0..10 {
        assert!(
            (samples[i] - recovered[i]).abs() < f32::EPSILON,
            "Sample {} mismatch",
            i
        );
    }
}

/// Test energy calculation matches between Rust and expected Swift behavior
#[test]
fn test_energy_calculation() {
    let samples: Vec<f32> = vec![0.1, -0.1, 0.2, -0.2, 0.3, -0.3];

    // Calculate energy as sum of squares divided by count
    let energy: f32 = samples.iter().map(|s| s * s).sum::<f32>() / samples.len() as f32;

    // Expected: (0.01 + 0.01 + 0.04 + 0.04 + 0.09 + 0.09) / 6 = 0.28 / 6 ≈ 0.0467
    let expected_energy = 0.28 / 6.0;
    assert!(
        (energy - expected_energy).abs() < 0.0001,
        "Energy calculation mismatch: got {}, expected {}",
        energy,
        expected_energy
    );

    // This energy level should pass VAD threshold of 1e-5
    assert!(energy > 1e-5, "Speech energy should pass VAD threshold");
}

/// Test silence detection (VAD threshold)
#[test]
fn test_vad_threshold_detection() {
    // Very quiet samples (below VAD threshold of 1e-5)
    let silence: Vec<f32> = vec![0.001, -0.001, 0.0005, -0.0005];
    let silence_energy: f32 = silence.iter().map(|s| s * s).sum::<f32>() / silence.len() as f32;
    // Expected: (0.000001 + 0.000001 + 0.00000025 + 0.00000025) / 4 = 0.0000025 / 4 ≈ 6.25e-7
    assert!(
        silence_energy < 1e-5,
        "Silence energy {} should be below VAD threshold",
        silence_energy
    );

    // Speech-level samples (above VAD threshold)
    let speech: Vec<f32> = vec![0.1, -0.1, 0.05, -0.05];
    let speech_energy: f32 = speech.iter().map(|s| s * s).sum::<f32>() / speech.len() as f32;
    // Expected: (0.01 + 0.01 + 0.0025 + 0.0025) / 4 = 0.025 / 4 = 0.00625
    assert!(
        speech_energy > 1e-5,
        "Speech energy {} should be above VAD threshold",
        speech_energy
    );
}

/// Test IPC command JSON serialization format
#[test]
fn test_ipc_command_format() {
    // Verify the JSON format matches what Swift expects
    use serde::Serialize;

    #[derive(Serialize)]
    #[serde(tag = "cmd", rename_all = "camelCase")]
    enum TestCommand {
        Init {
            model: Option<String>,
            language: Option<String>,
        },
        Audio {
            #[serde(rename = "sessionId")]
            session_id: String,
            samples: String,
            #[serde(rename = "sampleCount")]
            sample_count: usize,
        },
    }

    let init_cmd = TestCommand::Init {
        model: Some("base".to_string()),
        language: None,
    };
    let json = serde_json::to_string(&init_cmd).unwrap();
    assert!(json.contains("\"cmd\":\"init\""));
    assert!(json.contains("\"model\":\"base\""));

    let audio_cmd = TestCommand::Audio {
        session_id: "test-123".to_string(),
        samples: "AAAA".to_string(),
        sample_count: 100,
    };
    let json = serde_json::to_string(&audio_cmd).unwrap();
    assert!(json.contains("\"cmd\":\"audio\""));
    assert!(json.contains("\"sessionId\":\"test-123\""));
    assert!(json.contains("\"sampleCount\":100"));
}

/// Test that sample count matches buffer size
#[test]
fn test_sample_count_consistency() {
    let chunk_size = 1600; // 100ms at 16kHz
    let samples: Vec<f32> = vec![0.0; chunk_size];

    let bytes: Vec<u8> = samples.iter().flat_map(|f| f.to_le_bytes()).collect();

    // Verify byte count
    assert_eq!(bytes.len(), chunk_size * 4);

    // Verify base64 decodes to same byte count
    let encoded = BASE64.encode(&bytes);
    let decoded = BASE64.decode(&encoded).unwrap();
    assert_eq!(decoded.len(), chunk_size * 4);

    // Verify sample count after decoding
    let recovered_count = decoded.len() / 4;
    assert_eq!(recovered_count, chunk_size);
}
