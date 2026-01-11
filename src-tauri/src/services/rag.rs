use crate::services::chunking::{chunk_transcript, chunk_transcript_segments, ChunkingConfig};
use crate::services::embeddings::{
    bytes_to_embedding, cosine_similarity, embedding_to_bytes,
    generate_embedding, EMBEDDING_DIM,
};
use crate::services::llm;
use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use sqlx::sqlite::SqlitePool;
use sqlx::Row;
use tauri::AppHandle;
use uuid::Uuid;

/// A retrieved chunk with similarity score
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RetrievedChunk {
    pub chunk_id: String,
    pub session_id: String,
    pub session_title: Option<String>,
    pub text: String,
    pub speaker: Option<String>,
    pub similarity: f32,
}

/// Chat message for RAG conversations
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatMessage {
    pub id: String,
    pub conversation_id: String,
    pub role: String,
    pub content: String,
    pub source_chunks: Option<Vec<String>>,
    pub created_at: i64,
}

/// Chat conversation
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatConversation {
    pub id: String,
    pub title: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

/// Index a session's transcript for RAG search
/// Chunks the transcript and generates embeddings for each chunk
pub async fn index_session(pool: &SqlitePool, session_id: &str) -> Result<usize> {
    // Get session transcript
    let row = sqlx::query(
        "SELECT transcript, transcript_segments FROM sessions WHERE id = ?",
    )
    .bind(session_id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| anyhow!("Session not found"))?;

    let transcript: Option<String> = row.get("transcript");
    let transcript_segments: Option<String> = row.get("transcript_segments");

    // Prefer transcript_segments if available (has speaker info)
    let config = ChunkingConfig::default();
    let chunks = if let Some(segments_json) = transcript_segments {
        chunk_transcript_segments(session_id, &segments_json, &config)
    } else if let Some(text) = transcript {
        chunk_transcript(session_id, &text, &config)
    } else {
        return Err(anyhow!("Session has no transcript"));
    };

    if chunks.is_empty() {
        return Ok(0);
    }

    // Delete existing chunks for this session
    sqlx::query("DELETE FROM transcript_chunks WHERE session_id = ?")
        .bind(session_id)
        .execute(pool)
        .await?;

    let now = chrono::Utc::now().timestamp();

    // Generate embeddings and store chunks
    for chunk in &chunks {
        let embedding = generate_embedding(&chunk.text)?;
        let embedding_bytes = embedding_to_bytes(&embedding);

        sqlx::query(
            r#"
            INSERT INTO transcript_chunks
            (id, session_id, chunk_index, text, speaker, start_offset, end_offset, embedding, embedding_model, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&chunk.id)
        .bind(session_id)
        .bind(chunk.chunk_index as i32)
        .bind(&chunk.text)
        .bind(&chunk.speaker)
        .bind(chunk.start_offset as i32)
        .bind(chunk.end_offset as i32)
        .bind(&embedding_bytes)
        .bind("all-minilm-l6-v2")
        .bind(now)
        .bind(now)
        .execute(pool)
        .await?;
    }

    // Update indexing status
    sqlx::query(
        r#"
        INSERT OR REPLACE INTO session_indexing_status
        (session_id, is_indexed, chunk_count, embedding_model, indexed_at)
        VALUES (?, 1, ?, ?, ?)
        "#,
    )
    .bind(session_id)
    .bind(chunks.len() as i32)
    .bind("all-minilm-l6-v2")
    .bind(now)
    .execute(pool)
    .await?;

    println!(
        "[RAG] Indexed session {} with {} chunks",
        session_id,
        chunks.len()
    );

    Ok(chunks.len())
}

/// Check if a session is indexed
pub async fn is_session_indexed(pool: &SqlitePool, session_id: &str) -> Result<bool> {
    let row: Option<(i32,)> = sqlx::query_as(
        "SELECT is_indexed FROM session_indexing_status WHERE session_id = ?",
    )
    .bind(session_id)
    .fetch_optional(pool)
    .await?;

    Ok(row.map(|r| r.0 == 1).unwrap_or(false))
}

/// Index all sessions that haven't been indexed yet
pub async fn index_all_pending_sessions(pool: &SqlitePool) -> Result<usize> {
    let rows = sqlx::query(
        r#"
        SELECT s.id
        FROM sessions s
        LEFT JOIN session_indexing_status sis ON s.id = sis.session_id
        WHERE s.transcript IS NOT NULL
          AND s.status = 'complete'
          AND (sis.is_indexed IS NULL OR sis.is_indexed = 0)
        "#,
    )
    .fetch_all(pool)
    .await?;

    let mut indexed_count = 0;
    for row in rows {
        let session_id: String = row.get("id");
        match index_session(pool, &session_id).await {
            Ok(chunks) => {
                if chunks > 0 {
                    indexed_count += 1;
                }
            }
            Err(e) => {
                println!("[RAG] Failed to index session {}: {}", session_id, e);
            }
        }
    }

    Ok(indexed_count)
}

/// Search for relevant chunks using semantic similarity
pub async fn search_chunks(
    pool: &SqlitePool,
    query: &str,
    limit: usize,
    min_similarity: f32,
) -> Result<Vec<RetrievedChunk>> {
    // Generate query embedding
    let query_embedding = generate_embedding(query)?;

    // Load all chunks with embeddings
    // For a personal transcript app, this is fast enough
    // For larger scale, would need approximate nearest neighbor search
    let rows = sqlx::query(
        r#"
        SELECT tc.id, tc.session_id, tc.text, tc.speaker, tc.embedding,
               s.title as session_title
        FROM transcript_chunks tc
        JOIN sessions s ON tc.session_id = s.id
        WHERE tc.embedding IS NOT NULL
        "#,
    )
    .fetch_all(pool)
    .await?;

    // Calculate similarities
    let mut results: Vec<(String, String, Option<String>, String, Option<String>, f32)> = rows
        .iter()
        .filter_map(|row| {
            let id: String = row.get("id");
            let session_id: String = row.get("session_id");
            let session_title: Option<String> = row.get("session_title");
            let text: String = row.get("text");
            let speaker: Option<String> = row.get("speaker");
            let embedding_bytes: Vec<u8> = row.get("embedding");

            if embedding_bytes.len() != EMBEDDING_DIM * 4 {
                return None;
            }

            let embedding = bytes_to_embedding(&embedding_bytes);
            let similarity = cosine_similarity(&query_embedding, &embedding);

            if similarity >= min_similarity {
                Some((id, session_id, session_title, text, speaker, similarity))
            } else {
                None
            }
        })
        .collect();

    // Sort by similarity (descending)
    results.sort_by(|a, b| b.5.partial_cmp(&a.5).unwrap_or(std::cmp::Ordering::Equal));

    // Take top k
    let retrieved: Vec<RetrievedChunk> = results
        .into_iter()
        .take(limit)
        .map(|(id, session_id, session_title, text, speaker, similarity)| RetrievedChunk {
            chunk_id: id,
            session_id,
            session_title,
            text,
            speaker,
            similarity,
        })
        .collect();

    Ok(retrieved)
}

/// Create a new chat conversation
pub async fn create_conversation(pool: &SqlitePool, title: Option<String>) -> Result<String> {
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().timestamp();

    sqlx::query(
        "INSERT INTO chat_conversations (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(&title)
    .bind(now)
    .bind(now)
    .execute(pool)
    .await?;

    Ok(id)
}

/// Add a message to a conversation
pub async fn add_message(
    pool: &SqlitePool,
    conversation_id: &str,
    role: &str,
    content: &str,
    source_chunks: Option<Vec<String>>,
) -> Result<ChatMessage> {
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().timestamp();

    let source_chunks_json = source_chunks
        .as_ref()
        .map(|chunks| serde_json::to_string(chunks).unwrap_or_default());

    sqlx::query(
        r#"
        INSERT INTO chat_messages (id, conversation_id, role, content, source_chunks, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        "#,
    )
    .bind(&id)
    .bind(conversation_id)
    .bind(role)
    .bind(content)
    .bind(&source_chunks_json)
    .bind(now)
    .execute(pool)
    .await?;

    // Update conversation timestamp
    sqlx::query("UPDATE chat_conversations SET updated_at = ? WHERE id = ?")
        .bind(now)
        .bind(conversation_id)
        .execute(pool)
        .await?;

    Ok(ChatMessage {
        id,
        conversation_id: conversation_id.to_string(),
        role: role.to_string(),
        content: content.to_string(),
        source_chunks,
        created_at: now,
    })
}

/// Get messages from a conversation
pub async fn get_conversation_messages(
    pool: &SqlitePool,
    conversation_id: &str,
) -> Result<Vec<ChatMessage>> {
    let rows = sqlx::query(
        "SELECT id, conversation_id, role, content, source_chunks, created_at
         FROM chat_messages
         WHERE conversation_id = ?
         ORDER BY created_at ASC",
    )
    .bind(conversation_id)
    .fetch_all(pool)
    .await?;

    let messages: Vec<ChatMessage> = rows
        .iter()
        .map(|row| {
            let source_chunks_json: Option<String> = row.get("source_chunks");
            let source_chunks: Option<Vec<String>> = source_chunks_json
                .and_then(|json| serde_json::from_str(&json).ok());

            ChatMessage {
                id: row.get("id"),
                conversation_id: row.get("conversation_id"),
                role: row.get("role"),
                content: row.get("content"),
                source_chunks,
                created_at: row.get("created_at"),
            }
        })
        .collect();

    Ok(messages)
}

/// Get all conversations
pub async fn get_conversations(pool: &SqlitePool) -> Result<Vec<ChatConversation>> {
    let rows = sqlx::query(
        "SELECT id, title, created_at, updated_at
         FROM chat_conversations
         WHERE is_active = 1
         ORDER BY updated_at DESC",
    )
    .fetch_all(pool)
    .await?;

    let conversations: Vec<ChatConversation> = rows
        .iter()
        .map(|row| ChatConversation {
            id: row.get("id"),
            title: row.get("title"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        })
        .collect();

    Ok(conversations)
}

/// Delete a conversation
pub async fn delete_conversation(pool: &SqlitePool, conversation_id: &str) -> Result<()> {
    sqlx::query("UPDATE chat_conversations SET is_active = 0 WHERE id = ?")
        .bind(conversation_id)
        .execute(pool)
        .await?;
    Ok(())
}

/// Build context string from retrieved chunks for RAG prompt
pub fn build_rag_context(chunks: &[RetrievedChunk]) -> String {
    if chunks.is_empty() {
        return String::new();
    }

    let mut context = String::from("Relevant transcript excerpts:\n\n");

    for (i, chunk) in chunks.iter().enumerate() {
        let speaker_label = chunk
            .speaker
            .as_ref()
            .map(|s| format!("[{}] ", s))
            .unwrap_or_default();

        let session_label = chunk
            .session_title
            .as_ref()
            .map(|t| format!(" (from: {})", t))
            .unwrap_or_default();

        context.push_str(&format!(
            "---\nExcerpt {}{}:\n{}{}\n",
            i + 1,
            session_label,
            speaker_label,
            chunk.text
        ));
    }

    context
}

/// Format RAG prompt with context and user question
pub fn format_rag_prompt(context: &str, user_question: &str) -> String {
    format!(
        r#"You are a helpful assistant that answers questions based on transcript excerpts.
Use the provided context to answer the user's question. If the context doesn't contain
relevant information, say so clearly. Be concise and accurate.

{}

User question: {}

Answer:"#,
        context, user_question
    )
}

/// Generate a RAG response using the configured LLM
pub async fn generate_rag_response(
    app: &AppHandle,
    conversation_id: &str,
    query: &str,
    chunks: &[RetrievedChunk],
) -> Result<String> {
    let context = build_rag_context(chunks);
    let prompt = format_rag_prompt(&context, query);

    // Use current LLM provider with streaming (emits llm-stream events)
    llm::generate_with_current_provider(app, conversation_id, &prompt, 1024).await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_build_rag_context_empty() {
        let chunks: Vec<RetrievedChunk> = vec![];
        let context = build_rag_context(&chunks);
        assert!(context.is_empty());
    }

    #[test]
    fn test_build_rag_context_with_chunks() {
        let chunks = vec![
            RetrievedChunk {
                chunk_id: "1".to_string(),
                session_id: "s1".to_string(),
                session_title: Some("Meeting Notes".to_string()),
                text: "We discussed the project timeline.".to_string(),
                speaker: Some("John".to_string()),
                similarity: 0.9,
            },
            RetrievedChunk {
                chunk_id: "2".to_string(),
                session_id: "s2".to_string(),
                session_title: None,
                text: "The deadline is next week.".to_string(),
                speaker: None,
                similarity: 0.8,
            },
        ];

        let context = build_rag_context(&chunks);

        assert!(context.contains("Excerpt 1"));
        assert!(context.contains("Meeting Notes"));
        assert!(context.contains("[John]"));
        assert!(context.contains("project timeline"));
        assert!(context.contains("Excerpt 2"));
        assert!(context.contains("deadline"));
    }

    #[test]
    fn test_format_rag_prompt() {
        let context = "Some context here";
        let question = "What is the deadline?";

        let prompt = format_rag_prompt(context, question);

        assert!(prompt.contains(context));
        assert!(prompt.contains(question));
        assert!(prompt.contains("helpful assistant"));
    }
}
