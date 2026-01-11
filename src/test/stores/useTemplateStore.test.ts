import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { useTemplateStore } from '../../stores/useTemplateStore';
import type { Template, AppSettings } from '../../types';

// Mock data
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

describe('useTemplateStore', () => {
  beforeEach(() => {
    // Reset store state
    useTemplateStore.setState({
      templates: [],
      settings: null,
    });
    vi.clearAllMocks();
  });

  describe('loadTemplates', () => {
    it('should load templates for a workspace type', async () => {
      vi.mocked(invoke).mockResolvedValueOnce([mockTemplate]);

      await useTemplateStore.getState().loadTemplates('therapy');

      expect(invoke).toHaveBeenCalledWith('get_templates', { workspaceType: 'therapy' });
      expect(useTemplateStore.getState().templates).toEqual([mockTemplate]);
    });

    it('should load all templates when no workspace type specified', async () => {
      const allTemplates = [
        mockTemplate,
        { ...mockTemplate, id: 'template-2', workspaceType: 'legal' as const },
      ];
      vi.mocked(invoke).mockResolvedValueOnce(allTemplates);

      await useTemplateStore.getState().loadTemplates();

      expect(invoke).toHaveBeenCalledWith('get_templates', { workspaceType: undefined });
      expect(useTemplateStore.getState().templates).toEqual(allTemplates);
    });

    it('should replace existing templates', async () => {
      useTemplateStore.setState({ templates: [mockTemplate] });
      const newTemplate = { ...mockTemplate, id: 'template-new' };
      vi.mocked(invoke).mockResolvedValueOnce([newTemplate]);

      await useTemplateStore.getState().loadTemplates('therapy');

      expect(useTemplateStore.getState().templates).toEqual([newTemplate]);
    });
  });

  describe('loadSettings', () => {
    it('should load settings from backend', async () => {
      vi.mocked(invoke).mockResolvedValueOnce(mockSettings);

      await useTemplateStore.getState().loadSettings();

      expect(invoke).toHaveBeenCalledWith('get_settings');
      expect(useTemplateStore.getState().settings).toEqual(mockSettings);
    });
  });

  describe('setSettings', () => {
    it('should update settings', () => {
      useTemplateStore.getState().setSettings(mockSettings);

      expect(useTemplateStore.getState().settings).toEqual(mockSettings);
    });

    it('should set settings to null', () => {
      useTemplateStore.setState({ settings: mockSettings });

      useTemplateStore.getState().setSettings(null);

      expect(useTemplateStore.getState().settings).toBeNull();
    });
  });
});
