import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Sidebar } from './Sidebar';

// Mock logger
vi.mock('../../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock toast
const mockAddToast = vi.fn();
vi.mock('../ui/Toast', () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

// Mock store functions
const mockSelectWorkspace = vi.fn();
const mockSelectFolder = vi.fn();
const mockCreateFolder = vi.fn();
const mockDeleteFolder = vi.fn();
const mockSetView = vi.fn();

const defaultMockState = {
  workspaces: [
    { id: 'ws1', name: 'Personal', workspaceType: 'personal' },
    { id: 'ws2', name: 'Work', workspaceType: 'personal' },
  ],
  currentWorkspace: { id: 'ws1', name: 'Personal', workspaceType: 'personal' },
  folders: [],
  currentFolder: null,
  selectWorkspace: mockSelectWorkspace,
  selectFolder: mockSelectFolder,
  createFolder: mockCreateFolder,
  deleteFolder: mockDeleteFolder,
  setView: mockSetView,
};

let mockState = { ...defaultMockState };

vi.mock('../../stores/appStore', () => ({
  useAppStore: () => mockState,
}));

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState = { ...defaultMockState };
  });

  describe('Layout', () => {
    it('should render the sidebar', () => {
      render(<Sidebar />);
      expect(screen.getByText('Transcript')).toBeInTheDocument();
    });

    it('should render workspace selector', () => {
      render(<Sidebar />);
      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
    });

    it('should render settings button', () => {
      render(<Sidebar />);
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });
  });

  describe('Workspace Selection', () => {
    it('should display current workspace in selector', () => {
      render(<Sidebar />);
      const select = screen.getByRole('combobox');
      expect(select).toHaveValue('ws1');
    });

    it('should list all workspaces', () => {
      render(<Sidebar />);
      expect(screen.getByText(/Personal/)).toBeInTheDocument();
      expect(screen.getByText(/Work/)).toBeInTheDocument();
    });

    it('should call selectWorkspace when workspace changes', () => {
      render(<Sidebar />);
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'ws2' } });
      expect(mockSelectWorkspace).toHaveBeenCalled();
    });
  });

  describe('Folder List', () => {
    it('should show "New Folder" button', () => {
      render(<Sidebar />);
      expect(screen.getByText(/New/)).toBeInTheDocument();
    });

    it('should display folders', () => {
      mockState = {
        ...defaultMockState,
        folders: [
          { id: 'f1', name: 'Meetings', sessionCount: 5 },
          { id: 'f2', name: 'Notes', sessionCount: 3 },
        ],
      };
      render(<Sidebar />);

      expect(screen.getByText('Meetings')).toBeInTheDocument();
      expect(screen.getByText('Notes')).toBeInTheDocument();
    });

    it('should show session count for folders', () => {
      mockState = {
        ...defaultMockState,
        folders: [
          { id: 'f1', name: 'Meetings', sessionCount: 5 },
        ],
      };
      render(<Sidebar />);

      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should not show session count when zero', () => {
      mockState = {
        ...defaultMockState,
        folders: [
          { id: 'f1', name: 'Empty', sessionCount: 0 },
        ],
      };
      render(<Sidebar />);

      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });

    it('should highlight current folder', () => {
      const folder = { id: 'f1', name: 'Meetings', sessionCount: 5 };
      mockState = {
        ...defaultMockState,
        folders: [folder],
        currentFolder: folder,
      };
      render(<Sidebar />);

      // The folder item has the class on the outer div with the cursor-pointer
      const folderElement = screen.getByText('Meetings').closest('[class*="cursor-pointer"]');
      expect(folderElement).toHaveClass('bg-[var(--primary)]');
    });

    it('should select folder on click', () => {
      const folder = { id: 'f1', name: 'Meetings', sessionCount: 5 };
      mockState = {
        ...defaultMockState,
        folders: [folder],
      };
      render(<Sidebar />);

      fireEvent.click(screen.getByText('Meetings'));
      expect(mockSelectFolder).toHaveBeenCalledWith(folder);
    });
  });

  describe('Create Folder', () => {
    it('should show new folder form when button clicked', () => {
      render(<Sidebar />);

      fireEvent.click(screen.getByText(/New/));

      expect(screen.getByPlaceholderText(/name/i)).toBeInTheDocument();
      expect(screen.getByText('Create')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should create folder on submit', async () => {
      render(<Sidebar />);

      fireEvent.click(screen.getByText(/New/));

      const input = screen.getByPlaceholderText(/name/i);
      fireEvent.change(input, { target: { value: 'Test Folder' } });
      fireEvent.click(screen.getByText('Create'));

      await waitFor(() => {
        expect(mockCreateFolder).toHaveBeenCalledWith('Test Folder');
      });
    });

    it('should create folder on Enter key', async () => {
      render(<Sidebar />);

      fireEvent.click(screen.getByText(/New/));

      const input = screen.getByPlaceholderText(/name/i);
      fireEvent.change(input, { target: { value: 'Enter Folder' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(mockCreateFolder).toHaveBeenCalledWith('Enter Folder');
      });
    });

    it('should not create folder with empty name', async () => {
      render(<Sidebar />);

      fireEvent.click(screen.getByText(/New/));
      fireEvent.click(screen.getByText('Create'));

      expect(mockCreateFolder).not.toHaveBeenCalled();
    });

    it('should cancel folder creation', () => {
      render(<Sidebar />);

      fireEvent.click(screen.getByText(/New/));
      expect(screen.getByPlaceholderText(/name/i)).toBeInTheDocument();

      fireEvent.click(screen.getByText('Cancel'));
      expect(screen.queryByPlaceholderText(/name/i)).not.toBeInTheDocument();
    });
  });

  describe('Delete Folder', () => {
    it('should show delete confirmation dialog', () => {
      mockState = {
        ...defaultMockState,
        folders: [
          { id: 'f1', name: 'Test Folder', sessionCount: 2 },
        ],
      };
      render(<Sidebar />);

      const deleteButton = screen.getByTitle('Delete folder');
      fireEvent.click(deleteButton);

      expect(screen.getByText('Delete Folder')).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to delete "Test Folder"/)).toBeInTheDocument();
    });

    it('should delete folder on confirmation', async () => {
      mockState = {
        ...defaultMockState,
        folders: [
          { id: 'f1', name: 'Test Folder', sessionCount: 2 },
        ],
      };
      render(<Sidebar />);

      const deleteButton = screen.getByTitle('Delete folder');
      fireEvent.click(deleteButton);

      const confirmButton = screen.getAllByText('Delete').find(btn =>
        btn.closest('button')?.classList.contains('bg-[var(--destructive)]') ||
        btn.closest('.flex.gap-2.justify-end')
      );
      if (confirmButton) {
        fireEvent.click(confirmButton);
      }

      await waitFor(() => {
        expect(mockDeleteFolder).toHaveBeenCalledWith('f1');
      });
    });

    it('should cancel folder deletion', () => {
      mockState = {
        ...defaultMockState,
        folders: [
          { id: 'f1', name: 'Test Folder', sessionCount: 2 },
        ],
      };
      render(<Sidebar />);

      const deleteButton = screen.getByTitle('Delete folder');
      fireEvent.click(deleteButton);

      // Find cancel in the dialog
      const cancelButtons = screen.getAllByText('Cancel');
      const dialogCancel = cancelButtons[cancelButtons.length - 1];
      fireEvent.click(dialogCancel);

      expect(screen.queryByText('Delete Folder')).not.toBeInTheDocument();
      expect(mockDeleteFolder).not.toHaveBeenCalled();
    });

    it('should show success toast on delete', async () => {
      mockState = {
        ...defaultMockState,
        folders: [
          { id: 'f1', name: 'Test Folder', sessionCount: 0 },
        ],
      };
      render(<Sidebar />);

      fireEvent.click(screen.getByTitle('Delete folder'));

      const buttons = screen.getAllByRole('button');
      const deleteConfirm = buttons.find(btn =>
        btn.textContent === 'Delete' && btn.closest('.flex.gap-2.justify-end')
      );
      if (deleteConfirm) {
        fireEvent.click(deleteConfirm);
      }

      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith('Folder deleted successfully', 'success');
      });
    });

    it('should show error toast on delete failure', async () => {
      mockDeleteFolder.mockRejectedValueOnce(new Error('Delete failed'));
      mockState = {
        ...defaultMockState,
        folders: [
          { id: 'f1', name: 'Test Folder', sessionCount: 0 },
        ],
      };
      render(<Sidebar />);

      fireEvent.click(screen.getByTitle('Delete folder'));

      const buttons = screen.getAllByRole('button');
      const deleteConfirm = buttons.find(btn =>
        btn.textContent === 'Delete' && btn.closest('.flex.gap-2.justify-end')
      );
      if (deleteConfirm) {
        fireEvent.click(deleteConfirm);
      }

      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith('Failed to delete folder', 'error');
      });
    });
  });

  describe('Settings Navigation', () => {
    it('should navigate to settings on click', () => {
      render(<Sidebar />);

      fireEvent.click(screen.getByText('Settings'));
      expect(mockSetView).toHaveBeenCalledWith('settings');
    });
  });

  describe('Empty State', () => {
    it('should show folders label', () => {
      render(<Sidebar />);
      expect(screen.getByText('Folders')).toBeInTheDocument();
    });

    it('should handle no workspaces gracefully', () => {
      mockState = {
        ...defaultMockState,
        workspaces: [],
        currentWorkspace: null,
      };

      // Should not throw
      expect(() => render(<Sidebar />)).not.toThrow();
    });
  });
});
