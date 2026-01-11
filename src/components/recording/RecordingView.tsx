import { useState, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { useAppStore } from '../../stores/appStore';
import { Button } from '../ui/Button';
import { Progress } from '../ui/Progress';
import { useToast } from '../ui/Toast';

interface TranscriptionProgress {
  sessionId: string;
  progress: number;
  status: string;
  message?: string;
}

export function RecordingView() {
  const { currentFolder, createSession, setView, updateSession } = useAppStore();
  const { addToast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [transcriptionProgress, setTranscriptionProgress] = useState<TranscriptionProgress | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Listen for transcription progress events
  useEffect(() => {
    let unlisten: UnlistenFn | null = null;

    const setupListener = async () => {
      unlisten = await listen<TranscriptionProgress>('transcription-progress', (event) => {
        console.log('[RecordingView] Transcription progress:', event.payload);
        setTranscriptionProgress(event.payload);

        if (event.payload.status === 'complete' || event.payload.status === 'error') {
          setIsTranscribing(false);
        }
      });
    };

    setupListener();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      // Clean up audio analysis
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const getSupportedMimeType = () => {
    const types = [
      'audio/mp4',
      'audio/ogg;codecs=vorbis',
      'audio/ogg',
      'audio/wav',
      'audio/webm;codecs=opus',
      'audio/webm',
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

  // Audio level analysis
  const startAudioAnalysis = (stream: MediaStream) => {
    console.log('[Audio] Starting audio level analysis');
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);

    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;
    source.connect(analyser);

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const updateLevel = () => {
      if (!analyserRef.current) return;

      analyserRef.current.getByteFrequencyData(dataArray);

      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / dataArray.length);
      const normalizedLevel = Math.min(100, (rms / 128) * 100);

      setAudioLevel(normalizedLevel);
      animationFrameRef.current = requestAnimationFrame(updateLevel);
    };

    updateLevel();
  };

  const stopAudioAnalysis = () => {
    console.log('[Audio] Stopping audio level analysis');
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevel(0);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = getSupportedMimeType();
      const options: MediaRecorderOptions = mimeType ? { mimeType } : {};

      const mediaRecorder = new MediaRecorder(stream, options);
      const actualMimeType = mediaRecorder.mimeType || 'audio/webm';

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      startAudioAnalysis(stream);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: actualMimeType });
        setAudioBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
        stopAudioAnalysis();
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setDuration(0);

      timerRef.current = window.setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } catch (error) {
      console.error('Failed to start recording:', error);
      addToast('Failed to access microphone. Please check permissions in System Preferences > Security & Privacy > Microphone.', 'error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && (mediaRecorderRef.current.state === 'recording' || mediaRecorderRef.current.state === 'paused')) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      // Pause audio level analysis
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      // Resume timer
      timerRef.current = window.setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
      // Resume audio level analysis
      if (analyserRef.current) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        const updateLevel = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i] * dataArray[i];
          }
          const rms = Math.sqrt(sum / dataArray.length);
          const normalizedLevel = Math.min(100, (rms / 128) * 100);
          setAudioLevel(normalizedLevel);
          animationFrameRef.current = requestAnimationFrame(updateLevel);
        };
        updateLevel();
      }
    }
  };

  const handleSave = async () => {
    if (!audioBlob || !currentFolder) return;

    setIsSaving(true);
    setIsTranscribing(true);
    setTranscriptionProgress(null);

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
      addToast('Failed to save recording. Please try again.', 'error');
    } finally {
      setIsSaving(false);
      setIsTranscribing(false);
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
        <div className="text-center animate-fade-in">
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
      <header className="h-14 px-6 flex items-center justify-between border-b border-[var(--border)] bg-[var(--card)]/50 backdrop-blur-sm">
        <button
          onClick={handleCancel}
          className="flex items-center gap-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors group"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
               className="group-hover:-translate-x-0.5 transition-transform">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          <span className="text-sm font-medium">Back</span>
        </button>
        <h1 className="text-sm font-semibold text-[var(--foreground)]">New Recording</h1>
        <div className="w-16" />
      </header>

      {/* Recording Area */}
      <div className="flex-1 flex items-center justify-center p-8 animate-fade-in">
        <div className="text-center max-w-md w-full">
          {/* Recording Indicator */}
          <div className="mb-8">
            <div
              className={`relative w-32 h-32 rounded-full mx-auto flex items-center justify-center transition-all duration-300 ${
                isRecording && !isPaused
                  ? 'bg-gradient-to-br from-red-500 to-red-600 recording-pulse shadow-2xl'
                  : isRecording && isPaused
                  ? 'bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg shadow-amber-500/30'
                  : audioBlob
                  ? 'bg-gradient-to-br from-[var(--success)] to-emerald-600 shadow-lg shadow-[var(--success)]/30'
                  : 'bg-[var(--muted)]'
              }`}
            >
              {isRecording && isPaused ? (
                <svg width="40" height="40" viewBox="0 0 24 24" fill="white">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              ) : isRecording ? (
                <svg width="40" height="40" viewBox="0 0 24 24" fill="white">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              ) : audioBlob ? (
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              ) : (
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" strokeWidth="1.5">
                  <path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z" />
                  <path d="M19 10v2a7 7 0 01-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="22" />
                </svg>
              )}
            </div>

            {/* Audio Level Meter */}
            {isRecording && !isPaused && (
              <div className="mt-6 flex items-end justify-center gap-0.5 h-10">
                {[...Array(24)].map((_, i) => {
                  const threshold = (i / 24) * 100;
                  const isActive = audioLevel > threshold;
                  const isHigh = i >= 18;
                  const isMedium = i >= 12 && i < 18;

                  return (
                    <div
                      key={i}
                      className={`w-1.5 rounded-full transition-all duration-75 ${
                        isActive
                          ? isHigh
                            ? 'bg-red-500'
                            : isMedium
                            ? 'bg-yellow-500'
                            : 'bg-[var(--success)]'
                          : 'bg-[var(--muted)]'
                      }`}
                      style={{
                        height: `${8 + i * 1.2}px`,
                      }}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* Duration */}
          <div className="text-5xl font-light tracking-tight mb-8 font-mono text-[var(--foreground)] tabular-nums">
            {formatDuration(duration)}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            {!audioBlob ? (
              isRecording ? (
                <div className="flex items-center gap-3">
                  {/* Pause/Resume Button */}
                  <button
                    onClick={isPaused ? resumeRecording : pauseRecording}
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-all btn-press ${
                      isPaused
                        ? 'bg-gradient-to-br from-[var(--success)] to-emerald-600 shadow-lg shadow-[var(--success)]/30 hover:shadow-xl'
                        : 'bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg shadow-amber-500/30 hover:shadow-xl'
                    }`}
                    title={isPaused ? 'Resume recording' : 'Pause recording'}
                  >
                    {isPaused ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                        <rect x="6" y="4" width="4" height="16" rx="1" />
                        <rect x="14" y="4" width="4" height="16" rx="1" />
                      </svg>
                    )}
                  </button>
                  {/* Stop Button */}
                  <button
                    onClick={stopRecording}
                    className="w-16 h-16 rounded-full flex items-center justify-center transition-all btn-press bg-gradient-to-br from-red-500 to-red-600 shadow-lg shadow-red-500/30 hover:shadow-xl"
                    title="Stop recording"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                      <rect x="6" y="6" width="12" height="12" rx="2" />
                    </svg>
                  </button>
                </div>
              ) : (
                <button
                  onClick={startRecording}
                  className="w-16 h-16 rounded-full flex items-center justify-center transition-all btn-press bg-gradient-to-br from-[var(--primary)] to-[var(--gradient-end)] shadow-lg shadow-[var(--primary)]/30 hover:shadow-xl"
                  title="Start recording"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                    <circle cx="12" cy="12" r="6" />
                  </svg>
                </button>
              )
            ) : isTranscribing ? (
              <div className="w-full max-w-xs animate-fade-in">
                <Progress
                  value={transcriptionProgress?.progress ?? 0}
                  showLabel
                  label={transcriptionProgress?.message || 'Transcribing...'}
                />
                <p className="text-xs text-[var(--muted-foreground)] mt-3 text-center">
                  {transcriptionProgress?.status === 'starting' && 'Preparing...'}
                  {transcriptionProgress?.status === 'transcribing' && 'Processing audio...'}
                  {transcriptionProgress?.status === 'processing' && 'Almost done...'}
                  {!transcriptionProgress && 'Starting transcription...'}
                </p>
              </div>
            ) : (
              <div className="flex gap-3 animate-scale-in">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setAudioBlob(null);
                    setDuration(0);
                  }}
                  className="px-5"
                >
                  Discard
                </Button>
                <Button
                  variant="gradient"
                  onClick={handleSave}
                  disabled={isSaving}
                  loading={isSaving}
                  className="px-6 gap-2"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z" />
                    <path d="M19 10v2a7 7 0 01-14 0v-2" />
                  </svg>
                  Save & Transcribe
                </Button>
              </div>
            )}
          </div>

          {/* Instructions */}
          <p className="mt-10 text-[var(--muted-foreground)] text-sm max-w-xs mx-auto leading-relaxed">
            {isRecording && isPaused
              ? 'Recording paused. Click play to resume or stop to finish.'
              : isRecording
              ? 'Recording... Pause or stop when finished.'
              : isTranscribing
              ? 'Transcribing locally. This may take a moment...'
              : audioBlob
              ? 'Recording complete! Save to transcribe.'
              : 'Tap to start recording. All processing is local.'}
          </p>
        </div>
      </div>
    </main>
  );
}
