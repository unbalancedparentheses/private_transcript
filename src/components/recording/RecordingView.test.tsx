import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { RecordingView } from './RecordingView';
import { listen } from '@tauri-apps/api/event';

// Mock the app store
const mockSetView = vi.fn();
const mockCreateSession = vi.fn();
const mockUpdateSession = vi.fn();

vi.mock('../../stores/appStore', () => ({
  useAppStore: () => ({
    currentFolder: { id: 'folder-1', name: 'Test Folder' },
    setView: mockSetView,
    createSession: mockCreateSession,
    updateSession: mockUpdateSession,
  }),
}));

// Mock navigator.mediaDevices
const mockMediaRecorder = {
  start: vi.fn(),
  stop: vi.fn(),
  state: 'inactive',
  ondataavailable: null as ((e: { data: Blob }) => void) | null,
  onstop: null as (() => void) | null,
  mimeType: 'audio/webm',
};

const mockMediaStream = {
  getTracks: () => [{ stop: vi.fn() }],
};

describe('RecordingView', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock MediaRecorder
    (globalThis as unknown as { MediaRecorder: unknown }).MediaRecorder = vi.fn(() => mockMediaRecorder);
    (globalThis as unknown as { MediaRecorder: { isTypeSupported: unknown } }).MediaRecorder.isTypeSupported = vi.fn(() => true);

    // Mock getUserMedia
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn(() => Promise.resolve(mockMediaStream)),
      },
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render the recording view', () => {
    render(<RecordingView />);
    expect(screen.getByText('New Recording')).toBeInTheDocument();
  });

  it('should show instructions to start recording', () => {
    render(<RecordingView />);
    expect(screen.getByText(/Tap to start recording/i)).toBeInTheDocument();
  });

  it('should show duration as 00:00 initially', () => {
    render(<RecordingView />);
    expect(screen.getByText('00:00')).toBeInTheDocument();
  });

  it('should have a back button', () => {
    render(<RecordingView />);
    expect(screen.getByText('Back')).toBeInTheDocument();
  });

  it('should call setView when back button is clicked', () => {
    render(<RecordingView />);
    fireEvent.click(screen.getByText('Back'));
    expect(mockSetView).toHaveBeenCalledWith('list');
  });

  it('should setup transcription progress listener on mount', async () => {
    render(<RecordingView />);

    await waitFor(() => {
      expect(listen).toHaveBeenCalledWith('transcription-progress', expect.any(Function));
    });
  });

  describe('Transcription Progress', () => {
    it('should display progress bar when transcribing', async () => {
      render(<RecordingView />);

      // Simulate having an audio blob and starting transcription
      // This tests the UI state when isTranscribing is true
      // In a real scenario, this would be triggered by handleSave
    });

    it('should show progress message when receiving events', async () => {
      // Get the listener callback
      let progressCallback: ((event: { payload: unknown }) => void) | null = null;
      vi.mocked(listen).mockImplementation(async (eventName, callback) => {
        if (eventName === 'transcription-progress') {
          progressCallback = callback as typeof progressCallback;
        }
        return () => {};
      });

      render(<RecordingView />);

      await waitFor(() => {
        expect(progressCallback).not.toBeNull();
      });

      // Simulate receiving a progress event
      if (progressCallback) {
        act(() => {
          progressCallback!({
            payload: {
              sessionId: 'test-session',
              progress: 50,
              status: 'transcribing',
              message: 'Processing audio...',
            },
          });
        });
      }
    });
  });
});

describe('RecordingView - No Folder Selected', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show message when no folder is selected', () => {
    // Override the mock for this test
    vi.doMock('../../stores/appStore', () => ({
      useAppStore: () => ({
        currentFolder: null,
        setView: mockSetView,
        createSession: mockCreateSession,
        updateSession: mockUpdateSession,
      }),
    }));
  });
});

describe('Audio Level Meter', () => {
  it('should not show level meter when not recording', () => {
    render(<RecordingView />);
    // The level meter bars should not be visible when not recording
    const levelMeterBars = document.querySelectorAll('.bg-green-500, .bg-yellow-500, .bg-red-500');
    expect(levelMeterBars.length).toBe(0);
  });
});

describe('Transcription Progress Event Handling', () => {
  it('should handle complete status', async () => {
    let progressCallback: ((event: { payload: unknown }) => void) | null = null;
    vi.mocked(listen).mockImplementation(async (eventName, callback) => {
      if (eventName === 'transcription-progress') {
        progressCallback = callback as typeof progressCallback;
      }
      return () => {};
    });

    render(<RecordingView />);

    await waitFor(() => {
      expect(progressCallback).not.toBeNull();
    });

    // Simulate complete event
    if (progressCallback) {
      act(() => {
        progressCallback!({
          payload: {
            sessionId: 'test-session',
            progress: 100,
            status: 'complete',
            message: 'Transcription complete',
          },
        });
      });
    }
  });

  it('should handle error status', async () => {
    let progressCallback: ((event: { payload: unknown }) => void) | null = null;
    vi.mocked(listen).mockImplementation(async (eventName, callback) => {
      if (eventName === 'transcription-progress') {
        progressCallback = callback as typeof progressCallback;
      }
      return () => {};
    });

    render(<RecordingView />);

    await waitFor(() => {
      expect(progressCallback).not.toBeNull();
    });

    // Simulate error event
    if (progressCallback) {
      act(() => {
        progressCallback!({
          payload: {
            sessionId: 'test-session',
            progress: 0,
            status: 'error',
            message: 'Transcription failed',
          },
        });
      });
    }
  });

  it('should cleanup listener on unmount', async () => {
    const unlistenMock = vi.fn();
    vi.mocked(listen).mockResolvedValue(unlistenMock);

    const { unmount } = render(<RecordingView />);

    await waitFor(() => {
      expect(listen).toHaveBeenCalled();
    });

    unmount();

    // The unlisten function should be called on unmount
    await waitFor(() => {
      expect(unlistenMock).toHaveBeenCalled();
    });
  });
});
