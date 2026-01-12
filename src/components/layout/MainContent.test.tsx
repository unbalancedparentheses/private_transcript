import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MainContent } from './MainContent';

// Mock child components
vi.mock('../recording/RecordingView', () => ({
  RecordingView: () => <div data-testid="recording-view">Recording View</div>,
}));

vi.mock('../session/SessionDetail', () => ({
  SessionDetail: () => <div data-testid="session-detail">Session Detail</div>,
}));

vi.mock('../settings/SettingsView', () => ({
  SettingsView: () => <div data-testid="settings-view">Settings View</div>,
}));

// Mock store
const mockSetView = vi.fn();
const mockSelectSession = vi.fn();

const defaultMockState = {
  currentWorkspace: { id: 'ws1', name: 'Personal', workspaceType: 'personal' },
  currentFolder: null,
  sessions: [],
  currentSession: null,
  view: 'home',
  setView: mockSetView,
  selectSession: mockSelectSession,
};

let mockState = { ...defaultMockState };

vi.mock('../../stores/appStore', () => ({
  useAppStore: () => mockState,
}));

describe('MainContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState = { ...defaultMockState };
  });

  describe('View Routing', () => {
    it('should render RecordingView when view is recording', () => {
      mockState = { ...defaultMockState, view: 'recording' };
      render(<MainContent />);
      expect(screen.getByTestId('recording-view')).toBeInTheDocument();
    });

    it('should render SessionDetail when view is session and session selected', () => {
      mockState = {
        ...defaultMockState,
        view: 'session',
        currentSession: { id: 's1', title: 'Test Session' },
      };
      render(<MainContent />);
      expect(screen.getByTestId('session-detail')).toBeInTheDocument();
    });

    it('should render SettingsView when view is settings', () => {
      mockState = { ...defaultMockState, view: 'settings' };
      render(<MainContent />);
      expect(screen.getByTestId('settings-view')).toBeInTheDocument();
    });

    it('should render main view when view is home', () => {
      render(<MainContent />);
      expect(screen.queryByTestId('recording-view')).not.toBeInTheDocument();
      expect(screen.queryByTestId('session-detail')).not.toBeInTheDocument();
      expect(screen.queryByTestId('settings-view')).not.toBeInTheDocument();
    });
  });

  describe('No Folder Selected State', () => {
    it('should show select folder message when no folder selected', () => {
      render(<MainContent />);
      expect(screen.getByText('Select a folder')).toBeInTheDocument();
      expect(screen.getByText('Choose from the sidebar to get started.')).toBeInTheDocument();
    });

    it('should display workspace name in header', () => {
      render(<MainContent />);
      expect(screen.getByText('Personal')).toBeInTheDocument();
    });

    it('should not show Record button without folder', () => {
      render(<MainContent />);
      expect(screen.queryByText('Record')).not.toBeInTheDocument();
    });
  });

  describe('Empty Folder State', () => {
    it('should show empty state when folder has no sessions', () => {
      mockState = {
        ...defaultMockState,
        currentFolder: { id: 'f1', name: 'Test Folder', sessionCount: 0 },
        sessions: [],
      };
      render(<MainContent />);
      expect(screen.getByText('No recordings yet')).toBeInTheDocument();
      expect(screen.getByText('Start recording to capture and transcribe audio.')).toBeInTheDocument();
    });

    it('should show Start Recording button in empty state', () => {
      mockState = {
        ...defaultMockState,
        currentFolder: { id: 'f1', name: 'Test Folder', sessionCount: 0 },
        sessions: [],
      };
      render(<MainContent />);
      expect(screen.getByText('Start Recording')).toBeInTheDocument();
    });

    it('should navigate to recording when Start Recording clicked', () => {
      mockState = {
        ...defaultMockState,
        currentFolder: { id: 'f1', name: 'Test Folder', sessionCount: 0 },
        sessions: [],
      };
      render(<MainContent />);
      fireEvent.click(screen.getByText('Start Recording'));
      expect(mockSetView).toHaveBeenCalledWith('recording');
    });

    it('should display folder name in header', () => {
      mockState = {
        ...defaultMockState,
        currentFolder: { id: 'f1', name: 'Test Folder', sessionCount: 0 },
        sessions: [],
      };
      render(<MainContent />);
      expect(screen.getByText('Test Folder')).toBeInTheDocument();
    });
  });

  describe('Header with Folder', () => {
    it('should show Record button when folder is selected', () => {
      mockState = {
        ...defaultMockState,
        currentFolder: { id: 'f1', name: 'Test Folder', sessionCount: 0 },
        sessions: [],
      };
      render(<MainContent />);
      expect(screen.getByText('Record')).toBeInTheDocument();
    });

    it('should navigate to recording when Record button clicked', () => {
      mockState = {
        ...defaultMockState,
        currentFolder: { id: 'f1', name: 'Test Folder', sessionCount: 0 },
        sessions: [],
      };
      render(<MainContent />);
      fireEvent.click(screen.getByText('Record'));
      expect(mockSetView).toHaveBeenCalledWith('recording');
    });

    it('should show session count in header when folder has sessions', () => {
      mockState = {
        ...defaultMockState,
        currentFolder: { id: 'f1', name: 'Test Folder', sessionCount: 3 },
        sessions: [
          { id: 's1', title: 'Session 1', status: 'complete', createdAt: Date.now() / 1000 },
          { id: 's2', title: 'Session 2', status: 'complete', createdAt: Date.now() / 1000 },
          { id: 's3', title: 'Session 3', status: 'complete', createdAt: Date.now() / 1000 },
        ],
      };
      render(<MainContent />);
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  describe('Session List', () => {
    it('should display sessions', () => {
      mockState = {
        ...defaultMockState,
        currentFolder: { id: 'f1', name: 'Test Folder', sessionCount: 2 },
        sessions: [
          { id: 's1', title: 'Meeting Notes', status: 'complete', transcript: 'Discussion about project', createdAt: Date.now() / 1000 },
          { id: 's2', title: 'Interview', status: 'complete', transcript: 'Candidate evaluation', createdAt: Date.now() / 1000 },
        ],
      };
      render(<MainContent />);
      expect(screen.getByText('Meeting Notes')).toBeInTheDocument();
      expect(screen.getByText('Interview')).toBeInTheDocument();
    });

    it('should show transcript preview', () => {
      mockState = {
        ...defaultMockState,
        currentFolder: { id: 'f1', name: 'Test Folder', sessionCount: 1 },
        sessions: [
          { id: 's1', title: 'Session', status: 'complete', transcript: 'This is a preview of the transcript content', createdAt: Date.now() / 1000 },
        ],
      };
      render(<MainContent />);
      expect(screen.getByText('This is a preview of the transcript content')).toBeInTheDocument();
    });

    it('should truncate long transcript preview', () => {
      const longTranscript = 'A'.repeat(100);
      mockState = {
        ...defaultMockState,
        currentFolder: { id: 'f1', name: 'Test Folder', sessionCount: 1 },
        sessions: [
          { id: 's1', title: 'Session', status: 'complete', transcript: longTranscript, createdAt: Date.now() / 1000 },
        ],
      };
      render(<MainContent />);
      expect(screen.getByText('A'.repeat(80) + '...')).toBeInTheDocument();
    });

    it('should select session on click', () => {
      const session = { id: 's1', title: 'Session', status: 'complete', transcript: 'Content', createdAt: Date.now() / 1000 };
      mockState = {
        ...defaultMockState,
        currentFolder: { id: 'f1', name: 'Test Folder', sessionCount: 1 },
        sessions: [session],
      };
      render(<MainContent />);
      fireEvent.click(screen.getByText('Session'));
      expect(mockSelectSession).toHaveBeenCalledWith(session);
    });
  });

  describe('Session Status', () => {
    it('should show complete status icon', () => {
      mockState = {
        ...defaultMockState,
        currentFolder: { id: 'f1', name: 'Test Folder', sessionCount: 1 },
        sessions: [
          { id: 's1', title: 'Complete Session', status: 'complete', transcript: 'Done', createdAt: Date.now() / 1000 },
        ],
      };
      render(<MainContent />);
      // Complete sessions don't show a badge, just check the session is there
      expect(screen.getByText('Complete Session')).toBeInTheDocument();
    });

    it('should show transcribing status', () => {
      mockState = {
        ...defaultMockState,
        currentFolder: { id: 'f1', name: 'Test Folder', sessionCount: 1 },
        sessions: [
          { id: 's1', title: 'Transcribing Session', status: 'transcribing', createdAt: Date.now() / 1000 },
        ],
      };
      render(<MainContent />);
      expect(screen.getByText('Transcribing')).toBeInTheDocument();
      expect(screen.getByText('Transcribing...')).toBeInTheDocument();
    });

    it('should show error status', () => {
      mockState = {
        ...defaultMockState,
        currentFolder: { id: 'f1', name: 'Test Folder', sessionCount: 1 },
        sessions: [
          { id: 's1', title: 'Error Session', status: 'error', createdAt: Date.now() / 1000 },
        ],
      };
      render(<MainContent />);
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Failed')).toBeInTheDocument();
    });

    it('should show pending status', () => {
      mockState = {
        ...defaultMockState,
        currentFolder: { id: 'f1', name: 'Test Folder', sessionCount: 1 },
        sessions: [
          { id: 's1', title: 'Pending Session', status: 'pending', createdAt: Date.now() / 1000 },
        ],
      };
      render(<MainContent />);
      expect(screen.getByText('Pending')).toBeInTheDocument();
      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });

    it('should show generating status', () => {
      mockState = {
        ...defaultMockState,
        currentFolder: { id: 'f1', name: 'Test Folder', sessionCount: 1 },
        sessions: [
          { id: 's1', title: 'Generating Session', status: 'generating', createdAt: Date.now() / 1000 },
        ],
      };
      render(<MainContent />);
      expect(screen.getByText('Generating')).toBeInTheDocument();
    });
  });

  describe('Session Without Title', () => {
    it('should show formatted date when session has no title', () => {
      const timestamp = new Date('2024-06-15 14:30:00').getTime() / 1000;
      mockState = {
        ...defaultMockState,
        currentFolder: { id: 'f1', name: 'Test Folder', sessionCount: 1 },
        sessions: [
          { id: 's1', title: '', status: 'complete', transcript: 'Content', createdAt: timestamp },
        ],
      };
      render(<MainContent />);
      // Should display a formatted date like "Sat, Jun 15, 2:30 PM"
      expect(screen.getByText(/Jun/)).toBeInTheDocument();
    });
  });

  describe('Relative Timestamp', () => {
    it('should show relative time for session', () => {
      const recentTimestamp = (Date.now() - 1000 * 60 * 5) / 1000; // 5 minutes ago
      mockState = {
        ...defaultMockState,
        currentFolder: { id: 'f1', name: 'Test Folder', sessionCount: 1 },
        sessions: [
          { id: 's1', title: 'Recent Session', status: 'complete', transcript: 'Content', createdAt: recentTimestamp },
        ],
      };
      render(<MainContent />);
      expect(screen.getByText(/minutes ago/)).toBeInTheDocument();
    });
  });

  describe('Fallback States', () => {
    it('should handle null workspace gracefully', () => {
      mockState = {
        ...defaultMockState,
        currentWorkspace: null,
      };
      expect(() => render(<MainContent />)).not.toThrow();
      expect(screen.getByText('Private Transcript')).toBeInTheDocument();
    });
  });
});
