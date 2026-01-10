import { invoke } from '@tauri-apps/api/core';

// Re-export invoke for convenience
export { invoke };

// Type-safe invoke helpers
export async function createWorkspace(name: string, workspaceType: string) {
  return invoke('create_workspace', { request: { name, workspace_type: workspaceType } });
}

export async function getWorkspaces() {
  return invoke('get_workspaces');
}

export async function createFolder(workspaceId: string, name: string) {
  return invoke('create_folder', { request: { workspace_id: workspaceId, name } });
}

export async function getFolders(workspaceId: string) {
  return invoke('get_folders', { workspaceId });
}

export async function createSession(folderId: string, audioPath: string, title?: string) {
  return invoke('create_session', { request: { folder_id: folderId, audio_path: audioPath, title } });
}

export async function getSessions(folderId: string) {
  return invoke('get_sessions', { folderId });
}

export async function transcribeAudio(sessionId: string, audioPath: string) {
  return invoke('transcribe_audio', { sessionId, audioPath });
}

export async function generateNote(transcript: string, templateId: string) {
  return invoke('generate_note', { transcript, templateId });
}

export async function checkOllamaStatus() {
  return invoke('check_ollama_status');
}
