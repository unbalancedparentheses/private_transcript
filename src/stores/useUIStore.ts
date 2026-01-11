import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export type ViewType = 'list' | 'recording' | 'processing' | 'session' | 'settings';

interface UIState {
  view: ViewType;
  setView: (view: ViewType) => void;
}

export const useUIStore = create<UIState>()(
  subscribeWithSelector((set) => ({
    view: 'list',
    setView: (view) => set({ view }),
  }))
);
