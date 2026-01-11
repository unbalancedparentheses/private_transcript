-- Migration 003: Chat History for RAG
-- Stores conversation history for chat with transcripts feature

-- Chat conversations (groups of related messages)
CREATE TABLE IF NOT EXISTS chat_conversations (
    id TEXT PRIMARY KEY,
    title TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    is_active INTEGER DEFAULT 1
);

-- Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    -- JSON array of chunk IDs that were used as context
    source_chunks TEXT,
    -- Token counts for context management
    token_count INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE
);

-- Index for fast message retrieval by conversation
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON chat_messages(conversation_id);

-- Index for chronological ordering
CREATE INDEX IF NOT EXISTS idx_messages_created ON chat_messages(conversation_id, created_at);
