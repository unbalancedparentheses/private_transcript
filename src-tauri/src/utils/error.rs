//! Error handling utilities for Tauri commands.
//!
//! This module provides traits and utilities for consistent error handling
//! across all Tauri commands, reducing code duplication.

use anyhow::Result;

/// Extension trait for converting `Result<T, anyhow::Error>` to `Result<T, String>`
/// for use in Tauri commands.
pub trait IntoTauriResult<T> {
    /// Converts an anyhow Result to a String-error Result for Tauri commands.
    fn into_tauri_result(self) -> Result<T, String>;
}

impl<T> IntoTauriResult<T> for Result<T> {
    fn into_tauri_result(self) -> Result<T, String> {
        self.map_err(|e| e.to_string())
    }
}

/// Extension trait for converting `Option<T>` to `Result<T, String>` with a custom error message.
pub trait OptionExt<T> {
    /// Converts an Option to a Result with the given error message.
    fn ok_or_err(self, msg: &str) -> Result<T, String>;
}

impl<T> OptionExt<T> for Option<T> {
    fn ok_or_err(self, msg: &str) -> Result<T, String> {
        self.ok_or_else(|| msg.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use anyhow::anyhow;

    #[test]
    fn test_into_tauri_result_ok() {
        let result: Result<i32> = Ok(42);
        let tauri_result = result.into_tauri_result();
        assert_eq!(tauri_result, Ok(42));
    }

    #[test]
    fn test_into_tauri_result_err() {
        let result: Result<i32> = Err(anyhow!("test error"));
        let tauri_result = result.into_tauri_result();
        assert!(tauri_result.is_err());
        assert_eq!(tauri_result.unwrap_err(), "test error");
    }

    #[test]
    fn test_option_ext_some() {
        let opt: Option<i32> = Some(42);
        let result = opt.ok_or_err("not found");
        assert_eq!(result, Ok(42));
    }

    #[test]
    fn test_option_ext_none() {
        let opt: Option<i32> = None;
        let result = opt.ok_or_err("not found");
        assert_eq!(result, Err("not found".to_string()));
    }
}
