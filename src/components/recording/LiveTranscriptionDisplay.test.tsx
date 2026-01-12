import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { LiveTranscriptionDisplay } from './LiveTranscriptionDisplay';

// Mock listen function with event simulation capability
type EventCallback = (event: { payload: unknown }) => void;
const eventListeners: Record<string, EventCallback[]> = {};

const mockListen = vi.fn().mockImplementation((eventName: string, callback: EventCallback) => {
  if (!eventListeners[eventName]) {
    eventListeners[eventName] = [];
  }
  eventListeners[eventName].push(callback);
  return Promise.resolve(() => {
    const index = eventListeners[eventName].indexOf(callback);
    if (index > -1) {
      eventListeners[eventName].splice(index, 1);
    }
  });
});

// Helper to emit events
const emitEvent = (eventName: string, payload: unknown) => {
  if (eventListeners[eventName]) {
    eventListeners[eventName].forEach((cb) => cb({ payload }));
  }
};

vi.mock('@tauri-apps/api/event', () => ({
  listen: (...args: unknown[]) => mockListen(...args),
}));

describe('LiveTranscriptionDisplay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear event listeners
    Object.keys(eventListeners).forEach((key) => {
      eventListeners[key] = [];
    });
  });

  describe('Initial State', () => {
    it('should render with active state', () => {
      render(<LiveTranscriptionDisplay sessionId="test-session" isActive={true} />);
      expect(screen.getByText('Live Transcription')).toBeInTheDocument();
    });

    it('should render with paused state', () => {
      render(<LiveTranscriptionDisplay sessionId="test-session" isActive={false} />);
      expect(screen.getByText('Transcription Paused')).toBeInTheDocument();
    });

    it('should show listening message when active and no content', () => {
      render(<LiveTranscriptionDisplay sessionId="test-session" isActive={true} />);
      expect(screen.getByText('Listening... speak to see live transcription')).toBeInTheDocument();
    });

    it('should show start recording message when not active', () => {
      render(<LiveTranscriptionDisplay sessionId="test-session" isActive={false} />);
      expect(screen.getByText('Start recording to see live transcription')).toBeInTheDocument();
    });

    it('should show active indicator dot', () => {
      const { container } = render(<LiveTranscriptionDisplay sessionId="test-session" isActive={true} />);
      const dot = container.querySelector('.bg-green-500.animate-pulse');
      expect(dot).toBeInTheDocument();
    });

    it('should show inactive indicator dot when paused', () => {
      const { container } = render(<LiveTranscriptionDisplay sessionId="test-session" isActive={false} />);
      const dot = container.querySelector('.bg-gray-400');
      expect(dot).toBeInTheDocument();
    });
  });

  describe('Event Listeners', () => {
    it('should set up event listeners when active', async () => {
      render(<LiveTranscriptionDisplay sessionId="test-session" isActive={true} />);

      await waitFor(() => {
        expect(mockListen).toHaveBeenCalledWith('live-transcription', expect.any(Function));
        expect(mockListen).toHaveBeenCalledWith('transcription-error', expect.any(Function));
      });
    });

    it('should not set up listeners when not active', async () => {
      render(<LiveTranscriptionDisplay sessionId="test-session" isActive={false} />);

      // Give time for effect to run
      await new Promise((r) => setTimeout(r, 50));

      expect(mockListen).not.toHaveBeenCalled();
    });
  });

  describe('Transcription Events', () => {
    it('should display tentative text', async () => {
      render(<LiveTranscriptionDisplay sessionId="test-session" isActive={true} />);

      await waitFor(() => {
        expect(mockListen).toHaveBeenCalledWith('live-transcription', expect.any(Function));
      });

      act(() => {
        emitEvent('live-transcription', {
          sessionId: 'test-session',
          text: 'Hello world',
          isFinal: false,
          timestamp: Date.now(),
        });
      });

      expect(screen.getByText('Hello world')).toBeInTheDocument();
    });

    it('should display confirmed text', async () => {
      render(<LiveTranscriptionDisplay sessionId="test-session" isActive={true} />);

      await waitFor(() => {
        expect(mockListen).toHaveBeenCalledWith('live-transcription', expect.any(Function));
      });

      act(() => {
        emitEvent('live-transcription', {
          sessionId: 'test-session',
          text: 'Confirmed text',
          isFinal: true,
          timestamp: Date.now(),
        });
      });

      expect(screen.getByText(/Confirmed text/)).toBeInTheDocument();
    });

    it('should clear tentative text after confirmation', async () => {
      render(<LiveTranscriptionDisplay sessionId="test-session" isActive={true} />);

      await waitFor(() => {
        expect(mockListen).toHaveBeenCalledWith('live-transcription', expect.any(Function));
      });

      // First send tentative
      act(() => {
        emitEvent('live-transcription', {
          sessionId: 'test-session',
          text: 'Tentative',
          isFinal: false,
          timestamp: Date.now(),
        });
      });

      expect(screen.getByText('Tentative')).toBeInTheDocument();

      // Then confirm different text
      act(() => {
        emitEvent('live-transcription', {
          sessionId: 'test-session',
          text: 'Final text',
          isFinal: true,
          timestamp: Date.now(),
        });
      });

      expect(screen.getByText(/Final text/)).toBeInTheDocument();
    });

    it('should ignore events from other sessions', async () => {
      render(<LiveTranscriptionDisplay sessionId="test-session" isActive={true} />);

      await waitFor(() => {
        expect(mockListen).toHaveBeenCalledWith('live-transcription', expect.any(Function));
      });

      act(() => {
        emitEvent('live-transcription', {
          sessionId: 'other-session',
          text: 'Should not appear',
          isFinal: false,
          timestamp: Date.now(),
        });
      });

      expect(screen.queryByText('Should not appear')).not.toBeInTheDocument();
    });

    it('should accumulate multiple confirmed segments', async () => {
      render(<LiveTranscriptionDisplay sessionId="test-session" isActive={true} />);

      await waitFor(() => {
        expect(mockListen).toHaveBeenCalledWith('live-transcription', expect.any(Function));
      });

      act(() => {
        emitEvent('live-transcription', {
          sessionId: 'test-session',
          text: 'First segment',
          isFinal: true,
          timestamp: Date.now(),
        });
      });

      act(() => {
        emitEvent('live-transcription', {
          sessionId: 'test-session',
          text: 'Second segment',
          isFinal: true,
          timestamp: Date.now(),
        });
      });

      expect(screen.getByText(/First segment Second segment/)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error message', async () => {
      render(<LiveTranscriptionDisplay sessionId="test-session" isActive={true} />);

      await waitFor(() => {
        expect(mockListen).toHaveBeenCalledWith('transcription-error', expect.any(Function));
      });

      act(() => {
        emitEvent('transcription-error', {
          sessionId: 'test-session',
          message: 'Transcription failed',
        });
      });

      expect(screen.getByText('Error:')).toBeInTheDocument();
      expect(screen.getByText(/Transcription failed/)).toBeInTheDocument();
    });

    it('should call onError callback when error occurs', async () => {
      const onError = vi.fn();
      render(<LiveTranscriptionDisplay sessionId="test-session" isActive={true} onError={onError} />);

      await waitFor(() => {
        expect(mockListen).toHaveBeenCalledWith('transcription-error', expect.any(Function));
      });

      act(() => {
        emitEvent('transcription-error', {
          sessionId: 'test-session',
          message: 'Error occurred',
        });
      });

      expect(onError).toHaveBeenCalledWith('Error occurred');
    });

    it('should handle global errors (no sessionId)', async () => {
      render(<LiveTranscriptionDisplay sessionId="test-session" isActive={true} />);

      await waitFor(() => {
        expect(mockListen).toHaveBeenCalledWith('transcription-error', expect.any(Function));
      });

      act(() => {
        emitEvent('transcription-error', {
          sessionId: null,
          message: 'Global error',
        });
      });

      expect(screen.getByText(/Global error/)).toBeInTheDocument();
    });

    it('should ignore errors from other sessions', async () => {
      render(<LiveTranscriptionDisplay sessionId="test-session" isActive={true} />);

      await waitFor(() => {
        expect(mockListen).toHaveBeenCalledWith('transcription-error', expect.any(Function));
      });

      act(() => {
        emitEvent('transcription-error', {
          sessionId: 'other-session',
          message: 'Other session error',
        });
      });

      expect(screen.queryByText('Other session error')).not.toBeInTheDocument();
    });
  });

  describe('Statistics', () => {
    it('should show segment count', async () => {
      render(<LiveTranscriptionDisplay sessionId="test-session" isActive={true} />);

      await waitFor(() => {
        expect(mockListen).toHaveBeenCalledWith('live-transcription', expect.any(Function));
      });

      act(() => {
        emitEvent('live-transcription', {
          sessionId: 'test-session',
          text: 'Segment one',
          isFinal: true,
          timestamp: Date.now(),
        });
      });

      act(() => {
        emitEvent('live-transcription', {
          sessionId: 'test-session',
          text: 'Segment two',
          isFinal: true,
          timestamp: Date.now(),
        });
      });

      expect(screen.getByText('2 confirmed segments')).toBeInTheDocument();
    });

    it('should show word count', async () => {
      render(<LiveTranscriptionDisplay sessionId="test-session" isActive={true} />);

      await waitFor(() => {
        expect(mockListen).toHaveBeenCalledWith('live-transcription', expect.any(Function));
      });

      act(() => {
        emitEvent('live-transcription', {
          sessionId: 'test-session',
          text: 'One two three four five',
          isFinal: true,
          timestamp: Date.now(),
        });
      });

      expect(screen.getByText('5 words')).toBeInTheDocument();
    });

    it('should not show stats when no content', () => {
      render(<LiveTranscriptionDisplay sessionId="test-session" isActive={true} />);
      expect(screen.queryByText(/segments/)).not.toBeInTheDocument();
      expect(screen.queryByText(/words/)).not.toBeInTheDocument();
    });
  });

  describe('Session Change', () => {
    it('should reset state when sessionId changes', async () => {
      const { rerender } = render(<LiveTranscriptionDisplay sessionId="session-1" isActive={true} />);

      await waitFor(() => {
        expect(mockListen).toHaveBeenCalled();
      });

      // Add some content
      act(() => {
        emitEvent('live-transcription', {
          sessionId: 'session-1',
          text: 'Old content',
          isFinal: true,
          timestamp: Date.now(),
        });
      });

      expect(screen.getByText(/Old content/)).toBeInTheDocument();

      // Change session
      rerender(<LiveTranscriptionDisplay sessionId="session-2" isActive={true} />);

      // Content should be cleared
      expect(screen.queryByText('Old content')).not.toBeInTheDocument();
      expect(screen.getByText('Listening... speak to see live transcription')).toBeInTheDocument();
    });
  });

  describe('Text Styling', () => {
    it('should show tentative text in italic', async () => {
      const { container } = render(<LiveTranscriptionDisplay sessionId="test-session" isActive={true} />);

      await waitFor(() => {
        expect(mockListen).toHaveBeenCalledWith('live-transcription', expect.any(Function));
      });

      act(() => {
        emitEvent('live-transcription', {
          sessionId: 'test-session',
          text: 'Tentative text',
          isFinal: false,
          timestamp: Date.now(),
        });
      });

      const italicElement = container.querySelector('.italic');
      expect(italicElement).toBeInTheDocument();
      expect(italicElement?.textContent).toBe('Tentative text');
    });
  });
});
