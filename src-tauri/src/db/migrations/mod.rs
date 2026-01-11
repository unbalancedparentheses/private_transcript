use anyhow::Result;
use sqlx::sqlite::SqlitePool;
use sqlx::Row;

/// Represents a database migration
struct Migration {
    version: i32,
    name: &'static str,
    sql: &'static str,
}

/// All migrations in order
const MIGRATIONS: &[Migration] = &[
    Migration {
        version: 1,
        name: "initial_schema",
        sql: include_str!("m001_initial_schema.sql"),
    },
    Migration {
        version: 2,
        name: "transcript_chunks",
        sql: include_str!("m002_transcript_chunks.sql"),
    },
    Migration {
        version: 3,
        name: "chat_history",
        sql: include_str!("m003_chat_history.sql"),
    },
];

/// Ensures the _migrations table exists
async fn ensure_migrations_table(pool: &SqlitePool) -> Result<()> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS _migrations (
            version INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            applied_at INTEGER NOT NULL
        )
        "#,
    )
    .execute(pool)
    .await?;
    Ok(())
}

/// Gets the current schema version (0 if no migrations applied)
async fn get_current_version(pool: &SqlitePool) -> Result<i32> {
    let result: Option<(i32,)> =
        sqlx::query_as("SELECT COALESCE(MAX(version), 0) FROM _migrations")
            .fetch_optional(pool)
            .await?;
    Ok(result.map(|r| r.0).unwrap_or(0))
}

/// Records that a migration was applied
async fn record_migration(pool: &SqlitePool, version: i32, name: &str) -> Result<()> {
    let now = chrono::Utc::now().timestamp();
    sqlx::query("INSERT INTO _migrations (version, name, applied_at) VALUES (?, ?, ?)")
        .bind(version)
        .bind(name)
        .bind(now)
        .execute(pool)
        .await?;
    Ok(())
}

/// Check if this is a fresh database (no tables exist yet)
async fn is_fresh_database(pool: &SqlitePool) -> Result<bool> {
    let result: (i32,) = sqlx::query_as(
        "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '_migrations'"
    )
    .fetch_one(pool)
    .await?;
    Ok(result.0 == 0)
}

/// Check if a specific table exists
async fn table_exists(pool: &SqlitePool, table_name: &str) -> Result<bool> {
    let result: (i32,) = sqlx::query_as(
        "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name = ?",
    )
    .bind(table_name)
    .fetch_one(pool)
    .await?;
    Ok(result.0 > 0)
}

/// Runs all pending migrations
pub async fn run_pending_migrations(pool: &SqlitePool) -> Result<()> {
    // Ensure the migrations tracking table exists
    ensure_migrations_table(pool).await?;

    let current_version = get_current_version(pool).await?;
    let is_fresh = is_fresh_database(pool).await?;

    // If we have existing tables but no migration records, this is an existing database
    // that was created before the migration system. Mark migration 1 as applied.
    if !is_fresh && current_version == 0 {
        // Check if workspaces table exists (key table from migration 1)
        if table_exists(pool, "workspaces").await? {
            println!("[migrations] Detected existing database, marking migration 1 as already applied");
            record_migration(pool, 1, "initial_schema").await?;
            return Ok(());
        }
    }

    // Apply pending migrations
    for migration in MIGRATIONS {
        if migration.version > current_version {
            println!(
                "[migrations] Applying migration {} ({})",
                migration.version,
                migration.name
            );

            // Execute the migration SQL
            // Split by semicolons and execute each statement
            for (idx, statement) in migration.sql.split(';').enumerate() {
                let trimmed = statement.trim();
                // Skip empty statements
                if trimmed.is_empty() {
                    continue;
                }
                // Extract non-comment content to check if there's actual SQL
                let non_comment: String = trimmed
                    .lines()
                    .filter(|line| !line.trim().starts_with("--"))
                    .collect::<Vec<_>>()
                    .join("\n");
                // Skip if it's only comments
                if non_comment.trim().is_empty() {
                    continue;
                }
                #[cfg(test)]
                println!(
                    "[debug] Executing statement {}: {}...",
                    idx,
                    non_comment.chars().take(60).collect::<String>()
                );

                sqlx::query(trimmed)
                    .execute(pool)
                    .await
                    .map_err(|e| {
                        anyhow::anyhow!(
                            "Failed to execute SQL statement {}: {}\nError: {}",
                            idx,
                            non_comment.chars().take(100).collect::<String>(),
                            e
                        )
                    })?;
            }

            // Record the migration
            record_migration(pool, migration.version, migration.name).await?;

            println!("[migrations] Migration {} applied successfully", migration.version);
        }
    }

    Ok(())
}

/// Gets a list of applied migrations for debugging
#[allow(dead_code)]
pub async fn get_applied_migrations(pool: &SqlitePool) -> Result<Vec<(i32, String, i64)>> {
    ensure_migrations_table(pool).await?;

    let rows = sqlx::query("SELECT version, name, applied_at FROM _migrations ORDER BY version")
        .fetch_all(pool)
        .await?;

    Ok(rows
        .into_iter()
        .map(|row| {
            (
                row.get::<i32, _>("version"),
                row.get::<String, _>("name"),
                row.get::<i64, _>("applied_at"),
            )
        })
        .collect())
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::sqlite::SqlitePoolOptions;

    async fn create_test_pool() -> SqlitePool {
        SqlitePoolOptions::new()
            .max_connections(1)
            .connect("sqlite::memory:")
            .await
            .expect("Failed to create test pool")
    }

    #[tokio::test]
    async fn test_fresh_migration() {
        let pool = create_test_pool().await;

        // Run migrations on fresh database
        run_pending_migrations(&pool).await.unwrap();

        // Verify migrations were recorded
        let version = get_current_version(&pool).await.unwrap();
        assert_eq!(version, 3); // Now we have 3 migrations

        // Verify migration 1 tables were created
        assert!(table_exists(&pool, "workspaces").await.unwrap());
        assert!(table_exists(&pool, "folders").await.unwrap());
        assert!(table_exists(&pool, "sessions").await.unwrap());
        assert!(table_exists(&pool, "templates").await.unwrap());
        assert!(table_exists(&pool, "settings").await.unwrap());

        // Verify migration 2 tables (transcript chunks)
        assert!(table_exists(&pool, "transcript_chunks").await.unwrap());
        assert!(table_exists(&pool, "session_indexing_status").await.unwrap());

        // Verify migration 3 tables (chat history)
        assert!(table_exists(&pool, "chat_conversations").await.unwrap());
        assert!(table_exists(&pool, "chat_messages").await.unwrap());
    }

    #[tokio::test]
    async fn test_skip_applied_migrations() {
        let pool = create_test_pool().await;

        // Run migrations twice
        run_pending_migrations(&pool).await.unwrap();
        run_pending_migrations(&pool).await.unwrap();

        // Should still be at version 3, not error
        let version = get_current_version(&pool).await.unwrap();
        assert_eq!(version, 3);

        // Check all 3 migration records exist
        let migrations = get_applied_migrations(&pool).await.unwrap();
        assert_eq!(migrations.len(), 3);
    }

    #[tokio::test]
    async fn test_existing_database_detection() {
        let pool = create_test_pool().await;

        // Manually create a table that would exist in pre-migration database
        sqlx::query("CREATE TABLE workspaces (id TEXT PRIMARY KEY)")
            .execute(&pool)
            .await
            .unwrap();

        // Run migrations - should detect existing database
        run_pending_migrations(&pool).await.unwrap();

        // Should have marked migration 1 as applied without running it
        let version = get_current_version(&pool).await.unwrap();
        assert_eq!(version, 1);
    }
}
