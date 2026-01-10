use anyhow::Result;
use sqlx::SqlitePool;
use uuid::Uuid;

mod therapy;
mod legal;
mod research;
mod general;

pub async fn insert_default_templates(pool: &SqlitePool) -> Result<()> {
    let now = chrono::Utc::now().timestamp();

    // Therapy templates
    for (name, description, prompt, is_default) in therapy::get_templates() {
        insert_template(pool, "therapy", name, description, prompt, is_default, now).await?;
    }

    // Legal templates
    for (name, description, prompt, is_default) in legal::get_templates() {
        insert_template(pool, "legal", name, description, prompt, is_default, now).await?;
    }

    // Research templates
    for (name, description, prompt, is_default) in research::get_templates() {
        insert_template(pool, "research", name, description, prompt, is_default, now).await?;
    }

    // General templates
    for (name, description, prompt, is_default) in general::get_templates() {
        insert_template(pool, "general", name, description, prompt, is_default, now).await?;
    }

    Ok(())
}

async fn insert_template(
    pool: &SqlitePool,
    workspace_type: &str,
    name: &str,
    description: &str,
    prompt: &str,
    is_default: bool,
    now: i64,
) -> Result<()> {
    let id = Uuid::new_v4().to_string();

    sqlx::query(
        "INSERT INTO templates (id, name, workspace_type, description, prompt, is_default, is_system, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)",
    )
    .bind(&id)
    .bind(name)
    .bind(workspace_type)
    .bind(description)
    .bind(prompt)
    .bind(is_default)
    .bind(now)
    .bind(now)
    .execute(pool)
    .await?;

    Ok(())
}
