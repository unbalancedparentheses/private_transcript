use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Template {
    pub id: String,
    pub name: String,
    pub workspace_type: String,
    pub description: Option<String>,
    pub prompt: String,
    pub output_format: Option<String>,
    pub is_default: bool,
    pub is_system: bool,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTemplateRequest {
    pub name: String,
    pub workspace_type: String,
    pub description: Option<String>,
    pub prompt: String,
    pub output_format: Option<String>,
}
