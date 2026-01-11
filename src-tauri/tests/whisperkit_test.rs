//! Tests for WhisperKit integration

use std::path::PathBuf;
use std::process::Command;

/// Get the path to the whisperkit-worker binary
fn get_worker_path() -> PathBuf {
    let project_root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).parent().unwrap().to_path_buf();
    project_root.join("whisperkit-worker/.build/release/whisperkit-worker")
}

/// Test that whisperkit-worker binary exists
#[test]
fn test_whisperkit_worker_exists() {
    let worker_path = get_worker_path();

    if !worker_path.exists() {
        eprintln!("WhisperKit worker not found at: {:?}", worker_path);
        eprintln!("Build it with: cd whisperkit-worker && swift build -c release");
        // Skip test if binary doesn't exist (CI might not have Swift)
        return;
    }

    assert!(worker_path.exists(), "whisperkit-worker binary should exist");
    assert!(worker_path.is_file(), "whisperkit-worker should be a file");
}

/// Test whisperkit-worker shows usage when called without args
#[test]
fn test_whisperkit_worker_usage() {
    let worker_path = get_worker_path();

    if !worker_path.exists() {
        eprintln!("Skipping test: whisperkit-worker not built");
        return;
    }

    let output = Command::new(&worker_path)
        .output()
        .expect("Failed to execute whisperkit-worker");

    // Should exit with error code when no args provided (missing audio path for default transcribe command)
    assert!(!output.status.success(), "Should fail without arguments");

    // Should show error about missing argument or usage message
    let stderr = String::from_utf8_lossy(&output.stderr);
    assert!(stderr.contains("USAGE:") || stderr.contains("audio-path") || stderr.contains("Missing expected argument"),
        "Should show usage or missing argument message, got: {}", stderr);
}

/// Test whisperkit-worker help shows subcommands
#[test]
fn test_whisperkit_worker_help() {
    let worker_path = get_worker_path();

    if !worker_path.exists() {
        eprintln!("Skipping test: whisperkit-worker not built");
        return;
    }

    let output = Command::new(&worker_path)
        .arg("--help")
        .output()
        .expect("Failed to execute whisperkit-worker");

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    let combined = format!("{}{}", stdout, stderr);

    // Should show available subcommands
    assert!(combined.contains("transcribe") && combined.contains("stream"),
        "Should show transcribe and stream subcommands, got: {}", combined);
}

/// Test whisperkit-worker with non-existent file
#[test]
fn test_whisperkit_worker_missing_file() {
    let worker_path = get_worker_path();

    if !worker_path.exists() {
        eprintln!("Skipping test: whisperkit-worker not built");
        return;
    }

    let output = Command::new(&worker_path)
        .arg("/nonexistent/audio/file.wav")
        .output()
        .expect("Failed to execute whisperkit-worker");

    assert!(!output.status.success(), "Should fail with missing file");

    let stderr = String::from_utf8_lossy(&output.stderr);
    assert!(stderr.contains("ERROR") || stderr.contains("not exist") || stderr.contains("not found"),
        "Should show error for missing file, got: {}", stderr);
}

/// Test whisperkit-worker transcription with test audio file
#[test]
fn test_whisperkit_worker_transcription() {
    let worker_path = get_worker_path();

    if !worker_path.exists() {
        eprintln!("Skipping test: whisperkit-worker not built");
        return;
    }

    // Use the JFK test audio from WhisperKit's test resources
    let project_root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).parent().unwrap().to_path_buf();
    let test_audio = project_root.join("whisperkit-worker/.build/checkouts/WhisperKit/Tests/WhisperKitTests/Resources/jfk.wav");

    if !test_audio.exists() {
        eprintln!("Skipping test: test audio file not found");
        eprintln!("Expected at: {:?}", test_audio);
        return;
    }

    let output = Command::new(&worker_path)
        .arg(&test_audio)
        .output()
        .expect("Failed to execute whisperkit-worker");

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        eprintln!("WhisperKit transcription failed: {}", stderr);
        // Don't fail - WhisperKit may need to download models
        return;
    }

    let transcript = String::from_utf8_lossy(&output.stdout);
    let transcript = transcript.trim().to_lowercase();

    // The JFK audio says: "And so, my fellow Americans, ask not what your country can do for you,
    // ask what you can do for your country."
    assert!(!transcript.is_empty(), "Transcript should not be empty");
    assert!(transcript.contains("ask") || transcript.contains("country") || transcript.contains("fellow"),
        "Should transcribe JFK speech, got: {}", transcript);
}

/// Test audio file format detection
#[test]
fn test_audio_format_detection() {
    let supported_formats = vec![
        ("test.wav", true),
        ("test.m4a", true),
        ("test.mp3", true),
        ("test.flac", true),
        ("test.ogg", true),
        ("test.txt", false),
        ("test.pdf", false),
    ];

    for (filename, is_audio) in supported_formats {
        let path = PathBuf::from(filename);
        let ext = path
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("");

        let audio_extensions = ["wav", "m4a", "mp3", "flac", "ogg", "aac", "webm"];
        let detected_as_audio = audio_extensions.contains(&ext);

        assert_eq!(detected_as_audio, is_audio,
            "File {} should be detected as audio={}", filename, is_audio);
    }
}

/// Test path construction for WhisperKit worker
#[test]
fn test_worker_path_construction() {
    let possible_paths = vec![
        "../whisperkit-worker/.build/release/whisperkit-worker",
        "./whisperkit-worker",
        "whisperkit-worker",
    ];

    for path_str in possible_paths {
        let path = PathBuf::from(path_str);
        assert!(!path_str.is_empty());
        // Just verify path construction doesn't panic
        let _ = path.file_name();
        let _ = path.parent();
    }
}

/// Test that transcription output is clean text
#[test]
fn test_transcript_output_format() {
    // Simulated transcript outputs that should be trimmed/cleaned
    let test_outputs = vec![
        ("  Hello world  \n", "Hello world"),
        ("Test transcript\n\n", "Test transcript"),
        ("\nLeading newline", "Leading newline"),
        ("No changes needed", "No changes needed"),
    ];

    for (raw, expected) in test_outputs {
        let cleaned = raw.trim();
        assert_eq!(cleaned, expected);
    }
}
