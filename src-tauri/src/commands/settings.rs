use crate::models::{AppSettings, UpdateSettingsRequest};
use crate::services::database;
use crate::utils::IntoTauriResult;
use serde::Serialize;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[tauri::command]
pub async fn get_settings(app: AppHandle) -> Result<AppSettings, String> {
    database::get_settings(&app).await.into_tauri_result()
}

#[tauri::command]
pub async fn update_settings(
    app: AppHandle,
    request: UpdateSettingsRequest,
) -> Result<AppSettings, String> {
    database::update_settings(&app, request)
        .await
        .into_tauri_result()
}

/// Storage item with details
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StorageItem {
    pub name: String,
    pub size: u64,
    pub file_count: u32,
    pub path: String,
}

/// Storage usage statistics
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StorageUsage {
    pub total_size: u64,
    pub items: Vec<StorageItem>,
}

/// Get storage usage statistics for audio files, database, and models
#[tauri::command]
pub async fn get_storage_usage(app: AppHandle) -> Result<StorageUsage, String> {
    let mut items = Vec::new();
    let mut total_size: u64 = 0;

    // Get app data directory
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;

    // Calculate audio files size
    let audio_dir = app_data_dir.join("audio");
    if audio_dir.exists() {
        let (size, count) = get_dir_size(&audio_dir);
        items.push(StorageItem {
            name: "Audio Recordings".to_string(),
            size,
            file_count: count,
            path: audio_dir.to_string_lossy().to_string(),
        });
        total_size += size;
    }

    // Calculate database size
    let db_path = app_data_dir.join("private-transcript.db");
    if db_path.exists() {
        let size = std::fs::metadata(&db_path).map(|m| m.len()).unwrap_or(0);
        items.push(StorageItem {
            name: "Database".to_string(),
            size,
            file_count: 1,
            path: db_path.to_string_lossy().to_string(),
        });
        total_size += size;
    }

    // Calculate models size (in user's cache directory typically)
    let models_dir = app_data_dir.join("models");
    if models_dir.exists() {
        let (size, count) = get_dir_size(&models_dir);
        items.push(StorageItem {
            name: "Downloaded Models".to_string(),
            size,
            file_count: count,
            path: models_dir.to_string_lossy().to_string(),
        });
        total_size += size;
    }

    // Check HuggingFace cache (common location for WhisperKit models)
    let home_dir = dirs::home_dir().unwrap_or_default();
    let hf_cache = home_dir.join(".cache").join("huggingface");
    if hf_cache.exists() {
        let (size, count) = get_dir_size(&hf_cache);
        if size > 0 {
            items.push(StorageItem {
                name: "HuggingFace Cache".to_string(),
                size,
                file_count: count,
                path: hf_cache.to_string_lossy().to_string(),
            });
            total_size += size;
        }
    }

    // Sort by size descending
    items.sort_by(|a, b| b.size.cmp(&a.size));

    Ok(StorageUsage { total_size, items })
}

/// Open a folder in the system's file manager (Finder on macOS, Explorer on Windows)
#[tauri::command]
pub async fn show_in_folder(path: String) -> Result<(), String> {
    let path = PathBuf::from(&path);

    if !path.exists() {
        return Err(format!("Path does not exist: {}", path.display()));
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open Finder: {}", e))?;
    }

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open Explorer: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open file manager: {}", e))?;
    }

    Ok(())
}

/// Calculate total size and file count of a directory recursively
fn get_dir_size(path: &PathBuf) -> (u64, u32) {
    let mut total_size: u64 = 0;
    let mut file_count: u32 = 0;

    if let Ok(entries) = std::fs::read_dir(path) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() {
                if let Ok(metadata) = std::fs::metadata(&path) {
                    total_size += metadata.len();
                    file_count += 1;
                }
            } else if path.is_dir() {
                let (size, count) = get_dir_size(&path);
                total_size += size;
                file_count += count;
            }
        }
    }

    (total_size, file_count)
}
