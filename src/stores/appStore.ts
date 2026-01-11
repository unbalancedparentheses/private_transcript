import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import type { Workspace, Folder, Session, Template, AppSettings, WorkspaceType } from '../types';

interface AppState {
  // Initialization
  initialized: boolean;
  onboardingComplete: boolean;

  // Workspaces
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;

  // Folders
  folders: Folder[];
  currentFolder: Folder | null;

  // Sessions
  sessions: Session[];
  currentSession: Session | null;

  // Templates
  templates: Template[];

  // Settings
  settings: AppSettings | null;

  // UI State
  view: 'list' | 'recording' | 'processing' | 'session' | 'settings';

  // Actions
  initialize: () => Promise<void>;
  setOnboardingComplete: (complete: boolean) => void;

  // Workspace actions
  createWorkspace: (name: string, type: WorkspaceType) => Promise<Workspace>;
  selectWorkspace: (workspace: Workspace) => Promise<void>;

  // Folder actions
  createFolder: (name: string) => Promise<Folder>;
  selectFolder: (folder: Folder) => Promise<void>;

  // Session actions
  createSession: (audioPath: string, title?: string) => Promise<Session>;
  selectSession: (session: Session) => void;
  updateSession: (id: string, updates: Partial<Session>) => Promise<void>;

  // View actions
  setView: (view: 'list' | 'recording' | 'processing' | 'session' | 'settings') => void;

  // Template actions
  loadTemplates: (workspaceType?: WorkspaceType) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  initialized: false,
  onboardingComplete: false,
  workspaces: [],
  currentWorkspace: null,
  folders: [],
  currentFolder: null,
  sessions: [],
  currentSession: null,
  templates: [],
  settings: null,
  view: 'list',

  initialize: async () => {
    try {
      // Load workspaces
      const workspaces = await invoke<Workspace[]>('get_workspaces');

      // Load settings
      const settings = await invoke<AppSettings>('get_settings');

      // Check if models are ready (at least one of each type downloaded)
      let modelsReady = false;
      try {
        modelsReady = await invoke<boolean>('are_models_ready');
      } catch {
        modelsReady = false;
      }

      // Onboarding is complete if we have workspaces AND models are ready
      const onboardingComplete = workspaces.length > 0 && modelsReady;

      set({
        workspaces,
        settings,
        initialized: true,
        onboardingComplete,
        currentWorkspace: workspaces.length > 0 ? workspaces[0] : null,
      });

      // If we have a workspace, load its folders
      if (workspaces.length > 0) {
        const folders = await invoke<Folder[]>('get_folders', {
          workspaceId: workspaces[0].id
        });
        set({ folders });

        // Load templates for this workspace type
        const templates = await invoke<Template[]>('get_templates', {
          workspaceType: workspaces[0].workspaceType,
        });
        set({ templates });
      }
    } catch (error) {
      console.error('Failed to initialize:', error);
      set({ initialized: true });
    }
  },

  createWorkspace: async (name, type) => {
    const workspace = await invoke<Workspace>('create_workspace', {
      request: { name, workspaceType: type },
    });
    set((state) => ({
      workspaces: [workspace, ...state.workspaces],
      currentWorkspace: workspace,
      folders: [],
      currentFolder: null,
      sessions: [],
    }));
    return workspace;
  },

  selectWorkspace: async (workspace) => {
    const folders = await invoke<Folder[]>('get_folders', {
      workspaceId: workspace.id
    });
    const templates = await invoke<Template[]>('get_templates', {
      workspaceType: workspace.workspaceType,
    });
    set({
      currentWorkspace: workspace,
      folders,
      templates,
      currentFolder: null,
      sessions: [],
      currentSession: null,
      view: 'list',
    });
  },

  createFolder: async (name) => {
    const { currentWorkspace } = get();
    if (!currentWorkspace) throw new Error('No workspace selected');

    const folder = await invoke<Folder>('create_folder', {
      request: { workspaceId: currentWorkspace.id, name },
    });
    set((state) => ({ folders: [folder, ...state.folders] }));
    return folder;
  },

  selectFolder: async (folder) => {
    const sessions = await invoke<Session[]>('get_sessions', {
      folderId: folder.id
    });
    set({
      currentFolder: folder,
      sessions,
      currentSession: null,
      view: 'list',
    });
  },

  createSession: async (audioPath, title) => {
    const { currentFolder } = get();
    if (!currentFolder) throw new Error('No folder selected');

    const session = await invoke<Session>('create_session', {
      request: {
        folderId: currentFolder.id,
        audioPath: audioPath,
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
    set({ currentSession: session, view: 'session' });
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

  setView: (view) => set({ view }),

  setOnboardingComplete: (complete) => set({ onboardingComplete: complete }),

  loadTemplates: async (workspaceType) => {
    const templates = await invoke<Template[]>('get_templates', {
      workspaceType,
    });
    set({ templates });
  },
}));
