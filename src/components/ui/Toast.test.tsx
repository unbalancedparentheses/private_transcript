import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ToastProvider, useToast, ToastType } from './Toast';

// Test component that uses the toast hook
function TestComponent({ type = 'info' as ToastType, duration = 5000 }) {
  const { addToast, removeToast, toasts } = useToast();

  return (
    <div>
      <button onClick={() => addToast('Test message', type, duration)}>Add Toast</button>
      <button onClick={() => addToast('Success!', 'success')}>Add Success</button>
      <button onClick={() => addToast('Error!', 'error')}>Add Error</button>
      <button onClick={() => addToast('Warning!', 'warning')}>Add Warning</button>
      <button onClick={() => addToast('Info!', 'info')}>Add Info</button>
      <span data-testid="toast-count">{toasts.length}</span>
      {toasts.map((toast) => (
        <button key={toast.id} onClick={() => removeToast(toast.id)}>
          Remove {toast.id}
        </button>
      ))}
    </div>
  );
}

// Wrapper component for testing
function TestWrapper({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}

describe('Toast Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('ToastProvider', () => {
    it('should render children', () => {
      render(
        <ToastProvider>
          <div data-testid="child">Child content</div>
        </ToastProvider>
      );
      expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    it('should provide toast context', () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );
      expect(screen.getByText('Add Toast')).toBeInTheDocument();
    });
  });

  describe('useToast hook', () => {
    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useToast must be used within a ToastProvider');

      consoleSpy.mockRestore();
    });

    it('should add toast', () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      fireEvent.click(screen.getByText('Add Toast'));
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });

    it('should remove toast manually', async () => {
      vi.useRealTimers(); // Use real timers for this test

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      fireEvent.click(screen.getByText('Add Toast'));
      expect(screen.getByText('Test message')).toBeInTheDocument();

      // Click the close button on the toast
      const closeButton = screen.getByLabelText('Close notification');
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText('Test message')).not.toBeInTheDocument();
      });

      vi.useFakeTimers(); // Restore fake timers
    });

    it('should auto-remove toast after duration', async () => {
      vi.useRealTimers(); // Use real timers for this test

      render(
        <TestWrapper>
          <TestComponent duration={100} /> {/* Short duration for test */}
        </TestWrapper>
      );

      fireEvent.click(screen.getByText('Add Toast'));
      expect(screen.getByText('Test message')).toBeInTheDocument();

      // Wait for auto-removal
      await waitFor(() => {
        expect(screen.queryByText('Test message')).not.toBeInTheDocument();
      }, { timeout: 500 });

      vi.useFakeTimers(); // Restore fake timers
    });

    it('should not auto-remove toast when duration is 0', async () => {
      render(
        <TestWrapper>
          <TestComponent duration={0} />
        </TestWrapper>
      );

      fireEvent.click(screen.getByText('Add Toast'));
      expect(screen.getByText('Test message')).toBeInTheDocument();

      // Fast-forward time significantly
      act(() => {
        vi.advanceTimersByTime(10000);
      });

      // Toast should still be there
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });

    it('should track toast count', () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      expect(screen.getByTestId('toast-count').textContent).toBe('0');

      fireEvent.click(screen.getByText('Add Toast'));
      expect(screen.getByTestId('toast-count').textContent).toBe('1');

      fireEvent.click(screen.getByText('Add Toast'));
      expect(screen.getByTestId('toast-count').textContent).toBe('2');
    });
  });

  describe('Toast Types', () => {
    it('should render success toast with correct styling', () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      fireEvent.click(screen.getByText('Add Success'));
      const toast = screen.getByRole('alert');
      // Toast uses card background with colored icon
      expect(toast.className).toContain('bg-[var(--card)]');
      expect(toast.className).toContain('border-[var(--border)]');
    });

    it('should render error toast with correct styling', () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      fireEvent.click(screen.getByText('Add Error'));
      const toast = screen.getByRole('alert');
      expect(toast.className).toContain('bg-[var(--card)]');
    });

    it('should render warning toast with correct styling', () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      fireEvent.click(screen.getByText('Add Warning'));
      const toast = screen.getByRole('alert');
      expect(toast.className).toContain('bg-[var(--card)]');
    });

    it('should render info toast with correct styling', () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      fireEvent.click(screen.getByText('Add Info'));
      const toast = screen.getByRole('alert');
      expect(toast.className).toContain('bg-[var(--card)]');
    });
  });

  describe('Toast Container', () => {
    it('should not render container when no toasts', () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      // Container should not be in the DOM when empty
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('should position toasts in bottom-right corner', () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      fireEvent.click(screen.getByText('Add Toast'));

      // Find the container
      const toast = screen.getByRole('alert');
      const container = toast.parentElement;
      expect(container).toHaveClass('fixed');
      expect(container).toHaveClass('bottom-4');
      expect(container).toHaveClass('right-4');
    });

    it('should stack multiple toasts', () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      fireEvent.click(screen.getByText('Add Success'));
      fireEvent.click(screen.getByText('Add Error'));
      fireEvent.click(screen.getByText('Add Warning'));

      const toasts = screen.getAllByRole('alert');
      expect(toasts).toHaveLength(3);
    });
  });

  describe('Toast Accessibility', () => {
    it('should have role="alert" for screen readers', () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      fireEvent.click(screen.getByText('Add Toast'));
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should have accessible close button', () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      fireEvent.click(screen.getByText('Add Toast'));
      expect(screen.getByLabelText('Close notification')).toBeInTheDocument();
    });
  });

  describe('Toast Icons', () => {
    it('should render checkmark icon for success', () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      fireEvent.click(screen.getByText('Add Success'));
      const toast = screen.getByRole('alert');
      const svg = toast.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should render appropriate icon for each type', () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      // Add all types
      fireEvent.click(screen.getByText('Add Success'));
      fireEvent.click(screen.getByText('Add Error'));
      fireEvent.click(screen.getByText('Add Warning'));
      fireEvent.click(screen.getByText('Add Info'));

      // All should have SVG icons
      const toasts = screen.getAllByRole('alert');
      toasts.forEach((toast) => {
        expect(toast.querySelector('svg')).toBeInTheDocument();
      });
    });
  });
});
