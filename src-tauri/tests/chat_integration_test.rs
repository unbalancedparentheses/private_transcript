//! Integration tests for the chat and RAG system
//!
//! Tests the complete chat flow including conversation management,
//! message handling, context retrieval, and RAG prompt generation.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ============================================================================
// Types (matching the Rust implementations)
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
struct ChatConversation {
    id: String,
    title: Option<String>,
    created_at: i64,
    updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
struct ChatMessage {
    id: String,
    conversation_id: String,
    role: String,
    content: String,
    source_chunks: Option<Vec<String>>,
    created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
struct TranscriptChunk {
    id: String,
    session_id: String,
    chunk_index: usize,
    text: String,
    speaker: Option<String>,
    embedding: Option<Vec<f32>>,
}

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

// ============================================================================
// Mock Chat System
// ============================================================================

struct MockChatSystem {
    conversations: HashMap<String, ChatConversation>,
    messages: HashMap<String, Vec<ChatMessage>>,
    chunks: Vec<TranscriptChunk>,
    next_id: u64,
}

impl MockChatSystem {
    fn new() -> Self {
        Self {
            conversations: HashMap::new(),
            messages: HashMap::new(),
            chunks: Vec::new(),
            next_id: 1,
        }
    }

    fn generate_id(&mut self) -> String {
        let id = format!("id-{}", self.next_id);
        self.next_id += 1;
        id
    }

    fn now() -> i64 {
        1704067200 // Fixed timestamp for testing
    }

    // Conversation operations
    fn create_conversation(&mut self, title: Option<&str>) -> ChatConversation {
        let conv = ChatConversation {
            id: self.generate_id(),
            title: title.map(|s| s.to_string()),
            created_at: Self::now(),
            updated_at: Self::now(),
        };
        self.conversations.insert(conv.id.clone(), conv.clone());
        self.messages.insert(conv.id.clone(), Vec::new());
        conv
    }

    fn get_conversations(&self) -> Vec<&ChatConversation> {
        let mut convs: Vec<_> = self.conversations.values().collect();
        convs.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
        convs
    }

    fn get_conversation(&self, id: &str) -> Option<&ChatConversation> {
        self.conversations.get(id)
    }

    fn delete_conversation(&mut self, id: &str) -> Result<(), &'static str> {
        self.conversations.remove(id).ok_or("Conversation not found")?;
        self.messages.remove(id);
        Ok(())
    }

    fn update_conversation_title(&mut self, id: &str, title: &str) -> Result<(), &'static str> {
        match self.conversations.get_mut(id) {
            Some(conv) => {
                conv.title = Some(title.to_string());
                conv.updated_at = Self::now() + 1;
                Ok(())
            }
            None => Err("Conversation not found"),
        }
    }

    // Message operations
    fn add_message(
        &mut self,
        conversation_id: &str,
        role: &str,
        content: &str,
        source_chunks: Option<Vec<String>>,
    ) -> Result<ChatMessage, &'static str> {
        if !self.conversations.contains_key(conversation_id) {
            return Err("Conversation not found");
        }

        let message = ChatMessage {
            id: self.generate_id(),
            conversation_id: conversation_id.to_string(),
            role: role.to_string(),
            content: content.to_string(),
            source_chunks,
            created_at: Self::now(),
        };

        self.messages
            .get_mut(conversation_id)
            .unwrap()
            .push(message.clone());

        // Update conversation timestamp
        if let Some(conv) = self.conversations.get_mut(conversation_id) {
            conv.updated_at = Self::now() + 1;
        }

        Ok(message)
    }

    fn get_messages(&self, conversation_id: &str) -> Vec<&ChatMessage> {
        self.messages
            .get(conversation_id)
            .map(|msgs| msgs.iter().collect())
            .unwrap_or_default()
    }

    // Chunk operations (for RAG)
    fn add_chunk(&mut self, session_id: &str, text: &str, speaker: Option<&str>) -> TranscriptChunk {
        let chunk_index = self.chunks.iter().filter(|c| c.session_id == session_id).count();

        let chunk = TranscriptChunk {
            id: self.generate_id(),
            session_id: session_id.to_string(),
            chunk_index,
            text: text.to_string(),
            speaker: speaker.map(|s| s.to_string()),
            embedding: Some(vec![0.1, 0.2, 0.3]), // Mock embedding
        };

        self.chunks.push(chunk.clone());
        chunk
    }

    fn search_chunks(&self, query: &str, limit: usize, min_similarity: f32) -> Vec<RetrievedChunk> {
        // Simple keyword-based search for testing (real impl uses embeddings)
        let query_lower = query.to_lowercase();

        let mut results: Vec<_> = self
            .chunks
            .iter()
            .filter(|c| c.text.to_lowercase().contains(&query_lower))
            .map(|c| {
                // Calculate mock similarity based on keyword overlap
                let similarity = if c.text.to_lowercase().contains(&query_lower) {
                    0.8
                } else {
                    0.3
                };

                RetrievedChunk {
                    chunk_id: c.id.clone(),
                    session_id: c.session_id.clone(),
                    session_title: Some(format!("Session {}", c.session_id)),
                    text: c.text.clone(),
                    speaker: c.speaker.clone(),
                    similarity,
                }
            })
            .filter(|c| c.similarity >= min_similarity)
            .collect();

        results.sort_by(|a, b| b.similarity.partial_cmp(&a.similarity).unwrap());
        results.truncate(limit);
        results
    }
}

// ============================================================================
// Conversation Tests
// ============================================================================

mod conversation_tests {
    use super::*;

    #[test]
    fn test_create_conversation() {
        let mut chat = MockChatSystem::new();
        let conv = chat.create_conversation(Some("Test Chat"));

        assert!(!conv.id.is_empty());
        assert_eq!(conv.title, Some("Test Chat".to_string()));
    }

    #[test]
    fn test_create_conversation_without_title() {
        let mut chat = MockChatSystem::new();
        let conv = chat.create_conversation(None);

        assert!(conv.title.is_none());
    }

    #[test]
    fn test_get_conversations_ordered() {
        let mut chat = MockChatSystem::new();

        let conv1 = chat.create_conversation(Some("First"));
        let conv2 = chat.create_conversation(Some("Second"));
        let conv3 = chat.create_conversation(Some("Third"));

        // Update conv1 to make it most recent
        chat.add_message(&conv1.id, "user", "Hello", None).unwrap();

        let convs = chat.get_conversations();
        // Most recently updated should be first
        assert_eq!(convs[0].id, conv1.id);
    }

    #[test]
    fn test_delete_conversation() {
        let mut chat = MockChatSystem::new();
        let conv = chat.create_conversation(Some("To Delete"));

        assert!(chat.delete_conversation(&conv.id).is_ok());
        assert!(chat.get_conversation(&conv.id).is_none());
    }

    #[test]
    fn test_delete_nonexistent_conversation() {
        let mut chat = MockChatSystem::new();
        assert!(chat.delete_conversation("nonexistent").is_err());
    }

    #[test]
    fn test_update_conversation_title() {
        let mut chat = MockChatSystem::new();
        let conv = chat.create_conversation(None);

        chat.update_conversation_title(&conv.id, "New Title").unwrap();

        let updated = chat.get_conversation(&conv.id).unwrap();
        assert_eq!(updated.title, Some("New Title".to_string()));
    }

    #[test]
    fn test_conversation_serialization() {
        let conv = ChatConversation {
            id: "conv-123".to_string(),
            title: Some("Test".to_string()),
            created_at: 1234567890,
            updated_at: 1234567891,
        };

        let json = serde_json::to_string(&conv).unwrap();
        assert!(json.contains("conv-123"));
        assert!(json.contains("createdAt")); // camelCase
    }
}

// ============================================================================
// Message Tests
// ============================================================================

mod message_tests {
    use super::*;

    #[test]
    fn test_add_user_message() {
        let mut chat = MockChatSystem::new();
        let conv = chat.create_conversation(None);

        let msg = chat
            .add_message(&conv.id, "user", "Hello, how are you?", None)
            .unwrap();

        assert_eq!(msg.role, "user");
        assert_eq!(msg.content, "Hello, how are you?");
        assert!(msg.source_chunks.is_none());
    }

    #[test]
    fn test_add_assistant_message_with_sources() {
        let mut chat = MockChatSystem::new();
        let conv = chat.create_conversation(None);

        let sources = vec!["chunk-1".to_string(), "chunk-2".to_string()];
        let msg = chat
            .add_message(&conv.id, "assistant", "Based on your transcripts...", Some(sources))
            .unwrap();

        assert_eq!(msg.role, "assistant");
        assert!(msg.source_chunks.is_some());
        assert_eq!(msg.source_chunks.as_ref().unwrap().len(), 2);
    }

    #[test]
    fn test_add_message_invalid_conversation() {
        let mut chat = MockChatSystem::new();
        assert!(chat.add_message("nonexistent", "user", "Hello", None).is_err());
    }

    #[test]
    fn test_get_messages_order() {
        let mut chat = MockChatSystem::new();
        let conv = chat.create_conversation(None);

        chat.add_message(&conv.id, "user", "First", None).unwrap();
        chat.add_message(&conv.id, "assistant", "Second", None).unwrap();
        chat.add_message(&conv.id, "user", "Third", None).unwrap();

        let messages = chat.get_messages(&conv.id);
        assert_eq!(messages.len(), 3);
        assert_eq!(messages[0].content, "First");
        assert_eq!(messages[1].content, "Second");
        assert_eq!(messages[2].content, "Third");
    }

    #[test]
    fn test_get_messages_empty_conversation() {
        let mut chat = MockChatSystem::new();
        let conv = chat.create_conversation(None);

        let messages = chat.get_messages(&conv.id);
        assert!(messages.is_empty());
    }

    #[test]
    fn test_message_serialization() {
        let msg = ChatMessage {
            id: "msg-1".to_string(),
            conversation_id: "conv-1".to_string(),
            role: "user".to_string(),
            content: "Hello".to_string(),
            source_chunks: Some(vec!["chunk-1".to_string()]),
            created_at: 1234567890,
        };

        let json = serde_json::to_string(&msg).unwrap();
        let restored: ChatMessage = serde_json::from_str(&json).unwrap();

        assert_eq!(msg, restored);
    }

    #[test]
    fn test_message_roles() {
        let mut chat = MockChatSystem::new();
        let conv = chat.create_conversation(None);

        let user_msg = chat.add_message(&conv.id, "user", "Question", None).unwrap();
        let assistant_msg = chat.add_message(&conv.id, "assistant", "Answer", None).unwrap();
        let system_msg = chat.add_message(&conv.id, "system", "Context", None).unwrap();

        assert_eq!(user_msg.role, "user");
        assert_eq!(assistant_msg.role, "assistant");
        assert_eq!(system_msg.role, "system");
    }
}

// ============================================================================
// Chunk and Search Tests
// ============================================================================

mod chunk_tests {
    use super::*;

    fn setup_chat_with_chunks() -> MockChatSystem {
        let mut chat = MockChatSystem::new();

        // Add chunks from multiple sessions
        chat.add_chunk("session-1", "The project deadline is next Friday.", Some("Manager"));
        chat.add_chunk("session-1", "We need to review the budget.", Some("Manager"));
        chat.add_chunk("session-2", "Client requested new features.", Some("Sales"));
        chat.add_chunk("session-2", "Technical requirements are complex.", Some("Developer"));
        chat.add_chunk("session-3", "Meeting notes from yesterday.", None);

        chat
    }

    #[test]
    fn test_add_chunk() {
        let mut chat = MockChatSystem::new();
        let chunk = chat.add_chunk("session-1", "Test content", Some("Speaker"));

        assert!(!chunk.id.is_empty());
        assert_eq!(chunk.session_id, "session-1");
        assert_eq!(chunk.text, "Test content");
        assert_eq!(chunk.speaker, Some("Speaker".to_string()));
        assert_eq!(chunk.chunk_index, 0);
    }

    #[test]
    fn test_chunk_index_increments() {
        let mut chat = MockChatSystem::new();

        let c1 = chat.add_chunk("session-1", "First", None);
        let c2 = chat.add_chunk("session-1", "Second", None);
        let c3 = chat.add_chunk("session-1", "Third", None);

        assert_eq!(c1.chunk_index, 0);
        assert_eq!(c2.chunk_index, 1);
        assert_eq!(c3.chunk_index, 2);
    }

    #[test]
    fn test_search_basic() {
        let chat = setup_chat_with_chunks();
        let results = chat.search_chunks("deadline", 5, 0.3);

        assert!(!results.is_empty());
        assert!(results[0].text.contains("deadline"));
    }

    #[test]
    fn test_search_limit() {
        let chat = setup_chat_with_chunks();
        let results = chat.search_chunks("the", 2, 0.0);

        assert!(results.len() <= 2);
    }

    #[test]
    fn test_search_min_similarity() {
        let chat = setup_chat_with_chunks();
        let results = chat.search_chunks("deadline", 5, 0.5);

        for result in &results {
            assert!(result.similarity >= 0.5);
        }
    }

    #[test]
    fn test_search_no_results() {
        let chat = setup_chat_with_chunks();
        let results = chat.search_chunks("nonexistent_term_xyz", 5, 0.3);

        assert!(results.is_empty());
    }

    #[test]
    fn test_search_results_sorted_by_similarity() {
        let chat = setup_chat_with_chunks();
        let results = chat.search_chunks("the", 10, 0.0);

        for i in 1..results.len() {
            assert!(results[i - 1].similarity >= results[i].similarity);
        }
    }

    #[test]
    fn test_retrieved_chunk_includes_metadata() {
        let chat = setup_chat_with_chunks();
        let results = chat.search_chunks("deadline", 1, 0.3);

        assert!(!results.is_empty());
        let result = &results[0];

        assert!(!result.chunk_id.is_empty());
        assert!(!result.session_id.is_empty());
        assert!(result.session_title.is_some());
        assert!(!result.text.is_empty());
    }
}

// ============================================================================
// RAG Context Building Tests
// ============================================================================

mod rag_context_tests {
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
                "---\nExcerpt {}{}:\n{}{}\n\n",
                i + 1,
                session_label,
                speaker_label,
                chunk.text
            ));
        }

        context
    }

    fn format_rag_prompt(context: &str, user_question: &str) -> String {
        if context.is_empty() {
            return format!(
                r#"The user asked a question but no relevant transcript excerpts were found.

User question: {}

Please let the user know that you couldn't find relevant information in their transcripts to answer this question."#,
                user_question
            );
        }

        format!(
            r#"You are a helpful assistant answering questions based on the user's transcript recordings.

INSTRUCTIONS:
- Answer the question using ONLY the information from the transcript excerpts below
- Synthesize information across multiple excerpts when relevant
- Quote specific parts when helpful
- If the excerpts don't contain enough information, say so

{}

User question: {}

Answer:"#,
            context, user_question
        )
    }

    #[test]
    fn test_build_context_empty() {
        let context = build_rag_context(&[]);
        assert!(context.is_empty());
    }

    #[test]
    fn test_build_context_single_chunk() {
        let chunks = vec![RetrievedChunk {
            chunk_id: "1".to_string(),
            session_id: "s1".to_string(),
            session_title: Some("Meeting".to_string()),
            text: "Important discussion.".to_string(),
            speaker: Some("Alice".to_string()),
            similarity: 0.9,
        }];

        let context = build_rag_context(&chunks);

        assert!(context.contains("Excerpt 1"));
        assert!(context.contains("Meeting"));
        assert!(context.contains("[Alice]"));
        assert!(context.contains("Important discussion"));
    }

    #[test]
    fn test_build_context_multiple_chunks() {
        let chunks = vec![
            RetrievedChunk {
                chunk_id: "1".to_string(),
                session_id: "s1".to_string(),
                session_title: Some("Meeting 1".to_string()),
                text: "First point.".to_string(),
                speaker: Some("Bob".to_string()),
                similarity: 0.9,
            },
            RetrievedChunk {
                chunk_id: "2".to_string(),
                session_id: "s2".to_string(),
                session_title: Some("Meeting 2".to_string()),
                text: "Second point.".to_string(),
                speaker: None,
                similarity: 0.8,
            },
        ];

        let context = build_rag_context(&chunks);

        assert!(context.contains("Excerpt 1"));
        assert!(context.contains("Excerpt 2"));
        assert!(context.contains("Meeting 1"));
        assert!(context.contains("Meeting 2"));
    }

    #[test]
    fn test_format_prompt_with_context() {
        let context = "Some context";
        let question = "What was discussed?";

        let prompt = format_rag_prompt(context, question);

        assert!(prompt.contains("helpful assistant"));
        assert!(prompt.contains("Some context"));
        assert!(prompt.contains("What was discussed?"));
        assert!(prompt.contains("INSTRUCTIONS"));
    }

    #[test]
    fn test_format_prompt_without_context() {
        let prompt = format_rag_prompt("", "What is the weather?");

        assert!(prompt.contains("no relevant transcript excerpts"));
        assert!(prompt.contains("What is the weather?"));
    }
}

// ============================================================================
// Full Chat Flow Tests
// ============================================================================

mod chat_flow_tests {
    use super::*;

    #[test]
    fn test_complete_chat_flow() {
        let mut chat = MockChatSystem::new();

        // 1. Add some transcript chunks
        chat.add_chunk("session-1", "The deadline is December 15th.", Some("Manager"));
        chat.add_chunk("session-1", "We need three developers.", Some("Manager"));
        chat.add_chunk("session-2", "Budget approved for Q1.", Some("Finance"));

        // 2. Create conversation
        let conv = chat.create_conversation(Some("Project Questions"));

        // 3. User asks question
        let user_msg = chat
            .add_message(&conv.id, "user", "When is the deadline?", None)
            .unwrap();
        assert_eq!(user_msg.role, "user");

        // 4. Search for relevant chunks
        let chunks = chat.search_chunks("deadline", 5, 0.3);
        assert!(!chunks.is_empty());

        // 5. Generate response (simulated)
        let chunk_ids: Vec<String> = chunks.iter().map(|c| c.chunk_id.clone()).collect();
        let response = "Based on the transcripts, the deadline is December 15th.";

        // 6. Add assistant response with sources
        let assistant_msg = chat
            .add_message(&conv.id, "assistant", response, Some(chunk_ids))
            .unwrap();

        assert_eq!(assistant_msg.role, "assistant");
        assert!(assistant_msg.source_chunks.is_some());

        // 7. Verify conversation state
        let messages = chat.get_messages(&conv.id);
        assert_eq!(messages.len(), 2);
    }

    #[test]
    fn test_multi_turn_conversation() {
        let mut chat = MockChatSystem::new();

        chat.add_chunk("session-1", "Project uses React and TypeScript.", None);
        chat.add_chunk("session-1", "Database is PostgreSQL.", None);

        let conv = chat.create_conversation(None);

        // Turn 1
        chat.add_message(&conv.id, "user", "What tech stack are we using?", None).unwrap();
        chat.add_message(&conv.id, "assistant", "You're using React with TypeScript.", None).unwrap();

        // Turn 2
        chat.add_message(&conv.id, "user", "What about the database?", None).unwrap();
        chat.add_message(&conv.id, "assistant", "The database is PostgreSQL.", None).unwrap();

        // Turn 3
        chat.add_message(&conv.id, "user", "Thanks!", None).unwrap();
        chat.add_message(&conv.id, "assistant", "You're welcome!", None).unwrap();

        let messages = chat.get_messages(&conv.id);
        assert_eq!(messages.len(), 6);

        // Verify alternating roles
        for (i, msg) in messages.iter().enumerate() {
            if i % 2 == 0 {
                assert_eq!(msg.role, "user");
            } else {
                assert_eq!(msg.role, "assistant");
            }
        }
    }

    #[test]
    fn test_conversation_with_no_relevant_results() {
        let mut chat = MockChatSystem::new();

        // Add chunks about different topics
        chat.add_chunk("session-1", "Weather forecast for tomorrow.", None);

        let conv = chat.create_conversation(None);

        // Ask about something not in transcripts
        chat.add_message(&conv.id, "user", "What is quantum physics?", None).unwrap();

        // Search returns no results
        let chunks = chat.search_chunks("quantum physics", 5, 0.5);
        assert!(chunks.is_empty());

        // Response indicates no relevant information
        chat.add_message(
            &conv.id,
            "assistant",
            "I couldn't find any information about quantum physics in your transcripts.",
            None,
        )
        .unwrap();

        let messages = chat.get_messages(&conv.id);
        assert_eq!(messages.len(), 2);
    }

    #[test]
    fn test_multiple_conversations() {
        let mut chat = MockChatSystem::new();

        // Create multiple conversations
        let conv1 = chat.create_conversation(Some("Chat 1"));
        let conv2 = chat.create_conversation(Some("Chat 2"));

        // Add messages to different conversations
        chat.add_message(&conv1.id, "user", "Hello in chat 1", None).unwrap();
        chat.add_message(&conv2.id, "user", "Hello in chat 2", None).unwrap();
        chat.add_message(&conv1.id, "assistant", "Reply in chat 1", None).unwrap();

        // Verify isolation
        assert_eq!(chat.get_messages(&conv1.id).len(), 2);
        assert_eq!(chat.get_messages(&conv2.id).len(), 1);
    }

    #[test]
    fn test_delete_conversation_with_messages() {
        let mut chat = MockChatSystem::new();
        let conv = chat.create_conversation(Some("To Delete"));

        chat.add_message(&conv.id, "user", "Message 1", None).unwrap();
        chat.add_message(&conv.id, "assistant", "Response 1", None).unwrap();

        // Delete should succeed
        assert!(chat.delete_conversation(&conv.id).is_ok());

        // Messages should be deleted too
        assert!(chat.get_messages(&conv.id).is_empty());
    }
}

// ============================================================================
// Edge Cases and Error Handling
// ============================================================================

mod edge_cases {
    use super::*;

    #[test]
    fn test_unicode_in_messages() {
        let mut chat = MockChatSystem::new();
        let conv = chat.create_conversation(Some("Unicode Test"));

        let msg = chat
            .add_message(
                &conv.id,
                "user",
                "你好！这是一个测试。🎉 مرحبا",
                None,
            )
            .unwrap();

        assert!(msg.content.contains("你好"));
        assert!(msg.content.contains("🎉"));
        assert!(msg.content.contains("مرحبا"));
    }

    #[test]
    fn test_long_message() {
        let mut chat = MockChatSystem::new();
        let conv = chat.create_conversation(None);

        let long_content = "A".repeat(10000);
        let msg = chat.add_message(&conv.id, "user", &long_content, None).unwrap();

        assert_eq!(msg.content.len(), 10000);
    }

    #[test]
    fn test_empty_message() {
        let mut chat = MockChatSystem::new();
        let conv = chat.create_conversation(None);

        let msg = chat.add_message(&conv.id, "user", "", None).unwrap();
        assert!(msg.content.is_empty());
    }

    #[test]
    fn test_special_characters_in_search() {
        let mut chat = MockChatSystem::new();
        chat.add_chunk("s1", "C++ and C# are programming languages.", None);

        // These shouldn't cause errors
        let results1 = chat.search_chunks("C++", 5, 0.0);
        let results2 = chat.search_chunks("test\"quoted\"", 5, 0.0);
        let results3 = chat.search_chunks("path/to/file", 5, 0.0);

        // Just verify no crashes
        assert!(results1.len() >= 0);
        assert!(results2.len() >= 0);
        assert!(results3.len() >= 0);
    }

    #[test]
    fn test_many_source_chunks() {
        let mut chat = MockChatSystem::new();
        let conv = chat.create_conversation(None);

        let many_sources: Vec<String> = (0..100).map(|i| format!("chunk-{}", i)).collect();

        let msg = chat
            .add_message(&conv.id, "assistant", "Response", Some(many_sources))
            .unwrap();

        assert_eq!(msg.source_chunks.as_ref().unwrap().len(), 100);
    }

    #[test]
    fn test_conversation_title_auto_generation() {
        let mut chat = MockChatSystem::new();
        let conv = chat.create_conversation(None);

        // Simulate auto-generating title from first message
        chat.add_message(&conv.id, "user", "What are the Q3 sales figures?", None).unwrap();

        // Would normally auto-generate title
        chat.update_conversation_title(&conv.id, "Q3 Sales Discussion").unwrap();

        let updated = chat.get_conversation(&conv.id).unwrap();
        assert_eq!(updated.title, Some("Q3 Sales Discussion".to_string()));
    }
}

// ============================================================================
// Similarity Score Tests
// ============================================================================

mod similarity_tests {
    use super::*;

    /// Calculate cosine similarity between two vectors
    fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
        if a.len() != b.len() || a.is_empty() {
            return 0.0;
        }

        let dot: f32 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
        let norm_a: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
        let norm_b: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();

        if norm_a == 0.0 || norm_b == 0.0 {
            return 0.0;
        }

        dot / (norm_a * norm_b)
    }

    #[test]
    fn test_identical_vectors() {
        let a = vec![1.0, 2.0, 3.0];
        let sim = cosine_similarity(&a, &a);
        assert!((sim - 1.0).abs() < 0.001);
    }

    #[test]
    fn test_orthogonal_vectors() {
        let a = vec![1.0, 0.0];
        let b = vec![0.0, 1.0];
        let sim = cosine_similarity(&a, &b);
        assert!(sim.abs() < 0.001);
    }

    #[test]
    fn test_opposite_vectors() {
        let a = vec![1.0, 2.0, 3.0];
        let b = vec![-1.0, -2.0, -3.0];
        let sim = cosine_similarity(&a, &b);
        assert!((sim + 1.0).abs() < 0.001);
    }

    #[test]
    fn test_similarity_range() {
        let a = vec![0.5, 0.3, 0.8];
        let b = vec![0.2, 0.7, 0.4];
        let sim = cosine_similarity(&a, &b);

        assert!(sim >= -1.0);
        assert!(sim <= 1.0);
    }

    #[test]
    fn test_empty_vectors() {
        let a: Vec<f32> = vec![];
        let b: Vec<f32> = vec![];
        let sim = cosine_similarity(&a, &b);
        assert_eq!(sim, 0.0);
    }

    #[test]
    fn test_different_length_vectors() {
        let a = vec![1.0, 2.0];
        let b = vec![1.0, 2.0, 3.0];
        let sim = cosine_similarity(&a, &b);
        assert_eq!(sim, 0.0);
    }
}
