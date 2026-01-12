import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OnboardingView } from './OnboardingView';

// Mock Tauri APIs
const mockInvoke = vi.fn();
const mockListen = vi.fn();

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: (...args: unknown[]) => mockListen(...args),
}));

// Mock app store
const mockCreateWorkspace = vi.fn();
const mockSetOnboardingComplete = vi.fn();

vi.mock('../../stores/appStore', () => ({
  useAppStore: () => ({
    createWorkspace: mockCreateWorkspace,
    setOnboardingComplete: mockSetOnboardingComplete,
  }),
}));

describe('OnboardingView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockResolvedValue([]);
    mockListen.mockResolvedValue(() => {});
  });

  describe('Welcome Step', () => {
    it('should render welcome screen initially', () => {
      render(<OnboardingView />);
      expect(screen.getByText('Welcome to Private Transcript')).toBeInTheDocument();
      expect(screen.getByText(/Your conversations stay on your device/)).toBeInTheDocument();
    });

    it('should show Get Started button', () => {
      render(<OnboardingView />);
      expect(screen.getByText('Get Started')).toBeInTheDocument();
    });

    it('should show privacy lock icon', () => {
      render(<OnboardingView />);
      expect(screen.getByText('🔒')).toBeInTheDocument();
    });

    it('should navigate to workspace step on Get Started click', () => {
      render(<OnboardingView />);
      fireEvent.click(screen.getByText('Get Started'));
      expect(screen.getByText('Choose your workspace type')).toBeInTheDocument();
    });
  });

  describe('Workspace Step', () => {
    it('should show workspace type options', () => {
      render(<OnboardingView />);
      fireEvent.click(screen.getByText('Get Started'));

      expect(screen.getByText('Therapy')).toBeInTheDocument();
      expect(screen.getByText('Legal')).toBeInTheDocument();
      expect(screen.getByText('Research')).toBeInTheDocument();
      expect(screen.getByText('General')).toBeInTheDocument();
    });

    it('should show workspace selection instructions', () => {
      render(<OnboardingView />);
      fireEvent.click(screen.getByText('Get Started'));

      expect(screen.getByText(/Select the type that best fits your needs/)).toBeInTheDocument();
    });

    it('should show workspace name input when type selected', () => {
      render(<OnboardingView />);
      fireEvent.click(screen.getByText('Get Started'));
      fireEvent.click(screen.getByText('General'));

      expect(screen.getByLabelText('Workspace Name')).toBeInTheDocument();
    });

    it('should pre-fill workspace name based on selected type', () => {
      render(<OnboardingView />);
      fireEvent.click(screen.getByText('Get Started'));
      fireEvent.click(screen.getByText('General'));

      const input = screen.getByLabelText('Workspace Name') as HTMLInputElement;
      expect(input.value).toBe('General');
    });

    it('should allow editing workspace name', () => {
      render(<OnboardingView />);
      fireEvent.click(screen.getByText('Get Started'));
      fireEvent.click(screen.getByText('General'));

      const input = screen.getByLabelText('Workspace Name');
      fireEvent.change(input, { target: { value: 'My Notes' } });

      expect((input as HTMLInputElement).value).toBe('My Notes');
    });

    it('should show Continue button when type selected', () => {
      render(<OnboardingView />);
      fireEvent.click(screen.getByText('Get Started'));
      fireEvent.click(screen.getByText('General'));

      expect(screen.getByText('Continue')).toBeInTheDocument();
    });

    it('should disable Continue button when workspace name is empty', () => {
      render(<OnboardingView />);
      fireEvent.click(screen.getByText('Get Started'));
      fireEvent.click(screen.getByText('General'));

      const input = screen.getByLabelText('Workspace Name');
      fireEvent.change(input, { target: { value: '' } });

      const continueButton = screen.getByText('Continue');
      expect(continueButton).toBeDisabled();
    });

    it('should show Back button when type selected', () => {
      render(<OnboardingView />);
      fireEvent.click(screen.getByText('Get Started'));
      fireEvent.click(screen.getByText('General'));

      expect(screen.getByText('Back')).toBeInTheDocument();
    });

    it('should clear selection on Back click', () => {
      render(<OnboardingView />);
      fireEvent.click(screen.getByText('Get Started'));
      fireEvent.click(screen.getByText('General'));
      fireEvent.click(screen.getByText('Back'));

      expect(screen.queryByLabelText('Workspace Name')).not.toBeInTheDocument();
    });
  });

  describe('Models Step', () => {
    beforeEach(() => {
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === 'get_available_whisper_models') {
          return Promise.resolve([
            { id: 'whisper-base', name: 'Whisper Base', description: 'Fast and accurate', sizeBytes: 100000000 },
            { id: 'whisper-large', name: 'Whisper Large', description: 'Most accurate', sizeBytes: 500000000 },
          ]);
        }
        if (cmd === 'get_available_llm_models') {
          return Promise.resolve([
            { id: 'llama-3.2-3b', name: 'Llama 3.2 3B', description: 'Efficient', sizeBytes: 2000000000 },
            { id: 'llama-3.2-8b', name: 'Llama 3.2 8B', description: 'More capable', sizeBytes: 5000000000 },
          ]);
        }
        if (cmd === 'get_downloaded_models') {
          return Promise.resolve([]);
        }
        if (cmd === 'are_models_ready') {
          return Promise.resolve(false);
        }
        return Promise.resolve(null);
      });
    });

    it('should navigate to models step after workspace selection', async () => {
      render(<OnboardingView />);
      fireEvent.click(screen.getByText('Get Started'));
      fireEvent.click(screen.getByText('General'));
      fireEvent.click(screen.getByText('Continue'));

      await waitFor(() => {
        expect(screen.getByText('Download AI Models')).toBeInTheDocument();
      });
    });

    it('should load available models', async () => {
      render(<OnboardingView />);
      fireEvent.click(screen.getByText('Get Started'));
      fireEvent.click(screen.getByText('General'));
      fireEvent.click(screen.getByText('Continue'));

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith('get_available_whisper_models');
        expect(mockInvoke).toHaveBeenCalledWith('get_available_llm_models');
      });
    });

    it('should display whisper model options', async () => {
      render(<OnboardingView />);
      fireEvent.click(screen.getByText('Get Started'));
      fireEvent.click(screen.getByText('General'));
      fireEvent.click(screen.getByText('Continue'));

      await waitFor(() => {
        expect(screen.getByText('Whisper Base')).toBeInTheDocument();
        expect(screen.getByText('Whisper Large')).toBeInTheDocument();
      });
    });

    it('should display LLM model options', async () => {
      render(<OnboardingView />);
      fireEvent.click(screen.getByText('Get Started'));
      fireEvent.click(screen.getByText('General'));
      fireEvent.click(screen.getByText('Continue'));

      await waitFor(() => {
        expect(screen.getByText('Llama 3.2 3B')).toBeInTheDocument();
        expect(screen.getByText('Llama 3.2 8B')).toBeInTheDocument();
      });
    });

    it('should show model descriptions', async () => {
      render(<OnboardingView />);
      fireEvent.click(screen.getByText('Get Started'));
      fireEvent.click(screen.getByText('General'));
      fireEvent.click(screen.getByText('Continue'));

      await waitFor(() => {
        expect(screen.getByText('Fast and accurate')).toBeInTheDocument();
        expect(screen.getByText('Efficient')).toBeInTheDocument();
      });
    });

    it('should show Download Models button', async () => {
      render(<OnboardingView />);
      fireEvent.click(screen.getByText('Get Started'));
      fireEvent.click(screen.getByText('General'));
      fireEvent.click(screen.getByText('Continue'));

      await waitFor(() => {
        expect(screen.getByText('Download Models')).toBeInTheDocument();
      });
    });

    it('should show section headers', async () => {
      render(<OnboardingView />);
      fireEvent.click(screen.getByText('Get Started'));
      fireEvent.click(screen.getByText('General'));
      fireEvent.click(screen.getByText('Continue'));

      await waitFor(() => {
        expect(screen.getByText('Speech Recognition (Whisper)')).toBeInTheDocument();
        expect(screen.getByText('Note Generation (LLM)')).toBeInTheDocument();
      });
    });

    it('should show offline message', async () => {
      render(<OnboardingView />);
      fireEvent.click(screen.getByText('Get Started'));
      fireEvent.click(screen.getByText('General'));
      fireEvent.click(screen.getByText('Continue'));

      await waitFor(() => {
        expect(screen.getByText(/No internet required after download/)).toBeInTheDocument();
      });
    });
  });

  describe('Ready Step', () => {
    beforeEach(() => {
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === 'get_available_whisper_models') {
          return Promise.resolve([
            { id: 'whisper-base', name: 'Whisper Base', description: 'Fast', sizeBytes: 100000000 },
          ]);
        }
        if (cmd === 'get_available_llm_models') {
          return Promise.resolve([
            { id: 'llama-3.2-3b', name: 'Llama 3.2 3B', description: 'Efficient', sizeBytes: 2000000000 },
          ]);
        }
        if (cmd === 'get_downloaded_models') {
          return Promise.resolve(['whisper-base', 'llama-3.2-3b']);
        }
        if (cmd === 'are_models_ready') {
          return Promise.resolve(true);
        }
        return Promise.resolve(null);
      });
    });

    it('should auto-navigate to ready step when models already downloaded', async () => {
      render(<OnboardingView />);
      fireEvent.click(screen.getByText('Get Started'));
      fireEvent.click(screen.getByText('General'));
      fireEvent.click(screen.getByText('Continue'));

      // Should show ready step after a short delay
      await waitFor(() => {
        expect(screen.getByText("You're all set!")).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should show privacy features on ready step', async () => {
      render(<OnboardingView />);
      fireEvent.click(screen.getByText('Get Started'));
      fireEvent.click(screen.getByText('General'));
      fireEvent.click(screen.getByText('Continue'));

      await waitFor(() => {
        expect(screen.getByText('100% Local Processing')).toBeInTheDocument();
        expect(screen.getByText('Data stored on your device')).toBeInTheDocument();
        expect(screen.getByText('No cloud, no tracking')).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should show finish button', async () => {
      render(<OnboardingView />);
      fireEvent.click(screen.getByText('Get Started'));
      fireEvent.click(screen.getByText('General'));
      fireEvent.click(screen.getByText('Continue'));

      await waitFor(() => {
        expect(screen.getByText('Start Using Private Transcript')).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should complete onboarding on finish', async () => {
      render(<OnboardingView />);
      fireEvent.click(screen.getByText('Get Started'));
      fireEvent.click(screen.getByText('General'));
      fireEvent.click(screen.getByText('Continue'));

      await waitFor(() => {
        expect(screen.getByText('Start Using Private Transcript')).toBeInTheDocument();
      }, { timeout: 2000 });

      fireEvent.click(screen.getByText('Start Using Private Transcript'));

      await waitFor(() => {
        expect(mockCreateWorkspace).toHaveBeenCalledWith('General', 'general');
        expect(mockSetOnboardingComplete).toHaveBeenCalledWith(true);
      });
    });
  });

  describe('Format Bytes Helper', () => {
    it('should display model sizes formatted', async () => {
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === 'get_available_whisper_models') {
          return Promise.resolve([
            { id: 'whisper-base', name: 'Whisper Base', description: 'Fast', sizeBytes: 100000000 },
          ]);
        }
        if (cmd === 'get_available_llm_models') {
          return Promise.resolve([
            { id: 'llama-3.2-3b', name: 'Llama 3.2 3B', description: 'Efficient', sizeBytes: 2147483648 },
          ]);
        }
        if (cmd === 'get_downloaded_models') {
          return Promise.resolve([]);
        }
        if (cmd === 'are_models_ready') {
          return Promise.resolve(false);
        }
        return Promise.resolve(null);
      });

      render(<OnboardingView />);
      fireEvent.click(screen.getByText('Get Started'));
      fireEvent.click(screen.getByText('General'));
      fireEvent.click(screen.getByText('Continue'));

      await waitFor(() => {
        expect(screen.getByText('95.4 MB')).toBeInTheDocument();
        expect(screen.getByText('2 GB')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle model loading errors gracefully', async () => {
      mockInvoke.mockRejectedValue(new Error('Network error'));

      render(<OnboardingView />);
      fireEvent.click(screen.getByText('Get Started'));
      fireEvent.click(screen.getByText('General'));
      fireEvent.click(screen.getByText('Continue'));

      // Should not crash
      await waitFor(() => {
        expect(screen.getByText('Download AI Models')).toBeInTheDocument();
      });
    });
  });
});
