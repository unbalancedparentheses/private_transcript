import { useState, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from '../../stores/appStore';
import { Button } from '../ui/Button';

export function RecordingView() {
  const { currentFolder, createSession, setView, updateSession } = useAppStore();
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const getSupportedMimeType = () => {
    // Prefer formats that Symphonia can decode (no Opus support)
    // Priority: MP4/AAC > OGG/Vorbis > WAV > WebM (fallback, may not work)
    const types = [
      'audio/mp4',                    // AAC codec - supported by Symphonia
      'audio/ogg;codecs=vorbis',      // Vorbis codec - supported by Symphonia
      'audio/ogg',                    // Vorbis codec - supported by Symphonia
      'audio/wav',                    // PCM - supported by Symphonia
      'audio/webm;codecs=opus',       // Opus - NOT supported, last resort
      'audio/webm',                   // Opus - NOT supported, last resort
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        console.log('[Recording] Using audio format:', type);
        return type;
      }
    }
    console.warn('[Recording] No supported audio format found');
    return '';
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mimeType = getSupportedMimeType();
      const options: MediaRecorderOptions = mimeType ? { mimeType } : {};

      const mediaRecorder = new MediaRecorder(stream, options);
      const actualMimeType = mediaRecorder.mimeType || 'audio/webm';

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: actualMimeType });
        setAudioBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setDuration(0);

      timerRef.current = window.setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('Failed to access microphone. Please check permissions in System Preferences > Security & Privacy > Microphone.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const handleSave = async () => {
    if (!audioBlob || !currentFolder) return;

    setIsSaving(true);

    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioData = Array.from(new Uint8Array(arrayBuffer));
      const tempId = crypto.randomUUID();

      const mimeType = audioBlob.type;
      let format = 'webm';
      if (mimeType.includes('mp4')) format = 'm4a';
      else if (mimeType.includes('ogg')) format = 'ogg';
      else if (mimeType.includes('wav')) format = 'wav';
      console.log('[Recording] Saving with format:', format, 'mimeType:', mimeType);

      const audioPath = await invoke<string>('save_audio_file', {
        sessionId: tempId,
        audioData,
        format,
      });

      const session = await createSession(audioPath, `Recording ${new Date().toLocaleString()}`);
      await updateSession(session.id, { status: 'transcribing' });

      try {
        const transcript = await invoke<string>('transcribe_audio', {
          sessionId: session.id,
          audioPath,
        });

        await updateSession(session.id, {
          transcript,
          status: 'complete',
        });
      } catch (error) {
        console.error('Transcription failed:', error);
        await updateSession(session.id, {
          status: 'error',
          errorMessage: String(error),
        });
      }

      setView('list');
    } catch (error) {
      console.error('Failed to save recording:', error);
      alert('Failed to save recording.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (isRecording) {
      stopRecording();
    }
    setAudioBlob(null);
    setDuration(0);
    setView('list');
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!currentFolder) {
    return (
      <main className="flex-1 flex items-center justify-center bg-[var(--background)]">
        <div className="text-center">
          <p className="text-[var(--muted-foreground)] mb-4">Please select a folder first</p>
          <Button variant="ghost" onClick={() => setView('list')}>
            Go Back
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col bg-[var(--background)]">
      {/* Header */}
      <header className="h-16 px-8 flex items-center justify-between border-b border-[var(--border)] bg-[var(--card)]">
        <div className="flex items-center gap-3">
          <button
            onClick={handleCancel}
            className="flex items-center gap-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-medium">Back</span>
          </button>
        </div>
        <h1 className="text-lg font-semibold text-[var(--foreground)]">New Recording</h1>
        <div className="w-20" />
      </header>

      {/* Recording Area */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          {/* Recording Indicator */}
          <div className="mb-10">
            <div
              className={`relative w-40 h-40 rounded-full mx-auto flex items-center justify-center transition-all ${
                isRecording
                  ? 'bg-red-500 shadow-lg shadow-red-500/30'
                  : audioBlob
                  ? 'bg-[var(--success)] shadow-lg shadow-green-500/30'
                  : 'bg-[var(--muted)]'
              }`}
            >
              {isRecording && (
                <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-20" />
              )}
              {isRecording ? (
                <svg width="48" height="48" viewBox="0 0 24 24" fill="white">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              ) : audioBlob ? (
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              ) : (
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" strokeWidth="1.5">
                  <path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z" />
                  <path d="M19 10v2a7 7 0 01-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="22" />
                </svg>
              )}
            </div>
          </div>

          {/* Duration */}
          <div className="text-5xl font-light tracking-tight mb-10 font-mono text-[var(--foreground)]">
            {formatDuration(duration)}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            {!audioBlob ? (
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all btn-press ${
                  isRecording
                    ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30'
                    : 'bg-[var(--primary)] hover:bg-[var(--primary-hover)] shadow-lg shadow-[var(--primary)]/30'
                }`}
              >
                {isRecording ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                    <circle cx="12" cy="12" r="8" />
                  </svg>
                )}
              </button>
            ) : (
              <>
                <Button
                  size="lg"
                  variant="ghost"
                  onClick={() => {
                    setAudioBlob(null);
                    setDuration(0);
                  }}
                  className="px-6"
                >
                  Discard
                </Button>
                <Button
                  size="lg"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-8 gap-2"
                >
                  {isSaving ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z" />
                        <path d="M19 10v2a7 7 0 01-14 0v-2" />
                      </svg>
                      Save & Transcribe
                    </>
                  )}
                </Button>
              </>
            )}
          </div>

          {/* Instructions */}
          <p className="mt-10 text-[var(--muted-foreground)] text-sm max-w-sm mx-auto leading-relaxed">
            {isRecording
              ? 'Recording in progress. Click the stop button when finished.'
              : audioBlob
              ? 'Recording complete! Save to transcribe your audio locally.'
              : 'Click the button to start recording. All audio is processed locally on your device.'}
          </p>
        </div>
      </div>
    </main>
  );
}
