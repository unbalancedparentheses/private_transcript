import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { useSessionStore } from '../../stores/useSessionStore';
import type { Session } from '../../types';

// Mock data
const mockSession: Session = {
  id: 'session-1',
  folderId: 'folder-1',
  title: 'Test Session',
  audioPath: '/path/to/audio.wav',
  audioDuration: 3600,
  status: 'pending',
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

describe('useSessionStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useSessionStore.setState({
      sessions: [],
      currentSession: null,
    });
    vi.clearAllMocks();
  });

  describe('loadSessions', () => {
    it('should load sessions for a folder', async () => {
      vi.mocked(invoke).mockResolvedValueOnce([mockSession]);

      await useSessionStore.getState().loadSessions('folder-1');

      expect(invoke).toHaveBeenCalledWith('get_sessions', { folderId: 'folder-1' });
      expect(useSessionStore.getState().sessions).toEqual([mockSession]);
      expect(useSessionStore.getState().currentSession).toBeNull();
    });

    it('should clear currentSession when loading new sessions', async () => {
      useSessionStore.setState({ currentSession: mockSession });
      vi.mocked(invoke).mockResolvedValueOnce([]);

      await useSessionStore.getState().loadSessions('folder-2');

      expect(useSessionStore.getState().currentSession).toBeNull();
    });
  });

  describe('createSession', () => {
    it('should create a session and add to state', async () => {
      vi.mocked(invoke).mockResolvedValueOnce(mockSession);

      const session = await useSessionStore.getState().createSession(
        'folder-1',
        '/path/to/audio.wav',
        'Test Session'
      );

      expect(invoke).toHaveBeenCalledWith('create_session', {
        request: {
          folderId: 'folder-1',
          audioPath: '/path/to/audio.wav',
          title: 'Test Session',
        },
      });
      expect(session).toEqual(mockSession);
      expect(useSessionStore.getState().sessions[0]).toEqual(mockSession);
      expect(useSessionStore.getState().currentSession).toEqual(mockSession);
    });

    it('should prepend new session to existing list', async () => {
      const existingSession = { ...mockSession, id: 'session-0' };
      useSessionStore.setState({ sessions: [existingSession] });
      vi.mocked(invoke).mockResolvedValueOnce(mockSession);

      await useSessionStore.getState().createSession('folder-1', '/path/to/audio.wav');

      const { sessions } = useSessionStore.getState();
      expect(sessions[0]).toEqual(mockSession);
      expect(sessions[1]).toEqual(existingSession);
    });
  });

  describe('selectSession', () => {
    it('should update currentSession', () => {
      useSessionStore.getState().selectSession(mockSession);

      expect(useSessionStore.getState().currentSession).toEqual(mockSession);
    });
  });

  describe('updateSession', () => {
    it('should update session and refresh from backend', async () => {
      const updatedSession = { ...mockSession, title: 'Updated Title' };
      useSessionStore.setState({ sessions: [mockSession], currentSession: mockSession });
      vi.mocked(invoke)
        .mockResolvedValueOnce(undefined) // update_session
        .mockResolvedValueOnce(updatedSession); // get_session

      await useSessionStore.getState().updateSession('session-1', { title: 'Updated Title' });

      expect(invoke).toHaveBeenCalledWith('update_session', {
        request: { id: 'session-1', title: 'Updated Title' },
      });
      expect(invoke).toHaveBeenCalledWith('get_session', { id: 'session-1' });
      expect(useSessionStore.getState().sessions[0]).toEqual(updatedSession);
      expect(useSessionStore.getState().currentSession).toEqual(updatedSession);
    });

    it('should not update currentSession if different session is updated', async () => {
      const otherSession = { ...mockSession, id: 'session-2' };
      const updatedSession = { ...otherSession, title: 'Updated' };
      useSessionStore.setState({ sessions: [mockSession, otherSession], currentSession: mockSession });
      vi.mocked(invoke)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(updatedSession);

      await useSessionStore.getState().updateSession('session-2', { title: 'Updated' });

      expect(useSessionStore.getState().currentSession).toEqual(mockSession);
    });
  });

  describe('deleteSession', () => {
    it('should delete session and remove from state', async () => {
      useSessionStore.setState({ sessions: [mockSession], currentSession: mockSession });
      vi.mocked(invoke).mockResolvedValueOnce(undefined);

      await useSessionStore.getState().deleteSession('session-1');

      expect(invoke).toHaveBeenCalledWith('delete_session', { id: 'session-1' });
      expect(useSessionStore.getState().sessions).toEqual([]);
      expect(useSessionStore.getState().currentSession).toBeNull();
    });

    it('should not clear currentSession if different session is deleted', async () => {
      const otherSession = { ...mockSession, id: 'session-2' };
      useSessionStore.setState({ sessions: [mockSession, otherSession], currentSession: mockSession });
      vi.mocked(invoke).mockResolvedValueOnce(undefined);

      await useSessionStore.getState().deleteSession('session-2');

      expect(useSessionStore.getState().currentSession).toEqual(mockSession);
      expect(useSessionStore.getState().sessions).toEqual([mockSession]);
    });
  });

  describe('clearSessions', () => {
    it('should clear all sessions and currentSession', () => {
      useSessionStore.setState({ sessions: [mockSession], currentSession: mockSession });

      useSessionStore.getState().clearSessions();

      expect(useSessionStore.getState().sessions).toEqual([]);
      expect(useSessionStore.getState().currentSession).toBeNull();
    });
  });
});
