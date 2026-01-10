use std::path::PathBuf;
use tauri::AppHandle;
use tauri::Manager;

/// Get the app data directory
pub fn get_app_data_dir(app: &AppHandle) -> Option<PathBuf> {
    app.path().app_data_dir().ok()
}

/// Get the models directory
pub fn get_models_dir(app: &AppHandle) -> Option<PathBuf> {
    get_app_data_dir(app).map(|p| p.join("models"))
}

/// Get the audio directory
pub fn get_audio_dir(app: &AppHandle) -> Option<PathBuf> {
    get_app_data_dir(app).map(|p| p.join("audio"))
}

/// Ensure a directory exists
pub fn ensure_dir(path: &PathBuf) -> std::io::Result<()> {
    std::fs::create_dir_all(path)
}
