// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod db;
mod models;
mod services;
mod templates;
mod utils;

use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // Set app data directory for embeddings service
            if let Ok(app_data_dir) = app.path().app_data_dir() {
                services::embeddings::set_app_data_dir(app_data_dir);
            }

            // Initialize database on startup
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = services::database::init_database(&app_handle).await {
                    eprintln!("Failed to initialize database: {}", e);
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Workspace commands
            commands::workspace::create_workspace,
            commands::workspace::get_workspaces,
            commands::workspace::update_workspace,
            commands::workspace::delete_workspace,
            // Folder commands
            commands::folder::create_folder,
            commands::folder::get_folders,
            commands::folder::update_folder,
            commands::folder::delete_folder,
            // Session commands
            commands::session::create_session,
            commands::session::get_sessions,
            commands::session::get_session,
            commands::session::update_session,
            commands::session::delete_session,
            commands::session::search_sessions,
            // Template commands
            commands::template::get_templates,
            commands::template::get_template,
            // Transcription commands
            commands::transcription::transcribe_audio,
            commands::transcription::get_transcription_progress,
            // Generation commands
            commands::generation::generate_note,
            commands::generation::generate_note_streaming,
            commands::generation::check_ollama_status,
            // Audio commands
            commands::audio::save_audio_file,
            commands::audio::get_audio_path,
            // System audio commands
            commands::system_audio::get_audio_devices,
            commands::system_audio::start_system_recording,
            commands::system_audio::stop_system_recording,
            commands::system_audio::get_recording_status,
            commands::system_audio::check_audio_permissions,
            commands::system_audio::open_screen_recording_settings,
            // Streaming transcription commands
            commands::streaming_transcription::start_streaming_worker,
            commands::streaming_transcription::initialize_streaming_worker,
            commands::streaming_transcription::start_live_transcription,
            commands::streaming_transcription::feed_live_audio,
            commands::streaming_transcription::stop_live_transcription,
            commands::streaming_transcription::shutdown_streaming_worker,
            commands::streaming_transcription::is_streaming_worker_running,
            commands::streaming_transcription::get_streaming_worker_state,
            commands::streaming_transcription::ensure_streaming_worker_running,
            // Export commands
            commands::export::export_markdown,
            commands::export::export_pdf,
            commands::export::export_docx,
            commands::export::export_to_obsidian,
            // Settings commands
            commands::settings::get_settings,
            commands::settings::update_settings,
            commands::settings::get_storage_usage,
            commands::settings::show_in_folder,
            commands::settings::open_file,
            // Model management commands
            commands::models::get_available_whisper_models,
            commands::models::get_available_llm_models,
            commands::models::get_all_available_models,
            commands::models::get_downloaded_models,
            commands::models::download_model,
            commands::models::delete_model,
            commands::models::load_whisper_model,
            commands::models::unload_whisper_model,
            commands::models::is_whisper_model_loaded,
            commands::models::get_loaded_whisper_model,
            commands::models::load_llm_model,
            commands::models::unload_llm_model,
            commands::models::is_llm_model_loaded,
            commands::models::get_loaded_llm_model,
            commands::models::get_models_total_size,
            commands::models::are_models_ready,
            // Chat/RAG commands
            commands::chat::check_embedding_model,
            commands::chat::load_embedding_model,
            commands::chat::unload_embedding_model,
            commands::chat::index_session_for_rag,
            commands::chat::is_session_indexed_for_rag,
            commands::chat::index_all_sessions,
            commands::chat::search_transcript_chunks,
            commands::chat::create_chat_conversation,
            commands::chat::add_chat_message,
            commands::chat::get_chat_messages,
            commands::chat::get_chat_conversations,
            commands::chat::delete_chat_conversation,
            commands::chat::build_context_from_chunks,
            commands::chat::format_rag_chat_prompt,
            commands::chat::send_rag_chat_message,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
