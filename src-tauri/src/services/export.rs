use anyhow::Result;
use std::path::PathBuf;

/// Get the exports directory
fn get_exports_dir() -> Result<PathBuf> {
    let downloads = dirs::download_dir()
        .or_else(dirs::desktop_dir)
        .or_else(dirs::home_dir)
        .ok_or_else(|| anyhow::anyhow!("Cannot find exports directory"))?;
    Ok(downloads)
}

/// Export content as Markdown
pub async fn export_markdown(content: &str, filename: &str) -> Result<String> {
    let exports_dir = get_exports_dir()?;
    let file_path = exports_dir.join(format!("{}.md", filename));

    tokio::fs::write(&file_path, content).await?;

    Ok(file_path.to_string_lossy().to_string())
}

/// Export content as PDF
pub async fn export_pdf(content: &str, filename: &str) -> Result<String> {
    let exports_dir = get_exports_dir()?;
    let file_path = exports_dir.join(format!("{}.pdf", filename));

    // TODO: Implement PDF export using printpdf
    // For now, just write as text with .pdf extension
    tokio::fs::write(&file_path, content).await?;

    Ok(file_path.to_string_lossy().to_string())
}

/// Export content as DOCX
pub async fn export_docx(content: &str, filename: &str) -> Result<String> {
    let exports_dir = get_exports_dir()?;
    let file_path = exports_dir.join(format!("{}.docx", filename));

    // TODO: Implement DOCX export using docx-rs
    // For now, just write as text with .docx extension
    tokio::fs::write(&file_path, content).await?;

    Ok(file_path.to_string_lossy().to_string())
}
