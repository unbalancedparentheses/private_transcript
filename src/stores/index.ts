// Store exports
export { useUIStore, type ViewType } from './useUIStore';
export { useInitStore } from './useInitStore';
export { useWorkspaceStore } from './useWorkspaceStore';
export { useSessionStore } from './useSessionStore';
export { useTemplateStore } from './useTemplateStore';
export { useChatStore } from './useChatStore';

// Cross-store subscriptions
import { useWorkspaceStore } from './useWorkspaceStore';
import { useSessionStore } from './useSessionStore';
import { useTemplateStore } from './useTemplateStore';
import { useUIStore } from './useUIStore';
import { invoke } from '@tauri-apps/api/core';
import type { Template, Folder, Workspace, Session } from '../types';

// Set up subscriptions for cross-store communication
let subscriptionsInitialized = false;

export function initializeStoreSubscriptions() {
  if (subscriptionsInitialized) return;
  subscriptionsInitialized = true;

  // When folder selection changes, load sessions for that folder
  useWorkspaceStore.subscribe(
    (state) => state.currentFolder,
    async (currentFolder: Folder | null, previousFolder: Folder | null) => {
      if (currentFolder && currentFolder.id !== previousFolder?.id) {
        await useSessionStore.getState().loadSessions(currentFolder.id);
        useUIStore.getState().setView('list');
      } else if (!currentFolder && previousFolder) {
        useSessionStore.getState().clearSessions();
      }
    }
  );

  // When workspace changes, load templates for that workspace type
  useWorkspaceStore.subscribe(
    (state) => state.currentWorkspace,
    async (currentWorkspace: Workspace | null, previousWorkspace: Workspace | null) => {
      if (currentWorkspace && currentWorkspace.id !== previousWorkspace?.id) {
        const templates = await invoke<Template[]>('get_templates', {
          workspaceType: currentWorkspace.workspaceType,
        });
        useTemplateStore.setState({ templates });
        // Clear sessions when workspace changes
        useSessionStore.getState().clearSessions();
        useUIStore.getState().setView('list');
      }
    }
  );

  // When session is deleted and it was the current one, go back to list view
  useSessionStore.subscribe(
    (state) => state.currentSession,
    (currentSession: Session | null, previousSession: Session | null) => {
      if (!currentSession && previousSession) {
        const currentView = useUIStore.getState().view;
        if (currentView === 'session') {
          useUIStore.getState().setView('list');
        }
      }
    }
  );
}
