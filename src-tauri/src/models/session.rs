use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Session {
    pub id: String,
    pub folder_id: String,
    pub title: Option<String>,
    pub audio_path: String,
    pub audio_duration: Option<i64>,
    pub transcript: Option<String>,
    pub transcript_segments: Option<String>,
    pub generated_note: Option<String>,
    pub note_format: Option<String>,
    pub template_id: Option<String>,
    pub status: String,
    pub error_message: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateSessionRequest {
    pub folder_id: String,
    pub title: Option<String>,
    pub audio_path: String,
    pub audio_duration: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSessionRequest {
    pub id: String,
    pub title: Option<String>,
    pub transcript: Option<String>,
    pub generated_note: Option<String>,
    pub status: Option<String>,
    pub error_message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranscriptionProgress {
    pub session_id: String,
    pub progress: f32,
    pub status: String,
}
