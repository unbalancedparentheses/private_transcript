import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GlobalSearch } from './GlobalSearch';

// Mock Tauri invoke
const mockInvoke = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

// Mock app store
const mockSelectSession = vi.fn();
vi.mock('../../stores/appStore', () => ({
  useAppStore: () => ({
    selectSession: mockSelectSession,
  }),
}));

describe('GlobalSearch', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockResolvedValue([]);
  });

  describe('Closed State', () => {
    it('should return null when not open', () => {
      const { container } = render(<GlobalSearch isOpen={false} onClose={mockOnClose} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Open State', () => {
    it('should render search dialog when open', () => {
      render(<GlobalSearch isOpen={true} onClose={mockOnClose} />);
      expect(screen.getByPlaceholderText('Search all sessions...')).toBeInTheDocument();
    });

    it('should show empty state message', () => {
      render(<GlobalSearch isOpen={true} onClose={mockOnClose} />);
      expect(screen.getByText('Search across all your sessions')).toBeInTheDocument();
      expect(screen.getByText('Titles, transcripts, and notes')).toBeInTheDocument();
    });

    it('should show ESC key hint', () => {
      render(<GlobalSearch isOpen={true} onClose={mockOnClose} />);
      expect(screen.getByText('ESC')).toBeInTheDocument();
    });

    it('should focus input on open', () => {
      render(<GlobalSearch isOpen={true} onClose={mockOnClose} />);
      const input = screen.getByPlaceholderText('Search all sessions...');
      expect(document.activeElement).toBe(input);
    });
  });

  describe('Search Functionality', () => {
    it('should call search API on query change', async () => {
      render(<GlobalSearch isOpen={true} onClose={mockOnClose} />);

      const input = screen.getByPlaceholderText('Search all sessions...');
      fireEvent.change(input, { target: { value: 'test' } });

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith('search_sessions', {
          query: 'test',
          limit: 20,
        });
      }, { timeout: 500 });
    });

    it('should not search with empty query', async () => {
      render(<GlobalSearch isOpen={true} onClose={mockOnClose} />);

      const input = screen.getByPlaceholderText('Search all sessions...');
      fireEvent.change(input, { target: { value: '   ' } });

      // Wait a bit and verify no call
      await new Promise(r => setTimeout(r, 200));
      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it('should display search results', async () => {
      mockInvoke.mockResolvedValue([
        { id: 's1', title: 'Meeting Notes', transcript: 'Discussion about project', createdAt: Date.now() },
        { id: 's2', title: 'Interview', transcript: 'Candidate evaluation', createdAt: Date.now() },
      ]);

      render(<GlobalSearch isOpen={true} onClose={mockOnClose} />);

      const input = screen.getByPlaceholderText('Search all sessions...');
      fireEvent.change(input, { target: { value: 'meeting' } });

      await waitFor(() => {
        // Use getAllByText and check at least one exists, or find by role
        const titles = document.querySelectorAll('.text-\\[13px\\].font-medium');
        const titleTexts = Array.from(titles).map(t => t.textContent);
        expect(titleTexts).toContain('Meeting Notes');
        expect(titleTexts).toContain('Interview');
      }, { timeout: 500 });
    });

    it('should show no results message', async () => {
      mockInvoke.mockResolvedValue([]);

      render(<GlobalSearch isOpen={true} onClose={mockOnClose} />);

      const input = screen.getByPlaceholderText('Search all sessions...');
      fireEvent.change(input, { target: { value: 'nonexistent' } });

      await waitFor(() => {
        expect(screen.getByText('No results found')).toBeInTheDocument();
      }, { timeout: 500 });
    });

    it('should show result count', async () => {
      mockInvoke.mockResolvedValue([
        { id: 's1', title: 'Result 1', createdAt: Date.now() },
        { id: 's2', title: 'Result 2', createdAt: Date.now() },
        { id: 's3', title: 'Result 3', createdAt: Date.now() },
      ]);

      render(<GlobalSearch isOpen={true} onClose={mockOnClose} />);

      const input = screen.getByPlaceholderText('Search all sessions...');
      fireEvent.change(input, { target: { value: 'result' } });

      await waitFor(() => {
        expect(screen.getByText('3 results')).toBeInTheDocument();
      }, { timeout: 500 });
    });
  });

  describe('Keyboard Navigation', () => {
    it('should close on Escape key', () => {
      render(<GlobalSearch isOpen={true} onClose={mockOnClose} />);

      const input = screen.getByPlaceholderText('Search all sessions...');
      fireEvent.keyDown(input, { key: 'Escape' });

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should select session on Enter', async () => {
      const session = { id: 's1', title: 'Test Session', transcript: 'Some transcript content', createdAt: Date.now() };
      mockInvoke.mockResolvedValue([session]);

      render(<GlobalSearch isOpen={true} onClose={mockOnClose} />);

      const input = screen.getByPlaceholderText('Search all sessions...');
      fireEvent.change(input, { target: { value: 'test' } });

      await waitFor(() => {
        const titles = document.querySelectorAll('.text-\\[13px\\].font-medium');
        expect(Array.from(titles).some(t => t.textContent === 'Test Session')).toBe(true);
      }, { timeout: 500 });

      fireEvent.keyDown(input, { key: 'Enter' });

      expect(mockSelectSession).toHaveBeenCalledWith(session);
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should navigate with arrow keys', async () => {
      mockInvoke.mockResolvedValue([
        { id: 's1', title: 'Result 1', transcript: 'First transcript', createdAt: Date.now() },
        { id: 's2', title: 'Result 2', transcript: 'Second transcript', createdAt: Date.now() },
      ]);

      render(<GlobalSearch isOpen={true} onClose={mockOnClose} />);

      const input = screen.getByPlaceholderText('Search all sessions...');
      fireEvent.change(input, { target: { value: 'result' } });

      await waitFor(() => {
        const titles = document.querySelectorAll('.text-\\[13px\\].font-medium');
        expect(Array.from(titles).some(t => t.textContent === 'Result 1')).toBe(true);
      }, { timeout: 500 });

      // First item should be selected initially - find buttons
      const buttons = document.querySelectorAll('button.w-full');
      expect(buttons[0]).toHaveClass('bg-[var(--primary)]');

      // Navigate down
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      expect(buttons[1]).toHaveClass('bg-[var(--primary)]');

      // Navigate back up
      fireEvent.keyDown(input, { key: 'ArrowUp' });
      expect(buttons[0]).toHaveClass('bg-[var(--primary)]');
    });
  });

  describe('Mouse Interaction', () => {
    it('should close on backdrop click', () => {
      render(<GlobalSearch isOpen={true} onClose={mockOnClose} />);

      const backdrop = document.querySelector('.fixed.inset-0.z-50');
      if (backdrop) {
        fireEvent.click(backdrop);
      }

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should not close on dialog click', () => {
      render(<GlobalSearch isOpen={true} onClose={mockOnClose} />);

      const input = screen.getByPlaceholderText('Search all sessions...');
      fireEvent.click(input);

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should select session on click', async () => {
      const session = { id: 's1', title: 'Click Test', transcript: 'Some transcript text', createdAt: Date.now() };
      mockInvoke.mockResolvedValue([session]);

      render(<GlobalSearch isOpen={true} onClose={mockOnClose} />);

      const input = screen.getByPlaceholderText('Search all sessions...');
      fireEvent.change(input, { target: { value: 'click' } });

      await waitFor(() => {
        const buttons = document.querySelectorAll('button.w-full');
        expect(buttons.length).toBeGreaterThan(0);
      }, { timeout: 500 });

      // Click the result button
      const resultButton = document.querySelector('button.w-full');
      fireEvent.click(resultButton!);

      expect(mockSelectSession).toHaveBeenCalledWith(session);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Preview and Display', () => {
    it('should show untitled for sessions without title', async () => {
      mockInvoke.mockResolvedValue([
        { id: 's1', title: '', transcript: 'Some content', createdAt: Date.now() },
      ]);

      render(<GlobalSearch isOpen={true} onClose={mockOnClose} />);

      const input = screen.getByPlaceholderText('Search all sessions...');
      fireEvent.change(input, { target: { value: 'content' } });

      await waitFor(() => {
        expect(screen.getByText('Untitled Session')).toBeInTheDocument();
      }, { timeout: 500 });
    });

    it('should format date correctly', async () => {
      const timestamp = new Date('2024-06-15').getTime();
      mockInvoke.mockResolvedValue([
        { id: 's1', title: 'Test', createdAt: timestamp },
      ]);

      render(<GlobalSearch isOpen={true} onClose={mockOnClose} />);

      const input = screen.getByPlaceholderText('Search all sessions...');
      fireEvent.change(input, { target: { value: 'test' } });

      await waitFor(() => {
        expect(screen.getByText(/Jun/)).toBeInTheDocument();
      }, { timeout: 500 });
    });
  });

  describe('Error Handling', () => {
    it('should handle search errors gracefully', async () => {
      mockInvoke.mockRejectedValue(new Error('Search failed'));

      render(<GlobalSearch isOpen={true} onClose={mockOnClose} />);

      const input = screen.getByPlaceholderText('Search all sessions...');
      fireEvent.change(input, { target: { value: 'error' } });

      await waitFor(() => {
        expect(screen.getByText('No results found')).toBeInTheDocument();
      }, { timeout: 500 });
    });
  });
});
