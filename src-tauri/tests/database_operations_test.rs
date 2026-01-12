//! Integration tests for database operations
//!
//! Tests comprehensive CRUD operations, relationships, constraints,
//! and complex queries for workspaces, folders, sessions, and settings.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ============================================================================
// Types (matching the Rust implementations)
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
struct Workspace {
    id: String,
    name: String,
    workspace_type: String,
    created_at: i64,
    updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
struct Folder {
    id: String,
    workspace_id: String,
    name: String,
    parent_id: Option<String>,
    created_at: i64,
    updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
struct Session {
    id: String,
    folder_id: String,
    title: Option<String>,
    audio_path: String,
    audio_duration: Option<i64>,
    transcript: Option<String>,
    generated_note: Option<String>,
    status: String,
    created_at: i64,
    updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AppSettings {
    theme: String,
    whisper_model: String,
    llm_provider: String,
    llm_model: Option<String>,
    ollama_endpoint: Option<String>,
    export_format: String,
    auto_save: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            theme: "system".to_string(),
            whisper_model: "base".to_string(),
            llm_provider: "bundled".to_string(),
            llm_model: Some("llama-3.2-1b".to_string()),
            ollama_endpoint: Some("http://localhost:11434".to_string()),
            export_format: "markdown".to_string(),
            auto_save: true,
        }
    }
}

// ============================================================================
// In-Memory Database Simulation for Testing
// ============================================================================

struct MockDatabase {
    workspaces: HashMap<String, Workspace>,
    folders: HashMap<String, Folder>,
    sessions: HashMap<String, Session>,
    settings: AppSettings,
    next_id: u64,
}

impl MockDatabase {
    fn new() -> Self {
        Self {
            workspaces: HashMap::new(),
            folders: HashMap::new(),
            sessions: HashMap::new(),
            settings: AppSettings::default(),
            next_id: 1,
        }
    }

    fn generate_id(&mut self) -> String {
        let id = format!("id-{}", self.next_id);
        self.next_id += 1;
        id
    }

    fn now() -> i64 {
        1704067200 // Fixed timestamp for testing
    }

    // Workspace operations
    fn create_workspace(&mut self, name: &str, workspace_type: &str) -> Workspace {
        let workspace = Workspace {
            id: self.generate_id(),
            name: name.to_string(),
            workspace_type: workspace_type.to_string(),
            created_at: Self::now(),
            updated_at: Self::now(),
        };
        self.workspaces.insert(workspace.id.clone(), workspace.clone());
        workspace
    }

    fn get_workspace(&self, id: &str) -> Option<&Workspace> {
        self.workspaces.get(id)
    }

    fn get_workspaces(&self) -> Vec<&Workspace> {
        self.workspaces.values().collect()
    }

    fn update_workspace(&mut self, id: &str, name: &str) -> Result<Workspace, &'static str> {
        match self.workspaces.get_mut(id) {
            Some(ws) => {
                ws.name = name.to_string();
                ws.updated_at = Self::now() + 1;
                Ok(ws.clone())
            }
            None => Err("Workspace not found"),
        }
    }

    fn delete_workspace(&mut self, id: &str) -> Result<(), &'static str> {
        // Check for dependent folders
        if self.folders.values().any(|f| f.workspace_id == id) {
            return Err("Cannot delete workspace with folders");
        }
        self.workspaces.remove(id).map(|_| ()).ok_or("Workspace not found")
    }

    // Folder operations
    fn create_folder(
        &mut self,
        workspace_id: &str,
        name: &str,
        parent_id: Option<&str>,
    ) -> Result<Folder, &'static str> {
        if !self.workspaces.contains_key(workspace_id) {
            return Err("Workspace not found");
        }

        if let Some(pid) = parent_id {
            if !self.folders.contains_key(pid) {
                return Err("Parent folder not found");
            }
        }

        let folder = Folder {
            id: self.generate_id(),
            workspace_id: workspace_id.to_string(),
            name: name.to_string(),
            parent_id: parent_id.map(|s| s.to_string()),
            created_at: Self::now(),
            updated_at: Self::now(),
        };
        self.folders.insert(folder.id.clone(), folder.clone());
        Ok(folder)
    }

    fn get_folders(&self, workspace_id: &str) -> Vec<&Folder> {
        self.folders
            .values()
            .filter(|f| f.workspace_id == workspace_id)
            .collect()
    }

    fn get_folder(&self, id: &str) -> Option<&Folder> {
        self.folders.get(id)
    }

    fn get_child_folders(&self, parent_id: &str) -> Vec<&Folder> {
        self.folders
            .values()
            .filter(|f| f.parent_id.as_deref() == Some(parent_id))
            .collect()
    }

    fn delete_folder(&mut self, id: &str) -> Result<(), &'static str> {
        // Check for dependent sessions
        if self.sessions.values().any(|s| s.folder_id == id) {
            return Err("Cannot delete folder with sessions");
        }
        // Check for child folders
        if self.folders.values().any(|f| f.parent_id.as_deref() == Some(id)) {
            return Err("Cannot delete folder with children");
        }
        self.folders.remove(id).map(|_| ()).ok_or("Folder not found")
    }

    // Session operations
    fn create_session(
        &mut self,
        folder_id: &str,
        audio_path: &str,
        title: Option<&str>,
    ) -> Result<Session, &'static str> {
        if !self.folders.contains_key(folder_id) {
            return Err("Folder not found");
        }

        let session = Session {
            id: self.generate_id(),
            folder_id: folder_id.to_string(),
            title: title.map(|s| s.to_string()),
            audio_path: audio_path.to_string(),
            audio_duration: None,
            transcript: None,
            generated_note: None,
            status: "pending".to_string(),
            created_at: Self::now(),
            updated_at: Self::now(),
        };
        self.sessions.insert(session.id.clone(), session.clone());
        Ok(session)
    }

    fn get_sessions(&self, folder_id: &str) -> Vec<&Session> {
        self.sessions
            .values()
            .filter(|s| s.folder_id == folder_id)
            .collect()
    }

    fn get_session(&self, id: &str) -> Option<&Session> {
        self.sessions.get(id)
    }

    fn update_session(
        &mut self,
        id: &str,
        updates: SessionUpdate,
    ) -> Result<Session, &'static str> {
        match self.sessions.get_mut(id) {
            Some(session) => {
                if let Some(title) = updates.title {
                    session.title = Some(title);
                }
                if let Some(transcript) = updates.transcript {
                    session.transcript = Some(transcript);
                }
                if let Some(note) = updates.generated_note {
                    session.generated_note = Some(note);
                }
                if let Some(status) = updates.status {
                    session.status = status;
                }
                if let Some(duration) = updates.audio_duration {
                    session.audio_duration = Some(duration);
                }
                session.updated_at = Self::now() + 1;
                Ok(session.clone())
            }
            None => Err("Session not found"),
        }
    }

    fn delete_session(&mut self, id: &str) -> Result<(), &'static str> {
        self.sessions.remove(id).map(|_| ()).ok_or("Session not found")
    }

    fn search_sessions(&self, query: &str) -> Vec<&Session> {
        let query_lower = query.to_lowercase();
        self.sessions
            .values()
            .filter(|s| {
                s.title
                    .as_ref()
                    .map(|t| t.to_lowercase().contains(&query_lower))
                    .unwrap_or(false)
                    || s.transcript
                        .as_ref()
                        .map(|t| t.to_lowercase().contains(&query_lower))
                        .unwrap_or(false)
            })
            .collect()
    }

    // Settings operations
    fn get_settings(&self) -> &AppSettings {
        &self.settings
    }

    fn update_settings(&mut self, updates: SettingsUpdate) -> &AppSettings {
        if let Some(theme) = updates.theme {
            self.settings.theme = theme;
        }
        if let Some(whisper_model) = updates.whisper_model {
            self.settings.whisper_model = whisper_model;
        }
        if let Some(llm_provider) = updates.llm_provider {
            self.settings.llm_provider = llm_provider;
        }
        if let Some(export_format) = updates.export_format {
            self.settings.export_format = export_format;
        }
        if let Some(auto_save) = updates.auto_save {
            self.settings.auto_save = auto_save;
        }
        &self.settings
    }
}

struct SessionUpdate {
    title: Option<String>,
    transcript: Option<String>,
    generated_note: Option<String>,
    status: Option<String>,
    audio_duration: Option<i64>,
}

struct SettingsUpdate {
    theme: Option<String>,
    whisper_model: Option<String>,
    llm_provider: Option<String>,
    export_format: Option<String>,
    auto_save: Option<bool>,
}

// ============================================================================
// Workspace Tests
// ============================================================================

mod workspace_tests {
    use super::*;

    #[test]
    fn test_create_workspace() {
        let mut db = MockDatabase::new();
        let ws = db.create_workspace("Test Workspace", "therapy");

        assert!(!ws.id.is_empty());
        assert_eq!(ws.name, "Test Workspace");
        assert_eq!(ws.workspace_type, "therapy");
    }

    #[test]
    fn test_create_multiple_workspaces() {
        let mut db = MockDatabase::new();

        let ws1 = db.create_workspace("Therapy", "therapy");
        let ws2 = db.create_workspace("Legal", "legal");
        let ws3 = db.create_workspace("Research", "research");

        assert_ne!(ws1.id, ws2.id);
        assert_ne!(ws2.id, ws3.id);
        assert_eq!(db.get_workspaces().len(), 3);
    }

    #[test]
    fn test_get_workspace() {
        let mut db = MockDatabase::new();
        let created = db.create_workspace("Test", "general");

        let fetched = db.get_workspace(&created.id);
        assert!(fetched.is_some());
        assert_eq!(fetched.unwrap().name, "Test");
    }

    #[test]
    fn test_get_nonexistent_workspace() {
        let db = MockDatabase::new();
        assert!(db.get_workspace("nonexistent").is_none());
    }

    #[test]
    fn test_update_workspace() {
        let mut db = MockDatabase::new();
        let ws = db.create_workspace("Original", "therapy");

        let updated = db.update_workspace(&ws.id, "Updated Name").unwrap();

        assert_eq!(updated.name, "Updated Name");
        assert!(updated.updated_at > updated.created_at);
    }

    #[test]
    fn test_update_nonexistent_workspace() {
        let mut db = MockDatabase::new();
        assert!(db.update_workspace("nonexistent", "Name").is_err());
    }

    #[test]
    fn test_delete_empty_workspace() {
        let mut db = MockDatabase::new();
        let ws = db.create_workspace("To Delete", "therapy");

        assert!(db.delete_workspace(&ws.id).is_ok());
        assert!(db.get_workspace(&ws.id).is_none());
    }

    #[test]
    fn test_delete_workspace_with_folders() {
        let mut db = MockDatabase::new();
        let ws = db.create_workspace("Has Folders", "therapy");
        db.create_folder(&ws.id, "Folder", None).unwrap();

        assert!(db.delete_workspace(&ws.id).is_err());
        // Workspace should still exist
        assert!(db.get_workspace(&ws.id).is_some());
    }

    #[test]
    fn test_workspace_types() {
        let mut db = MockDatabase::new();

        for ws_type in ["therapy", "legal", "research", "general"] {
            let ws = db.create_workspace(&format!("{} Workspace", ws_type), ws_type);
            assert_eq!(ws.workspace_type, ws_type);
        }
    }
}

// ============================================================================
// Folder Tests
// ============================================================================

mod folder_tests {
    use super::*;

    #[test]
    fn test_create_folder() {
        let mut db = MockDatabase::new();
        let ws = db.create_workspace("Test", "therapy");
        let folder = db.create_folder(&ws.id, "Clients", None).unwrap();

        assert!(!folder.id.is_empty());
        assert_eq!(folder.workspace_id, ws.id);
        assert_eq!(folder.name, "Clients");
        assert!(folder.parent_id.is_none());
    }

    #[test]
    fn test_create_nested_folder() {
        let mut db = MockDatabase::new();
        let ws = db.create_workspace("Test", "therapy");
        let parent = db.create_folder(&ws.id, "Parent", None).unwrap();
        let child = db.create_folder(&ws.id, "Child", Some(&parent.id)).unwrap();

        assert_eq!(child.parent_id, Some(parent.id.clone()));
    }

    #[test]
    fn test_create_deeply_nested_folders() {
        let mut db = MockDatabase::new();
        let ws = db.create_workspace("Test", "therapy");

        let mut parent_id: Option<String> = None;
        for i in 1..=5 {
            let folder = db
                .create_folder(&ws.id, &format!("Level {}", i), parent_id.as_deref())
                .unwrap();
            parent_id = Some(folder.id);
        }

        // All 5 levels created
        assert_eq!(db.get_folders(&ws.id).len(), 5);
    }

    #[test]
    fn test_create_folder_invalid_workspace() {
        let mut db = MockDatabase::new();
        assert!(db.create_folder("nonexistent", "Folder", None).is_err());
    }

    #[test]
    fn test_create_folder_invalid_parent() {
        let mut db = MockDatabase::new();
        let ws = db.create_workspace("Test", "therapy");
        assert!(db.create_folder(&ws.id, "Folder", Some("nonexistent")).is_err());
    }

    #[test]
    fn test_get_folders_by_workspace() {
        let mut db = MockDatabase::new();
        let ws1 = db.create_workspace("WS1", "therapy");
        let ws2 = db.create_workspace("WS2", "legal");

        db.create_folder(&ws1.id, "Folder 1", None).unwrap();
        db.create_folder(&ws1.id, "Folder 2", None).unwrap();
        db.create_folder(&ws2.id, "Other Folder", None).unwrap();

        assert_eq!(db.get_folders(&ws1.id).len(), 2);
        assert_eq!(db.get_folders(&ws2.id).len(), 1);
    }

    #[test]
    fn test_get_child_folders() {
        let mut db = MockDatabase::new();
        let ws = db.create_workspace("Test", "therapy");
        let parent = db.create_folder(&ws.id, "Parent", None).unwrap();
        db.create_folder(&ws.id, "Child 1", Some(&parent.id)).unwrap();
        db.create_folder(&ws.id, "Child 2", Some(&parent.id)).unwrap();
        db.create_folder(&ws.id, "Sibling", None).unwrap();

        let children = db.get_child_folders(&parent.id);
        assert_eq!(children.len(), 2);
    }

    #[test]
    fn test_delete_empty_folder() {
        let mut db = MockDatabase::new();
        let ws = db.create_workspace("Test", "therapy");
        let folder = db.create_folder(&ws.id, "To Delete", None).unwrap();

        assert!(db.delete_folder(&folder.id).is_ok());
        assert!(db.get_folder(&folder.id).is_none());
    }

    #[test]
    fn test_delete_folder_with_sessions() {
        let mut db = MockDatabase::new();
        let ws = db.create_workspace("Test", "therapy");
        let folder = db.create_folder(&ws.id, "Has Sessions", None).unwrap();
        db.create_session(&folder.id, "/audio.wav", Some("Session")).unwrap();

        assert!(db.delete_folder(&folder.id).is_err());
    }

    #[test]
    fn test_delete_folder_with_children() {
        let mut db = MockDatabase::new();
        let ws = db.create_workspace("Test", "therapy");
        let parent = db.create_folder(&ws.id, "Parent", None).unwrap();
        db.create_folder(&ws.id, "Child", Some(&parent.id)).unwrap();

        assert!(db.delete_folder(&parent.id).is_err());
    }
}

// ============================================================================
// Session Tests
// ============================================================================

mod session_tests {
    use super::*;

    fn setup_db_with_folder() -> (MockDatabase, String) {
        let mut db = MockDatabase::new();
        let ws = db.create_workspace("Test", "therapy");
        let folder = db.create_folder(&ws.id, "Clients", None).unwrap();
        (db, folder.id)
    }

    #[test]
    fn test_create_session() {
        let (mut db, folder_id) = setup_db_with_folder();
        let session = db
            .create_session(&folder_id, "/audio/test.wav", Some("Test Session"))
            .unwrap();

        assert!(!session.id.is_empty());
        assert_eq!(session.folder_id, folder_id);
        assert_eq!(session.title, Some("Test Session".to_string()));
        assert_eq!(session.status, "pending");
    }

    #[test]
    fn test_create_session_without_title() {
        let (mut db, folder_id) = setup_db_with_folder();
        let session = db.create_session(&folder_id, "/audio/test.wav", None).unwrap();

        assert!(session.title.is_none());
    }

    #[test]
    fn test_create_session_invalid_folder() {
        let mut db = MockDatabase::new();
        assert!(db.create_session("nonexistent", "/audio.wav", None).is_err());
    }

    #[test]
    fn test_get_sessions_by_folder() {
        let (mut db, folder_id) = setup_db_with_folder();

        db.create_session(&folder_id, "/audio1.wav", Some("Session 1")).unwrap();
        db.create_session(&folder_id, "/audio2.wav", Some("Session 2")).unwrap();

        let sessions = db.get_sessions(&folder_id);
        assert_eq!(sessions.len(), 2);
    }

    #[test]
    fn test_update_session_status() {
        let (mut db, folder_id) = setup_db_with_folder();
        let session = db.create_session(&folder_id, "/audio.wav", None).unwrap();

        let updated = db
            .update_session(
                &session.id,
                SessionUpdate {
                    title: None,
                    transcript: None,
                    generated_note: None,
                    status: Some("transcribing".to_string()),
                    audio_duration: None,
                },
            )
            .unwrap();

        assert_eq!(updated.status, "transcribing");
    }

    #[test]
    fn test_update_session_transcript() {
        let (mut db, folder_id) = setup_db_with_folder();
        let session = db.create_session(&folder_id, "/audio.wav", None).unwrap();

        let updated = db
            .update_session(
                &session.id,
                SessionUpdate {
                    title: None,
                    transcript: Some("This is the transcript.".to_string()),
                    generated_note: None,
                    status: Some("complete".to_string()),
                    audio_duration: Some(60000),
                },
            )
            .unwrap();

        assert_eq!(updated.transcript, Some("This is the transcript.".to_string()));
        assert_eq!(updated.status, "complete");
        assert_eq!(updated.audio_duration, Some(60000));
    }

    #[test]
    fn test_update_session_note() {
        let (mut db, folder_id) = setup_db_with_folder();
        let session = db.create_session(&folder_id, "/audio.wav", None).unwrap();

        let updated = db
            .update_session(
                &session.id,
                SessionUpdate {
                    title: None,
                    transcript: None,
                    generated_note: Some("# SOAP Note\n\nContent here...".to_string()),
                    status: None,
                    audio_duration: None,
                },
            )
            .unwrap();

        assert!(updated.generated_note.is_some());
        assert!(updated.generated_note.unwrap().contains("SOAP"));
    }

    #[test]
    fn test_delete_session() {
        let (mut db, folder_id) = setup_db_with_folder();
        let session = db.create_session(&folder_id, "/audio.wav", None).unwrap();

        assert!(db.delete_session(&session.id).is_ok());
        assert!(db.get_session(&session.id).is_none());
    }

    #[test]
    fn test_session_status_lifecycle() {
        let (mut db, folder_id) = setup_db_with_folder();
        let session = db.create_session(&folder_id, "/audio.wav", None).unwrap();

        // pending -> transcribing
        let s = db
            .update_session(
                &session.id,
                SessionUpdate {
                    title: None,
                    transcript: None,
                    generated_note: None,
                    status: Some("transcribing".to_string()),
                    audio_duration: None,
                },
            )
            .unwrap();
        assert_eq!(s.status, "transcribing");

        // transcribing -> generating
        let s = db
            .update_session(
                &session.id,
                SessionUpdate {
                    title: None,
                    transcript: Some("Transcript content".to_string()),
                    generated_note: None,
                    status: Some("generating".to_string()),
                    audio_duration: None,
                },
            )
            .unwrap();
        assert_eq!(s.status, "generating");

        // generating -> complete
        let s = db
            .update_session(
                &session.id,
                SessionUpdate {
                    title: None,
                    transcript: None,
                    generated_note: Some("Generated note".to_string()),
                    status: Some("complete".to_string()),
                    audio_duration: None,
                },
            )
            .unwrap();
        assert_eq!(s.status, "complete");
    }
}

// ============================================================================
// Search Tests
// ============================================================================

mod search_tests {
    use super::*;

    fn setup_db_with_sessions() -> MockDatabase {
        let mut db = MockDatabase::new();
        let ws = db.create_workspace("Test", "therapy");
        let folder = db.create_folder(&ws.id, "Clients", None).unwrap();

        // Create sessions with different content
        let mut s1 = db
            .create_session(&folder.id, "/audio1.wav", Some("Weekly Meeting"))
            .unwrap();
        db.update_session(
            &s1.id,
            SessionUpdate {
                title: None,
                transcript: Some("Discussion about project timeline.".to_string()),
                generated_note: None,
                status: None,
                audio_duration: None,
            },
        )
        .unwrap();

        let mut s2 = db
            .create_session(&folder.id, "/audio2.wav", Some("Project Review"))
            .unwrap();
        db.update_session(
            &s2.id,
            SessionUpdate {
                title: None,
                transcript: Some("Budget and timeline review.".to_string()),
                generated_note: None,
                status: None,
                audio_duration: None,
            },
        )
        .unwrap();

        db.create_session(&folder.id, "/audio3.wav", Some("Daily Standup")).unwrap();

        db
    }

    #[test]
    fn test_search_by_title() {
        let db = setup_db_with_sessions();
        let results = db.search_sessions("Meeting");

        assert_eq!(results.len(), 1);
        assert!(results[0].title.as_ref().unwrap().contains("Meeting"));
    }

    #[test]
    fn test_search_by_transcript() {
        let db = setup_db_with_sessions();
        let results = db.search_sessions("budget");

        assert_eq!(results.len(), 1);
        assert!(results[0].transcript.as_ref().unwrap().contains("Budget"));
    }

    #[test]
    fn test_search_multiple_results() {
        let db = setup_db_with_sessions();
        let results = db.search_sessions("timeline");

        assert_eq!(results.len(), 2);
    }

    #[test]
    fn test_search_case_insensitive() {
        let db = setup_db_with_sessions();

        let results_lower = db.search_sessions("project");
        let results_upper = db.search_sessions("PROJECT");
        let results_mixed = db.search_sessions("PrOjEcT");

        assert_eq!(results_lower.len(), results_upper.len());
        assert_eq!(results_lower.len(), results_mixed.len());
    }

    #[test]
    fn test_search_no_results() {
        let db = setup_db_with_sessions();
        let results = db.search_sessions("nonexistent");

        assert!(results.is_empty());
    }
}

// ============================================================================
// Settings Tests
// ============================================================================

mod settings_tests {
    use super::*;

    #[test]
    fn test_default_settings() {
        let db = MockDatabase::new();
        let settings = db.get_settings();

        assert_eq!(settings.theme, "system");
        assert_eq!(settings.whisper_model, "base");
        assert_eq!(settings.llm_provider, "bundled");
        assert!(settings.auto_save);
    }

    #[test]
    fn test_update_theme() {
        let mut db = MockDatabase::new();

        db.update_settings(SettingsUpdate {
            theme: Some("dark".to_string()),
            whisper_model: None,
            llm_provider: None,
            export_format: None,
            auto_save: None,
        });

        assert_eq!(db.get_settings().theme, "dark");
    }

    #[test]
    fn test_update_multiple_settings() {
        let mut db = MockDatabase::new();

        db.update_settings(SettingsUpdate {
            theme: Some("light".to_string()),
            whisper_model: Some("large".to_string()),
            llm_provider: Some("local".to_string()),
            export_format: Some("pdf".to_string()),
            auto_save: Some(false),
        });

        let settings = db.get_settings();
        assert_eq!(settings.theme, "light");
        assert_eq!(settings.whisper_model, "large");
        assert_eq!(settings.llm_provider, "local");
        assert_eq!(settings.export_format, "pdf");
        assert!(!settings.auto_save);
    }

    #[test]
    fn test_partial_settings_update() {
        let mut db = MockDatabase::new();

        // Only update theme
        db.update_settings(SettingsUpdate {
            theme: Some("dark".to_string()),
            whisper_model: None,
            llm_provider: None,
            export_format: None,
            auto_save: None,
        });

        let settings = db.get_settings();
        assert_eq!(settings.theme, "dark");
        // Other settings unchanged
        assert_eq!(settings.whisper_model, "base");
        assert!(settings.auto_save);
    }

    #[test]
    fn test_valid_themes() {
        let mut db = MockDatabase::new();

        for theme in ["system", "light", "dark"] {
            db.update_settings(SettingsUpdate {
                theme: Some(theme.to_string()),
                whisper_model: None,
                llm_provider: None,
                export_format: None,
                auto_save: None,
            });
            assert_eq!(db.get_settings().theme, theme);
        }
    }

    #[test]
    fn test_valid_whisper_models() {
        let mut db = MockDatabase::new();

        for model in ["tiny", "base", "small", "medium", "large", "large-v3-turbo"] {
            db.update_settings(SettingsUpdate {
                theme: None,
                whisper_model: Some(model.to_string()),
                llm_provider: None,
                export_format: None,
                auto_save: None,
            });
            assert_eq!(db.get_settings().whisper_model, model);
        }
    }
}

// ============================================================================
// Complex Scenario Tests
// ============================================================================

mod complex_scenarios {
    use super::*;

    #[test]
    fn test_full_workflow_simulation() {
        let mut db = MockDatabase::new();

        // 1. Create workspace
        let ws = db.create_workspace("My Practice", "therapy");

        // 2. Create folders
        let clients_folder = db.create_folder(&ws.id, "Clients", None).unwrap();
        let john_folder = db
            .create_folder(&ws.id, "John Smith", Some(&clients_folder.id))
            .unwrap();

        // 3. Create session
        let session = db
            .create_session(&john_folder.id, "/audio/session1.wav", Some("Initial Consultation"))
            .unwrap();

        // 4. Update with transcript
        db.update_session(
            &session.id,
            SessionUpdate {
                title: None,
                transcript: Some("Patient discussed anxiety symptoms...".to_string()),
                generated_note: None,
                status: Some("transcribing".to_string()),
                audio_duration: Some(3600000),
            },
        )
        .unwrap();

        // 5. Update with generated note
        let final_session = db
            .update_session(
                &session.id,
                SessionUpdate {
                    title: None,
                    transcript: None,
                    generated_note: Some("# SOAP Note\n\n**S:** Patient reports...".to_string()),
                    status: Some("complete".to_string()),
                    audio_duration: None,
                },
            )
            .unwrap();

        // Verify final state
        assert_eq!(final_session.status, "complete");
        assert!(final_session.transcript.is_some());
        assert!(final_session.generated_note.is_some());
        assert_eq!(final_session.audio_duration, Some(3600000));
    }

    #[test]
    fn test_workspace_isolation() {
        let mut db = MockDatabase::new();

        let ws1 = db.create_workspace("Workspace 1", "therapy");
        let ws2 = db.create_workspace("Workspace 2", "legal");

        let folder1 = db.create_folder(&ws1.id, "Folder in WS1", None).unwrap();
        let folder2 = db.create_folder(&ws2.id, "Folder in WS2", None).unwrap();

        db.create_session(&folder1.id, "/audio1.wav", Some("Session 1")).unwrap();
        db.create_session(&folder2.id, "/audio2.wav", Some("Session 2")).unwrap();

        // Folders are isolated by workspace
        assert_eq!(db.get_folders(&ws1.id).len(), 1);
        assert_eq!(db.get_folders(&ws2.id).len(), 1);

        // Sessions are isolated by folder
        assert_eq!(db.get_sessions(&folder1.id).len(), 1);
        assert_eq!(db.get_sessions(&folder2.id).len(), 1);
    }

    #[test]
    fn test_cascading_operations() {
        let mut db = MockDatabase::new();

        let ws = db.create_workspace("Test", "therapy");
        let folder = db.create_folder(&ws.id, "Folder", None).unwrap();
        let session = db.create_session(&folder.id, "/audio.wav", None).unwrap();

        // Cannot delete folder with session
        assert!(db.delete_folder(&folder.id).is_err());

        // Delete session first
        db.delete_session(&session.id).unwrap();

        // Now can delete folder
        assert!(db.delete_folder(&folder.id).is_ok());

        // Now can delete workspace
        assert!(db.delete_workspace(&ws.id).is_ok());
    }

    #[test]
    fn test_many_sessions_performance() {
        let mut db = MockDatabase::new();
        let ws = db.create_workspace("Test", "therapy");
        let folder = db.create_folder(&ws.id, "Bulk", None).unwrap();

        // Create many sessions
        for i in 0..100 {
            db.create_session(&folder.id, &format!("/audio{}.wav", i), Some(&format!("Session {}", i)))
                .unwrap();
        }

        // Verify all created
        assert_eq!(db.get_sessions(&folder.id).len(), 100);

        // Search should still work
        let results = db.search_sessions("Session 5");
        assert!(results.len() > 1); // Should find Session 5, 50, 51, etc.
    }
}
