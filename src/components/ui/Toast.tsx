import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { cn } from '../../lib/utils';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  progress?: number;
  action?: ToastAction;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (message: string, type?: ToastType, options?: { duration?: number; progress?: number; action?: ToastAction }) => string;
  updateToast: (id: string, updates: Partial<Toast>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((
    message: string,
    type: ToastType = 'info',
    options?: { duration?: number; progress?: number; action?: ToastAction }
  ) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const duration = options?.duration ?? 5000;
    const newToast: Toast = {
      id,
      message,
      type,
      duration,
      progress: options?.progress,
      action: options?.action,
    };
    setToasts((prev) => [...prev, newToast]);

    // Auto-remove after duration (unless it has progress, then it's manual)
    if (duration > 0 && options?.progress === undefined) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  }, []);

  const updateToast = useCallback((id: string, updates: Partial<Toast>) => {
    setToasts((prev) =>
      prev.map((toast) =>
        toast.id === id ? { ...toast, ...updates } : toast
      )
    );
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, updateToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  removeToast: (id: string) => void;
}

function ToastContainer({ toasts, removeToast }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

interface ToastItemProps {
  toast: Toast;
  onClose: () => void;
}

function ToastItem({ toast, onClose }: ToastItemProps) {
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 150);
  };

  const iconMap = {
    success: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M20 6L9 17l-5-5" />
      </svg>
    ),
    error: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    ),
    warning: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    info: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
  };

  const colorMap = {
    success: 'text-[var(--success)]',
    error: 'text-[var(--destructive)]',
    warning: 'text-[var(--warning)]',
    info: 'text-[var(--primary)]',
  };

  const progressColorMap = {
    success: 'bg-[var(--success)]',
    error: 'bg-[var(--destructive)]',
    warning: 'bg-[var(--warning)]',
    info: 'bg-[var(--primary)]',
  };

  return (
    <div
      className={cn(
        'flex flex-col rounded-lg bg-[var(--card)] border border-[var(--border)] shadow-lg overflow-hidden',
        'transition-all duration-150',
        isExiting ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0 animate-slide-in-right'
      )}
      role="alert"
    >
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <span className={cn('flex-shrink-0', colorMap[toast.type])}>{iconMap[toast.type]}</span>
        <p className="flex-1 text-[13px] text-[var(--foreground)]">{toast.message}</p>
        {toast.action && (
          <button
            onClick={() => {
              toast.action?.onClick();
              handleClose();
            }}
            className="flex-shrink-0 px-2 py-1 text-[12px] font-medium text-[var(--primary)] hover:bg-[var(--primary)]/10 rounded transition-colors"
          >
            {toast.action.label}
          </button>
        )}
        <button
          onClick={handleClose}
          className="flex-shrink-0 p-0.5 rounded text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          aria-label="Close notification"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      {toast.progress !== undefined && (
        <div className="h-1 bg-[var(--muted)]">
          <div
            className={cn('h-full transition-all duration-300', progressColorMap[toast.type])}
            style={{ width: `${Math.min(100, Math.max(0, toast.progress))}%` }}
          />
        </div>
      )}
    </div>
  );
}
