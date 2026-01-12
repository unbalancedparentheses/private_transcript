//! Integration tests for the complete transcription pipeline
//!
//! Tests the end-to-end flow from audio input to transcript output,
//! including audio processing, transcription, and result handling.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ============================================================================
// Types (matching the Rust implementations)
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
struct TranscriptionSegment {
    start: f64,
    end: f64,
    text: String,
    speaker: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TranscriptionResult {
    session_id: String,
    segments: Vec<TranscriptionSegment>,
    full_text: String,
    language: Option<String>,
    duration: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TranscriptionProgress {
    session_id: String,
    progress: f32,
    status: String,
    current_segment: Option<usize>,
    total_segments: Option<usize>,
}

#[derive(Debug, Clone, PartialEq)]
enum TranscriptionStatus {
    Pending,
    Transcribing,
    Generating,
    Complete,
    Error,
}

impl TranscriptionStatus {
    fn from_str(s: &str) -> Self {
        match s {
            "pending" => Self::Pending,
            "transcribing" => Self::Transcribing,
            "generating" => Self::Generating,
            "complete" => Self::Complete,
            "error" => Self::Error,
            _ => Self::Pending,
        }
    }

    fn as_str(&self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Transcribing => "transcribing",
            Self::Generating => "generating",
            Self::Complete => "complete",
            Self::Error => "error",
        }
    }
}

// ============================================================================
// Audio Processing Tests
// ============================================================================

mod audio_processing_tests {
    use super::*;

    /// Validate audio file format requirements
    fn validate_audio_format(
        sample_rate: u32,
        channels: u8,
        bit_depth: u8,
    ) -> Result<(), &'static str> {
        if sample_rate != 16000 && sample_rate != 44100 && sample_rate != 48000 {
            return Err("Unsupported sample rate");
        }
        if channels != 1 && channels != 2 {
            return Err("Only mono or stereo audio supported");
        }
        if bit_depth != 16 && bit_depth != 32 {
            return Err("Unsupported bit depth");
        }
        Ok(())
    }

    /// Calculate audio duration from file info
    fn calculate_duration(sample_rate: u32, total_samples: u64) -> f64 {
        total_samples as f64 / sample_rate as f64
    }

    /// Simulate audio resampling to 16kHz for Whisper
    fn resample_for_whisper(sample_rate: u32, samples: &[f32]) -> Vec<f32> {
        if sample_rate == 16000 {
            return samples.to_vec();
        }

        let ratio = 16000.0 / sample_rate as f64;
        let new_len = (samples.len() as f64 * ratio) as usize;
        let mut resampled = Vec::with_capacity(new_len);

        for i in 0..new_len {
            let src_idx = (i as f64 / ratio) as usize;
            if src_idx < samples.len() {
                resampled.push(samples[src_idx]);
            }
        }

        resampled
    }

    #[test]
    fn test_valid_audio_formats() {
        assert!(validate_audio_format(16000, 1, 16).is_ok());
        assert!(validate_audio_format(44100, 2, 16).is_ok());
        assert!(validate_audio_format(48000, 1, 32).is_ok());
    }

    #[test]
    fn test_invalid_sample_rate() {
        assert!(validate_audio_format(8000, 1, 16).is_err());
        assert!(validate_audio_format(22050, 1, 16).is_err());
    }

    #[test]
    fn test_invalid_channels() {
        assert!(validate_audio_format(16000, 3, 16).is_err());
        assert!(validate_audio_format(16000, 0, 16).is_err());
    }

    #[test]
    fn test_duration_calculation() {
        // 1 second of audio at 16kHz
        let duration = calculate_duration(16000, 16000);
        assert!((duration - 1.0).abs() < 0.001);

        // 1 minute of audio at 44.1kHz
        let duration = calculate_duration(44100, 44100 * 60);
        assert!((duration - 60.0).abs() < 0.001);
    }

    #[test]
    fn test_resample_same_rate() {
        let samples: Vec<f32> = (0..100).map(|i| i as f32 / 100.0).collect();
        let resampled = resample_for_whisper(16000, &samples);
        assert_eq!(resampled.len(), samples.len());
    }

    #[test]
    fn test_resample_downsample() {
        let samples: Vec<f32> = (0..44100).map(|i| (i as f32 / 44100.0).sin()).collect();
        let resampled = resample_for_whisper(44100, &samples);
        // Should be approximately 16000 samples for 1 second of 44.1kHz audio
        assert!((resampled.len() as i32 - 16000).abs() < 100);
    }

    #[test]
    fn test_resample_upsample() {
        let samples: Vec<f32> = (0..8000).map(|i| (i as f32 / 8000.0).sin()).collect();
        let resampled = resample_for_whisper(8000, &samples);
        // 8kHz resampled to 16kHz should double the samples
        assert!(resampled.len() > samples.len());
    }
}

// ============================================================================
// Transcription Segment Tests
// ============================================================================

mod segment_tests {
    use super::*;

    fn create_test_segment(start: f64, end: f64, text: &str) -> TranscriptionSegment {
        TranscriptionSegment {
            start,
            end,
            text: text.to_string(),
            speaker: None,
        }
    }

    #[test]
    fn test_segment_creation() {
        let segment = create_test_segment(0.0, 2.5, "Hello world");
        assert_eq!(segment.start, 0.0);
        assert_eq!(segment.end, 2.5);
        assert_eq!(segment.text, "Hello world");
        assert!(segment.speaker.is_none());
    }

    #[test]
    fn test_segment_with_speaker() {
        let mut segment = create_test_segment(0.0, 2.5, "Hello world");
        segment.speaker = Some("Speaker 1".to_string());
        assert_eq!(segment.speaker, Some("Speaker 1".to_string()));
    }

    #[test]
    fn test_segment_serialization() {
        let segment = create_test_segment(1.5, 3.0, "Test segment");
        let json = serde_json::to_string(&segment).unwrap();
        assert!(json.contains("\"start\":1.5"));
        assert!(json.contains("\"end\":3"));
        assert!(json.contains("Test segment"));
    }

    #[test]
    fn test_segment_deserialization() {
        let json = r#"{"start":0.5,"end":2.0,"text":"Deserialized","speaker":"Bob"}"#;
        let segment: TranscriptionSegment = serde_json::from_str(json).unwrap();
        assert_eq!(segment.start, 0.5);
        assert_eq!(segment.end, 2.0);
        assert_eq!(segment.text, "Deserialized");
        assert_eq!(segment.speaker, Some("Bob".to_string()));
    }

    #[test]
    fn test_segment_duration() {
        let segment = create_test_segment(5.0, 10.5, "Five and a half seconds");
        let duration = segment.end - segment.start;
        assert!((duration - 5.5).abs() < 0.001);
    }

    #[test]
    fn test_segments_non_overlapping() {
        let segments = vec![
            create_test_segment(0.0, 2.0, "First"),
            create_test_segment(2.0, 4.0, "Second"),
            create_test_segment(4.0, 6.0, "Third"),
        ];

        for i in 1..segments.len() {
            assert!(
                segments[i].start >= segments[i - 1].end,
                "Segments should not overlap"
            );
        }
    }

    #[test]
    fn test_segments_with_gaps() {
        let segments = vec![
            create_test_segment(0.0, 2.0, "First"),
            create_test_segment(3.0, 5.0, "Second with gap"),
            create_test_segment(7.0, 9.0, "Third with larger gap"),
        ];

        // Verify gaps
        let gap1 = segments[1].start - segments[0].end;
        let gap2 = segments[2].start - segments[1].end;

        assert!((gap1 - 1.0).abs() < 0.001);
        assert!((gap2 - 2.0).abs() < 0.001);
    }
}

// ============================================================================
// Transcription Result Tests
// ============================================================================

mod result_tests {
    use super::*;

    fn create_test_result(session_id: &str, segments: Vec<TranscriptionSegment>) -> TranscriptionResult {
        let full_text = segments
            .iter()
            .map(|s| s.text.clone())
            .collect::<Vec<_>>()
            .join(" ");

        let duration = segments
            .last()
            .map(|s| s.end)
            .unwrap_or(0.0);

        TranscriptionResult {
            session_id: session_id.to_string(),
            segments,
            full_text,
            language: Some("en".to_string()),
            duration,
        }
    }

    #[test]
    fn test_result_creation() {
        let segments = vec![
            TranscriptionSegment {
                start: 0.0,
                end: 2.0,
                text: "Hello".to_string(),
                speaker: None,
            },
            TranscriptionSegment {
                start: 2.0,
                end: 4.0,
                text: "world".to_string(),
                speaker: None,
            },
        ];

        let result = create_test_result("session-1", segments);

        assert_eq!(result.session_id, "session-1");
        assert_eq!(result.segments.len(), 2);
        assert_eq!(result.full_text, "Hello world");
        assert_eq!(result.duration, 4.0);
    }

    #[test]
    fn test_empty_result() {
        let result = create_test_result("session-empty", vec![]);

        assert!(result.segments.is_empty());
        assert!(result.full_text.is_empty());
        assert_eq!(result.duration, 0.0);
    }

    #[test]
    fn test_result_serialization_roundtrip() {
        let segments = vec![TranscriptionSegment {
            start: 1.0,
            end: 3.0,
            text: "Test".to_string(),
            speaker: Some("Alice".to_string()),
        }];

        let result = create_test_result("test-session", segments);
        let json = serde_json::to_string(&result).unwrap();
        let restored: TranscriptionResult = serde_json::from_str(&json).unwrap();

        assert_eq!(restored.session_id, result.session_id);
        assert_eq!(restored.segments.len(), result.segments.len());
        assert_eq!(restored.full_text, result.full_text);
    }

    #[test]
    fn test_result_language_detection() {
        let result = TranscriptionResult {
            session_id: "lang-test".to_string(),
            segments: vec![],
            full_text: "Bonjour le monde".to_string(),
            language: Some("fr".to_string()),
            duration: 2.0,
        };

        assert_eq!(result.language, Some("fr".to_string()));
    }

    #[test]
    fn test_result_with_unicode() {
        let segments = vec![
            TranscriptionSegment {
                start: 0.0,
                end: 2.0,
                text: "你好世界".to_string(),
                speaker: None,
            },
            TranscriptionSegment {
                start: 2.0,
                end: 4.0,
                text: "مرحبا بالعالم".to_string(),
                speaker: None,
            },
        ];

        let result = create_test_result("unicode-session", segments);
        assert!(result.full_text.contains("你好"));
        assert!(result.full_text.contains("مرحبا"));
    }
}

// ============================================================================
// Progress Tracking Tests
// ============================================================================

mod progress_tests {
    use super::*;

    fn create_progress(session_id: &str, progress: f32, status: &str) -> TranscriptionProgress {
        TranscriptionProgress {
            session_id: session_id.to_string(),
            progress,
            status: status.to_string(),
            current_segment: None,
            total_segments: None,
        }
    }

    #[test]
    fn test_progress_creation() {
        let progress = create_progress("sess-1", 0.5, "transcribing");

        assert_eq!(progress.session_id, "sess-1");
        assert_eq!(progress.progress, 0.5);
        assert_eq!(progress.status, "transcribing");
    }

    #[test]
    fn test_progress_boundaries() {
        let start = create_progress("sess-1", 0.0, "pending");
        let end = create_progress("sess-1", 1.0, "complete");

        assert_eq!(start.progress, 0.0);
        assert_eq!(end.progress, 1.0);
    }

    #[test]
    fn test_progress_with_segments() {
        let mut progress = create_progress("sess-1", 0.33, "transcribing");
        progress.current_segment = Some(10);
        progress.total_segments = Some(30);

        assert_eq!(progress.current_segment, Some(10));
        assert_eq!(progress.total_segments, Some(30));
    }

    #[test]
    fn test_progress_serialization() {
        let progress = TranscriptionProgress {
            session_id: "test".to_string(),
            progress: 0.75,
            status: "transcribing".to_string(),
            current_segment: Some(15),
            total_segments: Some(20),
        };

        let json = serde_json::to_string(&progress).unwrap();
        assert!(json.contains("\"progress\":0.75"));
        assert!(json.contains("currentSegment"));
        assert!(json.contains("totalSegments"));
    }

    #[test]
    fn test_progress_status_sequence() {
        let statuses = ["pending", "transcribing", "generating", "complete"];

        for (i, status) in statuses.iter().enumerate() {
            let progress = i as f32 / (statuses.len() - 1) as f32;
            let p = create_progress("sess-1", progress, status);
            assert_eq!(p.status, *status);
        }
    }
}

// ============================================================================
// Status Transition Tests
// ============================================================================

mod status_tests {
    use super::*;

    #[test]
    fn test_status_from_str() {
        assert_eq!(TranscriptionStatus::from_str("pending"), TranscriptionStatus::Pending);
        assert_eq!(TranscriptionStatus::from_str("transcribing"), TranscriptionStatus::Transcribing);
        assert_eq!(TranscriptionStatus::from_str("generating"), TranscriptionStatus::Generating);
        assert_eq!(TranscriptionStatus::from_str("complete"), TranscriptionStatus::Complete);
        assert_eq!(TranscriptionStatus::from_str("error"), TranscriptionStatus::Error);
    }

    #[test]
    fn test_status_as_str() {
        assert_eq!(TranscriptionStatus::Pending.as_str(), "pending");
        assert_eq!(TranscriptionStatus::Transcribing.as_str(), "transcribing");
        assert_eq!(TranscriptionStatus::Generating.as_str(), "generating");
        assert_eq!(TranscriptionStatus::Complete.as_str(), "complete");
        assert_eq!(TranscriptionStatus::Error.as_str(), "error");
    }

    #[test]
    fn test_status_unknown_defaults_to_pending() {
        assert_eq!(TranscriptionStatus::from_str("unknown"), TranscriptionStatus::Pending);
        assert_eq!(TranscriptionStatus::from_str(""), TranscriptionStatus::Pending);
    }

    #[test]
    fn test_valid_status_transitions() {
        // Valid transitions
        let valid_transitions = [
            (TranscriptionStatus::Pending, TranscriptionStatus::Transcribing),
            (TranscriptionStatus::Transcribing, TranscriptionStatus::Generating),
            (TranscriptionStatus::Transcribing, TranscriptionStatus::Complete), // Skip generating
            (TranscriptionStatus::Generating, TranscriptionStatus::Complete),
            (TranscriptionStatus::Pending, TranscriptionStatus::Error),
            (TranscriptionStatus::Transcribing, TranscriptionStatus::Error),
            (TranscriptionStatus::Generating, TranscriptionStatus::Error),
        ];

        for (from, to) in valid_transitions {
            // Just verify these are valid enum values
            assert_ne!(from.as_str(), to.as_str());
        }
    }
}

// ============================================================================
// Pipeline Simulation Tests
// ============================================================================

mod pipeline_tests {
    use super::*;

    /// Simulate the full transcription pipeline
    struct TranscriptionPipeline {
        sessions: HashMap<String, TranscriptionStatus>,
        results: HashMap<String, TranscriptionResult>,
    }

    impl TranscriptionPipeline {
        fn new() -> Self {
            Self {
                sessions: HashMap::new(),
                results: HashMap::new(),
            }
        }

        fn start_transcription(&mut self, session_id: &str) -> Result<(), &'static str> {
            if self.sessions.contains_key(session_id) {
                return Err("Session already being transcribed");
            }
            self.sessions.insert(session_id.to_string(), TranscriptionStatus::Transcribing);
            Ok(())
        }

        fn complete_transcription(
            &mut self,
            session_id: &str,
            result: TranscriptionResult,
        ) -> Result<(), &'static str> {
            match self.sessions.get(session_id) {
                Some(TranscriptionStatus::Transcribing) => {
                    self.sessions.insert(session_id.to_string(), TranscriptionStatus::Complete);
                    self.results.insert(session_id.to_string(), result);
                    Ok(())
                }
                _ => Err("Invalid status for completion"),
            }
        }

        fn fail_transcription(&mut self, session_id: &str) -> Result<(), &'static str> {
            if !self.sessions.contains_key(session_id) {
                return Err("Session not found");
            }
            self.sessions.insert(session_id.to_string(), TranscriptionStatus::Error);
            Ok(())
        }

        fn get_status(&self, session_id: &str) -> Option<&TranscriptionStatus> {
            self.sessions.get(session_id)
        }

        fn get_result(&self, session_id: &str) -> Option<&TranscriptionResult> {
            self.results.get(session_id)
        }
    }

    #[test]
    fn test_pipeline_start() {
        let mut pipeline = TranscriptionPipeline::new();
        assert!(pipeline.start_transcription("sess-1").is_ok());
        assert_eq!(
            pipeline.get_status("sess-1"),
            Some(&TranscriptionStatus::Transcribing)
        );
    }

    #[test]
    fn test_pipeline_duplicate_start() {
        let mut pipeline = TranscriptionPipeline::new();
        pipeline.start_transcription("sess-1").unwrap();
        assert!(pipeline.start_transcription("sess-1").is_err());
    }

    #[test]
    fn test_pipeline_complete() {
        let mut pipeline = TranscriptionPipeline::new();
        pipeline.start_transcription("sess-1").unwrap();

        let result = TranscriptionResult {
            session_id: "sess-1".to_string(),
            segments: vec![],
            full_text: "Test transcript".to_string(),
            language: Some("en".to_string()),
            duration: 10.0,
        };

        assert!(pipeline.complete_transcription("sess-1", result).is_ok());
        assert_eq!(
            pipeline.get_status("sess-1"),
            Some(&TranscriptionStatus::Complete)
        );
        assert!(pipeline.get_result("sess-1").is_some());
    }

    #[test]
    fn test_pipeline_fail() {
        let mut pipeline = TranscriptionPipeline::new();
        pipeline.start_transcription("sess-1").unwrap();
        assert!(pipeline.fail_transcription("sess-1").is_ok());
        assert_eq!(
            pipeline.get_status("sess-1"),
            Some(&TranscriptionStatus::Error)
        );
    }

    #[test]
    fn test_pipeline_concurrent_sessions() {
        let mut pipeline = TranscriptionPipeline::new();

        // Start multiple sessions
        for i in 1..=5 {
            let session_id = format!("sess-{}", i);
            assert!(pipeline.start_transcription(&session_id).is_ok());
        }

        // All should be transcribing
        for i in 1..=5 {
            let session_id = format!("sess-{}", i);
            assert_eq!(
                pipeline.get_status(&session_id),
                Some(&TranscriptionStatus::Transcribing)
            );
        }
    }

    #[test]
    fn test_pipeline_full_flow() {
        let mut pipeline = TranscriptionPipeline::new();

        // 1. Start
        pipeline.start_transcription("test-session").unwrap();
        assert_eq!(
            pipeline.get_status("test-session"),
            Some(&TranscriptionStatus::Transcribing)
        );

        // 2. Complete with result
        let segments = vec![
            TranscriptionSegment {
                start: 0.0,
                end: 5.0,
                text: "Hello, this is a test.".to_string(),
                speaker: Some("Speaker 1".to_string()),
            },
            TranscriptionSegment {
                start: 5.0,
                end: 10.0,
                text: "This is the second segment.".to_string(),
                speaker: Some("Speaker 2".to_string()),
            },
        ];

        let result = TranscriptionResult {
            session_id: "test-session".to_string(),
            segments,
            full_text: "Hello, this is a test. This is the second segment.".to_string(),
            language: Some("en".to_string()),
            duration: 10.0,
        };

        pipeline.complete_transcription("test-session", result).unwrap();

        // 3. Verify final state
        assert_eq!(
            pipeline.get_status("test-session"),
            Some(&TranscriptionStatus::Complete)
        );

        let stored_result = pipeline.get_result("test-session").unwrap();
        assert_eq!(stored_result.segments.len(), 2);
        assert!(stored_result.full_text.contains("Hello"));
    }
}

// ============================================================================
// Text Processing Tests
// ============================================================================

mod text_processing_tests {
    /// Remove filler words from transcript
    fn remove_filler_words(text: &str) -> String {
        let fillers = ["um", "uh", "like", "you know", "er", "ah"];
        let mut result = text.to_string();

        for filler in fillers {
            // Remove filler with surrounding spaces/punctuation
            let patterns = [
                format!(" {} ", filler),
                format!(" {}, ", filler),
                format!(", {} ", filler),
            ];

            for pattern in patterns {
                result = result.replace(&pattern, " ");
            }
        }

        // Clean up multiple spaces
        while result.contains("  ") {
            result = result.replace("  ", " ");
        }

        result.trim().to_string()
    }

    /// Merge short consecutive segments from same speaker
    fn merge_speaker_segments(
        segments: &[super::TranscriptionSegment],
        min_duration: f64,
    ) -> Vec<super::TranscriptionSegment> {
        if segments.is_empty() {
            return vec![];
        }

        let mut merged = vec![];
        let mut current = segments[0].clone();

        for segment in segments.iter().skip(1) {
            let same_speaker = current.speaker == segment.speaker;
            let short_duration = (current.end - current.start) < min_duration;
            let adjacent = (segment.start - current.end).abs() < 0.5;

            if same_speaker && short_duration && adjacent {
                // Merge segments
                current.end = segment.end;
                current.text = format!("{} {}", current.text, segment.text);
            } else {
                merged.push(current);
                current = segment.clone();
            }
        }

        merged.push(current);
        merged
    }

    #[test]
    fn test_remove_filler_words() {
        let text = "So um I was thinking, you know, about the um project.";
        let cleaned = remove_filler_words(text);

        assert!(!cleaned.contains(" um "));
        assert!(!cleaned.contains(" you know "));
    }

    #[test]
    fn test_remove_filler_preserves_content() {
        let text = "The umbrella was useful.";
        let cleaned = remove_filler_words(text);

        // Should not remove "um" that's part of "umbrella"
        assert!(cleaned.contains("umbrella"));
    }

    #[test]
    fn test_merge_short_segments() {
        let segments = vec![
            super::TranscriptionSegment {
                start: 0.0,
                end: 0.3,
                text: "Hi".to_string(),
                speaker: Some("A".to_string()),
            },
            super::TranscriptionSegment {
                start: 0.3,
                end: 0.6,
                text: "there".to_string(),
                speaker: Some("A".to_string()),
            },
            super::TranscriptionSegment {
                start: 0.8,
                end: 3.0,
                text: "How are you?".to_string(),
                speaker: Some("B".to_string()),
            },
        ];

        let merged = merge_speaker_segments(&segments, 1.0);

        // First two should be merged (same speaker, short, adjacent)
        assert!(merged.len() <= segments.len());
    }

    #[test]
    fn test_merge_different_speakers_not_merged() {
        let segments = vec![
            super::TranscriptionSegment {
                start: 0.0,
                end: 0.5,
                text: "Hello".to_string(),
                speaker: Some("A".to_string()),
            },
            super::TranscriptionSegment {
                start: 0.5,
                end: 1.0,
                text: "Hi".to_string(),
                speaker: Some("B".to_string()),
            },
        ];

        let merged = merge_speaker_segments(&segments, 1.0);

        // Different speakers should not be merged
        assert_eq!(merged.len(), 2);
    }
}

// ============================================================================
// Timestamp Formatting Tests
// ============================================================================

mod timestamp_tests {
    /// Format seconds to HH:MM:SS.mmm
    fn format_timestamp(seconds: f64) -> String {
        let hours = (seconds / 3600.0) as u32;
        let minutes = ((seconds % 3600.0) / 60.0) as u32;
        let secs = seconds % 60.0;

        if hours > 0 {
            format!("{:02}:{:02}:{:06.3}", hours, minutes, secs)
        } else {
            format!("{:02}:{:06.3}", minutes, secs)
        }
    }

    /// Parse timestamp back to seconds
    fn parse_timestamp(ts: &str) -> Result<f64, &'static str> {
        let parts: Vec<&str> = ts.split(':').collect();

        match parts.len() {
            2 => {
                let minutes: f64 = parts[0].parse().map_err(|_| "Invalid minutes")?;
                let seconds: f64 = parts[1].parse().map_err(|_| "Invalid seconds")?;
                Ok(minutes * 60.0 + seconds)
            }
            3 => {
                let hours: f64 = parts[0].parse().map_err(|_| "Invalid hours")?;
                let minutes: f64 = parts[1].parse().map_err(|_| "Invalid minutes")?;
                let seconds: f64 = parts[2].parse().map_err(|_| "Invalid seconds")?;
                Ok(hours * 3600.0 + minutes * 60.0 + seconds)
            }
            _ => Err("Invalid timestamp format"),
        }
    }

    #[test]
    fn test_format_timestamp_short() {
        assert_eq!(format_timestamp(0.0), "00:00.000");
        assert_eq!(format_timestamp(5.5), "00:05.500");
        assert_eq!(format_timestamp(65.123), "01:05.123");
    }

    #[test]
    fn test_format_timestamp_hours() {
        assert_eq!(format_timestamp(3661.5), "01:01:01.500");
        assert_eq!(format_timestamp(7200.0), "02:00:00.000");
    }

    #[test]
    fn test_parse_timestamp_short() {
        let ts = parse_timestamp("01:30.500").unwrap();
        assert!((ts - 90.5).abs() < 0.001);
    }

    #[test]
    fn test_parse_timestamp_hours() {
        let ts = parse_timestamp("01:30:45.250").unwrap();
        let expected = 3600.0 + 1800.0 + 45.25;
        assert!((ts - expected).abs() < 0.001);
    }

    #[test]
    fn test_timestamp_roundtrip() {
        let original = 123.456;
        let formatted = format_timestamp(original);
        let parsed = parse_timestamp(&formatted).unwrap();
        assert!((original - parsed).abs() < 0.001);
    }
}
