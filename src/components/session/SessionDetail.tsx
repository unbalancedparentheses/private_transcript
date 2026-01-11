import { useState, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { convertFileSrc } from '@tauri-apps/api/core';
import { useAppStore } from '../../stores/appStore';
import { Button } from '../ui/Button';

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
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

  // Audio player state
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);

  // Convert file path to audio source
  useEffect(() => {
    if (currentSession?.audioPath) {
      console.log('[Audio] Session audioPath:', currentSession.audioPath);
      console.log('[Audio] Session ID:', currentSession.id);
      console.log('[Audio] Session status:', currentSession.status);

      try {
        const src = convertFileSrc(currentSession.audioPath);
        console.log('[Audio] Converted path:', currentSession.audioPath, '→', src);
        setAudioSrc(src);
        setAudioError(null);
      } catch (err) {
        const errorMsg = `Failed to convert audio path: ${err}`;
        console.error('[Audio] Conversion error:', err);
        console.error('[Audio] Original path:', currentSession.audioPath);
        setAudioError(errorMsg);
      }
    } else {
      console.log('[Audio] No audioPath in session');
      setAudioSrc(null);
    }
  }, [currentSession?.audioPath, currentSession?.id, currentSession?.status]);

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
    <main className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-14 px-6 flex items-center justify-between border-b border-border shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setView('list')}>
            ← Back
          </Button>
          <h1 className="text-lg font-semibold truncate">
            {currentSession.title || 'Session'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-background border border-border text-sm"
          >
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
          <Button
            onClick={handleGenerateNote}
            disabled={generating || !currentSession.transcript}
          >
            {generating ? 'Generating...' : 'Generate Note'}
          </Button>
          <div className="relative group">
            <Button variant="secondary">Export ▾</Button>
            <div className="absolute right-0 top-full mt-1 py-1 bg-background border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button
                onClick={() => handleExport('markdown')}
                className="w-full px-4 py-2 text-sm text-left hover:bg-accent"
              >
                Markdown
              </button>
              <button
                onClick={() => handleExport('pdf')}
                className="w-full px-4 py-2 text-sm text-left hover:bg-accent"
              >
                PDF
              </button>
              <button
                onClick={() => handleExport('docx')}
                className="w-full px-4 py-2 text-sm text-left hover:bg-accent"
              >
                Word
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Audio Player */}
      {audioSrc ? (
        <div className="px-6 py-4 border-b border-border bg-muted/30">
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
              const errorMessage = audio.error?.message || 'Unknown error';
              const errorTypes: Record<number, string> = {
                1: 'MEDIA_ERR_ABORTED - Fetching process aborted',
                2: 'MEDIA_ERR_NETWORK - Network error occurred',
                3: 'MEDIA_ERR_DECODE - Error decoding media',
                4: 'MEDIA_ERR_SRC_NOT_SUPPORTED - Format not supported'
              };
              const errorType = errorCode ? errorTypes[errorCode] || `Unknown error code: ${errorCode}` : 'No error code';
              console.error('[Audio] Playback error:');
              console.error('[Audio]   Error code:', errorCode, '-', errorType);
              console.error('[Audio]   Error message:', errorMessage);
              console.error('[Audio]   Audio src:', audio.src);
              console.error('[Audio]   Ready state:', audio.readyState);
              console.error('[Audio]   Network state:', audio.networkState);
              setAudioError(`Audio playback failed: ${errorType}`);
            }}
          />
          <div className="flex items-center gap-4">
            {/* Play/Pause Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={skipBackward}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
                title="Skip back 10s"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 3v9l-9 9" />
                  <path d="M12 12V3" />
                  <path d="M3 12h9" />
                </svg>
              </button>
              <button
                onClick={togglePlayPause}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              >
                {isPlaying ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" rx="1" />
                    <rect x="14" y="4" width="4" height="16" rx="1" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>
              <button
                onClick={skipForward}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
                title="Skip forward 10s"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 3v9l9 9" />
                  <path d="M12 12V3" />
                  <path d="M21 12h-9" />
                </svg>
              </button>
            </div>

            {/* Time Display */}
            <span className="text-sm text-muted-foreground w-12 text-right">
              {formatTime(currentTime)}
            </span>

            {/* Progress Bar */}
            <div className="flex-1">
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer
                         [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                         [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer
                         [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full
                         [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0"
              />
            </div>

            {/* Duration */}
            <span className="text-sm text-muted-foreground w-12">
              {formatTime(duration)}
            </span>
          </div>
          {audioError && (
            <p className="text-xs text-red-500 mt-2">{audioError}</p>
          )}
        </div>
      ) : currentSession?.audioPath ? (
        <div className="px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2 text-muted-foreground">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            <span className="text-sm">Loading audio...</span>
          </div>
        </div>
      ) : (
        <div className="px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2 text-muted-foreground">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
            <span className="text-sm">No audio file available for this session</span>
          </div>
        </div>
      )}

      {/* Two-column layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Transcript Column */}
        <div className="flex-1 flex flex-col border-r border-border">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 className="font-medium">Transcript</h2>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(currentSession.transcript || '')}
              >
                Copy
              </Button>
              {editingTranscript ? (
                <>
                  <Button size="sm" onClick={handleSaveTranscript}>
                    Save
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setTranscriptText(currentSession.transcript || '');
                      setEditingTranscript(false);
                    }}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingTranscript(true)}
                >
                  Edit
                </Button>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {editingTranscript ? (
              <textarea
                value={transcriptText}
                onChange={(e) => setTranscriptText(e.target.value)}
                className="w-full h-full p-3 rounded-lg border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              />
            ) : (
              <div className="prose prose-sm max-w-none">
                {currentSession.transcript ? (
                  <p className="whitespace-pre-wrap">{currentSession.transcript}</p>
                ) : (
                  <p className="text-muted-foreground italic">
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
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 className="font-medium">Notes</h2>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(currentSession.generatedNote || '')}
              >
                Copy
              </Button>
              {editingNote ? (
                <>
                  <Button size="sm" onClick={handleSaveNote}>
                    Save
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setNoteText(currentSession.generatedNote || '');
                      setEditingNote(false);
                    }}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setEditingNote(true)}>
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
                className="w-full h-full p-3 rounded-lg border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              />
            ) : (
              <div className="prose prose-sm max-w-none">
                {currentSession.generatedNote ? (
                  <div
                    className="whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{
                      __html: currentSession.generatedNote
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\n/g, '<br />'),
                    }}
                  />
                ) : (
                  <p className="text-muted-foreground italic">
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
