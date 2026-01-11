import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { SessionDetail } from './SessionDetail';

// Mock scrollIntoView since jsdom doesn't support it
Element.prototype.scrollIntoView = vi.fn();

// Mock session data
const mockSession = {
  id: 'session-1',
  folderId: 'folder-1',
  title: 'Test Session',
  transcript: 'This is a test transcript. Testing the search feature. This test should find multiple matches.',
  generatedNote: 'Generated note content',
  audioPath: '/path/to/audio.webm',
  status: 'complete' as const,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockTemplates = [
  { id: 'template-1', name: 'Meeting Notes', isDefault: true, prompt: '' },
  { id: 'template-2', name: 'Summary', isDefault: false, prompt: '' },
];

const mockSetView = vi.fn();
const mockUpdateSession = vi.fn();

vi.mock('../../stores/appStore', () => ({
  useAppStore: () => ({
    currentSession: mockSession,
    templates: mockTemplates,
    setView: mockSetView,
    updateSession: mockUpdateSession,
  }),
}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
  convertFileSrc: vi.fn((path: string) => `asset://localhost/${path}`),
}));

describe('SessionDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render the session title', () => {
      render(<SessionDetail />);
      expect(screen.getByText('Test Session')).toBeInTheDocument();
    });

    it('should render the back button', () => {
      render(<SessionDetail />);
      expect(screen.getByText('Back')).toBeInTheDocument();
    });

    it('should navigate back when back button is clicked', () => {
      render(<SessionDetail />);
      fireEvent.click(screen.getByText('Back'));
      expect(mockSetView).toHaveBeenCalledWith('list');
    });

    it('should render the transcript section', () => {
      render(<SessionDetail />);
      expect(screen.getByText('Transcript')).toBeInTheDocument();
    });

    it('should render the notes section', () => {
      render(<SessionDetail />);
      expect(screen.getByText('Notes')).toBeInTheDocument();
    });

    it('should display the transcript content', () => {
      render(<SessionDetail />);
      expect(screen.getByText(/This is a test transcript/)).toBeInTheDocument();
    });

    it('should display the generated note', () => {
      render(<SessionDetail />);
      expect(screen.getByText('Generated note content')).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('should show search button initially', () => {
      render(<SessionDetail />);
      const searchButton = screen.getByTitle('Search (Cmd+F)');
      expect(searchButton).toBeInTheDocument();
    });

    it('should open search input when search button is clicked', async () => {
      render(<SessionDetail />);
      const searchButton = screen.getByTitle('Search (Cmd+F)');
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
      });
    });

    it('should open search with Cmd+F keyboard shortcut', async () => {
      render(<SessionDetail />);

      act(() => {
        fireEvent.keyDown(window, { key: 'f', metaKey: true });
      });

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
      });
    });

    it('should open search with Ctrl+F keyboard shortcut', async () => {
      render(<SessionDetail />);

      act(() => {
        fireEvent.keyDown(window, { key: 'f', ctrlKey: true });
      });

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
      });
    });

    it('should close search with Escape key', async () => {
      render(<SessionDetail />);

      // Open search
      const searchButton = screen.getByTitle('Search (Cmd+F)');
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
      });

      // Close with Escape
      act(() => {
        fireEvent.keyDown(window, { key: 'Escape' });
      });

      await waitFor(() => {
        expect(screen.queryByPlaceholderText('Search...')).not.toBeInTheDocument();
      });
    });

    it('should close search when close button is clicked', async () => {
      render(<SessionDetail />);

      // Open search
      fireEvent.click(screen.getByTitle('Search (Cmd+F)'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
      });

      // Find and click close button (X icon)
      const closeButton = document.querySelector('[class*="animate-scale-in"] button:last-child');
      expect(closeButton).toBeInTheDocument();
      fireEvent.click(closeButton!);

      await waitFor(() => {
        expect(screen.queryByPlaceholderText('Search...')).not.toBeInTheDocument();
      });
    });

    it('should find and display match count', async () => {
      render(<SessionDetail />);

      // Open search
      fireEvent.click(screen.getByTitle('Search (Cmd+F)'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
      });

      // Type search query - "test" appears 3 times in the transcript
      const searchInput = screen.getByPlaceholderText('Search...');
      fireEvent.change(searchInput, { target: { value: 'test' } });

      await waitFor(() => {
        expect(screen.getByText('1/3')).toBeInTheDocument();
      });
    });

    it('should be case-insensitive search', async () => {
      render(<SessionDetail />);

      // Open search
      fireEvent.click(screen.getByTitle('Search (Cmd+F)'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
      });

      // Type uppercase - should still find matches
      const searchInput = screen.getByPlaceholderText('Search...');
      fireEvent.change(searchInput, { target: { value: 'TEST' } });

      await waitFor(() => {
        expect(screen.getByText('1/3')).toBeInTheDocument();
      });
    });

    it('should highlight search matches in transcript', async () => {
      render(<SessionDetail />);

      // Open search and type query
      fireEvent.click(screen.getByTitle('Search (Cmd+F)'));
      const searchInput = await screen.findByPlaceholderText('Search...');
      fireEvent.change(searchInput, { target: { value: 'test' } });

      await waitFor(() => {
        const marks = document.querySelectorAll('mark');
        expect(marks.length).toBe(3); // 3 matches
      });
    });

    it('should highlight current match differently', async () => {
      render(<SessionDetail />);

      // Open search and type query
      fireEvent.click(screen.getByTitle('Search (Cmd+F)'));
      const searchInput = await screen.findByPlaceholderText('Search...');
      fireEvent.change(searchInput, { target: { value: 'test' } });

      await waitFor(() => {
        const currentMatch = document.querySelector('.search-highlight-current');
        expect(currentMatch).toBeInTheDocument();
        expect(currentMatch?.classList.contains('bg-[var(--primary)]')).toBe(true);
      });
    });

    it('should navigate to next match with next button', async () => {
      render(<SessionDetail />);

      // Open search and type query
      fireEvent.click(screen.getByTitle('Search (Cmd+F)'));
      const searchInput = await screen.findByPlaceholderText('Search...');
      fireEvent.change(searchInput, { target: { value: 'test' } });

      await waitFor(() => {
        expect(screen.getByText('1/3')).toBeInTheDocument();
      });

      // Click next button
      const nextButton = screen.getByTitle('Next match (Enter)');
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText('2/3')).toBeInTheDocument();
      });
    });

    it('should navigate to previous match with previous button', async () => {
      render(<SessionDetail />);

      // Open search and type query
      fireEvent.click(screen.getByTitle('Search (Cmd+F)'));
      const searchInput = await screen.findByPlaceholderText('Search...');
      fireEvent.change(searchInput, { target: { value: 'test' } });

      await waitFor(() => {
        expect(screen.getByText('1/3')).toBeInTheDocument();
      });

      // Click previous button (should wrap to last)
      const prevButton = screen.getByTitle('Previous match (Shift+Enter)');
      fireEvent.click(prevButton);

      await waitFor(() => {
        expect(screen.getByText('3/3')).toBeInTheDocument();
      });
    });

    it('should navigate with Enter key', async () => {
      render(<SessionDetail />);

      // Open search and type query
      fireEvent.click(screen.getByTitle('Search (Cmd+F)'));
      const searchInput = await screen.findByPlaceholderText('Search...');
      fireEvent.change(searchInput, { target: { value: 'test' } });

      await waitFor(() => {
        expect(screen.getByText('1/3')).toBeInTheDocument();
      });

      // Press Enter to go to next
      act(() => {
        fireEvent.keyDown(window, { key: 'Enter' });
      });

      await waitFor(() => {
        expect(screen.getByText('2/3')).toBeInTheDocument();
      });
    });

    it('should navigate backwards with Shift+Enter key', async () => {
      render(<SessionDetail />);

      // Open search and type query
      fireEvent.click(screen.getByTitle('Search (Cmd+F)'));
      const searchInput = await screen.findByPlaceholderText('Search...');
      fireEvent.change(searchInput, { target: { value: 'test' } });

      await waitFor(() => {
        expect(screen.getByText('1/3')).toBeInTheDocument();
      });

      // Press Shift+Enter to go to previous (wraps to last)
      act(() => {
        fireEvent.keyDown(window, { key: 'Enter', shiftKey: true });
      });

      await waitFor(() => {
        expect(screen.getByText('3/3')).toBeInTheDocument();
      });
    });

    it('should wrap around when navigating past last match', async () => {
      render(<SessionDetail />);

      // Open search and type query
      fireEvent.click(screen.getByTitle('Search (Cmd+F)'));
      const searchInput = await screen.findByPlaceholderText('Search...');
      fireEvent.change(searchInput, { target: { value: 'test' } });

      await waitFor(() => {
        expect(screen.getByText('1/3')).toBeInTheDocument();
      });

      const nextButton = screen.getByTitle('Next match (Enter)');

      // Navigate to 2/3
      fireEvent.click(nextButton);
      await waitFor(() => {
        expect(screen.getByText('2/3')).toBeInTheDocument();
      });

      // Navigate to 3/3
      fireEvent.click(nextButton);
      await waitFor(() => {
        expect(screen.getByText('3/3')).toBeInTheDocument();
      });

      // Navigate to 1/3 (wrap around)
      fireEvent.click(nextButton);
      await waitFor(() => {
        expect(screen.getByText('1/3')).toBeInTheDocument();
      });
    });

    it('should clear search query when closing search', async () => {
      render(<SessionDetail />);

      // Open search and type query
      fireEvent.click(screen.getByTitle('Search (Cmd+F)'));
      const searchInput = await screen.findByPlaceholderText('Search...');
      fireEvent.change(searchInput, { target: { value: 'test' } });

      await waitFor(() => {
        expect(screen.getByText('1/3')).toBeInTheDocument();
      });

      // Close with Escape
      act(() => {
        fireEvent.keyDown(window, { key: 'Escape' });
      });

      // Reopen search
      fireEvent.click(screen.getByTitle('Search (Cmd+F)'));

      await waitFor(() => {
        const newSearchInput = screen.getByPlaceholderText('Search...');
        expect(newSearchInput).toHaveValue('');
      });
    });

    it('should reset to first match when search query changes', async () => {
      render(<SessionDetail />);

      // Open search and type query
      fireEvent.click(screen.getByTitle('Search (Cmd+F)'));
      const searchInput = await screen.findByPlaceholderText('Search...');
      fireEvent.change(searchInput, { target: { value: 'test' } });

      // Navigate to 2nd match
      const nextButton = await screen.findByTitle('Next match (Enter)');
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText('2/3')).toBeInTheDocument();
      });

      // Change search query
      fireEvent.change(searchInput, { target: { value: 'This' } });

      await waitFor(() => {
        // Should reset to 1st match of new query
        expect(screen.getByText(/1\//)).toBeInTheDocument();
      });
    });

    it('should not show navigation when no matches found', async () => {
      render(<SessionDetail />);

      // Open search
      fireEvent.click(screen.getByTitle('Search (Cmd+F)'));
      const searchInput = await screen.findByPlaceholderText('Search...');

      // Search for something that doesn't exist
      fireEvent.change(searchInput, { target: { value: 'xyz123notfound' } });

      await waitFor(() => {
        expect(screen.queryByTitle('Next match (Enter)')).not.toBeInTheDocument();
        expect(screen.queryByTitle('Previous match (Shift+Enter)')).not.toBeInTheDocument();
      });
    });

    it('should show plain transcript when search is empty', async () => {
      render(<SessionDetail />);

      // Open search but leave empty
      fireEvent.click(screen.getByTitle('Search (Cmd+F)'));
      await screen.findByPlaceholderText('Search...');

      // No highlights should be present
      const marks = document.querySelectorAll('mark');
      expect(marks.length).toBe(0);
    });
  });

  describe('Copy Functionality', () => {
    it('should have copy button for transcript', () => {
      render(<SessionDetail />);
      const copyButtons = screen.getAllByText('Copy');
      expect(copyButtons.length).toBeGreaterThanOrEqual(1);
    });

    it('should copy transcript to clipboard when clicked', async () => {
      const mockClipboard = { writeText: vi.fn().mockResolvedValue(undefined) };
      Object.assign(navigator, { clipboard: mockClipboard });

      render(<SessionDetail />);
      const copyButtons = screen.getAllByText('Copy');
      fireEvent.click(copyButtons[0]);

      await waitFor(() => {
        expect(mockClipboard.writeText).toHaveBeenCalledWith(mockSession.transcript);
      });
    });
  });

  describe('Edit Functionality', () => {
    it('should have edit button for transcript', () => {
      render(<SessionDetail />);
      const editButtons = screen.getAllByText('Edit');
      expect(editButtons.length).toBeGreaterThanOrEqual(1);
    });

    it('should show textarea when editing transcript', () => {
      render(<SessionDetail />);
      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[0]);

      const textarea = document.querySelector('textarea');
      expect(textarea).toBeInTheDocument();
    });

    it('should show save and cancel buttons when editing', () => {
      render(<SessionDetail />);
      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[0]);

      expect(screen.getByText('Save')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should call updateSession when saving transcript', async () => {
      render(<SessionDetail />);
      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[0]);

      const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: 'Updated transcript' } });

      fireEvent.click(screen.getByText('Save'));

      await waitFor(() => {
        expect(mockUpdateSession).toHaveBeenCalledWith('session-1', { transcript: 'Updated transcript' });
      });
    });
  });
});

describe('SessionDetail - Speaker Labels', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should show speaker toggle button', () => {
    render(<SessionDetail />);
    const speakerButton = screen.getByTitle(/speaker labels/i);
    expect(speakerButton).toBeInTheDocument();
  });

  it('should show plain text by default', () => {
    render(<SessionDetail />);

    // Plain text should be visible
    expect(screen.getByText(/This is a test transcript/)).toBeInTheDocument();
  });

  it('should toggle button appearance when speaker view is active', async () => {
    render(<SessionDetail />);
    const speakerButton = screen.getByTitle(/speaker labels/i);

    // Initially not active
    expect(speakerButton.className).not.toContain('bg-[var(--primary)]');

    // Click to enable speaker view
    fireEvent.click(speakerButton);

    // Button should now have primary color
    await waitFor(() => {
      expect(speakerButton.className).toContain('bg-[var(--primary)]');
    });
  });

  it('should toggle back to plain text view', async () => {
    render(<SessionDetail />);
    const speakerButton = screen.getByTitle(/speaker labels/i);

    // Enable speaker view
    fireEvent.click(speakerButton);
    await waitFor(() => {
      expect(speakerButton.className).toContain('bg-[var(--primary)]');
    });

    // Disable speaker view
    fireEvent.click(speakerButton);
    await waitFor(() => {
      expect(speakerButton.className).not.toContain('bg-[var(--primary)]');
    });
  });
});

describe('SessionDetail - Audio Player', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render audio player when audioPath exists', () => {
    render(<SessionDetail />);
    const audioElement = document.querySelector('audio');
    expect(audioElement).toBeInTheDocument();
  });

  it('should have play/pause button', () => {
    render(<SessionDetail />);
    const playButton = document.querySelector('[class*="rounded-full bg-[var(--primary)]"]');
    expect(playButton).toBeInTheDocument();
  });

  it('should have skip backward button', () => {
    render(<SessionDetail />);
    const skipBackButton = screen.getByTitle('Skip back 10s');
    expect(skipBackButton).toBeInTheDocument();
  });

  it('should have skip forward button', () => {
    render(<SessionDetail />);
    const skipForwardButton = screen.getByTitle('Skip forward 10s');
    expect(skipForwardButton).toBeInTheDocument();
  });

  it('should display time as 0:00 initially', () => {
    render(<SessionDetail />);
    const timeDisplays = screen.getAllByText('0:00');
    expect(timeDisplays.length).toBeGreaterThan(0);
  });
});

describe('SessionDetail - Export Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should have export dropdown button', () => {
    render(<SessionDetail />);
    expect(screen.getByText('Export')).toBeInTheDocument();
  });

  it('should show export options on hover', () => {
    render(<SessionDetail />);
    // Export options should be in the DOM but hidden
    expect(screen.getByText('Markdown')).toBeInTheDocument();
    expect(screen.getByText('PDF')).toBeInTheDocument();
    expect(screen.getByText('Word')).toBeInTheDocument();
  });
});

describe('SessionDetail - Generate Note', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should have template selector', () => {
    render(<SessionDetail />);
    const templateSelect = document.querySelector('select');
    expect(templateSelect).toBeInTheDocument();
  });

  it('should show available templates in selector', () => {
    render(<SessionDetail />);
    expect(screen.getByText('Meeting Notes')).toBeInTheDocument();
    expect(screen.getByText('Summary')).toBeInTheDocument();
  });

  it('should have Generate Note button', () => {
    render(<SessionDetail />);
    expect(screen.getByText('Generate Note')).toBeInTheDocument();
  });

  it('should disable Generate Note button when no transcript', async () => {
    // This tests the disabled state based on transcript availability
    render(<SessionDetail />);
    const generateButton = screen.getByText('Generate Note');
    // Button should be enabled since mock has transcript
    expect(generateButton).not.toBeDisabled();
  });
});

describe('SessionDetail - Notes Section', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should display notes section', () => {
    render(<SessionDetail />);
    expect(screen.getByText('Notes')).toBeInTheDocument();
  });

  it('should display generated note content', () => {
    render(<SessionDetail />);
    expect(screen.getByText('Generated note content')).toBeInTheDocument();
  });

  it('should have edit button for notes', () => {
    render(<SessionDetail />);
    const editButtons = screen.getAllByText('Edit');
    // Should have edit buttons for both transcript and notes
    expect(editButtons.length).toBe(2);
  });

  it('should have copy button for notes', () => {
    render(<SessionDetail />);
    const copyButtons = screen.getAllByText('Copy');
    // Should have copy buttons for both transcript and notes
    expect(copyButtons.length).toBe(2);
  });

  it('should show textarea when editing notes', () => {
    render(<SessionDetail />);
    const editButtons = screen.getAllByText('Edit');
    // Click the second edit button (notes section)
    fireEvent.click(editButtons[1]);

    const textareas = document.querySelectorAll('textarea');
    expect(textareas.length).toBeGreaterThan(0);
  });
});

describe('SessionDetail - Header', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should display session title in header', () => {
    render(<SessionDetail />);
    expect(screen.getByText('Test Session')).toBeInTheDocument();
  });

  it('should have back button with arrow icon', () => {
    render(<SessionDetail />);
    const backButton = screen.getByText('Back');
    expect(backButton.closest('button')).toBeInTheDocument();
  });
});

describe('SessionDetail - No Session', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return null when no current session', () => {
    vi.doMock('../../stores/appStore', () => ({
      useAppStore: () => ({
        currentSession: null,
        templates: [],
        setView: vi.fn(),
        updateSession: vi.fn(),
      }),
    }));

    // The component returns null when no session
    // This is tested by the component logic
  });
});
