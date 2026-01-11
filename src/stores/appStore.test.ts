import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAppStore } from './appStore';
import { useInitStore } from './useInitStore';
import { useWorkspaceStore } from './useWorkspaceStore';
import { useSessionStore } from './useSessionStore';
import { useTemplateStore } from './useTemplateStore';
import { useUIStore } from './useUIStore';
import { invoke } from '@tauri-apps/api/core';

// Mock invoke
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

describe('AppStore', () => {
  beforeEach(() => {
    // Reset all individual stores
    useInitStore.setState({
      initialized: false,
      onboardingComplete: false,
    });
    useWorkspaceStore.setState({
      workspaces: [],
      currentWorkspace: null,
      folders: [],
      currentFolder: null,
    });
    useSessionStore.setState({
      sessions: [],
      currentSession: null,
    });
    useTemplateStore.setState({
      templates: [],
      settings: null,
    });
    useUIStore.setState({
      view: 'list',
    });
    vi.clearAllMocks();
    // Reset mock implementations to default (returns undefined)
    vi.mocked(invoke).mockReset();
  });

  afterEach(() => {
    // Ensure mocks are reset after each test
    vi.mocked(invoke).mockReset();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useAppStore.getState();
      expect(state.initialized).toBe(false);
      expect(state.onboardingComplete).toBe(false);
      expect(state.workspaces).toEqual([]);
      expect(state.currentWorkspace).toBeNull();
      expect(state.folders).toEqual([]);
      expect(state.sessions).toEqual([]);
      expect(state.view).toBe('list');
    });
  });

  describe('setView', () => {
    it('should update the view', () => {
      const { setView } = useAppStore.getState();

      setView('recording');
      expect(useAppStore.getState().view).toBe('recording');

      setView('session');
      expect(useAppStore.getState().view).toBe('session');

      setView('settings');
      expect(useAppStore.getState().view).toBe('settings');
    });
  });

  describe('setOnboardingComplete', () => {
    it('should set onboarding complete status', () => {
      const { setOnboardingComplete } = useAppStore.getState();

      setOnboardingComplete(true);
      expect(useAppStore.getState().onboardingComplete).toBe(true);

      setOnboardingComplete(false);
      expect(useAppStore.getState().onboardingComplete).toBe(false);
    });
  });

  describe('selectSession', () => {
    it('should select a session and change view', () => {
      const mockSession = {
        id: 'session-1',
        folderId: 'folder-1',
        title: 'Test Session',
        audioPath: '/path/to/audio.m4a',
        status: 'pending',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const { selectSession } = useAppStore.getState();
      selectSession(mockSession as any);

      const state = useAppStore.getState();
      expect(state.currentSession).toEqual(mockSession);
      expect(state.view).toBe('session');
    });
  });

  describe('initialize', () => {
    it('should load workspaces and settings on initialize', async () => {
      const mockWorkspaces = [
        { id: 'ws-1', name: 'Work', workspaceType: 'general' },
      ];
      const mockSettings = { theme: 'light' };
      const mockFolders = [{ id: 'folder-1', name: 'Notes' }];
      const mockTemplates = [{ id: 'template-1', name: 'General' }];

      (invoke as any)
        .mockResolvedValueOnce(mockWorkspaces) // get_workspaces
        .mockResolvedValueOnce(mockSettings) // get_settings
        .mockResolvedValueOnce(true) // are_models_ready
        .mockResolvedValueOnce(mockFolders) // get_folders
        .mockResolvedValueOnce(mockTemplates); // get_templates

      const { initialize } = useAppStore.getState();
      await initialize();

      const state = useAppStore.getState();
      expect(state.initialized).toBe(true);
      expect(state.workspaces).toEqual(mockWorkspaces);
      expect(state.currentWorkspace).toEqual(mockWorkspaces[0]);
      expect(state.onboardingComplete).toBe(true);
    });

    it('should set onboardingComplete to false if no workspaces', async () => {
      (invoke as any)
        .mockResolvedValueOnce([]) // get_workspaces - empty
        .mockResolvedValueOnce({}) // get_settings
        .mockResolvedValueOnce(false); // are_models_ready

      const { initialize } = useAppStore.getState();
      await initialize();

      const state = useAppStore.getState();
      expect(state.initialized).toBe(true);
      expect(state.onboardingComplete).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      // Mock invoke to reject with an error
      vi.mocked(invoke).mockImplementation(() =>
        Promise.reject(new Error('Network error'))
      );

      const { initialize } = useAppStore.getState();
      await initialize();

      const state = useAppStore.getState();
      expect(state.initialized).toBe(true);
    });
  });

  describe('createWorkspace', () => {
    it('should create a workspace and update state', async () => {
      const mockWorkspace = {
        id: 'ws-new',
        name: 'New Workspace',
        workspaceType: 'research',
      };

      (invoke as any).mockResolvedValueOnce(mockWorkspace);

      const { createWorkspace } = useAppStore.getState();
      const result = await createWorkspace('New Workspace', 'research');

      expect(result).toEqual(mockWorkspace);
      expect(invoke).toHaveBeenCalledWith('create_workspace', {
        request: { name: 'New Workspace', workspaceType: 'research' },
      });

      const state = useAppStore.getState();
      expect(state.workspaces).toContain(mockWorkspace);
      expect(state.currentWorkspace).toEqual(mockWorkspace);
    });
  });

  describe('createSession', () => {
    it('should throw error if no folder selected', async () => {
      const { createSession } = useAppStore.getState();
      await expect(createSession('/path/audio.m4a')).rejects.toThrow('No folder selected');
    });

    it('should create a session when folder is selected', async () => {
      const mockSession = {
        id: 'session-new',
        folderId: 'folder-1',
        audioPath: '/path/audio.m4a',
        status: 'pending',
      };

      // Mock invoke to return empty sessions for loadSessions and then the session for createSession
      vi.mocked(invoke).mockImplementation(async (cmd: string) => {
        if (cmd === 'get_sessions') return [];
        if (cmd === 'create_session') return mockSession;
        return undefined;
      });

      // Set up folder first - update the workspace store
      // This triggers subscription which calls loadSessions
      useWorkspaceStore.setState({
        currentFolder: { id: 'folder-1', name: 'Test Folder' } as any,
      });

      // Wait for subscription to complete
      await new Promise((resolve) => setTimeout(resolve, 0));

      const { createSession } = useAppStore.getState();
      const result = await createSession('/path/audio.m4a', 'My Recording');

      expect(result).toEqual(mockSession);
      expect(invoke).toHaveBeenCalledWith('create_session', {
        request: {
          folderId: 'folder-1',
          audioPath: '/path/audio.m4a',
          title: 'My Recording',
        },
      });
    });
  });

  describe('updateSession', () => {
    it('should update session and refresh state', async () => {
      const originalSession = {
        id: 'session-1',
        folderId: 'folder-1',
        title: 'Original Title',
        status: 'pending',
      };

      const updatedSession = {
        ...originalSession,
        title: 'Updated Title',
        status: 'completed',
      };

      // Set up state in the session store
      useSessionStore.setState({
        sessions: [originalSession as any],
        currentSession: originalSession as any,
      });

      (invoke as any)
        .mockResolvedValueOnce(undefined) // update_session
        .mockResolvedValueOnce(updatedSession); // get_session

      const { updateSession } = useAppStore.getState();
      await updateSession('session-1', { title: 'Updated Title', status: 'complete' });

      const state = useAppStore.getState();
      expect(state.sessions[0].title).toBe('Updated Title');
      expect(state.currentSession?.title).toBe('Updated Title');
    });
  });
});
