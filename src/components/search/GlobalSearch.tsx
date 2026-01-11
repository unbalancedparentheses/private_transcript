import { useState, useEffect, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from '../../stores/appStore';
import type { Session } from '../../types';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { selectSession } = useAppStore();

  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Search on query change with debounce
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const sessions = await invoke<Session[]>('search_sessions', {
          query: query.trim(),
          limit: 20,
        });
        setResults(sessions);
        setSelectedIndex(0);
      } catch (error) {
        console.error('Search failed:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            handleSelect(results[selectedIndex]);
          }
          break;
        case 'Escape':
          onClose();
          break;
      }
    },
    [results, selectedIndex, onClose]
  );

  const handleSelect = (session: Session) => {
    selectSession(session);
    onClose();
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getPreview = (session: Session) => {
    // Find where the query matches in the content
    const searchTerm = query.toLowerCase();
    const sources = [
      session.title,
      session.transcript,
      session.generatedNote,
    ].filter(Boolean);

    for (const source of sources) {
      if (!source) continue;
      const lowerSource = source.toLowerCase();
      const index = lowerSource.indexOf(searchTerm);
      if (index !== -1) {
        const start = Math.max(0, index - 30);
        const end = Math.min(source.length, index + searchTerm.length + 30);
        let preview = source.slice(start, end);
        if (start > 0) preview = '...' + preview;
        if (end < source.length) preview = preview + '...';
        return preview;
      }
    }

    // Fallback to transcript start
    return session.transcript?.slice(0, 60) + '...';
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Dialog */}
      <div
        className="relative w-full max-w-xl mx-4 rounded-xl bg-[var(--card)] border border-[var(--border)] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 p-3 border-b border-[var(--border)]">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-[var(--muted-foreground)]"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search all sessions..."
            className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-[var(--muted-foreground)]"
          />
          {loading && (
            <div className="w-4 h-4 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
          )}
          <kbd className="px-1.5 py-0.5 text-[10px] text-[var(--muted-foreground)] bg-[var(--secondary)] rounded">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto">
          {query.trim() === '' ? (
            <div className="p-8 text-center text-[var(--muted-foreground)]">
              <p className="text-[13px]">Search across all your sessions</p>
              <p className="text-[11px] mt-1">Titles, transcripts, and notes</p>
            </div>
          ) : results.length === 0 && !loading ? (
            <div className="p-8 text-center text-[var(--muted-foreground)]">
              <p className="text-[13px]">No results found</p>
              <p className="text-[11px] mt-1">Try a different search term</p>
            </div>
          ) : (
            <div className="p-1">
              {results.map((session, index) => (
                <button
                  key={session.id}
                  onClick={() => handleSelect(session)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    index === selectedIndex
                      ? 'bg-[var(--primary)] text-white'
                      : 'hover:bg-[var(--secondary)]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[13px] font-medium truncate">
                      {session.title || 'Untitled Session'}
                    </span>
                    <span
                      className={`text-[11px] shrink-0 ml-2 ${
                        index === selectedIndex
                          ? 'text-white/70'
                          : 'text-[var(--muted-foreground)]'
                      }`}
                    >
                      {formatDate(session.createdAt)}
                    </span>
                  </div>
                  <p
                    className={`text-[12px] line-clamp-2 ${
                      index === selectedIndex
                        ? 'text-white/80'
                        : 'text-[var(--muted-foreground)]'
                    }`}
                  >
                    {getPreview(session)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {results.length > 0 && (
          <div className="p-2 border-t border-[var(--border)] flex items-center justify-between text-[11px] text-[var(--muted-foreground)]">
            <span>{results.length} result{results.length !== 1 ? 's' : ''}</span>
            <div className="flex items-center gap-2">
              <span>
                <kbd className="px-1 py-0.5 bg-[var(--secondary)] rounded">↑↓</kbd> to navigate
              </span>
              <span>
                <kbd className="px-1 py-0.5 bg-[var(--secondary)] rounded">↵</kbd> to select
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
