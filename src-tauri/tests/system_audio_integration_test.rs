//! Integration tests for system audio capture functionality
//!
//! Tests the Swift audio-capture-worker binary, message protocol,
//! WAV file generation, and recording state management.

use std::process::Command;
use std::path::PathBuf;

// ==========================================
// Worker Binary Tests
// ==========================================

mod worker_binary_tests {
    use super::*;

    fn get_worker_path() -> Option<PathBuf> {
        let paths = [
            "binaries/audio-capture-worker-aarch64-apple-darwin",
            "bins/audio-capture-worker/.build/release/audio-capture-worker",
            "bins/audio-capture-worker/.build/debug/audio-capture-worker",
        ];

        for path in paths {
            let p = PathBuf::from(path);
            if p.exists() {
                return Some(p);
            }
        }
        None
    }

    #[test]
    fn test_worker_binary_exists() {
        let worker = get_worker_path();
        assert!(worker.is_some(), "Audio capture worker binary should exist");
    }

    #[test]
    fn test_worker_list_devices_command() {
        let Some(worker_path) = get_worker_path() else {
            println!("Skipping test: worker binary not found");
            return;
        };

        let output = Command::new(&worker_path)
            .arg("list-devices")
            .output()
            .expect("Failed to run worker");

        assert!(output.status.success(), "list-devices should succeed");

        let stdout = String::from_utf8_lossy(&output.stdout);
        assert!(stdout.contains("\"type\":\"devices\""), "Should return devices message");
        assert!(stdout.contains("\"devices\""), "Should contain devices array");

        // Parse as JSON to verify structure
        let json: serde_json::Value = serde_json::from_str(&stdout)
            .expect("Output should be valid JSON");

        assert_eq!(json["type"], "devices");
        assert!(json["devices"].is_array());
    }

    #[test]
    fn test_worker_check_permission_command() {
        let Some(worker_path) = get_worker_path() else {
            println!("Skipping test: worker binary not found");
            return;
        };

        let output = Command::new(&worker_path)
            .arg("check-permission")
            .output()
            .expect("Failed to run worker");

        assert!(output.status.success(), "check-permission should succeed");

        let stdout = String::from_utf8_lossy(&output.stdout);
        assert!(stdout.contains("\"type\":\"permission\""), "Should return permission message");

        // Parse as JSON
        let json: serde_json::Value = serde_json::from_str(&stdout)
            .expect("Output should be valid JSON");

        assert_eq!(json["type"], "permission");
        assert!(json["granted"].is_boolean());
    }

    #[test]
    fn test_worker_help_command() {
        let Some(worker_path) = get_worker_path() else {
            println!("Skipping test: worker binary not found");
            return;
        };

        let output = Command::new(&worker_path)
            .arg("--help")
            .output()
            .expect("Failed to run worker");

        let stdout = String::from_utf8_lossy(&output.stdout);
        let stderr = String::from_utf8_lossy(&output.stderr);
        let combined = format!("{}{}", stdout, stderr);

        assert!(
            combined.contains("audio-capture-worker") || combined.contains("USAGE"),
            "Should display help information"
        );
    }

    #[test]
    fn test_worker_invalid_subcommand() {
        let Some(worker_path) = get_worker_path() else {
            println!("Skipping test: worker binary not found");
            return;
        };

        let output = Command::new(&worker_path)
            .arg("invalid-command")
            .output()
            .expect("Failed to run worker");

        // Should fail or show error
        assert!(!output.status.success() || !output.stderr.is_empty());
    }
}

// ==========================================
// Worker Message Protocol Tests
// ==========================================

mod message_protocol_tests {
    use serde::{Deserialize, Serialize};

    #[derive(Debug, Clone, Serialize, Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct AudioDevice {
        id: String,
        name: String,
        is_default: bool,
    }

    #[derive(Debug, Clone, Deserialize)]
    #[serde(tag = "type", rename_all = "camelCase")]
    enum WorkerMessage {
        Status {
            #[serde(rename = "state")]
            state: String,
            #[serde(rename = "duration_ms")]
            duration_ms: u64,
            #[serde(rename = "mic_level")]
            mic_level: f32,
            #[serde(rename = "system_level")]
            system_level: f32,
        },
        Complete {
            #[serde(rename = "output_path")]
            output_path: String,
            #[serde(rename = "duration_ms")]
            duration_ms: u64,
        },
        Error {
            message: String,
        },
        Devices {
            devices: Vec<AudioDevice>,
        },
        Permission {
            granted: bool,
        },
        #[serde(rename = "settings_opened")]
        SettingsOpened {
            success: bool,
        },
    }

    #[test]
    fn test_parse_status_message_recording() {
        let json = r#"{"type":"status","state":"recording","duration_ms":5000,"mic_level":0.75,"system_level":0.5}"#;
        let msg: WorkerMessage = serde_json::from_str(json).unwrap();

        match msg {
            WorkerMessage::Status { state, duration_ms, mic_level, system_level } => {
                assert_eq!(state, "recording");
                assert_eq!(duration_ms, 5000);
                assert!((mic_level - 0.75).abs() < 0.001);
                assert!((system_level - 0.5).abs() < 0.001);
            }
            _ => panic!("Expected Status message"),
        }
    }

    #[test]
    fn test_parse_status_message_with_high_levels() {
        let json = r#"{"type":"status","state":"recording","duration_ms":10000,"mic_level":1.0,"system_level":1.0}"#;
        let msg: WorkerMessage = serde_json::from_str(json).unwrap();

        match msg {
            WorkerMessage::Status { mic_level, system_level, .. } => {
                assert_eq!(mic_level, 1.0);
                assert_eq!(system_level, 1.0);
            }
            _ => panic!("Expected Status message"),
        }
    }

    #[test]
    fn test_parse_complete_message() {
        let json = r#"{"type":"complete","output_path":"/tmp/test.wav","duration_ms":120000}"#;
        let msg: WorkerMessage = serde_json::from_str(json).unwrap();

        match msg {
            WorkerMessage::Complete { output_path, duration_ms } => {
                assert_eq!(output_path, "/tmp/test.wav");
                assert_eq!(duration_ms, 120000);
            }
            _ => panic!("Expected Complete message"),
        }
    }

    #[test]
    fn test_parse_complete_message_with_special_path() {
        let json = r#"{"type":"complete","output_path":"/Users/test/My Documents/recording (1).wav","duration_ms":5000}"#;
        let msg: WorkerMessage = serde_json::from_str(json).unwrap();

        match msg {
            WorkerMessage::Complete { output_path, .. } => {
                assert!(output_path.contains("My Documents"));
                assert!(output_path.contains("recording (1)"));
            }
            _ => panic!("Expected Complete message"),
        }
    }

    #[test]
    fn test_parse_error_message() {
        let json = r#"{"type":"error","message":"Permission denied"}"#;
        let msg: WorkerMessage = serde_json::from_str(json).unwrap();

        match msg {
            WorkerMessage::Error { message } => {
                assert_eq!(message, "Permission denied");
            }
            _ => panic!("Expected Error message"),
        }
    }

    #[test]
    fn test_parse_error_message_with_details() {
        let json = r#"{"type":"error","message":"Failed to start capture: Screen recording permission denied. Please grant permission in System Settings > Privacy & Security > Screen Recording"}"#;
        let msg: WorkerMessage = serde_json::from_str(json).unwrap();

        match msg {
            WorkerMessage::Error { message } => {
                assert!(message.contains("Screen recording permission"));
                assert!(message.contains("System Settings"));
            }
            _ => panic!("Expected Error message"),
        }
    }

    #[test]
    fn test_parse_devices_message_single_device() {
        let json = r#"{"type":"devices","devices":[{"id":"77","name":"Built-in Microphone","isDefault":true}]}"#;
        let msg: WorkerMessage = serde_json::from_str(json).unwrap();

        match msg {
            WorkerMessage::Devices { devices } => {
                assert_eq!(devices.len(), 1);
                assert_eq!(devices[0].id, "77");
                assert_eq!(devices[0].name, "Built-in Microphone");
                assert!(devices[0].is_default);
            }
            _ => panic!("Expected Devices message"),
        }
    }

    #[test]
    fn test_parse_devices_message_multiple_devices() {
        let json = r#"{"type":"devices","devices":[
            {"id":"77","name":"Built-in Microphone","isDefault":true},
            {"id":"123","name":"USB Microphone","isDefault":false},
            {"id":"456","name":"Bluetooth Headset","isDefault":false}
        ]}"#;
        let msg: WorkerMessage = serde_json::from_str(json).unwrap();

        match msg {
            WorkerMessage::Devices { devices } => {
                assert_eq!(devices.len(), 3);
                let default_count = devices.iter().filter(|d| d.is_default).count();
                assert_eq!(default_count, 1);
            }
            _ => panic!("Expected Devices message"),
        }
    }

    #[test]
    fn test_parse_devices_message_empty() {
        let json = r#"{"type":"devices","devices":[]}"#;
        let msg: WorkerMessage = serde_json::from_str(json).unwrap();

        match msg {
            WorkerMessage::Devices { devices } => {
                assert!(devices.is_empty());
            }
            _ => panic!("Expected Devices message"),
        }
    }

    #[test]
    fn test_parse_permission_granted() {
        let json = r#"{"type":"permission","granted":true}"#;
        let msg: WorkerMessage = serde_json::from_str(json).unwrap();

        match msg {
            WorkerMessage::Permission { granted } => {
                assert!(granted);
            }
            _ => panic!("Expected Permission message"),
        }
    }

    #[test]
    fn test_parse_permission_denied() {
        let json = r#"{"type":"permission","granted":false}"#;
        let msg: WorkerMessage = serde_json::from_str(json).unwrap();

        match msg {
            WorkerMessage::Permission { granted } => {
                assert!(!granted);
            }
            _ => panic!("Expected Permission message"),
        }
    }

    #[test]
    fn test_parse_settings_opened() {
        let json = r#"{"type":"settings_opened","success":true}"#;
        let msg: WorkerMessage = serde_json::from_str(json).unwrap();

        match msg {
            WorkerMessage::SettingsOpened { success } => {
                assert!(success);
            }
            _ => panic!("Expected SettingsOpened message"),
        }
    }

    #[test]
    fn test_status_message_field_order_independence() {
        // Test that field order doesn't matter
        let json1 = r#"{"type":"status","state":"recording","duration_ms":1000,"mic_level":0.5,"system_level":0.3}"#;
        let json2 = r#"{"state":"recording","type":"status","system_level":0.3,"mic_level":0.5,"duration_ms":1000}"#;
        let json3 = r#"{"mic_level":0.5,"duration_ms":1000,"type":"status","state":"recording","system_level":0.3}"#;

        for json in [json1, json2, json3] {
            let msg: WorkerMessage = serde_json::from_str(json).unwrap();
            match msg {
                WorkerMessage::Status { duration_ms, .. } => {
                    assert_eq!(duration_ms, 1000);
                }
                _ => panic!("Expected Status message"),
            }
        }
    }
}

// ==========================================
// Recording Configuration Tests
// ==========================================

mod recording_config_tests {
    use serde::{Deserialize, Serialize};

    #[derive(Debug, Clone, Serialize, Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct RecordingConfig {
        mic_device_id: Option<String>,
        capture_system_audio: bool,
        sample_rate: u32,
        mic_volume: f32,
        system_volume: f32,
    }

    impl Default for RecordingConfig {
        fn default() -> Self {
            Self {
                mic_device_id: None,
                capture_system_audio: false,
                sample_rate: 16000,
                mic_volume: 1.0,
                system_volume: 0.7,
            }
        }
    }

    #[test]
    fn test_default_config() {
        let config = RecordingConfig::default();
        assert!(config.mic_device_id.is_none());
        assert!(!config.capture_system_audio);
        assert_eq!(config.sample_rate, 16000);
        assert_eq!(config.mic_volume, 1.0);
        assert_eq!(config.system_volume, 0.7);
    }

    #[test]
    fn test_serialize_default_config() {
        let config = RecordingConfig::default();
        let json = serde_json::to_string(&config).unwrap();

        assert!(json.contains("\"micDeviceId\":null"));
        assert!(json.contains("\"captureSystemAudio\":false"));
        assert!(json.contains("\"sampleRate\":16000"));
    }

    #[test]
    fn test_deserialize_config_with_device() {
        let json = r#"{"micDeviceId":"77","captureSystemAudio":true,"sampleRate":44100,"micVolume":0.8,"systemVolume":0.6}"#;
        let config: RecordingConfig = serde_json::from_str(json).unwrap();

        assert_eq!(config.mic_device_id, Some("77".to_string()));
        assert!(config.capture_system_audio);
        assert_eq!(config.sample_rate, 44100);
        assert_eq!(config.mic_volume, 0.8);
        assert_eq!(config.system_volume, 0.6);
    }

    #[test]
    fn test_config_sample_rates() {
        let sample_rates = [8000u32, 16000, 22050, 44100, 48000, 96000];

        for rate in sample_rates {
            let config = RecordingConfig {
                sample_rate: rate,
                ..Default::default()
            };
            let json = serde_json::to_string(&config).unwrap();
            let parsed: RecordingConfig = serde_json::from_str(&json).unwrap();
            assert_eq!(parsed.sample_rate, rate);
        }
    }

    #[test]
    fn test_config_volume_ranges() {
        // Test edge cases
        let volumes = [0.0f32, 0.1, 0.5, 1.0, 1.5, 2.0];

        for vol in volumes {
            let config = RecordingConfig {
                mic_volume: vol,
                system_volume: vol,
                ..Default::default()
            };
            let json = serde_json::to_string(&config).unwrap();
            let parsed: RecordingConfig = serde_json::from_str(&json).unwrap();
            assert!((parsed.mic_volume - vol).abs() < 0.001);
            assert!((parsed.system_volume - vol).abs() < 0.001);
        }
    }

    #[test]
    fn test_config_roundtrip() {
        let config = RecordingConfig {
            mic_device_id: Some("test-device-123".to_string()),
            capture_system_audio: true,
            sample_rate: 48000,
            mic_volume: 0.9,
            system_volume: 0.5,
        };

        let json = serde_json::to_string(&config).unwrap();
        let parsed: RecordingConfig = serde_json::from_str(&json).unwrap();

        assert_eq!(config.mic_device_id, parsed.mic_device_id);
        assert_eq!(config.capture_system_audio, parsed.capture_system_audio);
        assert_eq!(config.sample_rate, parsed.sample_rate);
        assert!((config.mic_volume - parsed.mic_volume).abs() < 0.001);
        assert!((config.system_volume - parsed.system_volume).abs() < 0.001);
    }
}

// ==========================================
// WAV File Format Tests
// ==========================================

mod wav_format_tests {

    /// WAV file header structure
    #[allow(dead_code)]
    struct WavHeader {
        chunk_id: [u8; 4],      // "RIFF"
        chunk_size: u32,        // File size - 8
        format: [u8; 4],        // "WAVE"
        subchunk1_id: [u8; 4],  // "fmt "
        subchunk1_size: u32,    // 16 for PCM
        audio_format: u16,      // 1 for PCM
        num_channels: u16,
        sample_rate: u32,
        byte_rate: u32,
        block_align: u16,
        bits_per_sample: u16,
        subchunk2_id: [u8; 4],  // "data"
        subchunk2_size: u32,    // Data size
    }

    fn parse_wav_header(data: &[u8]) -> Option<WavHeader> {
        if data.len() < 44 {
            return None;
        }

        Some(WavHeader {
            chunk_id: [data[0], data[1], data[2], data[3]],
            chunk_size: u32::from_le_bytes([data[4], data[5], data[6], data[7]]),
            format: [data[8], data[9], data[10], data[11]],
            subchunk1_id: [data[12], data[13], data[14], data[15]],
            subchunk1_size: u32::from_le_bytes([data[16], data[17], data[18], data[19]]),
            audio_format: u16::from_le_bytes([data[20], data[21]]),
            num_channels: u16::from_le_bytes([data[22], data[23]]),
            sample_rate: u32::from_le_bytes([data[24], data[25], data[26], data[27]]),
            byte_rate: u32::from_le_bytes([data[28], data[29], data[30], data[31]]),
            block_align: u16::from_le_bytes([data[32], data[33]]),
            bits_per_sample: u16::from_le_bytes([data[34], data[35]]),
            subchunk2_id: [data[36], data[37], data[38], data[39]],
            subchunk2_size: u32::from_le_bytes([data[40], data[41], data[42], data[43]]),
        })
    }

    #[test]
    fn test_wav_header_riff_format() {
        // Create a minimal WAV header
        let mut header = vec![0u8; 44];
        header[0..4].copy_from_slice(b"RIFF");
        header[8..12].copy_from_slice(b"WAVE");
        header[12..16].copy_from_slice(b"fmt ");
        header[36..40].copy_from_slice(b"data");

        let parsed = parse_wav_header(&header).unwrap();
        assert_eq!(&parsed.chunk_id, b"RIFF");
        assert_eq!(&parsed.format, b"WAVE");
        assert_eq!(&parsed.subchunk1_id, b"fmt ");
        assert_eq!(&parsed.subchunk2_id, b"data");
    }

    #[test]
    fn test_wav_header_pcm_format() {
        let mut header = vec![0u8; 44];
        header[0..4].copy_from_slice(b"RIFF");
        header[8..12].copy_from_slice(b"WAVE");
        header[12..16].copy_from_slice(b"fmt ");
        // PCM format = 1
        header[20] = 1;
        header[21] = 0;

        let parsed = parse_wav_header(&header).unwrap();
        assert_eq!(parsed.audio_format, 1);
    }

    #[test]
    fn test_wav_header_16khz_mono() {
        let mut header = vec![0u8; 44];
        header[0..4].copy_from_slice(b"RIFF");
        header[8..12].copy_from_slice(b"WAVE");
        header[12..16].copy_from_slice(b"fmt ");

        // 16 for PCM subchunk size
        header[16..20].copy_from_slice(&16u32.to_le_bytes());
        // PCM format
        header[20..22].copy_from_slice(&1u16.to_le_bytes());
        // 1 channel
        header[22..24].copy_from_slice(&1u16.to_le_bytes());
        // 16000 Hz
        header[24..28].copy_from_slice(&16000u32.to_le_bytes());
        // Byte rate: 16000 * 1 * 16 / 8 = 32000
        header[28..32].copy_from_slice(&32000u32.to_le_bytes());
        // Block align: 1 * 16 / 8 = 2
        header[32..34].copy_from_slice(&2u16.to_le_bytes());
        // 16 bits per sample
        header[34..36].copy_from_slice(&16u16.to_le_bytes());
        header[36..40].copy_from_slice(b"data");

        let parsed = parse_wav_header(&header).unwrap();
        assert_eq!(parsed.num_channels, 1);
        assert_eq!(parsed.sample_rate, 16000);
        assert_eq!(parsed.bits_per_sample, 16);
        assert_eq!(parsed.byte_rate, 32000);
        assert_eq!(parsed.block_align, 2);
    }

    #[test]
    fn test_wav_duration_calculation() {
        // For a WAV file: duration = data_size / byte_rate
        let sample_rate = 16000u32;
        let channels = 1u16;
        let bits_per_sample = 16u16;
        let byte_rate = sample_rate * channels as u32 * bits_per_sample as u32 / 8;

        // 1 second of audio
        let one_second_bytes = byte_rate;
        let duration = one_second_bytes as f64 / byte_rate as f64;
        assert!((duration - 1.0).abs() < 0.001);

        // 10 seconds of audio
        let ten_seconds_bytes = byte_rate * 10;
        let duration = ten_seconds_bytes as f64 / byte_rate as f64;
        assert!((duration - 10.0).abs() < 0.001);
    }

    #[test]
    fn test_wav_file_size_calculation() {
        // WAV file size = 44 (header) + data_size
        let duration_seconds = 5.0;
        let sample_rate = 16000u32;
        let channels = 1u16;
        let bits_per_sample = 16u16;

        let data_size = (duration_seconds * sample_rate as f64 * channels as f64 * bits_per_sample as f64 / 8.0) as u32;
        let file_size = 44 + data_size;

        // 5 seconds at 16kHz mono 16-bit = 5 * 16000 * 1 * 2 = 160000 bytes + 44 header
        assert_eq!(data_size, 160000);
        assert_eq!(file_size, 160044);
    }
}

// ==========================================
// Recording State Machine Tests
// ==========================================

mod state_machine_tests {
    use serde::{Deserialize, Serialize};

    #[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
    #[serde(rename_all = "camelCase")]
    enum RecordingState {
        Idle,
        Recording,
        Stopping,
    }

    #[derive(Debug, Clone)]
    struct RecordingStatus {
        state: RecordingState,
        duration_ms: u64,
        mic_level: f32,
        system_level: f32,
    }

    impl Default for RecordingStatus {
        fn default() -> Self {
            Self {
                state: RecordingState::Idle,
                duration_ms: 0,
                mic_level: 0.0,
                system_level: 0.0,
            }
        }
    }

    #[test]
    fn test_initial_state_is_idle() {
        let status = RecordingStatus::default();
        assert_eq!(status.state, RecordingState::Idle);
        assert_eq!(status.duration_ms, 0);
        assert_eq!(status.mic_level, 0.0);
        assert_eq!(status.system_level, 0.0);
    }

    #[test]
    fn test_state_transition_idle_to_recording() {
        let mut status = RecordingStatus::default();
        assert_eq!(status.state, RecordingState::Idle);

        status.state = RecordingState::Recording;
        assert_eq!(status.state, RecordingState::Recording);
    }

    #[test]
    fn test_state_transition_recording_to_stopping() {
        let mut status = RecordingStatus {
            state: RecordingState::Recording,
            duration_ms: 5000,
            ..Default::default()
        };

        status.state = RecordingState::Stopping;
        assert_eq!(status.state, RecordingState::Stopping);
        // Duration should be preserved
        assert_eq!(status.duration_ms, 5000);
    }

    #[test]
    fn test_state_transition_stopping_to_idle() {
        let mut status = RecordingStatus {
            state: RecordingState::Stopping,
            ..Default::default()
        };

        status.state = RecordingState::Idle;
        assert_eq!(status.state, RecordingState::Idle);
    }

    #[test]
    fn test_full_recording_cycle() {
        let mut status = RecordingStatus::default();

        // Start recording
        assert_eq!(status.state, RecordingState::Idle);
        status.state = RecordingState::Recording;
        assert_eq!(status.state, RecordingState::Recording);

        // Simulate recording progress
        status.duration_ms = 1000;
        status.mic_level = 0.5;
        status.system_level = 0.3;

        assert_eq!(status.duration_ms, 1000);
        assert_eq!(status.mic_level, 0.5);
        assert_eq!(status.system_level, 0.3);

        // More progress
        status.duration_ms = 5000;
        status.mic_level = 0.8;
        status.system_level = 0.6;

        // Stop recording
        status.state = RecordingState::Stopping;
        assert_eq!(status.state, RecordingState::Stopping);

        // Complete
        status.state = RecordingState::Idle;
        assert_eq!(status.state, RecordingState::Idle);
    }

    #[test]
    fn test_recording_state_serialization() {
        assert_eq!(serde_json::to_string(&RecordingState::Idle).unwrap(), "\"idle\"");
        assert_eq!(serde_json::to_string(&RecordingState::Recording).unwrap(), "\"recording\"");
        assert_eq!(serde_json::to_string(&RecordingState::Stopping).unwrap(), "\"stopping\"");
    }

    #[test]
    fn test_recording_state_deserialization() {
        let idle: RecordingState = serde_json::from_str("\"idle\"").unwrap();
        let recording: RecordingState = serde_json::from_str("\"recording\"").unwrap();
        let stopping: RecordingState = serde_json::from_str("\"stopping\"").unwrap();

        assert_eq!(idle, RecordingState::Idle);
        assert_eq!(recording, RecordingState::Recording);
        assert_eq!(stopping, RecordingState::Stopping);
    }

    #[test]
    fn test_level_updates_during_recording() {
        let mut status = RecordingStatus {
            state: RecordingState::Recording,
            ..Default::default()
        };

        // Simulate fluctuating audio levels
        let level_samples = [0.1f32, 0.3, 0.7, 0.9, 0.5, 0.2, 0.0, 0.4, 1.0, 0.6];

        for level in level_samples {
            status.mic_level = level;
            assert!(status.mic_level >= 0.0);
            assert!(status.mic_level <= 1.0);
        }
    }

    #[test]
    fn test_duration_increments() {
        let mut status = RecordingStatus {
            state: RecordingState::Recording,
            ..Default::default()
        };

        // Simulate 100ms intervals
        for i in 1..=50 {
            status.duration_ms = i * 100;
            assert_eq!(status.duration_ms, i * 100);
        }

        // Final duration should be 5000ms (5 seconds)
        assert_eq!(status.duration_ms, 5000);
    }
}

// ==========================================
// Audio Level Calculation Tests
// ==========================================

mod audio_level_tests {
    /// Calculate RMS level from samples (same algorithm as Swift worker)
    fn calculate_level(samples: &[f32]) -> f32 {
        if samples.is_empty() {
            return 0.0;
        }
        let sum_squares: f32 = samples.iter().map(|s| s * s).sum();
        let rms = (sum_squares / samples.len() as f32).sqrt();
        (rms * 3.0).min(1.0)
    }

    #[test]
    fn test_silence_level() {
        let samples = vec![0.0f32; 1024];
        let level = calculate_level(&samples);
        assert_eq!(level, 0.0);
    }

    #[test]
    fn test_low_level_audio() {
        let samples: Vec<f32> = (0..1024).map(|i| (i as f32 * 0.01).sin() * 0.1).collect();
        let level = calculate_level(&samples);
        assert!(level > 0.0);
        assert!(level < 0.5);
    }

    #[test]
    fn test_medium_level_audio() {
        let samples: Vec<f32> = (0..1024).map(|i| (i as f32 * 0.01).sin() * 0.5).collect();
        let level = calculate_level(&samples);
        assert!(level > 0.3);
        assert!(level <= 1.0); // Level is capped at 1.0
    }

    #[test]
    fn test_high_level_audio() {
        let samples: Vec<f32> = (0..1024).map(|i| (i as f32 * 0.01).sin() * 1.0).collect();
        let level = calculate_level(&samples);
        assert!(level > 0.5);
        assert!(level <= 1.0);
    }

    #[test]
    fn test_clipping_audio() {
        // Full scale audio should be capped at 1.0
        let samples = vec![1.0f32; 1024];
        let level = calculate_level(&samples);
        assert_eq!(level, 1.0);
    }

    #[test]
    fn test_negative_samples() {
        // RMS should work with negative values
        let samples = vec![-0.5f32; 1024];
        let level = calculate_level(&samples);
        assert!(level > 0.0);
    }

    #[test]
    fn test_empty_samples() {
        let samples: Vec<f32> = vec![];
        let level = calculate_level(&samples);
        assert_eq!(level, 0.0);
    }

    #[test]
    fn test_single_sample() {
        let samples = vec![0.5f32];
        let level = calculate_level(&samples);
        assert!(level > 0.0);
    }

    #[test]
    fn test_alternating_samples() {
        // Alternating positive/negative should still compute correctly
        let samples: Vec<f32> = (0..1024).map(|i| if i % 2 == 0 { 0.5 } else { -0.5 }).collect();
        let level = calculate_level(&samples);
        assert!(level > 0.0);
    }
}

// ==========================================
// Command Line Argument Tests
// ==========================================

mod cli_argument_tests {
    /// Represents the expected command line format
    fn build_record_command(
        output: &str,
        sample_rate: u32,
        mic_volume: f32,
        system_volume: f32,
        system_audio: bool,
        mic_device: Option<&str>,
    ) -> Vec<String> {
        let mut args = vec![
            "--output".to_string(),
            output.to_string(),
            "--sample-rate".to_string(),
            sample_rate.to_string(),
            "--mic-volume".to_string(),
            mic_volume.to_string(),
            "--system-volume".to_string(),
            system_volume.to_string(),
        ];

        if system_audio {
            args.push("--system-audio".to_string());
        }

        if let Some(device) = mic_device {
            args.push("--mic-device".to_string());
            args.push(device.to_string());
        }

        args
    }

    #[test]
    fn test_build_basic_command() {
        let args = build_record_command("/tmp/test.wav", 16000, 1.0, 0.7, false, None);

        assert!(args.contains(&"--output".to_string()));
        assert!(args.contains(&"/tmp/test.wav".to_string()));
        assert!(args.contains(&"--sample-rate".to_string()));
        assert!(args.contains(&"16000".to_string()));
        assert!(!args.contains(&"--system-audio".to_string()));
        assert!(!args.contains(&"--mic-device".to_string()));
    }

    #[test]
    fn test_build_command_with_system_audio() {
        let args = build_record_command("/tmp/test.wav", 16000, 1.0, 0.7, true, None);

        assert!(args.contains(&"--system-audio".to_string()));
    }

    #[test]
    fn test_build_command_with_mic_device() {
        let args = build_record_command("/tmp/test.wav", 16000, 1.0, 0.7, false, Some("77"));

        assert!(args.contains(&"--mic-device".to_string()));
        assert!(args.contains(&"77".to_string()));
    }

    #[test]
    fn test_build_full_command() {
        let args = build_record_command("/tmp/test.wav", 48000, 0.8, 0.5, true, Some("device-123"));

        assert!(args.contains(&"48000".to_string()));
        assert!(args.contains(&"0.8".to_string()));
        assert!(args.contains(&"0.5".to_string()));
        assert!(args.contains(&"--system-audio".to_string()));
        assert!(args.contains(&"device-123".to_string()));
    }

    #[test]
    fn test_path_with_spaces() {
        let args = build_record_command("/Users/test/My Documents/audio.wav", 16000, 1.0, 0.7, false, None);

        assert!(args.contains(&"/Users/test/My Documents/audio.wav".to_string()));
    }

    #[test]
    fn test_device_id_special_chars() {
        let args = build_record_command("/tmp/test.wav", 16000, 1.0, 0.7, false, Some("device:123/usb"));

        assert!(args.contains(&"device:123/usb".to_string()));
    }
}

// ==========================================
// Error Handling Tests
// ==========================================

mod error_handling_tests {
    use serde::Deserialize;

    #[derive(Debug, Deserialize)]
    struct ErrorMessage {
        #[serde(rename = "type")]
        msg_type: String,
        message: String,
    }

    #[test]
    fn test_parse_permission_error() {
        let json = r#"{"type":"error","message":"Screen recording permission denied"}"#;
        let error: ErrorMessage = serde_json::from_str(json).unwrap();

        assert_eq!(error.msg_type, "error");
        assert!(error.message.contains("permission"));
    }

    #[test]
    fn test_parse_device_error() {
        let json = r#"{"type":"error","message":"Failed to set input device (status: -10863)"}"#;
        let error: ErrorMessage = serde_json::from_str(json).unwrap();

        assert_eq!(error.msg_type, "error");
        assert!(error.message.contains("device"));
    }

    #[test]
    fn test_parse_engine_error() {
        let json = r#"{"type":"error","message":"Failed to create audio engine"}"#;
        let error: ErrorMessage = serde_json::from_str(json).unwrap();

        assert!(error.message.contains("audio engine"));
    }

    #[test]
    fn test_parse_file_error() {
        let json = r#"{"type":"error","message":"Error writing samples: The file doesn't exist."}"#;
        let error: ErrorMessage = serde_json::from_str(json).unwrap();

        assert!(error.message.contains("writing"));
    }

    #[test]
    fn test_error_with_unicode() {
        let json = r#"{"type":"error","message":"錯誤：無法訪問麥克風"}"#;
        let error: ErrorMessage = serde_json::from_str(json).unwrap();

        assert!(error.message.contains("錯誤"));
    }

    #[test]
    fn test_error_with_newlines() {
        let json = r#"{"type":"error","message":"Error occurred.\nPlease try again."}"#;
        let error: ErrorMessage = serde_json::from_str(json).unwrap();

        assert!(error.message.contains("\n"));
    }
}

// ==========================================
// Audio Mixing Tests
// ==========================================

mod audio_mixing_tests {
    /// Soft clipping function (tanh)
    fn soft_clip(x: f32) -> f32 {
        x.tanh()
    }

    /// Mix two audio samples with volumes
    fn mix_samples(mic: f32, system: f32, mic_vol: f32, sys_vol: f32) -> f32 {
        soft_clip(mic * mic_vol + system * sys_vol)
    }

    #[test]
    fn test_mix_silence() {
        let result = mix_samples(0.0, 0.0, 1.0, 0.7);
        assert_eq!(result, 0.0);
    }

    #[test]
    fn test_mix_mic_only() {
        let result = mix_samples(0.5, 0.0, 1.0, 0.7);
        let expected = (0.5f32 * 1.0).tanh();
        assert!((result - expected).abs() < 0.001);
    }

    #[test]
    fn test_mix_system_only() {
        let result = mix_samples(0.0, 0.5, 1.0, 0.7);
        let expected = (0.5f32 * 0.7).tanh();
        assert!((result - expected).abs() < 0.001);
    }

    #[test]
    fn test_mix_both_sources() {
        let result = mix_samples(0.5, 0.5, 1.0, 0.7);
        let expected = (0.5f32 * 1.0 + 0.5 * 0.7).tanh();
        assert!((result - expected).abs() < 0.001);
    }

    #[test]
    fn test_soft_clipping_prevents_overflow() {
        // Even with very loud sources, output should be bounded
        let result = mix_samples(1.0, 1.0, 1.0, 1.0);
        assert!(result <= 1.0);
        assert!(result > 0.9); // tanh(2) ≈ 0.964
    }

    #[test]
    fn test_soft_clipping_with_extreme_values() {
        let result = mix_samples(10.0, 10.0, 1.0, 1.0);
        assert!(result <= 1.0);
        assert!(result > 0.99); // tanh(20) ≈ 1.0
    }

    #[test]
    fn test_volume_zero_mutes() {
        let result = mix_samples(1.0, 1.0, 0.0, 0.0);
        assert_eq!(result, 0.0);
    }

    #[test]
    fn test_negative_samples() {
        let result = mix_samples(-0.5, -0.5, 1.0, 0.7);
        let expected = (-0.5f32 * 1.0 + -0.5 * 0.7).tanh();
        assert!((result - expected).abs() < 0.001);
    }

    #[test]
    fn test_mixed_polarity() {
        let result = mix_samples(0.5, -0.5, 1.0, 1.0);
        let expected = (0.5f32 * 1.0 + -0.5 * 1.0).tanh();
        assert!((result - expected).abs() < 0.001);
        assert_eq!(result, 0.0); // Should cancel out
    }
}
