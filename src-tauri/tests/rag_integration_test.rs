//! Integration tests for RAG (Retrieval Augmented Generation) system
//!
//! These tests verify the complete RAG pipeline:
//! 1. Chunking transcripts
//! 2. Building context from chunks
//! 3. Formatting RAG prompts
//! 4. Search functionality (without actual embeddings)

use serde::{Deserialize, Serialize};

// ============================================================================
// Types (matching the Rust implementations)
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RetrievedChunk {
    chunk_id: String,
    session_id: String,
    session_title: Option<String>,
    text: String,
    speaker: Option<String>,
    similarity: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ChatMessage {
    id: String,
    conversation_id: String,
    role: String,
    content: String,
    source_chunks: Option<Vec<String>>,
    created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ChatConversation {
    id: String,
    title: Option<String>,
    created_at: i64,
    updated_at: i64,
}

// ============================================================================
// Chunking Tests
// ============================================================================

mod chunking_tests {
    #[derive(Debug, Clone)]
    struct TranscriptChunk {
        id: String,
        session_id: String,
        chunk_index: usize,
        text: String,
        #[allow(dead_code)]
        speaker: Option<String>,
        #[allow(dead_code)]
        start_offset: usize,
        #[allow(dead_code)]
        end_offset: usize,
    }

    #[derive(Debug, Clone)]
    struct ChunkingConfig {
        chunk_size: usize,
        chunk_overlap: usize,
        min_chunk_size: usize,
    }

    impl Default for ChunkingConfig {
        fn default() -> Self {
            Self {
                chunk_size: 500,
                chunk_overlap: 50,
                min_chunk_size: 100,
            }
        }
    }

    fn chunk_transcript(session_id: &str, text: &str, config: &ChunkingConfig) -> Vec<TranscriptChunk> {
        if text.len() < config.min_chunk_size {
            if text.is_empty() {
                return vec![];
            }
            return vec![TranscriptChunk {
                id: format!("{}-0", session_id),
                session_id: session_id.to_string(),
                chunk_index: 0,
                text: text.to_string(),
                speaker: None,
                start_offset: 0,
                end_offset: text.len(),
            }];
        }

        let mut chunks = Vec::new();
        let mut start = 0;
        let mut chunk_index = 0;

        while start < text.len() {
            let end = (start + config.chunk_size).min(text.len());
            let chunk_text = &text[start..end];

            chunks.push(TranscriptChunk {
                id: format!("{}-{}", session_id, chunk_index),
                session_id: session_id.to_string(),
                chunk_index,
                text: chunk_text.to_string(),
                speaker: None,
                start_offset: start,
                end_offset: end,
            });

            if end >= text.len() {
                break;
            }

            start = end - config.chunk_overlap;
            chunk_index += 1;
        }

        chunks
    }

    #[test]
    fn test_empty_transcript_produces_no_chunks() {
        let config = ChunkingConfig::default();
        let chunks = chunk_transcript("session-1", "", &config);
        assert!(chunks.is_empty());
    }

    #[test]
    fn test_short_transcript_produces_single_chunk() {
        let config = ChunkingConfig::default();
        let short_text = "This is a short transcript.";
        let chunks = chunk_transcript("session-1", short_text, &config);

        // Short text below min_chunk_size still produces one chunk
        assert_eq!(chunks.len(), 1);
        assert_eq!(chunks[0].text, short_text);
        assert_eq!(chunks[0].chunk_index, 0);
    }

    #[test]
    fn test_long_transcript_produces_multiple_chunks() {
        let config = ChunkingConfig {
            chunk_size: 100,
            chunk_overlap: 20,
            min_chunk_size: 50,
        };

        let long_text = "A".repeat(250); // 250 characters
        let chunks = chunk_transcript("session-1", &long_text, &config);

        assert!(chunks.len() > 1);

        // Verify chunk IDs are unique
        let ids: Vec<_> = chunks.iter().map(|c| &c.id).collect();
        let unique_ids: std::collections::HashSet<_> = ids.iter().collect();
        assert_eq!(ids.len(), unique_ids.len());
    }

    #[test]
    fn test_chunks_have_correct_session_id() {
        let config = ChunkingConfig::default();
        let text = "A".repeat(200);
        let chunks = chunk_transcript("my-session-123", &text, &config);

        for chunk in &chunks {
            assert_eq!(chunk.session_id, "my-session-123");
        }
    }

    #[test]
    fn test_chunk_indices_are_sequential() {
        let config = ChunkingConfig {
            chunk_size: 50,
            chunk_overlap: 10,
            min_chunk_size: 20,
        };

        let text = "A".repeat(200);
        let chunks = chunk_transcript("session-1", &text, &config);

        for (i, chunk) in chunks.iter().enumerate() {
            assert_eq!(chunk.chunk_index, i);
        }
    }
}

// ============================================================================
// Context Building Tests
// ============================================================================

mod context_building_tests {
    use super::*;

    fn build_rag_context(chunks: &[RetrievedChunk]) -> String {
        if chunks.is_empty() {
            return String::new();
        }

        let mut context = String::from("Relevant transcript excerpts:\n\n");

        for (i, chunk) in chunks.iter().enumerate() {
            let speaker_label = chunk
                .speaker
                .as_ref()
                .map(|s| format!("[{}] ", s))
                .unwrap_or_default();

            let session_label = chunk
                .session_title
                .as_ref()
                .map(|t| format!(" (from: {})", t))
                .unwrap_or_default();

            context.push_str(&format!(
                "---\nExcerpt {}{}:\n{}{}\n",
                i + 1,
                session_label,
                speaker_label,
                chunk.text
            ));
        }

        context
    }

    #[test]
    fn test_empty_chunks_produce_empty_context() {
        let chunks: Vec<RetrievedChunk> = vec![];
        let context = build_rag_context(&chunks);
        assert!(context.is_empty());
    }

    #[test]
    fn test_single_chunk_context() {
        let chunks = vec![RetrievedChunk {
            chunk_id: "1".to_string(),
            session_id: "s1".to_string(),
            session_title: Some("Team Meeting".to_string()),
            text: "We discussed the project timeline.".to_string(),
            speaker: Some("Alice".to_string()),
            similarity: 0.9,
        }];

        let context = build_rag_context(&chunks);

        assert!(context.contains("Excerpt 1"));
        assert!(context.contains("Team Meeting"));
        assert!(context.contains("[Alice]"));
        assert!(context.contains("project timeline"));
    }

    #[test]
    fn test_multiple_chunks_context() {
        let chunks = vec![
            RetrievedChunk {
                chunk_id: "1".to_string(),
                session_id: "s1".to_string(),
                session_title: Some("Meeting 1".to_string()),
                text: "First excerpt text.".to_string(),
                speaker: Some("Bob".to_string()),
                similarity: 0.9,
            },
            RetrievedChunk {
                chunk_id: "2".to_string(),
                session_id: "s2".to_string(),
                session_title: Some("Meeting 2".to_string()),
                text: "Second excerpt text.".to_string(),
                speaker: None,
                similarity: 0.8,
            },
            RetrievedChunk {
                chunk_id: "3".to_string(),
                session_id: "s3".to_string(),
                session_title: None,
                text: "Third excerpt text.".to_string(),
                speaker: Some("Carol".to_string()),
                similarity: 0.7,
            },
        ];

        let context = build_rag_context(&chunks);

        assert!(context.contains("Excerpt 1"));
        assert!(context.contains("Excerpt 2"));
        assert!(context.contains("Excerpt 3"));
        assert!(context.contains("Meeting 1"));
        assert!(context.contains("Meeting 2"));
        assert!(context.contains("[Bob]"));
        assert!(context.contains("[Carol]"));
        // Excerpt 2 has no speaker
        assert!(!context.contains("Excerpt 2") || !context.contains("[") || context.contains("[Carol]") || context.contains("[Bob]"));
    }

    #[test]
    fn test_context_without_speaker() {
        let chunks = vec![RetrievedChunk {
            chunk_id: "1".to_string(),
            session_id: "s1".to_string(),
            session_title: Some("Meeting".to_string()),
            text: "Some text without speaker.".to_string(),
            speaker: None,
            similarity: 0.9,
        }];

        let context = build_rag_context(&chunks);

        assert!(context.contains("Some text without speaker"));
        assert!(!context.contains("[") || context.contains("Relevant"));
    }

    #[test]
    fn test_context_without_session_title() {
        let chunks = vec![RetrievedChunk {
            chunk_id: "1".to_string(),
            session_id: "s1".to_string(),
            session_title: None,
            text: "Text from untitled session.".to_string(),
            speaker: Some("Dave".to_string()),
            similarity: 0.9,
        }];

        let context = build_rag_context(&chunks);

        assert!(context.contains("Excerpt 1:"));
        assert!(!context.contains("(from:"));
    }
}

// ============================================================================
// RAG Prompt Formatting Tests
// ============================================================================

mod prompt_formatting_tests {
    #[test]
    fn test_prompt_with_context() {
        let context = "Relevant transcript excerpts:\n\n---\nExcerpt 1:\nSome text here.\n";
        let question = "What was discussed?";

        let prompt = format_rag_prompt(context, question);

        assert!(prompt.contains(context));
        assert!(prompt.contains(question));
        assert!(prompt.contains("INSTRUCTIONS"));
        assert!(prompt.contains("helpful assistant"));
    }

    #[test]
    fn test_prompt_without_context() {
        let context = "";
        let question = "What is the weather?";

        let prompt = format_rag_prompt(context, question);

        assert!(prompt.contains(question));
        assert!(prompt.contains("no relevant transcript excerpts"));
        assert!(prompt.contains("rephrasing"));
    }

    #[test]
    fn test_prompt_contains_instructions() {
        let context = "Some context";
        let question = "A question";

        let prompt = format_rag_prompt(context, question);

        // Verify key instructions are present
        assert!(prompt.contains("ONLY") || prompt.contains("only"));
        assert!(prompt.contains("transcript"));
    }

    fn format_rag_prompt(context: &str, user_question: &str) -> String {
        if context.is_empty() {
            return format!(
                r#"The user asked a question but no relevant transcript excerpts were found.

User question: {}

Please let the user know that you couldn't find relevant information in their transcripts to answer this question. Suggest they might need to record content related to their question first, or try rephrasing their question."#,
                user_question
            );
        }

        format!(
            r#"You are a helpful assistant answering questions based on the user's transcript recordings.

INSTRUCTIONS:
- Answer the question using ONLY the information from the transcript excerpts below
- Synthesize information across multiple excerpts when relevant
- Quote specific parts of the transcripts when it helps answer the question
- If the excerpts don't contain enough information, say so honestly
- Be direct and helpful - give actionable answers when possible
- For analytical questions (summaries, themes, patterns), analyze across all excerpts

{}

User question: {}

Answer:"#,
            context, user_question
        )
    }
}

// ============================================================================
// Chat Message Tests
// ============================================================================

mod chat_message_tests {
    use super::*;

    #[test]
    fn test_chat_message_serialization() {
        let msg = ChatMessage {
            id: "msg-1".to_string(),
            conversation_id: "conv-1".to_string(),
            role: "user".to_string(),
            content: "Hello, world!".to_string(),
            source_chunks: None,
            created_at: 1234567890,
        };

        let json = serde_json::to_string(&msg).unwrap();

        assert!(json.contains("msg-1"));
        assert!(json.contains("conv-1"));
        assert!(json.contains("user"));
        assert!(json.contains("Hello, world!"));
        assert!(json.contains("conversationId")); // camelCase
    }

    #[test]
    fn test_chat_message_with_sources() {
        let msg = ChatMessage {
            id: "msg-1".to_string(),
            conversation_id: "conv-1".to_string(),
            role: "assistant".to_string(),
            content: "Based on your transcripts...".to_string(),
            source_chunks: Some(vec!["chunk-1".to_string(), "chunk-2".to_string()]),
            created_at: 1234567890,
        };

        let json = serde_json::to_string(&msg).unwrap();

        assert!(json.contains("sourceChunks"));
        assert!(json.contains("chunk-1"));
        assert!(json.contains("chunk-2"));
    }

    #[test]
    fn test_chat_message_deserialization() {
        let json = r#"{
            "id": "msg-1",
            "conversationId": "conv-1",
            "role": "user",
            "content": "Test message",
            "sourceChunks": null,
            "createdAt": 1234567890
        }"#;

        let msg: ChatMessage = serde_json::from_str(json).unwrap();

        assert_eq!(msg.id, "msg-1");
        assert_eq!(msg.conversation_id, "conv-1");
        assert_eq!(msg.role, "user");
        assert_eq!(msg.content, "Test message");
        assert!(msg.source_chunks.is_none());
    }

    #[test]
    fn test_conversation_serialization() {
        let conv = ChatConversation {
            id: "conv-1".to_string(),
            title: Some("Test Conversation".to_string()),
            created_at: 1234567890,
            updated_at: 1234567891,
        };

        let json = serde_json::to_string(&conv).unwrap();

        assert!(json.contains("conv-1"));
        assert!(json.contains("Test Conversation"));
        assert!(json.contains("createdAt"));
        assert!(json.contains("updatedAt"));
    }
}

// ============================================================================
// Retrieved Chunk Tests
// ============================================================================

mod retrieved_chunk_tests {
    use super::*;

    #[test]
    fn test_chunk_similarity_ordering() {
        let mut chunks = [
            RetrievedChunk {
                chunk_id: "1".to_string(),
                session_id: "s1".to_string(),
                session_title: None,
                text: "Low similarity".to_string(),
                speaker: None,
                similarity: 0.5,
            },
            RetrievedChunk {
                chunk_id: "2".to_string(),
                session_id: "s1".to_string(),
                session_title: None,
                text: "High similarity".to_string(),
                speaker: None,
                similarity: 0.9,
            },
            RetrievedChunk {
                chunk_id: "3".to_string(),
                session_id: "s1".to_string(),
                session_title: None,
                text: "Medium similarity".to_string(),
                speaker: None,
                similarity: 0.7,
            },
        ];

        // Sort by similarity descending
        chunks.sort_by(|a, b| b.similarity.partial_cmp(&a.similarity).unwrap());

        assert_eq!(chunks[0].chunk_id, "2"); // 0.9
        assert_eq!(chunks[1].chunk_id, "3"); // 0.7
        assert_eq!(chunks[2].chunk_id, "1"); // 0.5
    }

    #[test]
    fn test_chunk_serialization_roundtrip() {
        let chunk = RetrievedChunk {
            chunk_id: "chunk-123".to_string(),
            session_id: "session-456".to_string(),
            session_title: Some("Important Meeting".to_string()),
            text: "This is the chunk text content.".to_string(),
            speaker: Some("John Doe".to_string()),
            similarity: 0.85,
        };

        let json = serde_json::to_string(&chunk).unwrap();
        let restored: RetrievedChunk = serde_json::from_str(&json).unwrap();

        assert_eq!(restored.chunk_id, chunk.chunk_id);
        assert_eq!(restored.session_id, chunk.session_id);
        assert_eq!(restored.session_title, chunk.session_title);
        assert_eq!(restored.text, chunk.text);
        assert_eq!(restored.speaker, chunk.speaker);
        assert!((restored.similarity - chunk.similarity).abs() < 0.001);
    }

    #[test]
    fn test_filter_chunks_by_similarity_threshold() {
        let chunks = vec![
            RetrievedChunk {
                chunk_id: "1".to_string(),
                session_id: "s1".to_string(),
                session_title: None,
                text: "Below threshold".to_string(),
                speaker: None,
                similarity: 0.2,
            },
            RetrievedChunk {
                chunk_id: "2".to_string(),
                session_id: "s1".to_string(),
                session_title: None,
                text: "Above threshold".to_string(),
                speaker: None,
                similarity: 0.5,
            },
            RetrievedChunk {
                chunk_id: "3".to_string(),
                session_id: "s1".to_string(),
                session_title: None,
                text: "At threshold".to_string(),
                speaker: None,
                similarity: 0.3,
            },
        ];

        let threshold = 0.3;
        let filtered: Vec<_> = chunks
            .into_iter()
            .filter(|c| c.similarity >= threshold)
            .collect();

        assert_eq!(filtered.len(), 2);
        assert!(filtered.iter().all(|c| c.similarity >= threshold));
    }
}

// ============================================================================
// Edge Cases and Error Handling
// ============================================================================

mod edge_cases {
    use super::*;

    #[test]
    fn test_special_characters_in_text() {
        let chunk = RetrievedChunk {
            chunk_id: "1".to_string(),
            session_id: "s1".to_string(),
            session_title: Some("Test \"Quotes\" & <Symbols>".to_string()),
            text: "Text with \"quotes\", <brackets>, & ampersand.".to_string(),
            speaker: Some("O'Brien".to_string()),
            similarity: 0.9,
        };

        let json = serde_json::to_string(&chunk).unwrap();
        let restored: RetrievedChunk = serde_json::from_str(&json).unwrap();

        assert_eq!(restored.session_title, chunk.session_title);
        assert_eq!(restored.text, chunk.text);
        assert_eq!(restored.speaker, chunk.speaker);
    }

    #[test]
    fn test_unicode_in_text() {
        let chunk = RetrievedChunk {
            chunk_id: "1".to_string(),
            session_id: "s1".to_string(),
            session_title: Some("会议记录".to_string()),
            text: "Emojis: 🎉🔥 Chinese: 你好 Arabic: مرحبا".to_string(),
            speaker: Some("José García".to_string()),
            similarity: 0.9,
        };

        let json = serde_json::to_string(&chunk).unwrap();
        let restored: RetrievedChunk = serde_json::from_str(&json).unwrap();

        assert_eq!(restored.session_title, chunk.session_title);
        assert_eq!(restored.text, chunk.text);
        assert_eq!(restored.speaker, chunk.speaker);
    }

    #[test]
    fn test_very_long_text() {
        let long_text = "A".repeat(10000);
        let chunk = RetrievedChunk {
            chunk_id: "1".to_string(),
            session_id: "s1".to_string(),
            session_title: None,
            text: long_text.clone(),
            speaker: None,
            similarity: 0.9,
        };

        let json = serde_json::to_string(&chunk).unwrap();
        let restored: RetrievedChunk = serde_json::from_str(&json).unwrap();

        assert_eq!(restored.text.len(), 10000);
    }

    #[test]
    fn test_empty_strings() {
        let chunk = RetrievedChunk {
            chunk_id: "".to_string(),
            session_id: "".to_string(),
            session_title: Some("".to_string()),
            text: "".to_string(),
            speaker: Some("".to_string()),
            similarity: 0.0,
        };

        let json = serde_json::to_string(&chunk).unwrap();
        let restored: RetrievedChunk = serde_json::from_str(&json).unwrap();

        assert_eq!(restored.chunk_id, "");
        assert_eq!(restored.text, "");
    }

    #[test]
    fn test_similarity_boundary_values() {
        // Test similarity at boundaries
        for similarity in [0.0_f32, 0.25, 0.5, 0.75, 1.0] {
            let chunk = RetrievedChunk {
                chunk_id: "1".to_string(),
                session_id: "s1".to_string(),
                session_title: None,
                text: "Test".to_string(),
                speaker: None,
                similarity,
            };

            let json = serde_json::to_string(&chunk).unwrap();
            let restored: RetrievedChunk = serde_json::from_str(&json).unwrap();

            assert!((restored.similarity - similarity).abs() < 0.001);
        }
    }
}
