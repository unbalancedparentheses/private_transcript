import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { useInitStore } from '../../stores/useInitStore';
import { useWorkspaceStore } from '../../stores/useWorkspaceStore';
import { useTemplateStore } from '../../stores/useTemplateStore';
import type { Workspace, Folder, Template, AppSettings } from '../../types';

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

const mockTemplate: Template = {
  id: 'template-1',
  name: 'Progress Note',
  workspaceType: 'therapy',
  prompt: 'Generate a progress note from {transcript}',
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

describe('useInitStore', () => {
  beforeEach(() => {
    // Reset all stores
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
    useTemplateStore.setState({
      templates: [],
      settings: null,
    });
    vi.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize with existing workspace and models ready', async () => {
      vi.mocked(invoke)
        .mockResolvedValueOnce([mockWorkspace]) // get_workspaces
        .mockResolvedValueOnce(mockSettings) // get_settings
        .mockResolvedValueOnce(true) // are_models_ready
        .mockResolvedValueOnce([mockFolder]) // get_folders
        .mockResolvedValueOnce([mockTemplate]); // get_templates

      await useInitStore.getState().initialize();

      expect(useInitStore.getState().initialized).toBe(true);
      expect(useInitStore.getState().onboardingComplete).toBe(true);
      expect(useWorkspaceStore.getState().workspaces).toEqual([mockWorkspace]);
      expect(useWorkspaceStore.getState().currentWorkspace).toEqual(mockWorkspace);
      expect(useWorkspaceStore.getState().folders).toEqual([mockFolder]);
      expect(useTemplateStore.getState().settings).toEqual(mockSettings);
      expect(useTemplateStore.getState().templates).toEqual([mockTemplate]);
    });

    it('should mark onboarding incomplete when no workspaces', async () => {
      vi.mocked(invoke)
        .mockResolvedValueOnce([]) // get_workspaces - empty
        .mockResolvedValueOnce(mockSettings) // get_settings
        .mockResolvedValueOnce(true); // are_models_ready

      await useInitStore.getState().initialize();

      expect(useInitStore.getState().initialized).toBe(true);
      expect(useInitStore.getState().onboardingComplete).toBe(false);
    });

    it('should mark onboarding incomplete when models not ready', async () => {
      vi.mocked(invoke)
        .mockResolvedValueOnce([mockWorkspace]) // get_workspaces
        .mockResolvedValueOnce(mockSettings) // get_settings
        .mockResolvedValueOnce(false) // are_models_ready - not ready
        .mockResolvedValueOnce([mockFolder]) // get_folders
        .mockResolvedValueOnce([mockTemplate]); // get_templates

      await useInitStore.getState().initialize();

      expect(useInitStore.getState().initialized).toBe(true);
      expect(useInitStore.getState().onboardingComplete).toBe(false);
    });

    it('should handle are_models_ready error gracefully', async () => {
      vi.mocked(invoke)
        .mockResolvedValueOnce([mockWorkspace]) // get_workspaces
        .mockResolvedValueOnce(mockSettings) // get_settings
        .mockRejectedValueOnce(new Error('Models not available')) // are_models_ready
        .mockResolvedValueOnce([mockFolder]) // get_folders
        .mockResolvedValueOnce([mockTemplate]); // get_templates

      await useInitStore.getState().initialize();

      expect(useInitStore.getState().initialized).toBe(true);
      expect(useInitStore.getState().onboardingComplete).toBe(false);
    });

    it('should handle initialization error and still set initialized', async () => {
      vi.mocked(invoke).mockRejectedValue(new Error('Failed'));

      await useInitStore.getState().initialize();

      expect(useInitStore.getState().initialized).toBe(true);
      expect(useInitStore.getState().onboardingComplete).toBe(false);
    });
  });

  describe('setOnboardingComplete', () => {
    it('should update onboardingComplete to true', () => {
      useInitStore.getState().setOnboardingComplete(true);
      expect(useInitStore.getState().onboardingComplete).toBe(true);
    });

    it('should update onboardingComplete to false', () => {
      useInitStore.setState({ onboardingComplete: true });
      useInitStore.getState().setOnboardingComplete(false);
      expect(useInitStore.getState().onboardingComplete).toBe(false);
    });
  });
});
