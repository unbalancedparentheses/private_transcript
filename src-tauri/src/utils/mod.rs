//! Utility modules for the application.

pub mod error;

pub use error::IntoTauriResult;

// Re-export OptionExt for future use
#[allow(unused_imports)]
pub use error::OptionExt;
