import { useState, useEffect, useRef } from 'react';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import type { LiveTranscriptionEvent, TranscriptionErrorEvent } from '../../types';

interface Props {
  sessionId: string;
  isActive: boolean;
  onError?: (error: string) => void;
}

interface ConfirmedSegment {
  text: string;
  timestamp: number;
}

/**
 * LiveTranscriptionDisplay shows real-time transcription results
 * as the user speaks. It distinguishes between confirmed (final)
 * text and tentative (may change) text.
 */
export function LiveTranscriptionDisplay({ sessionId, isActive, onError }: Props) {
  const [confirmedSegments, setConfirmedSegments] = useState<ConfirmedSegment[]>([]);
  const [tentativeText, setTentativeText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new text arrives
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [confirmedSegments, tentativeText]);

  // Listen for transcription events
  useEffect(() => {
    if (!isActive) {
      return;
    }

    let unlistenTranscription: UnlistenFn | null = null;
    let unlistenError: UnlistenFn | null = null;

    const setupListeners = async () => {
      // Listen for live transcription events
      unlistenTranscription = await listen<LiveTranscriptionEvent>(
        'live-transcription',
        (event) => {
          const { sessionId: eventSessionId, text, isFinal, timestamp } = event.payload;

          // Only process events for this session
          if (eventSessionId !== sessionId) return;

          if (isFinal) {
            // Add to confirmed segments
            setConfirmedSegments((prev) => [...prev, { text, timestamp }]);
            // Clear tentative text since it's now confirmed
            setTentativeText('');
          } else {
            // Update tentative text
            setTentativeText(text);
          }
        }
      );

      // Listen for transcription errors
      unlistenError = await listen<TranscriptionErrorEvent>(
        'transcription-error',
        (event) => {
          const { sessionId: eventSessionId, message } = event.payload;

          // Only process errors for this session or global errors
          if (eventSessionId && eventSessionId !== sessionId) return;

          setError(message);
          onError?.(message);
        }
      );
    };

    setupListeners();

    return () => {
      unlistenTranscription?.();
      unlistenError?.();
    };
  }, [sessionId, isActive, onError]);

  // Reset state when session changes
  useEffect(() => {
    setConfirmedSegments([]);
    setTentativeText('');
    setError(null);
  }, [sessionId]);

  const confirmedText = confirmedSegments.map((s) => s.text).join(' ');
  const hasContent = confirmedText || tentativeText;

  return (
    <div className="live-transcription-container mt-6 w-full max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div
          className={`w-2 h-2 rounded-full ${
            isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
          }`}
        />
        <span className="text-xs font-medium text-[var(--muted-foreground)]">
          {isActive ? 'Live Transcription' : 'Transcription Paused'}
        </span>
      </div>

      {/* Transcript Display */}
      <div
        ref={containerRef}
        className="h-32 overflow-y-auto p-4 rounded-lg border border-[var(--border)] bg-[var(--muted)]/20"
      >
        {error ? (
          <div className="text-sm text-red-500">
            <span className="font-medium">Error:</span> {error}
          </div>
        ) : hasContent ? (
          <div className="text-sm text-[var(--foreground)] leading-relaxed">
            {/* Confirmed text */}
            {confirmedText && (
              <span className="text-[var(--foreground)]">{confirmedText} </span>
            )}
            {/* Tentative text */}
            {tentativeText && (
              <span className="text-[var(--muted-foreground)] italic">
                {tentativeText}
              </span>
            )}
          </div>
        ) : (
          <p className="text-xs text-[var(--muted-foreground)] italic text-center">
            {isActive
              ? 'Listening... speak to see live transcription'
              : 'Start recording to see live transcription'}
          </p>
        )}
      </div>

      {/* Stats */}
      {hasContent && (
        <div className="mt-2 flex justify-between text-xs text-[var(--muted-foreground)]">
          <span>{confirmedSegments.length} confirmed segments</span>
          <span>
            {(confirmedText + ' ' + tentativeText).trim().split(/\s+/).filter(Boolean).length} words
          </span>
        </div>
      )}
    </div>
  );
}

export default LiveTranscriptionDisplay;
