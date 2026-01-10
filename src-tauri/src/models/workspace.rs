use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum WorkspaceType {
    Therapy,
    Legal,
    Research,
    General,
}

impl WorkspaceType {
    pub fn as_str(&self) -> &str {
        match self {
            WorkspaceType::Therapy => "therapy",
            WorkspaceType::Legal => "legal",
            WorkspaceType::Research => "research",
            WorkspaceType::General => "general",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "therapy" => Some(WorkspaceType::Therapy),
            "legal" => Some(WorkspaceType::Legal),
            "research" => Some(WorkspaceType::Research),
            "general" => Some(WorkspaceType::General),
            _ => None,
        }
    }

    pub fn folder_label(&self) -> &str {
        match self {
            WorkspaceType::Therapy => "Clients",
            WorkspaceType::Legal => "Cases",
            WorkspaceType::Research => "Projects",
            WorkspaceType::General => "Folders",
        }
    }

    pub fn session_label(&self) -> &str {
        match self {
            WorkspaceType::Therapy => "Sessions",
            WorkspaceType::Legal => "Recordings",
            WorkspaceType::Research => "Interviews",
            WorkspaceType::General => "Recordings",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Workspace {
    pub id: String,
    pub name: String,
    pub workspace_type: String,
    pub created_at: i64,
    pub updated_at: i64,
    pub is_active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateWorkspaceRequest {
    pub name: String,
    pub workspace_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateWorkspaceRequest {
    pub id: String,
    pub name: Option<String>,
}
