-- Migration 001: Initial Schema
-- Private Transcript Database Schema

-- Workspaces: therapy, legal, research, general
CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    workspace_type TEXT NOT NULL CHECK (workspace_type IN ('therapy', 'legal', 'research', 'general')),
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    is_active INTEGER DEFAULT 1
);

-- Templates: Note generation templates (must be before sessions due to FK)
CREATE TABLE IF NOT EXISTS templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    workspace_type TEXT NOT NULL CHECK (workspace_type IN ('therapy', 'legal', 'research', 'general')),
    description TEXT,
    prompt TEXT NOT NULL,
    output_format TEXT,
    is_default INTEGER DEFAULT 0,
    is_system INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Folders: Clients (therapy), Cases (legal), Projects (research), Folders (general)
CREATE TABLE IF NOT EXISTS folders (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    name TEXT NOT NULL,
    metadata TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    is_active INTEGER DEFAULT 1,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);

-- Sessions: Individual recordings
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    folder_id TEXT NOT NULL,
    title TEXT,
    audio_path TEXT NOT NULL,
    audio_duration INTEGER,
    transcript TEXT,
    transcript_segments TEXT,
    generated_note TEXT,
    note_format TEXT,
    template_id TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'transcribing', 'generating', 'complete', 'error')),
    error_message TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (folder_id) REFERENCES folders(id),
    FOREIGN KEY (template_id) REFERENCES templates(id)
);

-- Settings: App configuration
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_folders_workspace ON folders(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sessions_folder ON sessions(folder_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_templates_workspace_type ON templates(workspace_type);
