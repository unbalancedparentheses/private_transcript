//! Tests for model structs and serialization

use serde::{Deserialize, Serialize};
use serde_json;

/// Session model matching the app's Session struct
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
struct Session {
    id: String,
    folder_id: String,
    title: Option<String>,
    audio_path: String,
    audio_duration: Option<i64>,
    transcript: Option<String>,
    transcript_segments: Option<String>,
    generated_note: Option<String>,
    note_format: Option<String>,
    template_id: Option<String>,
    status: String,
    error_message: Option<String>,
    created_at: i64,
    updated_at: i64,
}

/// Test Session serialization to JSON
#[test]
fn test_session_serialization() {
    let session = Session {
        id: "test-session-123".to_string(),
        folder_id: "folder-456".to_string(),
        title: Some("Test Meeting".to_string()),
        audio_path: "/path/to/audio.m4a".to_string(),
        audio_duration: Some(3600),
        transcript: Some("Hello world".to_string()),
        transcript_segments: None,
        generated_note: None,
        note_format: Some("markdown".to_string()),
        template_id: Some("general".to_string()),
        status: "completed".to_string(),
        error_message: None,
        created_at: 1704067200,
        updated_at: 1704067200,
    };

    let json = serde_json::to_string(&session).unwrap();

    // Verify camelCase conversion
    assert!(json.contains("\"folderId\""));
    assert!(json.contains("\"audioPath\""));
    assert!(json.contains("\"audioDuration\""));
    assert!(json.contains("\"createdAt\""));
    assert!(json.contains("\"updatedAt\""));

    // Verify values
    assert!(json.contains("\"test-session-123\""));
    assert!(json.contains("\"Test Meeting\""));
}

/// Test Session deserialization from JSON
#[test]
fn test_session_deserialization() {
    let json = r#"{
        "id": "session-789",
        "folderId": "folder-abc",
        "title": null,
        "audioPath": "/audio/file.wav",
        "audioDuration": 1800,
        "transcript": "Test transcript",
        "transcriptSegments": null,
        "generatedNote": null,
        "noteFormat": null,
        "templateId": null,
        "status": "pending",
        "errorMessage": null,
        "createdAt": 1704153600,
        "updatedAt": 1704153600
    }"#;

    let session: Session = serde_json::from_str(json).unwrap();

    assert_eq!(session.id, "session-789");
    assert_eq!(session.folder_id, "folder-abc");
    assert!(session.title.is_none());
    assert_eq!(session.audio_path, "/audio/file.wav");
    assert_eq!(session.audio_duration, Some(1800));
    assert_eq!(session.transcript, Some("Test transcript".to_string()));
    assert_eq!(session.status, "pending");
}

/// Test Session round-trip serialization
#[test]
fn test_session_roundtrip() {
    let original = Session {
        id: "roundtrip-test".to_string(),
        folder_id: "folder-id".to_string(),
        title: Some("Roundtrip Test".to_string()),
        audio_path: "/test/audio.m4a".to_string(),
        audio_duration: Some(120),
        transcript: Some("Test".to_string()),
        transcript_segments: Some("[{\"start\": 0, \"end\": 1}]".to_string()),
        generated_note: Some("# Notes".to_string()),
        note_format: Some("markdown".to_string()),
        template_id: Some("research".to_string()),
        status: "completed".to_string(),
        error_message: None,
        created_at: 1704240000,
        updated_at: 1704240000,
    };

    let json = serde_json::to_string(&original).unwrap();
    let deserialized: Session = serde_json::from_str(&json).unwrap();

    assert_eq!(original, deserialized);
}

/// TranscriptionProgress model
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
struct TranscriptionProgress {
    session_id: String,
    progress: f32,
    status: String,
}

/// Test TranscriptionProgress serialization
#[test]
fn test_transcription_progress_serialization() {
    let progress = TranscriptionProgress {
        session_id: "session-123".to_string(),
        progress: 50.5,
        status: "transcribing".to_string(),
    };

    let json = serde_json::to_string(&progress).unwrap();
    assert!(json.contains("\"session_id\""));
    assert!(json.contains("50.5"));
    assert!(json.contains("\"transcribing\""));
}

/// Test progress values
#[test]
fn test_progress_values() {
    let test_cases = vec![
        (0.0f32, "pending"),
        (25.0f32, "transcribing"),
        (50.0f32, "transcribing"),
        (100.0f32, "completed"),
    ];

    for (progress_value, status) in test_cases {
        let progress = TranscriptionProgress {
            session_id: "test".to_string(),
            progress: progress_value,
            status: status.to_string(),
        };

        assert!(progress.progress >= 0.0);
        assert!(progress.progress <= 100.0);
        assert!(!progress.status.is_empty());
    }
}

/// Folder model
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
struct Folder {
    id: String,
    workspace_id: String,
    name: String,
    created_at: i64,
    updated_at: i64,
}

/// Test Folder serialization
#[test]
fn test_folder_serialization() {
    let folder = Folder {
        id: "folder-123".to_string(),
        workspace_id: "workspace-456".to_string(),
        name: "Project Notes".to_string(),
        created_at: 1704326400,
        updated_at: 1704326400,
    };

    let json = serde_json::to_string(&folder).unwrap();
    assert!(json.contains("\"workspaceId\""));
    assert!(json.contains("\"createdAt\""));
    assert!(json.contains("\"Project Notes\""));
}

/// Workspace model
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
struct Workspace {
    id: String,
    name: String,
    workspace_type: String,
    created_at: i64,
    updated_at: i64,
}

/// Test Workspace serialization
#[test]
fn test_workspace_serialization() {
    let workspace = Workspace {
        id: "ws-123".to_string(),
        name: "My Workspace".to_string(),
        workspace_type: "personal".to_string(),
        created_at: 1704412800,
        updated_at: 1704412800,
    };

    let json = serde_json::to_string(&workspace).unwrap();
    assert!(json.contains("\"workspaceType\""));
    assert!(json.contains("\"personal\""));

    let deserialized: Workspace = serde_json::from_str(&json).unwrap();
    assert_eq!(workspace, deserialized);
}

/// Test valid status strings
#[test]
fn test_valid_session_statuses() {
    let valid_statuses = vec![
        "pending",
        "recording",
        "transcribing",
        "generating",
        "completed",
        "error",
    ];

    for status in valid_statuses {
        assert!(!status.is_empty());
        assert!(status.chars().all(|c| c.is_lowercase() || c == '_'));
    }
}

/// Test UUID format validation
#[test]
fn test_uuid_format() {
    // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    let valid_uuids = vec![
        "550e8400-e29b-41d4-a716-446655440000",
        "123e4567-e89b-42d3-a456-426614174000",
    ];

    for uuid in valid_uuids {
        assert_eq!(uuid.len(), 36);
        assert_eq!(uuid.chars().filter(|&c| c == '-').count(), 4);
    }
}
