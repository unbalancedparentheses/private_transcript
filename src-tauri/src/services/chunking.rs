use serde::{Deserialize, Serialize};

/// A chunk of text from a transcript, ready for embedding
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranscriptChunk {
    /// Unique identifier for this chunk
    pub id: String,
    /// Session ID this chunk belongs to
    pub session_id: String,
    /// Index of this chunk within the session
    pub chunk_index: usize,
    /// The text content
    pub text: String,
    /// Optional speaker name if available
    pub speaker: Option<String>,
    /// Start position in original transcript (character offset)
    pub start_offset: usize,
    /// End position in original transcript (character offset)
    pub end_offset: usize,
}

/// Configuration for chunking
#[derive(Debug, Clone)]
pub struct ChunkingConfig {
    /// Target size for each chunk in characters (roughly equivalent to tokens/4)
    pub target_chunk_size: usize,
    /// Overlap between chunks in characters
    pub overlap_size: usize,
    /// Minimum chunk size (chunks smaller than this are merged)
    pub min_chunk_size: usize,
}

impl Default for ChunkingConfig {
    fn default() -> Self {
        Self {
            target_chunk_size: 500,  // ~125 tokens
            overlap_size: 50,        // ~12 tokens overlap
            min_chunk_size: 100,     // Don't create tiny chunks
        }
    }
}

/// Split a transcript into chunks suitable for embedding
/// Tries to respect sentence boundaries when possible
pub fn chunk_transcript(
    session_id: &str,
    transcript: &str,
    config: &ChunkingConfig,
) -> Vec<TranscriptChunk> {
    if transcript.is_empty() {
        return vec![];
    }

    let mut chunks = Vec::new();
    let sentences = split_into_sentences(transcript);

    let mut current_chunk = String::new();
    let mut current_start = 0;
    let mut chunk_index = 0;

    for sentence in sentences {
        let sentence_with_space = if current_chunk.is_empty() {
            sentence.to_string()
        } else {
            format!(" {}", sentence)
        };

        // If adding this sentence would exceed target size, finalize current chunk
        if !current_chunk.is_empty()
            && current_chunk.len() + sentence_with_space.len() > config.target_chunk_size
        {
            // Create chunk
            let chunk = TranscriptChunk {
                id: format!("{}-{}", session_id, chunk_index),
                session_id: session_id.to_string(),
                chunk_index,
                text: current_chunk.trim().to_string(),
                speaker: None, // Will be populated from segment data if available
                start_offset: current_start,
                end_offset: current_start + current_chunk.len(),
            };

            if chunk.text.len() >= config.min_chunk_size {
                chunks.push(chunk);
                chunk_index += 1;
            }

            // Start new chunk with overlap
            let overlap_text = get_overlap_text(&current_chunk, config.overlap_size);
            current_start = current_start + current_chunk.len() - overlap_text.len();
            current_chunk = overlap_text;
        }

        current_chunk.push_str(&sentence_with_space);
    }

    // Don't forget the last chunk
    if !current_chunk.is_empty() && current_chunk.trim().len() >= config.min_chunk_size {
        chunks.push(TranscriptChunk {
            id: format!("{}-{}", session_id, chunk_index),
            session_id: session_id.to_string(),
            chunk_index,
            text: current_chunk.trim().to_string(),
            speaker: None,
            start_offset: current_start,
            end_offset: current_start + current_chunk.len(),
        });
    }

    // If we ended up with no chunks, create one from the entire text
    if chunks.is_empty() && !transcript.trim().is_empty() {
        chunks.push(TranscriptChunk {
            id: format!("{}-0", session_id),
            session_id: session_id.to_string(),
            chunk_index: 0,
            text: transcript.trim().to_string(),
            speaker: None,
            start_offset: 0,
            end_offset: transcript.len(),
        });
    }

    chunks
}

/// Split text into sentences (simple heuristic)
fn split_into_sentences(text: &str) -> Vec<&str> {
    let mut sentences = Vec::new();
    let mut start = 0;

    for (i, c) in text.char_indices() {
        if c == '.' || c == '!' || c == '?' {
            // Check if this looks like end of sentence
            // (not abbreviations like "Dr." or "Mr.")
            let potential_end = i + c.len_utf8();
            if potential_end < text.len() {
                let next_char = text[potential_end..].chars().next();
                if matches!(next_char, Some(' ') | Some('\n') | None) {
                    let sentence = &text[start..potential_end];
                    if !sentence.trim().is_empty() {
                        sentences.push(sentence.trim());
                    }
                    start = potential_end;
                }
            } else {
                // End of text
                let sentence = &text[start..potential_end];
                if !sentence.trim().is_empty() {
                    sentences.push(sentence.trim());
                }
                start = potential_end;
            }
        }
    }

    // Add remaining text as final sentence
    if start < text.len() {
        let remaining = text[start..].trim();
        if !remaining.is_empty() {
            sentences.push(remaining);
        }
    }

    // If no sentences were found, return the whole text as one
    if sentences.is_empty() && !text.trim().is_empty() {
        sentences.push(text.trim());
    }

    sentences
}

/// Get the last N characters for overlap, trying to break at word boundary
fn get_overlap_text(text: &str, target_size: usize) -> String {
    if text.len() <= target_size {
        return text.to_string();
    }

    let start_pos = text.len().saturating_sub(target_size);

    // Find the next word boundary after start_pos
    let overlap_start = text[start_pos..]
        .char_indices()
        .find(|(_, c)| *c == ' ')
        .map(|(i, _)| start_pos + i + 1)
        .unwrap_or(start_pos);

    text[overlap_start..].to_string()
}

/// Parse transcript segments (JSON) and chunk them while preserving speaker info
pub fn chunk_transcript_segments(
    session_id: &str,
    segments_json: &str,
    config: &ChunkingConfig,
) -> Vec<TranscriptChunk> {
    // Try to parse as JSON array of segments
    #[derive(Deserialize)]
    struct Segment {
        text: String,
        speaker: Option<String>,
    }

    let segments: Vec<Segment> = match serde_json::from_str(segments_json) {
        Ok(s) => s,
        Err(_) => {
            // Fall back to plain text chunking
            return chunk_transcript(session_id, segments_json, config);
        }
    };

    let mut chunks = Vec::new();
    let mut current_text = String::new();
    let mut current_speaker: Option<String> = None;
    let mut chunk_index = 0;
    let mut start_offset = 0;

    for segment in segments {
        let speaker_changed = segment.speaker != current_speaker && current_speaker.is_some();
        let would_exceed_size = current_text.len() + segment.text.len() > config.target_chunk_size;

        // Create chunk when speaker changes or size exceeds target
        if !current_text.is_empty() && (speaker_changed || would_exceed_size) {
            let chunk = TranscriptChunk {
                id: format!("{}-{}", session_id, chunk_index),
                session_id: session_id.to_string(),
                chunk_index,
                text: current_text.trim().to_string(),
                speaker: current_speaker.clone(),
                start_offset,
                end_offset: start_offset + current_text.len(),
            };

            if chunk.text.len() >= config.min_chunk_size {
                chunks.push(chunk);
                chunk_index += 1;
            }

            start_offset += current_text.len();
            current_text.clear();
        }

        // Add segment text
        if !current_text.is_empty() {
            current_text.push(' ');
        }
        current_text.push_str(&segment.text);
        current_speaker = segment.speaker;
    }

    // Final chunk
    if !current_text.is_empty() && current_text.trim().len() >= config.min_chunk_size {
        chunks.push(TranscriptChunk {
            id: format!("{}-{}", session_id, chunk_index),
            session_id: session_id.to_string(),
            chunk_index,
            text: current_text.trim().to_string(),
            speaker: current_speaker,
            start_offset,
            end_offset: start_offset + current_text.len(),
        });
    }

    chunks
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_chunk_empty_transcript() {
        let config = ChunkingConfig::default();
        let chunks = chunk_transcript("test-session", "", &config);
        assert!(chunks.is_empty());
    }

    #[test]
    fn test_chunk_short_transcript() {
        let config = ChunkingConfig {
            min_chunk_size: 10,
            ..Default::default()
        };
        let chunks = chunk_transcript("test-session", "Hello world. This is a test.", &config);
        assert_eq!(chunks.len(), 1);
        assert!(chunks[0].text.contains("Hello"));
    }

    #[test]
    fn test_chunk_long_transcript() {
        let config = ChunkingConfig {
            target_chunk_size: 50,
            overlap_size: 10,
            min_chunk_size: 10,
        };

        let transcript = "This is the first sentence. This is the second sentence. This is the third sentence. This is the fourth sentence.";
        let chunks = chunk_transcript("test-session", transcript, &config);

        // Should create multiple chunks
        assert!(chunks.len() > 1);

        // Each chunk should have proper IDs
        for (i, chunk) in chunks.iter().enumerate() {
            assert_eq!(chunk.chunk_index, i);
            assert!(chunk.id.starts_with("test-session-"));
        }
    }

    #[test]
    fn test_split_into_sentences() {
        let text = "Hello world. How are you? I'm fine!";
        let sentences = split_into_sentences(text);

        assert_eq!(sentences.len(), 3);
        assert_eq!(sentences[0], "Hello world.");
        assert_eq!(sentences[1], "How are you?");
        assert_eq!(sentences[2], "I'm fine!");
    }

    #[test]
    fn test_split_into_sentences_no_punctuation() {
        let text = "Hello world without punctuation";
        let sentences = split_into_sentences(text);

        assert_eq!(sentences.len(), 1);
        assert_eq!(sentences[0], text);
    }

    #[test]
    fn test_overlap_text() {
        let text = "This is a test sentence with multiple words.";
        let overlap = get_overlap_text(text, 20);

        // Should get approximately last 20 characters, breaking at word boundary
        assert!(overlap.len() <= 25); // Some flexibility for word boundary
        assert!(text.ends_with(&overlap.trim_start()));
    }

    #[test]
    fn test_chunk_session_id() {
        let config = ChunkingConfig::default();
        let chunks = chunk_transcript("my-session-123", "Hello world. This is a test transcript with some content.", &config);

        assert!(!chunks.is_empty());
        assert!(chunks[0].session_id == "my-session-123");
    }

    #[test]
    fn test_chunk_segments_json() {
        let config = ChunkingConfig {
            target_chunk_size: 100,
            min_chunk_size: 10,
            ..Default::default()
        };

        let segments_json = r#"[
            {"text": "Hello, how are you?", "speaker": "Alice"},
            {"text": "I'm doing well, thanks!", "speaker": "Bob"},
            {"text": "That's great to hear.", "speaker": "Alice"}
        ]"#;

        let chunks = chunk_transcript_segments("test-session", segments_json, &config);

        assert!(!chunks.is_empty());
        // Chunks should preserve speaker info
        for chunk in &chunks {
            assert!(chunk.speaker.is_some());
        }
    }

    #[test]
    fn test_chunk_invalid_json_fallback() {
        let config = ChunkingConfig {
            min_chunk_size: 10,
            ..Default::default()
        };

        // Invalid JSON should fall back to plain text chunking
        let chunks = chunk_transcript_segments("test-session", "Just plain text here.", &config);

        assert_eq!(chunks.len(), 1);
        assert_eq!(chunks[0].text, "Just plain text here.");
    }
}
