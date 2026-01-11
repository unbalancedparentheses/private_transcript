use crate::db::migrations;
use crate::models::*;
use crate::templates;
use anyhow::Result;
use sqlx::sqlite::{SqliteConnectOptions, SqlitePool, SqlitePoolOptions, SqliteRow};
use sqlx::Row;
use std::str::FromStr;
use std::sync::OnceLock;
use tauri::AppHandle;
use tauri::Manager;
use uuid::Uuid;

static DB_POOL: OnceLock<SqlitePool> = OnceLock::new();

fn get_db_path(app: &AppHandle) -> Result<String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| anyhow::anyhow!("Failed to get app data dir: {}", e))?;
    std::fs::create_dir_all(&app_data_dir)?;
    let db_path = app_data_dir.join("private_transcript.db");
    Ok(db_path.to_string_lossy().to_string())
}

pub async fn init_database(app: &AppHandle) -> Result<()> {
    let db_path = get_db_path(app)?;

    let options = SqliteConnectOptions::from_str(&format!("sqlite:{}?mode=rwc", db_path))?
        .create_if_missing(true);

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(options)
        .await?;

    // Run database migrations
    migrations::run_pending_migrations(&pool).await?;

    // Insert default templates if they don't exist
    let template_count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM templates")
        .fetch_one(&pool)
        .await?;

    if template_count.0 == 0 {
        templates::insert_default_templates(&pool).await?;
    }

    DB_POOL.set(pool).ok();
    Ok(())
}

fn get_pool() -> Result<&'static SqlitePool> {
    DB_POOL
        .get()
        .ok_or_else(|| anyhow::anyhow!("Database not initialized"))
}

fn now() -> i64 {
    chrono::Utc::now().timestamp()
}

fn workspace_from_row(row: SqliteRow) -> Workspace {
    Workspace {
        id: row.get("id"),
        name: row.get("name"),
        workspace_type: row.get("workspace_type"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
        is_active: row.get::<i32, _>("is_active") == 1,
    }
}

fn folder_from_row(row: SqliteRow) -> Folder {
    Folder {
        id: row.get("id"),
        workspace_id: row.get("workspace_id"),
        name: row.get("name"),
        metadata: row.get("metadata"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
        is_active: row.get::<i32, _>("is_active") == 1,
        session_count: row.get::<i64, _>("session_count"),
    }
}

fn session_from_row(row: SqliteRow) -> Session {
    Session {
        id: row.get("id"),
        folder_id: row.get("folder_id"),
        title: row.get("title"),
        audio_path: row.get("audio_path"),
        audio_duration: row.get("audio_duration"),
        transcript: row.get("transcript"),
        transcript_segments: row.get("transcript_segments"),
        generated_note: row.get("generated_note"),
        note_format: row.get("note_format"),
        template_id: row.get("template_id"),
        status: row.get("status"),
        error_message: row.get("error_message"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    }
}

fn template_from_row(row: SqliteRow) -> Template {
    Template {
        id: row.get("id"),
        name: row.get("name"),
        workspace_type: row.get("workspace_type"),
        description: row.get("description"),
        prompt: row.get("prompt"),
        output_format: row.get("output_format"),
        is_default: row.get::<i32, _>("is_default") == 1,
        is_system: row.get::<i32, _>("is_system") == 1,
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    }
}

// Workspace operations
pub async fn create_workspace(
    _app: &AppHandle,
    request: CreateWorkspaceRequest,
) -> Result<Workspace> {
    let pool = get_pool()?;
    let id = Uuid::new_v4().to_string();
    let now = now();

    sqlx::query(
        "INSERT INTO workspaces (id, name, workspace_type, created_at, updated_at, is_active) VALUES (?, ?, ?, ?, ?, 1)",
    )
    .bind(&id)
    .bind(&request.name)
    .bind(&request.workspace_type)
    .bind(now)
    .bind(now)
    .execute(pool)
    .await?;

    Ok(Workspace {
        id,
        name: request.name,
        workspace_type: request.workspace_type,
        created_at: now,
        updated_at: now,
        is_active: true,
    })
}

pub async fn get_workspaces(_app: &AppHandle) -> Result<Vec<Workspace>> {
    let pool = get_pool()?;
    let rows = sqlx::query(
        "SELECT id, name, workspace_type, created_at, updated_at, is_active FROM workspaces WHERE is_active = 1 ORDER BY created_at DESC"
    )
    .fetch_all(pool)
    .await?;

    Ok(rows.into_iter().map(workspace_from_row).collect())
}

pub async fn update_workspace(
    _app: &AppHandle,
    request: UpdateWorkspaceRequest,
) -> Result<Workspace> {
    let pool = get_pool()?;
    let now = now();

    if let Some(name) = &request.name {
        sqlx::query("UPDATE workspaces SET name = ?, updated_at = ? WHERE id = ?")
            .bind(name)
            .bind(now)
            .bind(&request.id)
            .execute(pool)
            .await?;
    }

    let row = sqlx::query(
        "SELECT id, name, workspace_type, created_at, updated_at, is_active FROM workspaces WHERE id = ?"
    )
    .bind(&request.id)
    .fetch_one(pool)
    .await?;

    Ok(workspace_from_row(row))
}

pub async fn delete_workspace(_app: &AppHandle, id: &str) -> Result<()> {
    let pool = get_pool()?;
    sqlx::query("UPDATE workspaces SET is_active = 0, updated_at = ? WHERE id = ?")
        .bind(now())
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}

// Folder operations
pub async fn create_folder(_app: &AppHandle, request: CreateFolderRequest) -> Result<Folder> {
    let pool = get_pool()?;
    let id = Uuid::new_v4().to_string();
    let now = now();

    sqlx::query(
        "INSERT INTO folders (id, workspace_id, name, metadata, created_at, updated_at, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)",
    )
    .bind(&id)
    .bind(&request.workspace_id)
    .bind(&request.name)
    .bind(&request.metadata)
    .bind(now)
    .bind(now)
    .execute(pool)
    .await?;

    Ok(Folder {
        id,
        workspace_id: request.workspace_id,
        name: request.name,
        metadata: request.metadata,
        created_at: now,
        updated_at: now,
        is_active: true,
        session_count: 0,
    })
}

pub async fn get_folders(_app: &AppHandle, workspace_id: &str) -> Result<Vec<Folder>> {
    let pool = get_pool()?;
    let rows = sqlx::query(
        r#"
        SELECT
            f.id, f.workspace_id, f.name, f.metadata, f.created_at, f.updated_at,
            f.is_active,
            COALESCE((SELECT COUNT(*) FROM sessions s WHERE s.folder_id = f.id), 0) as session_count
        FROM folders f
        WHERE f.workspace_id = ? AND f.is_active = 1
        ORDER BY f.created_at DESC
        "#
    )
    .bind(workspace_id)
    .fetch_all(pool)
    .await?;

    Ok(rows.into_iter().map(folder_from_row).collect())
}

pub async fn update_folder(_app: &AppHandle, request: UpdateFolderRequest) -> Result<Folder> {
    let pool = get_pool()?;
    let now = now();

    if let Some(name) = &request.name {
        sqlx::query("UPDATE folders SET name = ?, updated_at = ? WHERE id = ?")
            .bind(name)
            .bind(now)
            .bind(&request.id)
            .execute(pool)
            .await?;
    }

    if let Some(metadata) = &request.metadata {
        sqlx::query("UPDATE folders SET metadata = ?, updated_at = ? WHERE id = ?")
            .bind(metadata)
            .bind(now)
            .bind(&request.id)
            .execute(pool)
            .await?;
    }

    let row = sqlx::query(
        r#"
        SELECT
            f.id, f.workspace_id, f.name, f.metadata, f.created_at, f.updated_at,
            f.is_active,
            COALESCE((SELECT COUNT(*) FROM sessions s WHERE s.folder_id = f.id), 0) as session_count
        FROM folders f
        WHERE f.id = ?
        "#
    )
    .bind(&request.id)
    .fetch_one(pool)
    .await?;

    Ok(folder_from_row(row))
}

pub async fn delete_folder(_app: &AppHandle, id: &str) -> Result<()> {
    let pool = get_pool()?;
    sqlx::query("UPDATE folders SET is_active = 0, updated_at = ? WHERE id = ?")
        .bind(now())
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}

// Session operations
pub async fn create_session(_app: &AppHandle, request: CreateSessionRequest) -> Result<Session> {
    let pool = get_pool()?;
    let id = Uuid::new_v4().to_string();
    let now = now();

    sqlx::query(
        "INSERT INTO sessions (id, folder_id, title, audio_path, audio_duration, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)",
    )
    .bind(&id)
    .bind(&request.folder_id)
    .bind(&request.title)
    .bind(&request.audio_path)
    .bind(&request.audio_duration)
    .bind(now)
    .bind(now)
    .execute(pool)
    .await?;

    Ok(Session {
        id,
        folder_id: request.folder_id,
        title: request.title,
        audio_path: request.audio_path,
        audio_duration: request.audio_duration,
        transcript: None,
        transcript_segments: None,
        generated_note: None,
        note_format: None,
        template_id: None,
        status: "pending".to_string(),
        error_message: None,
        created_at: now,
        updated_at: now,
    })
}

pub async fn get_sessions(_app: &AppHandle, folder_id: &str) -> Result<Vec<Session>> {
    let pool = get_pool()?;
    let rows = sqlx::query(
        "SELECT * FROM sessions WHERE folder_id = ? ORDER BY created_at DESC"
    )
    .bind(folder_id)
    .fetch_all(pool)
    .await?;

    Ok(rows.into_iter().map(session_from_row).collect())
}

pub async fn get_session(_app: &AppHandle, id: &str) -> Result<Session> {
    let pool = get_pool()?;
    let row = sqlx::query("SELECT * FROM sessions WHERE id = ?")
        .bind(id)
        .fetch_one(pool)
        .await?;
    Ok(session_from_row(row))
}

pub async fn update_session(_app: &AppHandle, request: UpdateSessionRequest) -> Result<Session> {
    let pool = get_pool()?;
    let now = now();

    if let Some(title) = &request.title {
        sqlx::query("UPDATE sessions SET title = ?, updated_at = ? WHERE id = ?")
            .bind(title)
            .bind(now)
            .bind(&request.id)
            .execute(pool)
            .await?;
    }

    if let Some(transcript) = &request.transcript {
        sqlx::query("UPDATE sessions SET transcript = ?, updated_at = ? WHERE id = ?")
            .bind(transcript)
            .bind(now)
            .bind(&request.id)
            .execute(pool)
            .await?;
    }

    if let Some(generated_note) = &request.generated_note {
        sqlx::query("UPDATE sessions SET generated_note = ?, updated_at = ? WHERE id = ?")
            .bind(generated_note)
            .bind(now)
            .bind(&request.id)
            .execute(pool)
            .await?;
    }

    if let Some(status) = &request.status {
        sqlx::query("UPDATE sessions SET status = ?, updated_at = ? WHERE id = ?")
            .bind(status)
            .bind(now)
            .bind(&request.id)
            .execute(pool)
            .await?;
    }

    if let Some(error_message) = &request.error_message {
        sqlx::query("UPDATE sessions SET error_message = ?, updated_at = ? WHERE id = ?")
            .bind(error_message)
            .bind(now)
            .bind(&request.id)
            .execute(pool)
            .await?;
    }

    let row = sqlx::query("SELECT * FROM sessions WHERE id = ?")
        .bind(&request.id)
        .fetch_one(pool)
        .await?;

    Ok(session_from_row(row))
}

pub async fn delete_session(_app: &AppHandle, id: &str) -> Result<()> {
    let pool = get_pool()?;
    sqlx::query("DELETE FROM sessions WHERE id = ?")
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}

// Template operations
pub async fn get_templates(_app: &AppHandle, workspace_type: Option<&str>) -> Result<Vec<Template>> {
    let pool = get_pool()?;

    let rows = if let Some(wt) = workspace_type {
        sqlx::query(
            "SELECT id, name, workspace_type, description, prompt, output_format, is_default, is_system, created_at, updated_at FROM templates WHERE workspace_type = ? ORDER BY is_default DESC, name ASC"
        )
        .bind(wt)
        .fetch_all(pool)
        .await?
    } else {
        sqlx::query(
            "SELECT id, name, workspace_type, description, prompt, output_format, is_default, is_system, created_at, updated_at FROM templates ORDER BY workspace_type, is_default DESC, name ASC"
        )
        .fetch_all(pool)
        .await?
    };

    Ok(rows.into_iter().map(template_from_row).collect())
}

pub async fn get_template(_app: &AppHandle, id: &str) -> Result<Template> {
    let pool = get_pool()?;
    let row = sqlx::query(
        "SELECT id, name, workspace_type, description, prompt, output_format, is_default, is_system, created_at, updated_at FROM templates WHERE id = ?"
    )
    .bind(id)
    .fetch_one(pool)
    .await?;
    Ok(template_from_row(row))
}

// Settings operations
pub async fn get_settings(_app: &AppHandle) -> Result<AppSettings> {
    let pool = get_pool()?;

    let rows: Vec<(String, String)> =
        sqlx::query_as("SELECT key, value FROM settings")
            .fetch_all(pool)
            .await?;

    let mut settings = AppSettings::default();

    for (key, value) in rows {
        match key.as_str() {
            "theme" => settings.theme = value,
            "whisper_model" => settings.whisper_model = value,
            "llm_provider" => settings.llm_provider = value,
            "llm_model" => settings.llm_model = value,
            "ollama_endpoint" => settings.ollama_endpoint = value,
            "openrouter_api_key" => settings.openrouter_api_key = Some(value),
            "openrouter_model" => settings.openrouter_model = Some(value),
            "default_workspace_id" => settings.default_workspace_id = Some(value),
            "audio_input_device" => settings.audio_input_device = Some(value),
            "export_format" => settings.export_format = value,
            "auto_save" => settings.auto_save = value == "true",
            _ => {}
        }
    }

    Ok(settings)
}

pub async fn update_settings(
    _app: &AppHandle,
    request: UpdateSettingsRequest,
) -> Result<AppSettings> {
    let pool = get_pool()?;
    let now = now();

    async fn upsert(pool: &SqlitePool, key: &str, value: &str, now: i64) -> Result<()> {
        sqlx::query(
            "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
        )
        .bind(key)
        .bind(value)
        .bind(now)
        .execute(pool)
        .await?;
        Ok(())
    }

    if let Some(v) = &request.theme {
        upsert(pool, "theme", v, now).await?;
    }
    if let Some(v) = &request.whisper_model {
        upsert(pool, "whisper_model", v, now).await?;
    }
    if let Some(v) = &request.llm_provider {
        upsert(pool, "llm_provider", v, now).await?;
    }
    if let Some(v) = &request.llm_model {
        upsert(pool, "llm_model", v, now).await?;
    }
    if let Some(v) = &request.ollama_endpoint {
        upsert(pool, "ollama_endpoint", v, now).await?;
    }
    if let Some(v) = &request.openrouter_api_key {
        upsert(pool, "openrouter_api_key", v, now).await?;
    }
    if let Some(v) = &request.openrouter_model {
        upsert(pool, "openrouter_model", v, now).await?;
    }
    if let Some(v) = &request.default_workspace_id {
        upsert(pool, "default_workspace_id", v, now).await?;
    }
    if let Some(v) = &request.audio_input_device {
        upsert(pool, "audio_input_device", v, now).await?;
    }
    if let Some(v) = &request.export_format {
        upsert(pool, "export_format", v, now).await?;
    }
    if let Some(v) = request.auto_save {
        upsert(pool, "auto_save", if v { "true" } else { "false" }, now).await?;
    }

    get_settings(_app).await
}
