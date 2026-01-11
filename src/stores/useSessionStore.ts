import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';
import type { Session } from '../types';

interface SessionState {
  sessions: Session[];
  currentSession: Session | null;

  loadSessions: (folderId: string) => Promise<void>;
  createSession: (folderId: string, audioPath: string, title?: string) => Promise<Session>;
  selectSession: (session: Session) => void;
  updateSession: (id: string, updates: Partial<Session>) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  clearSessions: () => void;
}

export const useSessionStore = create<SessionState>()(
  subscribeWithSelector((set, get) => ({
    sessions: [],
    currentSession: null,

    loadSessions: async (folderId) => {
      const sessions = await invoke<Session[]>('get_sessions', { folderId });
      set({ sessions, currentSession: null });
    },

    createSession: async (folderId, audioPath, title) => {
      const session = await invoke<Session>('create_session', {
        request: {
          folderId,
          audioPath,
          title,
        },
      });
      set((state) => ({
        sessions: [session, ...state.sessions],
        currentSession: session,
      }));
      return session;
    },

    selectSession: (session) => {
      set({ currentSession: session });
    },

    updateSession: async (id, updates) => {
      await invoke('update_session', {
        request: { id, ...updates },
      });

      // Refresh session data
      const session = await invoke<Session>('get_session', { id });
      set((state) => ({
        sessions: state.sessions.map((s) => (s.id === id ? session : s)),
        currentSession: state.currentSession?.id === id ? session : state.currentSession,
      }));
    },

    deleteSession: async (id) => {
      await invoke('delete_session', { id });
      const { currentSession } = get();
      set((state) => ({
        sessions: state.sessions.filter((s) => s.id !== id),
        currentSession: currentSession?.id === id ? null : currentSession,
      }));
    },

    clearSessions: () => set({ sessions: [], currentSession: null }),
  }))
);
