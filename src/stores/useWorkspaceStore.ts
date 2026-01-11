import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';
import type { Workspace, Folder, WorkspaceType } from '../types';

interface WorkspaceState {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  folders: Folder[];
  currentFolder: Folder | null;

  loadWorkspaces: () => Promise<Workspace[]>;
  createWorkspace: (name: string, type: WorkspaceType) => Promise<Workspace>;
  selectWorkspace: (workspace: Workspace) => Promise<Folder[]>;
  setCurrentWorkspace: (workspace: Workspace | null) => void;

  loadFolders: (workspaceId: string) => Promise<Folder[]>;
  createFolder: (name: string) => Promise<Folder>;
  selectFolder: (folder: Folder) => void;
  deleteFolder: (id: string) => Promise<void>;
  clearFolderSelection: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  subscribeWithSelector((set, get) => ({
    workspaces: [],
    currentWorkspace: null,
    folders: [],
    currentFolder: null,

    loadWorkspaces: async () => {
      const workspaces = await invoke<Workspace[]>('get_workspaces');
      set({ workspaces });
      return workspaces;
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
      }));
      return workspace;
    },

    selectWorkspace: async (workspace) => {
      const folders = await invoke<Folder[]>('get_folders', {
        workspaceId: workspace.id,
      });
      set({
        currentWorkspace: workspace,
        folders,
        currentFolder: null,
      });
      return folders;
    },

    setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),

    loadFolders: async (workspaceId) => {
      const folders = await invoke<Folder[]>('get_folders', { workspaceId });
      set({ folders });
      return folders;
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

    selectFolder: (folder) => {
      set({ currentFolder: folder });
    },

    deleteFolder: async (id) => {
      await invoke('delete_folder', { id });
      const { currentFolder } = get();
      set((state) => ({
        folders: state.folders.filter((f) => f.id !== id),
        currentFolder: currentFolder?.id === id ? null : currentFolder,
      }));
    },

    clearFolderSelection: () => set({ currentFolder: null }),
  }))
);
