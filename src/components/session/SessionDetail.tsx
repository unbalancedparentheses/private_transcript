import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { convertFileSrc } from '@tauri-apps/api/core';
import { useAppStore } from '../../stores/appStore';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import type { TranscriptSegment } from '../../types';
import {
  parseTranscriptIntoSegments,
  parseInlineSpeakerLabels,
  getUniqueSpeakers,
  renameSpeaker,
  segmentsToText,
  getSpeakerColor,
} from '../../lib/speakerDetection';

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

interface SearchMatch {
  start: number;
  end: number;
}

export function SessionDetail() {
  const { currentSession, templates, setView, updateSession } = useAppStore();
  const [selectedTemplate, setSelectedTemplate] = useState(
    templates.find((t) => t.isDefault)?.id || templates[0]?.id || ''
  );
  const [generating, setGenerating] = useState(false);
  const [editingTranscript, setEditingTranscript] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [transcriptText, setTranscriptText] = useState(currentSession?.transcript || '');
  const [noteText, setNoteText] = useState(currentSession?.generatedNote || '');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  // Speaker labels state
  const [showSpeakerView, setShowSpeakerView] = useState(false);
  const [speakerSegments, setSpeakerSegments] = useState<TranscriptSegment[]>([]);
  const [editingSpeaker, setEditingSpeaker] = useState<string | null>(null);
  const [newSpeakerName, setNewSpeakerName] = useState('');

  // Parse transcript into speaker segments when speaker view is enabled
  useEffect(() => {
    if (showSpeakerView && currentSession?.transcript) {
      // Check if transcript already has speaker labels (e.g., "Name: text")
      const hasInlineLabels = /^[A-Z][a-zA-Z\s]*?:\s/m.test(currentSession.transcript);
      const segments = hasInlineLabels
        ? parseInlineSpeakerLabels(currentSession.transcript)
        : parseTranscriptIntoSegments(currentSession.transcript);
      setSpeakerSegments(segments);
    }
  }, [showSpeakerView, currentSession?.transcript]);

  // Get unique speakers for the rename dropdown
  const uniqueSpeakers = useMemo(() => {
    return getUniqueSpeakers(speakerSegments);
  }, [speakerSegments]);

  // Handle speaker rename
  const handleRenameSpeaker = () => {
    if (editingSpeaker && newSpeakerName.trim()) {
      const updatedSegments = renameSpeaker(speakerSegments, editingSpeaker, newSpeakerName.trim());
      setSpeakerSegments(updatedSegments);
      setEditingSpeaker(null);
      setNewSpeakerName('');
    }
  };

  // Audio player state
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);

  // Compute search matches
  const searchMatches = useMemo((): SearchMatch[] => {
    if (!searchQuery || !currentSession?.transcript) return [];

    const matches: SearchMatch[] = [];
    const text = currentSession.transcript.toLowerCase();
    const query = searchQuery.toLowerCase();

    let index = 0;
    while ((index = text.indexOf(query, index)) !== -1) {
      matches.push({ start: index, end: index + query.length });
      index += 1;
    }

    return matches;
  }, [searchQuery, currentSession?.transcript]);

  // Reset current match when search changes
  useEffect(() => {
    setCurrentMatchIndex(0);
  }, [searchQuery]);

  // Scroll to current match
  useEffect(() => {
    if (searchMatches.length > 0 && transcriptRef.current) {
      const highlightedElement = transcriptRef.current.querySelector('.search-highlight-current');
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentMatchIndex, searchMatches]);

  // Keyboard shortcuts for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + F to toggle search
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        setShowSearch(true);
        setTimeout(() => searchInputRef.current?.focus(), 0);
      }
      // Escape to close search
      if (e.key === 'Escape' && showSearch) {
        setShowSearch(false);
        setSearchQuery('');
      }
      // Enter to go to next match
      if (e.key === 'Enter' && showSearch && searchMatches.length > 0) {
        e.preventDefault();
        if (e.shiftKey) {
          goToPreviousMatch();
        } else {
          goToNextMatch();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSearch, searchMatches.length]);

  const goToNextMatch = useCallback(() => {
    if (searchMatches.length > 0) {
      setCurrentMatchIndex((prev) => (prev + 1) % searchMatches.length);
    }
  }, [searchMatches.length]);

  const goToPreviousMatch = useCallback(() => {
    if (searchMatches.length > 0) {
      setCurrentMatchIndex((prev) => (prev - 1 + searchMatches.length) % searchMatches.length);
    }
  }, [searchMatches.length]);

  // Render transcript with highlighted search matches
  const renderTranscriptWithHighlights = () => {
    if (!currentSession?.transcript) return null;
    if (!searchQuery || searchMatches.length === 0) {
      return <p className="whitespace-pre-wrap text-sm leading-relaxed">{currentSession.transcript}</p>;
    }

    const text = currentSession.transcript;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    searchMatches.forEach((match, index) => {
      // Add text before match
      if (match.start > lastIndex) {
        parts.push(text.slice(lastIndex, match.start));
      }

      // Add highlighted match
      const isCurrentMatch = index === currentMatchIndex;
      parts.push(
        <mark
          key={`match-${index}`}
          className={`rounded px-0.5 ${
            isCurrentMatch
              ? 'bg-[var(--primary)] text-white search-highlight-current'
              : 'bg-yellow-200 dark:bg-yellow-500/30'
          }`}
        >
          {text.slice(match.start, match.end)}
        </mark>
      );

      lastIndex = match.end;
    });

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return <p className="whitespace-pre-wrap text-sm leading-relaxed">{parts}</p>;
  };

  // Convert file path to audio source
  useEffect(() => {
    if (currentSession?.audioPath) {
      console.log('[Audio] Session audioPath:', currentSession.audioPath);
      try {
        const src = convertFileSrc(currentSession.audioPath);
        console.log('[Audio] Converted path:', currentSession.audioPath, '→', src);
        setAudioSrc(src);
        setAudioError(null);
      } catch (err) {
        const errorMsg = `Failed to convert audio path: ${err}`;
        console.error('[Audio] Conversion error:', err);
        setAudioError(errorMsg);
      }
    } else {
      setAudioSrc(null);
    }
  }, [currentSession?.audioPath, currentSession?.id]);

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const skipBackward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10);
    }
  };

  const skipForward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 10);
    }
  };

  if (!currentSession) {
    return null;
  }

  const handleGenerateNote = async () => {
    if (!selectedTemplate || !currentSession.transcript) return;

    setGenerating(true);
    try {
      await updateSession(currentSession.id, { status: 'generating' });

      const note = await invoke<string>('generate_note', {
        transcript: currentSession.transcript,
        templateId: selectedTemplate,
      });

      await updateSession(currentSession.id, {
        generatedNote: note,
        templateId: selectedTemplate,
        status: 'complete',
      });
      setNoteText(note);
    } catch (error) {
      console.error('Failed to generate note:', error);
      await updateSession(currentSession.id, {
        status: 'error',
        errorMessage: String(error),
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveTranscript = async () => {
    await updateSession(currentSession.id, { transcript: transcriptText });
    setEditingTranscript(false);
  };

  const handleSaveNote = async () => {
    await updateSession(currentSession.id, { generatedNote: noteText });
    setEditingNote(false);
  };

  const handleExport = async (format: 'markdown' | 'pdf' | 'docx') => {
    const content = `# ${currentSession.title || 'Session'}\n\n## Transcript\n\n${currentSession.transcript || ''}\n\n## Notes\n\n${currentSession.generatedNote || ''}`;
    const filename = `session-${currentSession.id.slice(0, 8)}`;

    try {
      const path = await invoke<string>(`export_${format}`, { content, filename });
      alert(`Exported to: ${path}`);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed');
    }
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  return (
    <main className="flex-1 flex flex-col overflow-hidden bg-[var(--background)]">
      {/* Header */}
      <header className="h-14 px-6 flex items-center justify-between border-b border-[var(--border)] bg-[var(--card)]/50 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setView('list')}
            className="flex items-center gap-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors group"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                 className="group-hover:-translate-x-0.5 transition-transform">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-medium">Back</span>
          </button>
          <div className="w-px h-5 bg-[var(--border)]" />
          <h1 className="text-sm font-semibold truncate max-w-[200px]">
            {currentSession.title || 'Session'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            className="h-8 px-3 rounded-lg bg-[var(--muted)] border-0 text-xs font-medium cursor-pointer
                       focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
          >
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            onClick={handleGenerateNote}
            disabled={generating || !currentSession.transcript}
            loading={generating}
          >
            Generate Note
          </Button>
          <div className="relative group">
            <Button variant="secondary" size="sm">
              Export
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </Button>
            <div className="absolute right-0 top-full mt-1 py-1 w-32 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button
                onClick={() => handleExport('markdown')}
                className="w-full px-3 py-1.5 text-xs text-left hover:bg-[var(--muted)] transition-colors"
              >
                Markdown
              </button>
              <button
                onClick={() => handleExport('pdf')}
                className="w-full px-3 py-1.5 text-xs text-left hover:bg-[var(--muted)] transition-colors"
              >
                PDF
              </button>
              <button
                onClick={() => handleExport('docx')}
                className="w-full px-3 py-1.5 text-xs text-left hover:bg-[var(--muted)] transition-colors"
              >
                Word
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Audio Player */}
      {audioSrc ? (
        <div className="px-6 py-3 border-b border-[var(--border)] bg-[var(--muted)]/30">
          <audio
            ref={audioRef}
            src={audioSrc}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
            onError={(e) => {
              const audio = e.currentTarget;
              const errorCode = audio.error?.code;
              const errorTypes: Record<number, string> = {
                1: 'MEDIA_ERR_ABORTED',
                2: 'MEDIA_ERR_NETWORK',
                3: 'MEDIA_ERR_DECODE',
                4: 'MEDIA_ERR_SRC_NOT_SUPPORTED'
              };
              const errorType = errorCode ? errorTypes[errorCode] || `Error ${errorCode}` : 'Unknown';
              console.error('[Audio] Playback error:', errorType);
              setAudioError(`Audio playback failed: ${errorType}`);
            }}
          />
          <div className="flex items-center gap-3">
            {/* Controls */}
            <div className="flex items-center gap-1">
              <button
                onClick={skipBackward}
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[var(--muted)] transition-colors"
                title="Skip back 10s"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 4v6h6M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                </svg>
              </button>
              <button
                onClick={togglePlayPause}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-[var(--primary)] text-white hover:opacity-90 transition-opacity"
              >
                {isPlaying ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" rx="1" />
                    <rect x="14" y="4" width="4" height="16" rx="1" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>
              <button
                onClick={skipForward}
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[var(--muted)] transition-colors"
                title="Skip forward 10s"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M23 4v6h-6M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
              </button>
            </div>

            {/* Time */}
            <span className="text-xs text-[var(--muted-foreground)] font-mono w-10 text-right tabular-nums">
              {formatTime(currentTime)}
            </span>

            {/* Progress */}
            <div className="flex-1">
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="audio-progress"
              />
            </div>

            {/* Duration */}
            <span className="text-xs text-[var(--muted-foreground)] font-mono w-10 tabular-nums">
              {formatTime(duration)}
            </span>
          </div>
          {audioError && (
            <p className="text-xs text-[var(--destructive)] mt-2">{audioError}</p>
          )}
        </div>
      ) : currentSession?.audioPath ? (
        <div className="px-6 py-3 border-b border-[var(--border)] bg-[var(--muted)]/30">
          <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
            <div className="spinner" />
            <span className="text-xs">Loading audio...</span>
          </div>
        </div>
      ) : null}

      {/* Two-column layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Transcript Column */}
        <div className="flex-1 flex flex-col border-r border-[var(--border)]">
          <div className="px-4 py-2.5 border-b border-[var(--border)] flex items-center justify-between gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
              Transcript
            </h2>
            <div className="flex items-center gap-1.5">
              {/* Search */}
              {showSearch ? (
                <div className="flex items-center gap-1.5 animate-scale-in">
                  <div className="relative">
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search..."
                      className="h-7 w-40 pl-7 pr-2 text-xs rounded-md border border-[var(--border)] bg-[var(--background)]
                                 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                    />
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]"
                    >
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.35-4.35" />
                    </svg>
                  </div>
                  {searchMatches.length > 0 && (
                    <>
                      <span className="text-[10px] text-[var(--muted-foreground)] tabular-nums">
                        {currentMatchIndex + 1}/{searchMatches.length}
                      </span>
                      <button
                        onClick={goToPreviousMatch}
                        className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--muted)] transition-colors"
                        title="Previous match (Shift+Enter)"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 15l-6-6-6 6" />
                        </svg>
                      </button>
                      <button
                        onClick={goToNextMatch}
                        className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--muted)] transition-colors"
                        title="Next match (Enter)"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => {
                      setShowSearch(false);
                      setSearchQuery('');
                    }}
                    className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--muted)] transition-colors"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setShowSearch(true);
                    setTimeout(() => searchInputRef.current?.focus(), 0);
                  }}
                  className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--muted)] transition-colors"
                  title="Search (Cmd+F)"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                </button>
              )}
              {/* Speaker View Toggle */}
              <button
                onClick={() => setShowSpeakerView(!showSpeakerView)}
                className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${
                  showSpeakerView
                    ? 'bg-[var(--primary)] text-white'
                    : 'hover:bg-[var(--muted)]'
                }`}
                title={showSpeakerView ? 'Show plain text' : 'Show speaker labels'}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(showSpeakerView ? segmentsToText(speakerSegments) : currentSession.transcript || '')}
                className="h-7 px-2 text-xs"
              >
                Copy
              </Button>
              {editingTranscript ? (
                <>
                  <Button size="sm" onClick={handleSaveTranscript} className="h-7 px-2 text-xs">
                    Save
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setTranscriptText(currentSession.transcript || '');
                      setEditingTranscript(false);
                    }}
                    className="h-7 px-2 text-xs"
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingTranscript(true)}
                  className="h-7 px-2 text-xs"
                >
                  Edit
                </Button>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4" ref={transcriptRef}>
            {editingTranscript ? (
              <textarea
                value={transcriptText}
                onChange={(e) => setTranscriptText(e.target.value)}
                className="w-full h-full p-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm resize-none
                           focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
              />
            ) : showSpeakerView && speakerSegments.length > 0 ? (
              <div className="space-y-4">
                {/* Speaker Legend */}
                <div className="flex flex-wrap gap-2 pb-3 border-b border-[var(--border)]">
                  {uniqueSpeakers.map((speaker) => (
                    <button
                      key={speaker}
                      onClick={() => {
                        setEditingSpeaker(speaker);
                        setNewSpeakerName(speaker);
                      }}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium
                                 bg-[var(--muted)] hover:bg-[var(--muted)]/80 transition-colors group"
                      title="Click to rename speaker"
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: getSpeakerColor(speaker) }}
                      />
                      {speaker}
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="opacity-0 group-hover:opacity-50 transition-opacity"
                      >
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                  ))}
                </div>

                {/* Speaker Rename Dialog */}
                {editingSpeaker && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-[var(--muted)]/50 animate-fade-in">
                    <span className="text-xs text-[var(--muted-foreground)]">Rename:</span>
                    <input
                      type="text"
                      value={newSpeakerName}
                      onChange={(e) => setNewSpeakerName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameSpeaker();
                        if (e.key === 'Escape') {
                          setEditingSpeaker(null);
                          setNewSpeakerName('');
                        }
                      }}
                      className="h-7 px-2 text-xs rounded border border-[var(--border)] bg-[var(--background)]
                                 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                      autoFocus
                    />
                    <Button size="sm" onClick={handleRenameSpeaker} className="h-7 px-2 text-xs">
                      Save
                    </Button>
                    <button
                      onClick={() => {
                        setEditingSpeaker(null);
                        setNewSpeakerName('');
                      }}
                      className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {/* Speaker Segments */}
                <div className="space-y-3">
                  {speakerSegments.map((segment, index) => (
                    <div key={index} className="flex gap-3 animate-fade-in" style={{ animationDelay: `${index * 20}ms` }}>
                      <div className="flex-shrink-0 pt-0.5">
                        <span
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold text-white"
                          style={{ backgroundColor: getSpeakerColor(segment.speaker || 'Speaker 1') }}
                        >
                          {segment.speaker || 'Speaker 1'}
                        </span>
                      </div>
                      <p className="flex-1 text-sm leading-relaxed whitespace-pre-wrap">
                        {segment.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="prose prose-sm max-w-none">
                {currentSession.transcript ? (
                  renderTranscriptWithHighlights()
                ) : (
                  <p className="text-[var(--muted-foreground)] text-sm italic">
                    {currentSession.status === 'transcribing'
                      ? 'Transcribing...'
                      : 'No transcript available'}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Notes Column */}
        <div className="flex-1 flex flex-col">
          <div className="px-4 py-2.5 border-b border-[var(--border)] flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
              Notes
            </h2>
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(currentSession.generatedNote || '')}
                className="h-7 px-2 text-xs"
              >
                Copy
              </Button>
              {editingNote ? (
                <>
                  <Button size="sm" onClick={handleSaveNote} className="h-7 px-2 text-xs">
                    Save
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setNoteText(currentSession.generatedNote || '');
                      setEditingNote(false);
                    }}
                    className="h-7 px-2 text-xs"
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingNote(true)}
                  className="h-7 px-2 text-xs"
                >
                  Edit
                </Button>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {editingNote ? (
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                className="w-full h-full p-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm resize-none
                           focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
              />
            ) : (
              <div className="prose prose-sm max-w-none">
                {currentSession.generatedNote ? (
                  <div
                    className="whitespace-pre-wrap text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{
                      __html: currentSession.generatedNote
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\n/g, '<br />'),
                    }}
                  />
                ) : (
                  <p className="text-[var(--muted-foreground)] text-sm italic">
                    {currentSession.status === 'generating'
                      ? 'Generating note...'
                      : 'No note generated yet. Select a template and click "Generate Note".'}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
