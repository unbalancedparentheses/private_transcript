import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { useWorkspaceStore } from '../../stores/useWorkspaceStore';
import type { Workspace, Folder } from '../../types';

// Mock data
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
  name: 'Test Client',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  sessionCount: 0,
};

describe('useWorkspaceStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useWorkspaceStore.setState({
      workspaces: [],
      currentWorkspace: null,
      folders: [],
      currentFolder: null,
    });
    vi.clearAllMocks();
  });

  describe('loadWorkspaces', () => {
    it('should load workspaces and update state', async () => {
      vi.mocked(invoke).mockResolvedValueOnce([mockWorkspace]);

      const workspaces = await useWorkspaceStore.getState().loadWorkspaces();

      expect(invoke).toHaveBeenCalledWith('get_workspaces');
      expect(workspaces).toEqual([mockWorkspace]);
      expect(useWorkspaceStore.getState().workspaces).toEqual([mockWorkspace]);
    });

    it('should return empty array when no workspaces exist', async () => {
      vi.mocked(invoke).mockResolvedValueOnce([]);

      const workspaces = await useWorkspaceStore.getState().loadWorkspaces();

      expect(workspaces).toEqual([]);
      expect(useWorkspaceStore.getState().workspaces).toEqual([]);
    });
  });

  describe('createWorkspace', () => {
    it('should create a workspace and add it to state', async () => {
      vi.mocked(invoke).mockResolvedValueOnce(mockWorkspace);

      const workspace = await useWorkspaceStore.getState().createWorkspace('Test Workspace', 'therapy');

      expect(invoke).toHaveBeenCalledWith('create_workspace', {
        request: { name: 'Test Workspace', workspaceType: 'therapy' },
      });
      expect(workspace).toEqual(mockWorkspace);
      expect(useWorkspaceStore.getState().workspaces).toContain(mockWorkspace);
      expect(useWorkspaceStore.getState().currentWorkspace).toEqual(mockWorkspace);
    });

    it('should prepend new workspace to existing list', async () => {
      const existingWorkspace = { ...mockWorkspace, id: 'ws-0', name: 'Existing' };
      useWorkspaceStore.setState({ workspaces: [existingWorkspace] });
      vi.mocked(invoke).mockResolvedValueOnce(mockWorkspace);

      await useWorkspaceStore.getState().createWorkspace('Test Workspace', 'therapy');

      const { workspaces } = useWorkspaceStore.getState();
      expect(workspaces[0]).toEqual(mockWorkspace);
      expect(workspaces[1]).toEqual(existingWorkspace);
    });
  });

  describe('selectWorkspace', () => {
    it('should select workspace and load its folders', async () => {
      vi.mocked(invoke).mockResolvedValueOnce([mockFolder]);

      const folders = await useWorkspaceStore.getState().selectWorkspace(mockWorkspace);

      expect(invoke).toHaveBeenCalledWith('get_folders', { workspaceId: 'ws-1' });
      expect(folders).toEqual([mockFolder]);
      expect(useWorkspaceStore.getState().currentWorkspace).toEqual(mockWorkspace);
      expect(useWorkspaceStore.getState().folders).toEqual([mockFolder]);
      expect(useWorkspaceStore.getState().currentFolder).toBeNull();
    });
  });

  describe('createFolder', () => {
    it('should create a folder when workspace is selected', async () => {
      useWorkspaceStore.setState({ currentWorkspace: mockWorkspace });
      vi.mocked(invoke).mockResolvedValueOnce(mockFolder);

      const folder = await useWorkspaceStore.getState().createFolder('Test Client');

      expect(invoke).toHaveBeenCalledWith('create_folder', {
        request: { workspaceId: 'ws-1', name: 'Test Client' },
      });
      expect(folder).toEqual(mockFolder);
      expect(useWorkspaceStore.getState().folders).toContain(mockFolder);
    });

    it('should throw error when no workspace is selected', async () => {
      await expect(useWorkspaceStore.getState().createFolder('Test Client')).rejects.toThrow(
        'No workspace selected'
      );
    });
  });

  describe('selectFolder', () => {
    it('should update currentFolder', () => {
      useWorkspaceStore.getState().selectFolder(mockFolder);

      expect(useWorkspaceStore.getState().currentFolder).toEqual(mockFolder);
    });
  });

  describe('deleteFolder', () => {
    it('should delete folder and remove from state', async () => {
      useWorkspaceStore.setState({ folders: [mockFolder], currentFolder: mockFolder });
      vi.mocked(invoke).mockResolvedValueOnce(undefined);

      await useWorkspaceStore.getState().deleteFolder('folder-1');

      expect(invoke).toHaveBeenCalledWith('delete_folder', { id: 'folder-1' });
      expect(useWorkspaceStore.getState().folders).toEqual([]);
      expect(useWorkspaceStore.getState().currentFolder).toBeNull();
    });

    it('should not clear currentFolder if different folder is deleted', async () => {
      const otherFolder = { ...mockFolder, id: 'folder-2' };
      useWorkspaceStore.setState({ folders: [mockFolder, otherFolder], currentFolder: mockFolder });
      vi.mocked(invoke).mockResolvedValueOnce(undefined);

      await useWorkspaceStore.getState().deleteFolder('folder-2');

      expect(useWorkspaceStore.getState().currentFolder).toEqual(mockFolder);
    });
  });

  describe('clearFolderSelection', () => {
    it('should clear currentFolder', () => {
      useWorkspaceStore.setState({ currentFolder: mockFolder });

      useWorkspaceStore.getState().clearFolderSelection();

      expect(useWorkspaceStore.getState().currentFolder).toBeNull();
    });
  });
});
