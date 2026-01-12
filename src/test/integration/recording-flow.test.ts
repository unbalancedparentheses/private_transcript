import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { useSessionStore } from '../../stores/useSessionStore';
import { useWorkspaceStore } from '../../stores/useWorkspaceStore';
import { useUIStore } from '../../stores/useUIStore';
import type { Session, Folder, Workspace } from '../../types';

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

// Test data
const mockWorkspace: Workspace = {
  id: 'ws-1',
  name: 'Test Workspace',
  workspaceType: 'therapy',
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

const mockFolder: Folder = {
  id: 'folder-1',
  workspaceId: 'ws-1',
  name: 'Test Folder',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  sessionCount: 0,
};

const createMockSession = (overrides: Partial<Session> = {}): Session => ({
  id: 'session-1',
  folderId: 'folder-1',
  title: 'Test Recording',
  audioPath: '/audio/test.wav',
  audioDuration: 60000,
  status: 'pending',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
});

// Reset stores before each test
function resetStores() {
  useWorkspaceStore.setState({
    workspaces: [mockWorkspace],
    currentWorkspace: mockWorkspace,
    folders: [mockFolder],
    currentFolder: mockFolder,
  });
  useSessionStore.setState({ sessions: [], currentSession: null });
  useUIStore.setState({ view: 'list' });
}

describe('Integration: Recording Workflow', () => {
  beforeEach(() => {
    resetStores();
    vi.clearAllMocks();
  });

  describe('Start Recording Flow', () => {
    it('should transition view to recording when starting', () => {
      // User clicks record
      useUIStore.getState().setView('recording');
      expect(useUIStore.getState().view).toBe('recording');
    });

    it('should handle recording state correctly', () => {
      useUIStore.getState().setView('recording');
      // Recording state is managed separately - just verify view change
      expect(useUIStore.getState().view).toBe('recording');
    });
  });

  describe('Stop Recording Flow', () => {
    it('should create session when recording stops', async () => {
      const newSession = createMockSession();
      vi.mocked(invoke).mockResolvedValueOnce(newSession);

      // Stop recording and create session
      const session = await useSessionStore.getState().createSession(
        'folder-1',
        '/audio/test.wav',
        'Test Recording'
      );

      expect(invoke).toHaveBeenCalledWith('create_session', expect.any(Object));
      expect(session.id).toBe('session-1');
      expect(session.status).toBe('pending');
    });

    it('should transition to processing view', async () => {
      const newSession = createMockSession();
      vi.mocked(invoke).mockResolvedValueOnce(newSession);

      await useSessionStore.getState().createSession('folder-1', '/audio/test.wav');

      useUIStore.getState().setView('processing');
      expect(useUIStore.getState().view).toBe('processing');
    });

    it('should handle recording error gracefully', async () => {
      vi.mocked(invoke).mockRejectedValueOnce(new Error('Failed to save audio'));

      await expect(
        useSessionStore.getState().createSession('folder-1', '/audio/test.wav')
      ).rejects.toThrow('Failed to save audio');

      // State should remain unchanged
      expect(useSessionStore.getState().sessions).toEqual([]);
    });
  });

  describe('Transcription Flow', () => {
    it('should update session status during transcription', async () => {
      const pendingSession = createMockSession({ status: 'pending' });
      const transcribingSession = createMockSession({ status: 'transcribing' });

      // Create session
      vi.mocked(invoke).mockResolvedValueOnce(pendingSession);
      await useSessionStore.getState().createSession('folder-1', '/audio/test.wav');

      // Start transcription
      vi.mocked(invoke)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(transcribingSession);

      await useSessionStore.getState().updateSession('session-1', {
        status: 'transcribing',
      });

      expect(useSessionStore.getState().sessions[0].status).toBe('transcribing');
    });

    it('should complete session with transcript', async () => {
      const completedSession = createMockSession({
        status: 'complete',
        transcript: 'This is the transcribed content.',
        audioDuration: 60000,
      });

      useSessionStore.setState({ sessions: [createMockSession()], currentSession: createMockSession() });

      vi.mocked(invoke)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(completedSession);

      await useSessionStore.getState().updateSession('session-1', {
        status: 'complete',
        transcript: 'This is the transcribed content.',
      });

      const session = useSessionStore.getState().sessions[0];
      expect(session.status).toBe('complete');
      expect(session.transcript).toBe('This is the transcribed content.');
    });

    it('should handle transcription failure', async () => {
      const errorSession = createMockSession({ status: 'error' });

      useSessionStore.setState({ sessions: [createMockSession()], currentSession: createMockSession() });

      vi.mocked(invoke)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(errorSession);

      await useSessionStore.getState().updateSession('session-1', {
        status: 'error',
      });

      expect(useSessionStore.getState().sessions[0].status).toBe('error');
    });
  });

  describe('Post-Transcription Flow', () => {
    it('should navigate to session view after completion', async () => {
      const completedSession = createMockSession({
        status: 'complete',
        transcript: 'Transcription content',
      });

      useSessionStore.setState({
        sessions: [completedSession],
        currentSession: completedSession
      });

      useUIStore.getState().setView('session');
      expect(useUIStore.getState().view).toBe('session');
    });

    it('should generate notes after transcription', async () => {
      const sessionWithNote = createMockSession({
        status: 'complete',
        transcript: 'Transcription content',
        generatedNote: '# Session Notes\n\nKey points discussed...',
      });

      useSessionStore.setState({ sessions: [createMockSession()], currentSession: createMockSession() });

      vi.mocked(invoke)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(sessionWithNote);

      await useSessionStore.getState().updateSession('session-1', {
        status: 'complete',
        generatedNote: '# Session Notes\n\nKey points discussed...',
      });

      expect(useSessionStore.getState().sessions[0].generatedNote).toContain('Session Notes');
    });
  });

  describe('Full Recording Lifecycle', () => {
    it('should handle complete recording → transcription → note generation flow', async () => {
      // 1. Start recording
      useUIStore.getState().setView('recording');
      expect(useUIStore.getState().view).toBe('recording');

      // 2. Stop recording, create session
      const newSession = createMockSession({ status: 'pending' });
      vi.mocked(invoke).mockResolvedValueOnce(newSession);
      await useSessionStore.getState().createSession('folder-1', '/audio/test.wav');

      // 3. Start transcription
      useUIStore.getState().setView('processing');
      expect(useUIStore.getState().view).toBe('processing');

      const transcribingSession = createMockSession({ status: 'transcribing' });
      vi.mocked(invoke)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(transcribingSession);
      await useSessionStore.getState().updateSession('session-1', { status: 'transcribing' });

      // 4. Complete transcription
      const transcribedSession = createMockSession({
        status: 'generating',
        transcript: 'Full transcription content here.',
      });
      vi.mocked(invoke)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(transcribedSession);
      await useSessionStore.getState().updateSession('session-1', {
        status: 'generating',
        transcript: 'Full transcription content here.',
      });

      // 5. Complete note generation
      const completedSession = createMockSession({
        status: 'complete',
        transcript: 'Full transcription content here.',
        generatedNote: '# Session Notes\n\nContent...',
      });
      vi.mocked(invoke)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(completedSession);
      await useSessionStore.getState().updateSession('session-1', {
        status: 'complete',
        generatedNote: '# Session Notes\n\nContent...',
      });

      // 6. Navigate to session view
      useUIStore.getState().setView('session');

      // Final assertions
      const finalSession = useSessionStore.getState().sessions[0];
      expect(finalSession.status).toBe('complete');
      expect(finalSession.transcript).toBeDefined();
      expect(finalSession.generatedNote).toBeDefined();
      expect(useUIStore.getState().view).toBe('session');
    });
  });

  describe('Multiple Sessions', () => {
    it('should handle multiple recordings in sequence', async () => {
      const session1 = createMockSession({ id: 'session-1', title: 'Recording 1' });
      const session2 = createMockSession({ id: 'session-2', title: 'Recording 2' });
      const session3 = createMockSession({ id: 'session-3', title: 'Recording 3' });

      vi.mocked(invoke)
        .mockResolvedValueOnce(session1)
        .mockResolvedValueOnce(session2)
        .mockResolvedValueOnce(session3);

      await useSessionStore.getState().createSession('folder-1', '/audio/1.wav', 'Recording 1');
      await useSessionStore.getState().createSession('folder-1', '/audio/2.wav', 'Recording 2');
      await useSessionStore.getState().createSession('folder-1', '/audio/3.wav', 'Recording 3');

      expect(useSessionStore.getState().sessions).toHaveLength(3);
    });

    it('should track all created sessions', async () => {
      const sessions = [
        createMockSession({ id: 'session-1', createdAt: 1000 }),
        createMockSession({ id: 'session-2', createdAt: 2000 }),
        createMockSession({ id: 'session-3', createdAt: 3000 }),
      ];

      vi.mocked(invoke)
        .mockResolvedValueOnce(sessions[0])
        .mockResolvedValueOnce(sessions[1])
        .mockResolvedValueOnce(sessions[2]);

      for (const s of sessions) {
        await useSessionStore.getState().createSession('folder-1', '/audio/test.wav');
      }

      const storedSessions = useSessionStore.getState().sessions;
      expect(storedSessions).toHaveLength(3);
      // Verify all session IDs are present
      const ids = storedSessions.map(s => s.id);
      expect(ids).toContain('session-1');
      expect(ids).toContain('session-2');
      expect(ids).toContain('session-3');
    });
  });

  describe('Pause and Resume Recording', () => {
    it('should handle pause during recording by maintaining view state', () => {
      useUIStore.getState().setView('recording');
      // Pause/resume are handled by native audio - view should remain recording
      expect(useUIStore.getState().view).toBe('recording');
    });
  });

  describe('Cancel Recording', () => {
    it('should handle cancelled recording without creating session', () => {
      useUIStore.getState().setView('recording');

      // Cancel and return to list
      useUIStore.getState().setView('list');

      expect(useUIStore.getState().view).toBe('list');
      expect(useSessionStore.getState().sessions).toHaveLength(0);
    });
  });
});

describe('Integration: Session Delete Flow', () => {
  beforeEach(() => {
    resetStores();
    vi.clearAllMocks();
  });

  it('should delete session and update state', async () => {
    const session = createMockSession();
    useSessionStore.setState({ sessions: [session], currentSession: session });

    vi.mocked(invoke).mockResolvedValueOnce(undefined);

    await useSessionStore.getState().deleteSession('session-1');

    expect(useSessionStore.getState().sessions).toHaveLength(0);
    expect(useSessionStore.getState().currentSession).toBeNull();
  });

  it('should handle delete error gracefully', async () => {
    const session = createMockSession();
    useSessionStore.setState({ sessions: [session], currentSession: session });

    vi.mocked(invoke).mockRejectedValueOnce(new Error('Database error'));

    await expect(
      useSessionStore.getState().deleteSession('session-1')
    ).rejects.toThrow('Database error');

    // Session should still exist
    expect(useSessionStore.getState().sessions).toHaveLength(1);
  });
});

describe('Integration: Session Selection', () => {
  beforeEach(() => {
    resetStores();
    vi.clearAllMocks();
  });

  it('should select session and switch view', () => {
    const session = createMockSession();
    useSessionStore.setState({ sessions: [session] });

    useSessionStore.getState().selectSession(session);
    useUIStore.getState().setView('session');

    expect(useSessionStore.getState().currentSession).toEqual(session);
    expect(useUIStore.getState().view).toBe('session');
  });

  it('should deselect session and return to list', () => {
    const session = createMockSession();
    useSessionStore.setState({ sessions: [session], currentSession: session });
    useUIStore.setState({ view: 'session' });

    // Use clearSessions to deselect (or setState directly)
    useSessionStore.setState({ currentSession: null });
    useUIStore.getState().setView('list');

    expect(useSessionStore.getState().currentSession).toBeNull();
    expect(useUIStore.getState().view).toBe('list');
  });
});
