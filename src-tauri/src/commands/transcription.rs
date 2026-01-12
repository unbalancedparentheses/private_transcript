use crate::models::TranscriptionProgress;
use crate::services::whisper;
use crate::utils::IntoTauriResult;
use once_cell::sync::Lazy;
use parking_lot::Mutex;
use std::collections::HashMap;
use tauri::AppHandle;

/// Track active transcription progress
static TRANSCRIPTION_PROGRESS: Lazy<Mutex<HashMap<String, TranscriptionProgress>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

/// Update transcription progress (called from whisper service via events)
pub fn update_progress(session_id: &str, progress: f32, status: &str) {
    println!(
        "[TranscriptionCmd] Updating progress: session={}, progress={:.1}%, status={}",
        session_id, progress, status
    );
    let mut map = TRANSCRIPTION_PROGRESS.lock();
    map.insert(
        session_id.to_string(),
        TranscriptionProgress {
            session_id: session_id.to_string(),
            progress,
            status: status.to_string(),
        },
    );
    println!(
        "[TranscriptionCmd] Progress map now has {} entries",
        map.len()
    );
}

/// Clear transcription progress when done
pub fn clear_progress(session_id: &str) {
    println!(
        "[TranscriptionCmd] Clearing progress for session: {}",
        session_id
    );
    let mut map = TRANSCRIPTION_PROGRESS.lock();
    map.remove(session_id);
    println!(
        "[TranscriptionCmd] Progress map now has {} entries",
        map.len()
    );
}

#[tauri::command]
#[allow(non_snake_case)]
pub async fn transcribe_audio(
    app: AppHandle,
    sessionId: String,
    audioPath: String,
) -> Result<String, String> {
    println!(
        "[Transcription] Starting transcription for session: {}",
        sessionId
    );
    println!("[Transcription] Audio path: {}", audioPath);

    // Initialize progress tracking
    update_progress(&sessionId, 0.0, "starting");

    // Check if file exists
    let path = std::path::Path::new(&audioPath);
    if !path.exists() {
        let err = format!("Audio file does not exist: {}", audioPath);
        println!("[Transcription] ERROR: {}", err);
        update_progress(&sessionId, 0.0, "error");
        return Err(err);
    }

    let file_size = std::fs::metadata(&audioPath)
        .map(|m| m.len())
        .unwrap_or(0);
    println!(
        "[Transcription] Audio file exists, size: {} bytes",
        file_size
    );

    // WhisperKit auto-downloads models, so we can transcribe directly
    // Set a default model if none is loaded (for UI compatibility)
    if !whisper::is_model_loaded() {
        println!("[Transcription] Setting default WhisperKit model...");
        whisper::load_model(&app, "whisperkit-base")
            .await
            .map_err(|e| {
                let err = format!("Failed to set model: {}", e);
                println!("[Transcription] ERROR: {}", err);
                update_progress(&sessionId, 0.0, "error");
                err
            })?;
    }

    update_progress(&sessionId, 10.0, "transcribing");
    println!("[Transcription] Starting WhisperKit transcription...");
    let result = whisper::transcribe(&app, &sessionId, &audioPath).await;

    match &result {
        Ok(transcript) => {
            println!(
                "[Transcription] SUCCESS! Transcript length: {} chars",
                transcript.len()
            );
            println!(
                "[Transcription] First 200 chars: {}",
                &transcript.chars().take(200).collect::<String>()
            );
            update_progress(&sessionId, 100.0, "complete");
        }
        Err(e) => {
            println!("[Transcription] ERROR during transcription: {}", e);
            update_progress(&sessionId, 0.0, "error");
        }
    }

    // Clean up progress tracking after a short delay
    let session_id_clone = sessionId.clone();
    tokio::spawn(async move {
        tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
        clear_progress(&session_id_clone);
    });

    result.into_tauri_result()
}

#[tauri::command]
pub async fn get_transcription_progress(
    _app: AppHandle,
    session_id: String,
) -> Result<TranscriptionProgress, String> {
    let map = TRANSCRIPTION_PROGRESS.lock();
    Ok(map
        .get(&session_id)
        .cloned()
        .unwrap_or_else(|| TranscriptionProgress {
            session_id,
            progress: 0.0,
            status: "pending".to_string(),
        }))
}

#[cfg(test)]
mod tests {
    use super::*;

    // Helper to generate unique session IDs for tests
    fn unique_session_id(prefix: &str) -> String {
        use std::time::{SystemTime, UNIX_EPOCH};
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        format!("{}-{}", prefix, nanos)
    }

    // ============================================================================
    // Progress Tracking Tests
    // ============================================================================

    #[test]
    fn test_update_progress() {
        let session_id = unique_session_id("test-update");
        update_progress(&session_id, 50.0, "transcribing");

        {
            let map = TRANSCRIPTION_PROGRESS.lock();
            let progress = map.get(&session_id).unwrap();
            assert_eq!(progress.progress, 50.0);
            assert_eq!(progress.status, "transcribing");
        }

        clear_progress(&session_id);
    }

    #[test]
    fn test_clear_progress() {
        let session_id = unique_session_id("test-clear");
        update_progress(&session_id, 100.0, "complete");
        clear_progress(&session_id);

        let map = TRANSCRIPTION_PROGRESS.lock();
        assert!(map.get(&session_id).is_none());
    }

    #[test]
    fn test_progress_status_transitions() {
        let session_id = unique_session_id("test-transitions");

        // Starting state
        update_progress(&session_id, 0.0, "starting");
        {
            let map = TRANSCRIPTION_PROGRESS.lock();
            let progress = map.get(&session_id).unwrap();
            assert_eq!(progress.status, "starting");
            assert_eq!(progress.progress, 0.0);
        }

        // Transcribing state
        update_progress(&session_id, 10.0, "transcribing");
        {
            let map = TRANSCRIPTION_PROGRESS.lock();
            let progress = map.get(&session_id).unwrap();
            assert_eq!(progress.status, "transcribing");
            assert_eq!(progress.progress, 10.0);
        }

        // Progress update mid-transcription
        update_progress(&session_id, 50.0, "transcribing");
        {
            let map = TRANSCRIPTION_PROGRESS.lock();
            let progress = map.get(&session_id).unwrap();
            assert_eq!(progress.progress, 50.0);
        }

        // Complete state
        update_progress(&session_id, 100.0, "complete");
        {
            let map = TRANSCRIPTION_PROGRESS.lock();
            let progress = map.get(&session_id).unwrap();
            assert_eq!(progress.status, "complete");
            assert_eq!(progress.progress, 100.0);
        }

        // Cleanup
        clear_progress(&session_id);
    }

    #[test]
    fn test_progress_error_state() {
        let session_id = unique_session_id("test-error");

        update_progress(&session_id, 25.0, "transcribing");
        update_progress(&session_id, 0.0, "error");

        {
            let map = TRANSCRIPTION_PROGRESS.lock();
            let progress = map.get(&session_id).unwrap();
            assert_eq!(progress.status, "error");
            assert_eq!(progress.progress, 0.0);
        }

        clear_progress(&session_id);
    }

    #[test]
    fn test_multiple_concurrent_sessions() {
        let session1 = unique_session_id("session1");
        let session2 = unique_session_id("session2");
        let session3 = unique_session_id("session3");

        // Start all sessions
        update_progress(&session1, 0.0, "starting");
        update_progress(&session2, 0.0, "starting");
        update_progress(&session3, 0.0, "starting");

        // Progress each at different rates
        update_progress(&session1, 75.0, "transcribing");
        update_progress(&session2, 25.0, "transcribing");
        update_progress(&session3, 50.0, "transcribing");

        {
            let map = TRANSCRIPTION_PROGRESS.lock();
            assert_eq!(map.get(&session1).unwrap().progress, 75.0);
            assert_eq!(map.get(&session2).unwrap().progress, 25.0);
            assert_eq!(map.get(&session3).unwrap().progress, 50.0);
        }

        // Complete one, error one, keep one running
        update_progress(&session1, 100.0, "complete");
        update_progress(&session2, 0.0, "error");

        {
            let map = TRANSCRIPTION_PROGRESS.lock();
            assert_eq!(map.get(&session1).unwrap().status, "complete");
            assert_eq!(map.get(&session2).unwrap().status, "error");
            assert_eq!(map.get(&session3).unwrap().status, "transcribing");
        }

        // Cleanup
        clear_progress(&session1);
        clear_progress(&session2);
        clear_progress(&session3);
    }

    #[test]
    fn test_clear_nonexistent_session() {
        let session_id = unique_session_id("nonexistent");
        // Should not panic when clearing a session that doesn't exist
        clear_progress(&session_id);

        {
            let map = TRANSCRIPTION_PROGRESS.lock();
            assert!(map.get(&session_id).is_none());
        }
    }

    #[test]
    fn test_progress_overwrites_existing() {
        let session_id = unique_session_id("overwrite");

        update_progress(&session_id, 50.0, "transcribing");
        update_progress(&session_id, 75.0, "transcribing");

        {
            let map = TRANSCRIPTION_PROGRESS.lock();
            let progress = map.get(&session_id).unwrap();
            // Should have the latest values
            assert_eq!(progress.progress, 75.0);
        }

        clear_progress(&session_id);
    }

    #[test]
    fn test_session_id_preservation() {
        let session_id = unique_session_id("preserve");

        update_progress(&session_id, 50.0, "transcribing");

        {
            let map = TRANSCRIPTION_PROGRESS.lock();
            let progress = map.get(&session_id).unwrap();
            assert_eq!(progress.session_id, session_id);
        }

        clear_progress(&session_id);
    }

    // ============================================================================
    // Progress Value Tests
    // ============================================================================

    #[test]
    fn test_progress_boundary_values() {
        let session_id = unique_session_id("boundary");

        // Test 0%
        update_progress(&session_id, 0.0, "starting");
        {
            let map = TRANSCRIPTION_PROGRESS.lock();
            assert_eq!(map.get(&session_id).unwrap().progress, 0.0);
        }

        // Test 100%
        update_progress(&session_id, 100.0, "complete");
        {
            let map = TRANSCRIPTION_PROGRESS.lock();
            assert_eq!(map.get(&session_id).unwrap().progress, 100.0);
        }

        clear_progress(&session_id);
    }

    #[test]
    fn test_progress_fractional_values() {
        let session_id = unique_session_id("fractional");

        update_progress(&session_id, 33.33, "transcribing");
        {
            let map = TRANSCRIPTION_PROGRESS.lock();
            let progress = map.get(&session_id).unwrap().progress;
            assert!((progress - 33.33).abs() < 0.001);
        }

        update_progress(&session_id, 66.67, "transcribing");
        {
            let map = TRANSCRIPTION_PROGRESS.lock();
            let progress = map.get(&session_id).unwrap().progress;
            assert!((progress - 66.67).abs() < 0.001);
        }

        clear_progress(&session_id);
    }

    // ============================================================================
    // Status String Tests
    // ============================================================================

    #[test]
    fn test_all_valid_status_strings() {
        let session_id = unique_session_id("status");

        let statuses = ["starting", "transcribing", "complete", "error", "pending"];

        for status in statuses {
            update_progress(&session_id, 50.0, status);
            {
                let map = TRANSCRIPTION_PROGRESS.lock();
                assert_eq!(map.get(&session_id).unwrap().status, status);
            } // Lock is dropped here before next iteration
        }

        clear_progress(&session_id);
    }

    #[test]
    fn test_empty_status_string() {
        let session_id = unique_session_id("empty-status");

        update_progress(&session_id, 50.0, "");

        {
            let map = TRANSCRIPTION_PROGRESS.lock();
            assert_eq!(map.get(&session_id).unwrap().status, "");
        } // Lock is dropped here

        clear_progress(&session_id);
    }

    // ============================================================================
    // TranscriptionProgress Struct Tests
    // ============================================================================

    #[test]
    fn test_transcription_progress_clone() {
        let progress = TranscriptionProgress {
            session_id: "test".to_string(),
            progress: 50.0,
            status: "transcribing".to_string(),
        };

        let cloned = progress.clone();
        assert_eq!(cloned.session_id, progress.session_id);
        assert_eq!(cloned.progress, progress.progress);
        assert_eq!(cloned.status, progress.status);
    }

    #[test]
    fn test_transcription_progress_serialization() {
        let progress = TranscriptionProgress {
            session_id: "test-session".to_string(),
            progress: 75.5,
            status: "transcribing".to_string(),
        };

        let json = serde_json::to_string(&progress).unwrap();
        assert!(json.contains("test-session"));
        assert!(json.contains("75.5"));
        assert!(json.contains("transcribing"));
    }

    #[test]
    fn test_transcription_progress_deserialization() {
        let json = r#"{"session_id":"test","progress":50.0,"status":"complete"}"#;
        let progress: TranscriptionProgress = serde_json::from_str(json).unwrap();

        assert_eq!(progress.session_id, "test");
        assert_eq!(progress.progress, 50.0);
        assert_eq!(progress.status, "complete");
    }

    // ============================================================================
    // Map Size and Cleanup Tests
    // ============================================================================

    #[test]
    fn test_map_grows_and_shrinks() {
        let sessions: Vec<String> = (0..5)
            .map(|i| unique_session_id(&format!("grow-{}", i)))
            .collect();

        // Add sessions
        for (i, session_id) in sessions.iter().enumerate() {
            update_progress(session_id, (i * 20) as f32, "transcribing");
        }

        {
            let map = TRANSCRIPTION_PROGRESS.lock();
            // At least our sessions should be there (might be more from other tests)
            for session_id in &sessions {
                assert!(map.contains_key(session_id));
            }
        }

        // Remove sessions
        for session_id in &sessions {
            clear_progress(session_id);
        }

        {
            let map = TRANSCRIPTION_PROGRESS.lock();
            for session_id in &sessions {
                assert!(!map.contains_key(session_id));
            }
        }
    }

    // ============================================================================
    // Thread Safety Tests
    // ============================================================================

    #[test]
    fn test_concurrent_updates_to_same_session() {
        use std::thread;

        let session_id = unique_session_id("concurrent");
        let session_id_clone = session_id.clone();

        // Spawn multiple threads updating the same session
        let handles: Vec<_> = (0..10)
            .map(|i| {
                let sid = session_id_clone.clone();
                thread::spawn(move || {
                    update_progress(&sid, (i * 10) as f32, "transcribing");
                })
            })
            .collect();

        // Wait for all threads
        for handle in handles {
            handle.join().unwrap();
        }

        // Session should exist with some valid value
        let map = TRANSCRIPTION_PROGRESS.lock();
        let progress = map.get(&session_id).unwrap();
        assert!(progress.progress >= 0.0 && progress.progress <= 100.0);

        drop(map);
        clear_progress(&session_id);
    }

    #[test]
    fn test_concurrent_different_sessions() {
        use std::thread;

        let sessions: Vec<String> = (0..10)
            .map(|i| unique_session_id(&format!("thread-{}", i)))
            .collect();

        let handles: Vec<_> = sessions
            .iter()
            .enumerate()
            .map(|(i, session_id)| {
                let sid = session_id.clone();
                thread::spawn(move || {
                    update_progress(&sid, (i * 10) as f32, "transcribing");
                })
            })
            .collect();

        for handle in handles {
            handle.join().unwrap();
        }

        // All sessions should exist
        {
            let map = TRANSCRIPTION_PROGRESS.lock();
            for session_id in &sessions {
                assert!(map.contains_key(session_id));
            }
        }

        // Cleanup
        for session_id in &sessions {
            clear_progress(session_id);
        }
    }
}
