import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore, ViewType } from '../../stores/useUIStore';

describe('useUIStore', () => {
  beforeEach(() => {
    // Reset to default state
    useUIStore.setState({ view: 'list' });
  });

  describe('initial state', () => {
    it('should have list as default view', () => {
      expect(useUIStore.getState().view).toBe('list');
    });
  });

  describe('setView', () => {
    it('should update view to recording', () => {
      useUIStore.getState().setView('recording');
      expect(useUIStore.getState().view).toBe('recording');
    });

    it('should update view to processing', () => {
      useUIStore.getState().setView('processing');
      expect(useUIStore.getState().view).toBe('processing');
    });

    it('should update view to session', () => {
      useUIStore.getState().setView('session');
      expect(useUIStore.getState().view).toBe('session');
    });

    it('should update view to settings', () => {
      useUIStore.getState().setView('settings');
      expect(useUIStore.getState().view).toBe('settings');
    });

    const allViews: ViewType[] = ['list', 'recording', 'processing', 'session', 'settings'];

    it('should cycle through all views', () => {
      allViews.forEach((view) => {
        useUIStore.getState().setView(view);
        expect(useUIStore.getState().view).toBe(view);
      });
    });
  });
});
