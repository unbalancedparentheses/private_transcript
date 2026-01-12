use anyhow::Result;
use std::path::PathBuf;

/// Get the exports directory
fn get_exports_dir() -> Result<PathBuf> {
    let downloads = dirs::download_dir()
        .or_else(dirs::desktop_dir)
        .or_else(dirs::home_dir)
        .ok_or_else(|| anyhow::anyhow!("Cannot find exports directory"))?;
    println!("[Export] Using exports directory: {:?}", downloads);
    Ok(downloads)
}

/// Parse markdown content into title, transcript, and notes sections
fn parse_content(content: &str) -> (String, String, String) {
    let mut title = String::new();
    let mut transcript = String::new();
    let mut notes = String::new();
    let mut current_section = "";

    for line in content.lines() {
        if line.starts_with("# ") {
            title = line.trim_start_matches("# ").to_string();
        } else if line.starts_with("## Transcript") {
            current_section = "transcript";
        } else if line.starts_with("## Notes") {
            current_section = "notes";
        } else if !line.is_empty() {
            match current_section {
                "transcript" => {
                    if !transcript.is_empty() {
                        transcript.push('\n');
                    }
                    transcript.push_str(line);
                }
                "notes" => {
                    if !notes.is_empty() {
                        notes.push('\n');
                    }
                    notes.push_str(line);
                }
                _ => {}
            }
        }
    }

    (title, transcript, notes)
}

/// Export content as Markdown
pub async fn export_markdown(content: &str, filename: &str) -> Result<String> {
    println!("[Export] Exporting markdown: {}", filename);
    let exports_dir = get_exports_dir()?;
    let file_path = exports_dir.join(format!("{}.md", filename));

    tokio::fs::write(&file_path, content).await?;

    let path = file_path.to_string_lossy().to_string();
    println!("[Export] Markdown exported to: {}", path);
    Ok(path)
}

/// Export content as PDF using printpdf
pub async fn export_pdf(content: &str, filename: &str) -> Result<String> {
    use printpdf::*;
    use std::fs::File;
    use std::io::BufWriter;

    println!("[Export] Exporting PDF: {}", filename);
    let exports_dir = get_exports_dir()?;
    let file_path = exports_dir.join(format!("{}.pdf", filename));

    let (title, transcript, notes) = parse_content(content);

    // Create document
    let (doc, page1, layer1) = PdfDocument::new(&title, Mm(210.0), Mm(297.0), "Layer 1");
    let current_layer = doc.get_page(page1).get_layer(layer1);

    // Use built-in Helvetica font
    let font = doc.add_builtin_font(BuiltinFont::Helvetica)?;
    let font_bold = doc.add_builtin_font(BuiltinFont::HelveticaBold)?;

    let mut y_position = Mm(280.0);
    let left_margin = Mm(20.0);
    let line_height = Mm(5.0);
    let page_width = Mm(170.0); // 210 - 2*20 margins

    // Helper to add text and handle line wrapping
    let add_text = |layer: &PdfLayerReference, text: &str, x: Mm, y: &mut Mm, font: &IndirectFontRef, size: f32| {
        // Simple word wrap - split long lines
        let max_chars_per_line = (page_width.0 / (size * 0.3)) as usize;
        let mut current_line = String::new();

        for word in text.split_whitespace() {
            if current_line.len() + word.len() + 1 > max_chars_per_line && !current_line.is_empty() {
                layer.use_text(&current_line, size, x, *y, font);
                *y -= line_height;
                current_line = word.to_string();
            } else {
                if !current_line.is_empty() {
                    current_line.push(' ');
                }
                current_line.push_str(word);
            }
        }
        if !current_line.is_empty() {
            layer.use_text(&current_line, size, x, *y, font);
            *y -= line_height;
        }
    };

    // Add title
    current_layer.use_text(&title, 20.0, left_margin, y_position, &font_bold);
    y_position -= Mm(15.0);

    // Add transcript section
    if !transcript.is_empty() {
        current_layer.use_text("Transcript", 14.0, left_margin, y_position, &font_bold);
        y_position -= Mm(8.0);

        for line in transcript.lines() {
            add_text(&current_layer, line, left_margin, &mut y_position, &font, 11.0);

            // Check if we need a new page
            if y_position < Mm(20.0) {
                // For simplicity, we'll just stop - proper pagination would need more work
                break;
            }
        }
        y_position -= Mm(10.0);
    }

    // Add notes section
    if !notes.is_empty() && y_position > Mm(40.0) {
        current_layer.use_text("Notes", 14.0, left_margin, y_position, &font_bold);
        y_position -= Mm(8.0);

        for line in notes.lines() {
            add_text(&current_layer, line, left_margin, &mut y_position, &font, 11.0);

            if y_position < Mm(20.0) {
                break;
            }
        }
    }

    // Save to file
    let file = File::create(&file_path)?;
    doc.save(&mut BufWriter::new(file))?;

    let path = file_path.to_string_lossy().to_string();
    println!("[Export] PDF exported to: {}", path);
    Ok(path)
}

/// Export content as DOCX using docx-rs
pub async fn export_docx(content: &str, filename: &str) -> Result<String> {
    use docx_rs::*;

    println!("[Export] Exporting DOCX: {}", filename);
    let exports_dir = get_exports_dir()?;
    let file_path = exports_dir.join(format!("{}.docx", filename));

    let (title, transcript, notes) = parse_content(content);

    // Create document
    let mut docx = Docx::new();

    // Add title
    let title_para = Paragraph::new()
        .add_run(Run::new().add_text(&title).bold().size(48)); // 24pt = 48 half-points
    docx = docx.add_paragraph(title_para);

    // Add empty line
    docx = docx.add_paragraph(Paragraph::new());

    // Add transcript section
    if !transcript.is_empty() {
        let section_para = Paragraph::new()
            .add_run(Run::new().add_text("Transcript").bold().size(28)); // 14pt
        docx = docx.add_paragraph(section_para);

        for line in transcript.lines() {
            let para = Paragraph::new()
                .add_run(Run::new().add_text(line).size(24)); // 12pt
            docx = docx.add_paragraph(para);
        }

        // Add spacing
        docx = docx.add_paragraph(Paragraph::new());
    }

    // Add notes section
    if !notes.is_empty() {
        let section_para = Paragraph::new()
            .add_run(Run::new().add_text("Notes").bold().size(28)); // 14pt
        docx = docx.add_paragraph(section_para);

        for line in notes.lines() {
            let para = Paragraph::new()
                .add_run(Run::new().add_text(line).size(24)); // 12pt
            docx = docx.add_paragraph(para);
        }
    }

    // Write to file
    let file = std::fs::File::create(&file_path)?;
    docx.build()
        .pack(file)
        .map_err(|e| anyhow::anyhow!("Failed to write DOCX: {}", e))?;

    let path = file_path.to_string_lossy().to_string();
    println!("[Export] DOCX exported to: {}", path);
    Ok(path)
}

/// Export content to Obsidian vault with frontmatter
pub async fn export_to_obsidian(
    content: &str,
    filename: &str,
    vault_path: &str,
    tags: Vec<String>,
) -> Result<String> {
    use chrono::Utc;

    println!("[Export] Exporting to Obsidian vault: {}", vault_path);

    let vault_dir = PathBuf::from(vault_path);
    if !vault_dir.exists() {
        return Err(anyhow::anyhow!("Obsidian vault path does not exist: {}", vault_path));
    }

    // Create a "Private Transcript" subfolder in the vault
    let export_dir = vault_dir.join("Private Transcript");
    if !export_dir.exists() {
        tokio::fs::create_dir_all(&export_dir).await?;
    }

    let (title, transcript, notes) = parse_content(content);

    // Build frontmatter
    let date = Utc::now().format("%Y-%m-%d").to_string();
    let tags_str = if tags.is_empty() {
        "  - transcript".to_string()
    } else {
        tags.iter()
            .map(|t| format!("  - {}", t))
            .collect::<Vec<_>>()
            .join("\n")
    };

    let frontmatter = format!(
        "---\ntitle: \"{}\"\ndate: {}\ntags:\n{}\nsource: Private Transcript\n---\n\n",
        title.replace("\"", "\\\""),
        date,
        tags_str
    );

    // Build markdown content
    let mut md_content = frontmatter;
    md_content.push_str(&format!("# {}\n\n", title));

    if !transcript.is_empty() {
        md_content.push_str("## Transcript\n\n");
        md_content.push_str(&transcript);
        md_content.push_str("\n\n");
    }

    if !notes.is_empty() {
        md_content.push_str("## Notes\n\n");
        md_content.push_str(&notes);
        md_content.push('\n');
    }

    // Create safe filename
    let safe_filename = filename
        .chars()
        .map(|c| if c.is_alphanumeric() || c == '-' || c == '_' { c } else { '_' })
        .collect::<String>();

    let file_path = export_dir.join(format!("{}.md", safe_filename));

    tokio::fs::write(&file_path, md_content).await?;

    let path = file_path.to_string_lossy().to_string();
    println!("[Export] Obsidian note exported to: {}", path);
    Ok(path)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[tokio::test]
    async fn test_export_markdown() {
        let content = "# Test\n\n## Transcript\n\nHello world\n\n## Notes\n\nSome notes";
        let result = export_markdown(content, "test_export").await;
        assert!(result.is_ok());

        let path = result.unwrap();
        assert!(path.ends_with(".md"));

        // Clean up
        let _ = fs::remove_file(&path);
    }

    #[test]
    fn test_parse_content() {
        let content = "# My Title\n\n## Transcript\n\nLine 1\nLine 2\n\n## Notes\n\nNote 1\nNote 2";
        let (title, transcript, notes) = parse_content(content);

        assert_eq!(title, "My Title");
        assert_eq!(transcript, "Line 1\nLine 2");
        assert_eq!(notes, "Note 1\nNote 2");
    }

    #[test]
    fn test_parse_content_empty_sections() {
        let content = "# Title Only\n\n## Transcript\n\n## Notes\n\n";
        let (title, transcript, notes) = parse_content(content);

        assert_eq!(title, "Title Only");
        assert!(transcript.is_empty());
        assert!(notes.is_empty());
    }

    #[test]
    fn test_parse_content_no_title() {
        let content = "## Transcript\n\nSome text\n\n## Notes\n\nSome notes";
        let (title, transcript, notes) = parse_content(content);

        assert!(title.is_empty());
        assert_eq!(transcript, "Some text");
        assert_eq!(notes, "Some notes");
    }

    #[test]
    fn test_parse_content_only_transcript() {
        let content = "# Meeting\n\n## Transcript\n\nLine 1\nLine 2\nLine 3";
        let (title, transcript, notes) = parse_content(content);

        assert_eq!(title, "Meeting");
        assert_eq!(transcript, "Line 1\nLine 2\nLine 3");
        assert!(notes.is_empty());
    }

    #[test]
    fn test_parse_content_only_notes() {
        let content = "# Quick Notes\n\n## Notes\n\nImportant point\nAnother point";
        let (title, transcript, notes) = parse_content(content);

        assert_eq!(title, "Quick Notes");
        assert!(transcript.is_empty());
        assert_eq!(notes, "Important point\nAnother point");
    }

    #[test]
    fn test_parse_content_multiline_transcript() {
        let content = "# Interview\n\n## Transcript\n\nQuestion about experience?\nI have 5 years of experience.\nThat's great.\n\n## Notes\n\nGood candidate";
        let (title, transcript, notes) = parse_content(content);

        assert_eq!(title, "Interview");
        assert!(transcript.contains("Question about experience?"));
        assert!(transcript.contains("5 years"));
        assert!(transcript.contains("That's great"));
        assert_eq!(notes, "Good candidate");
    }

    #[test]
    fn test_parse_content_empty_string() {
        let content = "";
        let (title, transcript, notes) = parse_content(content);

        assert!(title.is_empty());
        assert!(transcript.is_empty());
        assert!(notes.is_empty());
    }

    #[test]
    fn test_parse_content_whitespace_only_lines() {
        let content = "# Test\n\n## Transcript\n\nLine 1\n\nLine 2";
        let (title, transcript, _notes) = parse_content(content);

        assert_eq!(title, "Test");
        // Empty lines are skipped
        assert_eq!(transcript, "Line 1\nLine 2");
    }
}
