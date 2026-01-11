import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';
import type { Template, AppSettings, WorkspaceType } from '../types';

interface TemplateState {
  templates: Template[];
  settings: AppSettings | null;
  loadTemplates: (workspaceType?: WorkspaceType) => Promise<void>;
  loadSettings: () => Promise<void>;
  setSettings: (settings: AppSettings | null) => void;
}

export const useTemplateStore = create<TemplateState>()(
  subscribeWithSelector((set) => ({
    templates: [],
    settings: null,

    loadTemplates: async (workspaceType) => {
      const templates = await invoke<Template[]>('get_templates', {
        workspaceType,
      });
      set({ templates });
    },

    loadSettings: async () => {
      const settings = await invoke<AppSettings>('get_settings');
      set({ settings });
    },

    setSettings: (settings) => set({ settings }),
  }))
);
