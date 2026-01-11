import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';
import type { Workspace, Folder, Template, AppSettings } from '../types';
import { useWorkspaceStore } from './useWorkspaceStore';
import { useTemplateStore } from './useTemplateStore';

interface InitState {
  initialized: boolean;
  onboardingComplete: boolean;
  initialize: () => Promise<void>;
  setOnboardingComplete: (complete: boolean) => void;
}

export const useInitStore = create<InitState>()(
  subscribeWithSelector((set) => ({
    initialized: false,
    onboardingComplete: false,

    initialize: async () => {
      try {
        // Load workspaces
        const workspaces = await invoke<Workspace[]>('get_workspaces');
        useWorkspaceStore.setState({ workspaces });

        // Load settings
        const settings = await invoke<AppSettings>('get_settings');
        useTemplateStore.setState({ settings });

        // Check if models are ready
        let modelsReady = false;
        try {
          modelsReady = await invoke<boolean>('are_models_ready');
        } catch {
          modelsReady = false;
        }

        // Onboarding is complete if we have workspaces AND models are ready
        const onboardingComplete = workspaces.length > 0 && modelsReady;

        // Set current workspace if available
        if (workspaces.length > 0) {
          const currentWorkspace = workspaces[0];
          useWorkspaceStore.setState({ currentWorkspace });

          // Load folders for this workspace
          const folders = await invoke<Folder[]>('get_folders', {
            workspaceId: currentWorkspace.id,
          });
          useWorkspaceStore.setState({ folders });

          // Load templates for this workspace type
          const templates = await invoke<Template[]>('get_templates', {
            workspaceType: currentWorkspace.workspaceType,
          });
          useTemplateStore.setState({ templates });
        }

        set({
          initialized: true,
          onboardingComplete,
        });
      } catch (error) {
        console.error('Failed to initialize:', error);
        set({ initialized: true });
      }
    },

    setOnboardingComplete: (complete) => set({ onboardingComplete: complete }),
  }))
);
