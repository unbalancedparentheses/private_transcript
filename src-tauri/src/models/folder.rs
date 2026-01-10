use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Folder {
    pub id: String,
    pub workspace_id: String,
    pub name: String,
    pub metadata: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
    pub is_active: bool,
    #[serde(default)]
    pub session_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateFolderRequest {
    pub workspace_id: String,
    pub name: String,
    pub metadata: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateFolderRequest {
    pub id: String,
    pub name: Option<String>,
    pub metadata: Option<String>,
}
