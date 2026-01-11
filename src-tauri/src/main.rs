// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod db;
mod models;
mod services;
mod templates;
mod utils;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
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
            // Template commands
            commands::template::get_templates,
            commands::template::get_template,
            // Transcription commands
            commands::transcription::transcribe_audio,
            commands::transcription::get_transcription_progress,
            // Generation commands
            commands::generation::generate_note,
            commands::generation::check_ollama_status,
            // Audio commands
            commands::audio::save_audio_file,
            commands::audio::get_audio_path,
            // Export commands
            commands::export::export_markdown,
            commands::export::export_pdf,
            commands::export::export_docx,
            commands::export::export_to_obsidian,
            // Settings commands
            commands::settings::get_settings,
            commands::settings::update_settings,
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
