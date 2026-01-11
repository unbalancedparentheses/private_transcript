use crate::services::database;
use crate::services::embeddings;
use crate::services::rag::{
    add_message, build_rag_context, create_conversation, delete_conversation,
    format_rag_prompt, generate_rag_response, get_conversation_messages, get_conversations,
    index_all_pending_sessions, index_session, is_session_indexed, search_chunks,
    ChatConversation, ChatMessage, RetrievedChunk,
};
use crate::utils::IntoTauriResult;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

/// Get app data directory
fn get_app_data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))
}

/// Check if embedding model is available
#[tauri::command]
pub async fn check_embedding_model(_app: AppHandle) -> Result<bool, String> {
    let app_data_dir = get_app_data_dir(&_app)?;
    Ok(embeddings::is_embedding_model_available(&app_data_dir))
}

/// Load the embedding model
#[tauri::command]
pub async fn load_embedding_model(_app: AppHandle) -> Result<(), String> {
    let app_data_dir = get_app_data_dir(&_app)?;
    embeddings::load_embedding_model(&app_data_dir).into_tauri_result()
}

/// Unload the embedding model to free memory
#[tauri::command]
pub async fn unload_embedding_model() -> Result<(), String> {
    embeddings::unload_embedding_model();
    Ok(())
}

/// Index a session for RAG search
#[tauri::command]
pub async fn index_session_for_rag(_app: AppHandle, session_id: String) -> Result<usize, String> {
    let pool = database::get_pool().into_tauri_result()?;
    index_session(pool, &session_id).await.into_tauri_result()
}

/// Check if a session is indexed
#[tauri::command]
pub async fn is_session_indexed_for_rag(
    _app: AppHandle,
    session_id: String,
) -> Result<bool, String> {
    let pool = database::get_pool().into_tauri_result()?;
    is_session_indexed(pool, &session_id)
        .await
        .into_tauri_result()
}

/// Index all pending sessions (sessions with transcripts that haven't been indexed)
#[tauri::command]
pub async fn index_all_sessions(_app: AppHandle) -> Result<usize, String> {
    let pool = database::get_pool().into_tauri_result()?;
    index_all_pending_sessions(pool).await.into_tauri_result()
}

/// Search for relevant chunks using semantic similarity
#[tauri::command]
pub async fn search_transcript_chunks(
    _app: AppHandle,
    query: String,
    limit: Option<usize>,
    min_similarity: Option<f32>,
) -> Result<Vec<RetrievedChunk>, String> {
    let pool = database::get_pool().into_tauri_result()?;
    search_chunks(
        pool,
        &query,
        limit.unwrap_or(5),
        min_similarity.unwrap_or(0.3),
    )
    .await
    .into_tauri_result()
}

/// Create a new chat conversation
#[tauri::command]
pub async fn create_chat_conversation(
    _app: AppHandle,
    title: Option<String>,
) -> Result<String, String> {
    let pool = database::get_pool().into_tauri_result()?;
    create_conversation(pool, title).await.into_tauri_result()
}

/// Add a message to a conversation
#[tauri::command]
pub async fn add_chat_message(
    _app: AppHandle,
    conversation_id: String,
    role: String,
    content: String,
    source_chunks: Option<Vec<String>>,
) -> Result<ChatMessage, String> {
    let pool = database::get_pool().into_tauri_result()?;
    add_message(pool, &conversation_id, &role, &content, source_chunks)
        .await
        .into_tauri_result()
}

/// Get messages from a conversation
#[tauri::command]
pub async fn get_chat_messages(
    _app: AppHandle,
    conversation_id: String,
) -> Result<Vec<ChatMessage>, String> {
    let pool = database::get_pool().into_tauri_result()?;
    get_conversation_messages(pool, &conversation_id)
        .await
        .into_tauri_result()
}

/// Get all conversations
#[tauri::command]
pub async fn get_chat_conversations(_app: AppHandle) -> Result<Vec<ChatConversation>, String> {
    let pool = database::get_pool().into_tauri_result()?;
    get_conversations(pool).await.into_tauri_result()
}

/// Delete a conversation
#[tauri::command]
pub async fn delete_chat_conversation(
    _app: AppHandle,
    conversation_id: String,
) -> Result<(), String> {
    let pool = database::get_pool().into_tauri_result()?;
    delete_conversation(pool, &conversation_id)
        .await
        .into_tauri_result()
}

/// Build RAG context from retrieved chunks (utility for frontend)
#[tauri::command]
pub fn build_context_from_chunks(chunks: Vec<RetrievedChunk>) -> String {
    build_rag_context(&chunks)
}

/// Format a RAG prompt with context and user question
#[tauri::command]
pub fn format_rag_chat_prompt(context: String, user_question: String) -> String {
    format_rag_prompt(&context, &user_question)
}

/// Send a RAG chat message - searches, generates response with LLM, and saves messages
#[tauri::command]
pub async fn send_rag_chat_message(
    app: AppHandle,
    conversation_id: String,
    message: String,
) -> Result<ChatMessage, String> {
    let pool = database::get_pool().into_tauri_result()?;

    // 1. Save user message
    add_message(pool, &conversation_id, "user", &message, None)
        .await
        .into_tauri_result()?;

    // 2. Search for relevant chunks
    let chunks = search_chunks(pool, &message, 5, 0.3)
        .await
        .into_tauri_result()?;

    // 3. Generate response with LLM (streams via llm-stream event using conversation_id)
    let response = generate_rag_response(&app, &conversation_id, &message, &chunks)
        .await
        .into_tauri_result()?;

    // 4. Save assistant message with source references
    let chunk_ids: Vec<String> = chunks.iter().map(|c| c.chunk_id.clone()).collect();
    let source_chunks = if chunk_ids.is_empty() {
        None
    } else {
        Some(chunk_ids)
    };

    let assistant_msg = add_message(pool, &conversation_id, "assistant", &response, source_chunks)
        .await
        .into_tauri_result()?;

    Ok(assistant_msg)
}
