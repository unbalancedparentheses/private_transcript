-- Migration 002: Transcript Chunks for RAG
-- Stores chunked transcript text with embeddings for semantic search

-- Transcript chunks table
CREATE TABLE IF NOT EXISTS transcript_chunks (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    text TEXT NOT NULL,
    speaker TEXT,
    start_offset INTEGER DEFAULT 0,
    end_offset INTEGER DEFAULT 0,
    -- Embedding stored as BLOB (Vec<f32> serialized to bytes)
    -- Using BLOB instead of sqlite-vec for simpler cross-platform support
    embedding BLOB,
    embedding_model TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- Index for fast session lookup
CREATE INDEX IF NOT EXISTS idx_chunks_session ON transcript_chunks(session_id);

-- Index for ordering chunks within a session
CREATE INDEX IF NOT EXISTS idx_chunks_session_index ON transcript_chunks(session_id, chunk_index);

-- Track which sessions have been indexed
CREATE TABLE IF NOT EXISTS session_indexing_status (
    session_id TEXT PRIMARY KEY,
    is_indexed INTEGER DEFAULT 0,
    chunk_count INTEGER DEFAULT 0,
    embedding_model TEXT,
    indexed_at INTEGER,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);
