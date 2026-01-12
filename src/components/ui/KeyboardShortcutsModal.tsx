import { useState, useEffect } from 'react';

interface Shortcut {
  keys: string[];
  description: string;
  category: string;
}

const shortcuts: Shortcut[] = [
  // Navigation
  { keys: ['⌘', 'K'], description: 'Open global search', category: 'Navigation' },
  { keys: ['⌘', '/'], description: 'Show keyboard shortcuts', category: 'Navigation' },
  { keys: ['Esc'], description: 'Close modal / Go back', category: 'Navigation' },

  // Transcript
  { keys: ['⌘', 'F'], description: 'Search in transcript', category: 'Transcript' },
  { keys: ['Enter'], description: 'Next search match', category: 'Transcript' },
  { keys: ['⇧', 'Enter'], description: 'Previous search match', category: 'Transcript' },

  // Playback
  { keys: ['Space'], description: 'Play / Pause audio', category: 'Playback' },
  { keys: ['←'], description: 'Skip back 10 seconds', category: 'Playback' },
  { keys: ['→'], description: 'Skip forward 10 seconds', category: 'Playback' },
];

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Group shortcuts by category
  const categories = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, Shortcut[]>);

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-[var(--card)] rounded-xl shadow-xl max-w-md w-full mx-4 border border-[var(--border)] animate-scale-in overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-[var(--foreground)]">
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4 max-h-[60vh] overflow-y-auto">
          {Object.entries(categories).map(([category, categoryShortcuts]) => (
            <div key={category} className="mb-5 last:mb-0">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-2">
                {category}
              </h3>
              <div className="space-y-2">
                {categoryShortcuts.map((shortcut, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-[13px] text-[var(--foreground)]">
                      {shortcut.description}
                    </span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIndex) => (
                        <kbd
                          key={keyIndex}
                          className="min-w-[24px] h-6 px-1.5 flex items-center justify-center
                                     bg-[var(--muted)] border border-[var(--border)] rounded-md
                                     text-[11px] font-medium text-[var(--muted-foreground)]
                                     shadow-[0_1px_0_var(--border)]"
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[var(--border)] bg-[var(--muted)]/30">
          <p className="text-[11px] text-[var(--muted-foreground)] text-center">
            Press <kbd className="px-1 py-0.5 bg-[var(--muted)] border border-[var(--border)] rounded text-[10px]">⌘</kbd> + <kbd className="px-1 py-0.5 bg-[var(--muted)] border border-[var(--border)] rounded text-[10px]">/</kbd> to toggle this panel
          </p>
        </div>
      </div>
    </div>
  );
}

// Hook to manage keyboard shortcuts modal
export function useKeyboardShortcuts() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === '/') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen((prev) => !prev),
  };
}
