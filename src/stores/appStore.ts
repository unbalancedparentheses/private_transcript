/**
 * Legacy combined store for backward compatibility.
 * New code should import from individual stores:
 * - useUIStore: view state
 * - useInitStore: initialization state
 * - useWorkspaceStore: workspaces and folders
 * - useSessionStore: sessions
 * - useTemplateStore: templates and settings
 */
import { create } from 'zustand';
import type { Workspace, Folder, Session, Template, AppSettings, WorkspaceType } from '../types';
import { useUIStore, type ViewType } from './useUIStore';
import { useInitStore } from './useInitStore';
import { useWorkspaceStore } from './useWorkspaceStore';
import { useSessionStore } from './useSessionStore';
import { useTemplateStore } from './useTemplateStore';
import { initializeStoreSubscriptions } from './index';

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
  view: ViewType;

  // Actions
  initialize: () => Promise<void>;
  setOnboardingComplete: (complete: boolean) => void;

  // Workspace actions
  createWorkspace: (name: string, type: WorkspaceType) => Promise<Workspace>;
  selectWorkspace: (workspace: Workspace) => Promise<void>;

  // Folder actions
  createFolder: (name: string) => Promise<Folder>;
  selectFolder: (folder: Folder) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;

  // Session actions
  createSession: (audioPath: string, title?: string) => Promise<Session>;
  selectSession: (session: Session) => void;
  updateSession: (id: string, updates: Partial<Session>) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;

  // View actions
  setView: (view: ViewType) => void;

  // Template actions
  loadTemplates: (workspaceType?: WorkspaceType) => Promise<void>;
}

export const useAppStore = create<AppState>((set) => {
  // Initialize cross-store subscriptions
  initializeStoreSubscriptions();

  // Subscribe to individual stores to keep combined state in sync
  useInitStore.subscribe((state) => {
    set({
      initialized: state.initialized,
      onboardingComplete: state.onboardingComplete,
    });
  });

  useWorkspaceStore.subscribe((state) => {
    set({
      workspaces: state.workspaces,
      currentWorkspace: state.currentWorkspace,
      folders: state.folders,
      currentFolder: state.currentFolder,
    });
  });

  useSessionStore.subscribe((state) => {
    set({
      sessions: state.sessions,
      currentSession: state.currentSession,
    });
  });

  useTemplateStore.subscribe((state) => {
    set({
      templates: state.templates,
      settings: state.settings,
    });
  });

  useUIStore.subscribe((state) => {
    set({ view: state.view });
  });

  return {
    // Initial state from individual stores
    initialized: useInitStore.getState().initialized,
    onboardingComplete: useInitStore.getState().onboardingComplete,
    workspaces: useWorkspaceStore.getState().workspaces,
    currentWorkspace: useWorkspaceStore.getState().currentWorkspace,
    folders: useWorkspaceStore.getState().folders,
    currentFolder: useWorkspaceStore.getState().currentFolder,
    sessions: useSessionStore.getState().sessions,
    currentSession: useSessionStore.getState().currentSession,
    templates: useTemplateStore.getState().templates,
    settings: useTemplateStore.getState().settings,
    view: useUIStore.getState().view,

    // Delegate actions to individual stores
    initialize: () => useInitStore.getState().initialize(),
    setOnboardingComplete: (complete) => useInitStore.getState().setOnboardingComplete(complete),

    createWorkspace: async (name, type) => {
      const workspace = await useWorkspaceStore.getState().createWorkspace(name, type);
      useSessionStore.getState().clearSessions();
      return workspace;
    },

    selectWorkspace: async (workspace) => {
      await useWorkspaceStore.getState().selectWorkspace(workspace);
      useSessionStore.getState().clearSessions();
      useUIStore.getState().setView('list');
    },

    createFolder: (name) => useWorkspaceStore.getState().createFolder(name),

    selectFolder: async (folder) => {
      useWorkspaceStore.getState().selectFolder(folder);
      await useSessionStore.getState().loadSessions(folder.id);
      useUIStore.getState().setView('list');
    },

    deleteFolder: async (id) => {
      const currentFolder = useWorkspaceStore.getState().currentFolder;
      await useWorkspaceStore.getState().deleteFolder(id);
      if (currentFolder?.id === id) {
        useSessionStore.getState().clearSessions();
      }
    },

    createSession: async (audioPath, title) => {
      const currentFolder = useWorkspaceStore.getState().currentFolder;
      if (!currentFolder) throw new Error('No folder selected');
      return useSessionStore.getState().createSession(currentFolder.id, audioPath, title);
    },

    selectSession: (session) => {
      useSessionStore.getState().selectSession(session);
      useUIStore.getState().setView('session');
    },

    updateSession: (id, updates) => useSessionStore.getState().updateSession(id, updates),

    deleteSession: async (id) => {
      const currentSession = useSessionStore.getState().currentSession;
      await useSessionStore.getState().deleteSession(id);
      if (currentSession?.id === id) {
        useUIStore.getState().setView('list');
      }
    },

    setView: (view) => useUIStore.getState().setView(view),

    loadTemplates: (workspaceType) => useTemplateStore.getState().loadTemplates(workspaceType),
  };
});
