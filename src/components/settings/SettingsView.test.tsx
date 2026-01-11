import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SettingsView } from './SettingsView';

// Mock app store
const mockSetView = vi.fn();

vi.mock('../../stores/appStore', () => ({
  useAppStore: () => ({
    setView: mockSetView,
  }),
}));

// Mock Tauri API
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn((command: string) => {
    if (command === 'check_ollama_status') {
      return Promise.resolve({ connected: true, models: ['llama2', 'mistral'], error: null });
    }
    if (command === 'get_available_whisper_models') {
      return Promise.resolve([
        { id: 'whisper-small', name: 'Small', description: 'Fast', sizeBytes: 100000000 },
      ]);
    }
    if (command === 'get_available_llm_models') {
      return Promise.resolve([
        { id: 'llama-7b', name: 'LLaMA 7B', description: 'Medium', sizeBytes: 4000000000 },
      ]);
    }
    if (command === 'get_downloaded_models') {
      return Promise.resolve(['whisper-small']);
    }
    if (command === 'get_loaded_whisper_model') {
      return Promise.resolve('whisper-small');
    }
    if (command === 'get_loaded_llm_model') {
      return Promise.resolve(null);
    }
    if (command === 'get_models_total_size') {
      return Promise.resolve(100000000);
    }
    return Promise.resolve(null);
  }),
}));

// Mock Tauri event API
vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('SettingsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Navigation', () => {
    it('should render settings header', () => {
      render(<SettingsView />);
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('should have back button', () => {
      render(<SettingsView />);
      const backButton = screen.getByRole('button', { name: '' });
      expect(backButton).toBeInTheDocument();
    });

    it('should navigate back when back button is clicked', () => {
      render(<SettingsView />);
      const buttons = screen.getAllByRole('button');
      // First button is the back button
      fireEvent.click(buttons[0]);
      expect(mockSetView).toHaveBeenCalledWith('list');
    });
  });

  describe('Tabs', () => {
    it('should render all tabs', () => {
      render(<SettingsView />);
      expect(screen.getByText('Models')).toBeInTheDocument();
      expect(screen.getByText('General')).toBeInTheDocument();
      expect(screen.getByText('About')).toBeInTheDocument();
    });

    it('should show Models tab content by default', async () => {
      render(<SettingsView />);
      await waitFor(() => {
        expect(screen.getByText('Model Manager')).toBeInTheDocument();
      });
    });

    it('should switch to General tab', async () => {
      render(<SettingsView />);
      fireEvent.click(screen.getByText('General'));
      await waitFor(() => {
        expect(screen.getByText('General Settings')).toBeInTheDocument();
      });
    });

    it('should switch to About tab', () => {
      render(<SettingsView />);
      fireEvent.click(screen.getByText('About'));
      expect(screen.getByText('About Private Transcript')).toBeInTheDocument();
    });
  });

  describe('General Settings', () => {
    beforeEach(() => {
      render(<SettingsView />);
      fireEvent.click(screen.getByText('General'));
    });

    it('should show Ollama connection section', async () => {
      await waitFor(() => {
        expect(screen.getByText('Ollama Connection')).toBeInTheDocument();
      });
    });

    it('should show appearance section', () => {
      expect(screen.getByText('Appearance')).toBeInTheDocument();
    });

    it('should show export section', () => {
      expect(screen.getByText('Export')).toBeInTheDocument();
    });

    it('should show developer section', () => {
      expect(screen.getByText('Developer')).toBeInTheDocument();
    });

    it('should have theme options', () => {
      expect(screen.getByText('Light')).toBeInTheDocument();
      expect(screen.getByText('Dark')).toBeInTheDocument();
      expect(screen.getByText('System')).toBeInTheDocument();
    });

    it('should have export format options', () => {
      expect(screen.getByText('MARKDOWN')).toBeInTheDocument();
      expect(screen.getByText('PDF')).toBeInTheDocument();
      expect(screen.getByText('DOCX')).toBeInTheDocument();
    });
  });

  describe('About Section', () => {
    beforeEach(() => {
      render(<SettingsView />);
      fireEvent.click(screen.getByText('About'));
    });

    it('should show privacy info', () => {
      expect(screen.getByText('100% Private')).toBeInTheDocument();
    });

    it('should show offline capability info', () => {
      expect(screen.getByText('No Cloud Required')).toBeInTheDocument();
    });

    it('should show open source info', () => {
      expect(screen.getByText('Powered by Open Source')).toBeInTheDocument();
    });

    it('should show version info', () => {
      expect(screen.getByText('Version 1.0.0')).toBeInTheDocument();
    });
  });
});
