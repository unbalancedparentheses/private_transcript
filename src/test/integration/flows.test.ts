import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { useInitStore } from '../../stores/useInitStore';
import { useWorkspaceStore } from '../../stores/useWorkspaceStore';
import { useSessionStore } from '../../stores/useSessionStore';
import { useTemplateStore } from '../../stores/useTemplateStore';
import { useUIStore } from '../../stores/useUIStore';
import type { Workspace, Folder, Session, Template, AppSettings } from '../../types';

// Comprehensive mock data
const mockWorkspace: Workspace = {
  id: 'ws-1',
  name: 'Therapy Practice',
  workspaceType: 'therapy',
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

const mockFolder: Folder = {
  id: 'folder-1',
  workspaceId: 'ws-1',
  name: 'John Smith',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  sessionCount: 1,
};

const mockSession: Session = {
  id: 'session-1',
  folderId: 'folder-1',
  title: 'Session 2024-01-11',
  audioPath: '/path/to/recording.wav',
  audioDuration: 3600,
  status: 'pending',
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

const mockTranscribedSession: Session = {
  ...mockSession,
  status: 'complete',
  transcript: 'Client discussed their progress this week...',
  generatedNote: '# Progress Note\n\nClient showed improvement...',
};

const mockTemplate: Template = {
  id: 'template-1',
  name: 'SOAP Note',
  workspaceType: 'therapy',
  prompt: 'Generate a SOAP note from: {transcript}',
  isDefault: true,
  isSystem: true,
};

const mockSettings: AppSettings = {
  theme: 'dark',
  whisperModel: 'base',
  llmProvider: 'bundled',
  llmModel: 'llama-3.2-1b',
  ollamaEndpoint: 'http://localhost:11434',
  exportFormat: 'markdown',
  autoSave: true,
};

// Reset all stores before each test
function resetAllStores() {
  useInitStore.setState({ initialized: false, onboardingComplete: false });
  useWorkspaceStore.setState({
    workspaces: [],
    currentWorkspace: null,
    folders: [],
    currentFolder: null,
  });
  useSessionStore.setState({ sessions: [], currentSession: null });
  useTemplateStore.setState({ templates: [], settings: null });
  useUIStore.setState({ view: 'list' });
}

describe('Integration: Full Application Flow', () => {
  beforeEach(() => {
    resetAllStores();
    vi.clearAllMocks();
  });

  describe('App Initialization Flow', () => {
    it('should initialize app with existing data', async () => {
      vi.mocked(invoke)
        .mockResolvedValueOnce([mockWorkspace]) // get_workspaces
        .mockResolvedValueOnce(mockSettings) // get_settings
        .mockResolvedValueOnce(true) // are_models_ready
        .mockResolvedValueOnce([mockFolder]) // get_folders
        .mockResolvedValueOnce([mockTemplate]); // get_templates

      await useInitStore.getState().initialize();

      // Verify all stores are populated
      expect(useInitStore.getState().initialized).toBe(true);
      expect(useInitStore.getState().onboardingComplete).toBe(true);
      expect(useWorkspaceStore.getState().currentWorkspace).toEqual(mockWorkspace);
      expect(useWorkspaceStore.getState().folders).toEqual([mockFolder]);
      expect(useTemplateStore.getState().settings).toEqual(mockSettings);
      expect(useTemplateStore.getState().templates).toEqual([mockTemplate]);
    });

    it('should handle fresh install (no workspaces, no models)', async () => {
      vi.mocked(invoke)
        .mockResolvedValueOnce([]) // get_workspaces - empty
        .mockResolvedValueOnce(mockSettings) // get_settings
        .mockResolvedValueOnce(false); // are_models_ready

      await useInitStore.getState().initialize();

      expect(useInitStore.getState().initialized).toBe(true);
      expect(useInitStore.getState().onboardingComplete).toBe(false);
      expect(useWorkspaceStore.getState().currentWorkspace).toBeNull();
    });
  });

  describe('Recording and Transcription Flow', () => {
    beforeEach(async () => {
      // Set up initial state as if user navigated to a folder
      useWorkspaceStore.setState({
        workspaces: [mockWorkspace],
        currentWorkspace: mockWorkspace,
        folders: [mockFolder],
        currentFolder: mockFolder,
      });
      useSessionStore.setState({ sessions: [mockSession] });
    });

    it('should create session after recording', async () => {
      const newSession = { ...mockSession, id: 'session-new' };
      vi.mocked(invoke).mockResolvedValueOnce(newSession);

      // Simulate recording completion
      useUIStore.getState().setView('recording');
      expect(useUIStore.getState().view).toBe('recording');

      // Create session with recorded audio
      const session = await useSessionStore.getState().createSession(
        'folder-1',
        '/path/to/new-recording.wav',
        'New Session'
      );

      expect(session).toEqual(newSession);
      expect(useSessionStore.getState().sessions[0]).toEqual(newSession);
      expect(useSessionStore.getState().currentSession).toEqual(newSession);
    });

    it('should update session after transcription completes', async () => {
      vi.mocked(invoke)
        .mockResolvedValueOnce(undefined) // update_session
        .mockResolvedValueOnce(mockTranscribedSession); // get_session

      useSessionStore.setState({ sessions: [mockSession], currentSession: mockSession });

      // Simulate transcription completion
      await useSessionStore.getState().updateSession('session-1', {
        status: 'complete',
        transcript: 'Client discussed their progress...',
      });

      expect(useSessionStore.getState().sessions[0].status).toBe('complete');
      expect(useSessionStore.getState().sessions[0].transcript).toBeDefined();
    });
  });

  describe('Navigation Flow', () => {
    it('should navigate between workspaces and load data', async () => {
      const workspace2 = { ...mockWorkspace, id: 'ws-2', name: 'Legal Practice', workspaceType: 'legal' as const };
      const folder2 = { ...mockFolder, id: 'folder-2', workspaceId: 'ws-2' };

      useWorkspaceStore.setState({
        workspaces: [mockWorkspace, workspace2],
        currentWorkspace: mockWorkspace,
        folders: [mockFolder],
        currentFolder: mockFolder,
      });

      vi.mocked(invoke).mockResolvedValueOnce([folder2]);

      // Switch to different workspace
      await useWorkspaceStore.getState().selectWorkspace(workspace2);

      expect(invoke).toHaveBeenCalledWith('get_folders', { workspaceId: 'ws-2' });
      expect(useWorkspaceStore.getState().currentWorkspace).toEqual(workspace2);
      expect(useWorkspaceStore.getState().folders).toEqual([folder2]);
      expect(useWorkspaceStore.getState().currentFolder).toBeNull();
    });

    it('should load sessions when folder is selected', async () => {
      useWorkspaceStore.setState({
        currentWorkspace: mockWorkspace,
        folders: [mockFolder],
      });

      vi.mocked(invoke).mockResolvedValueOnce([mockSession]);

      // Select folder
      useWorkspaceStore.getState().selectFolder(mockFolder);
      await useSessionStore.getState().loadSessions('folder-1');

      expect(useWorkspaceStore.getState().currentFolder).toEqual(mockFolder);
      expect(useSessionStore.getState().sessions).toEqual([mockSession]);
    });
  });

  describe('View Transitions', () => {
    it('should handle recording flow view transitions', () => {
      // Start at list view
      expect(useUIStore.getState().view).toBe('list');

      // Go to recording
      useUIStore.getState().setView('recording');
      expect(useUIStore.getState().view).toBe('recording');

      // Go to processing after recording
      useUIStore.getState().setView('processing');
      expect(useUIStore.getState().view).toBe('processing');

      // Go to session after processing
      useUIStore.getState().setView('session');
      expect(useUIStore.getState().view).toBe('session');

      // Back to list
      useUIStore.getState().setView('list');
      expect(useUIStore.getState().view).toBe('list');
    });
  });

  describe('Session Management Flow', () => {
    it('should handle complete session lifecycle', async () => {
      useWorkspaceStore.setState({
        currentWorkspace: mockWorkspace,
        folders: [mockFolder],
        currentFolder: mockFolder,
      });

      // 1. Create session
      vi.mocked(invoke).mockResolvedValueOnce(mockSession);
      const session = await useSessionStore.getState().createSession(
        'folder-1',
        '/path/to/audio.wav'
      );
      expect(session.status).toBe('pending');

      // 2. Update to transcribing
      vi.mocked(invoke)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({ ...mockSession, status: 'transcribing' });
      await useSessionStore.getState().updateSession('session-1', { status: 'transcribing' });
      expect(useSessionStore.getState().sessions[0].status).toBe('transcribing');

      // 3. Update to generating
      vi.mocked(invoke)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({ ...mockSession, status: 'generating', transcript: 'Text...' });
      await useSessionStore.getState().updateSession('session-1', {
        status: 'generating',
        transcript: 'Text...',
      });
      expect(useSessionStore.getState().sessions[0].status).toBe('generating');

      // 4. Update to complete
      vi.mocked(invoke)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(mockTranscribedSession);
      await useSessionStore.getState().updateSession('session-1', {
        status: 'complete',
        generatedNote: '# Note',
      });
      expect(useSessionStore.getState().sessions[0].status).toBe('complete');

      // 5. Delete session
      vi.mocked(invoke).mockResolvedValueOnce(undefined);
      await useSessionStore.getState().deleteSession('session-1');
      expect(useSessionStore.getState().sessions).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    it('should handle failed session creation', async () => {
      vi.mocked(invoke).mockRejectedValueOnce(new Error('Disk full'));

      await expect(
        useSessionStore.getState().createSession('folder-1', '/path/to/audio.wav')
      ).rejects.toThrow('Disk full');

      // State should remain unchanged
      expect(useSessionStore.getState().sessions).toEqual([]);
      expect(useSessionStore.getState().currentSession).toBeNull();
    });

    it('should handle failed workspace load', async () => {
      vi.mocked(invoke).mockRejectedValueOnce(new Error('Database error'));

      await expect(useWorkspaceStore.getState().loadWorkspaces()).rejects.toThrow('Database error');
    });
  });
});
