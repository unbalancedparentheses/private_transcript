import { useState, useRef, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { useAppStore } from '../../stores/appStore';
import { Button } from '../ui/Button';
import { Progress } from '../ui/Progress';
import { useToast } from '../ui/Toast';
import { LiveTranscriptionDisplay } from './LiveTranscriptionDisplay';
import type { AudioDevice, RecordingConfig, RecordingProgressEvent, LiveTranscriptionConfig, TranscriptionCompleteEvent } from '../../types';

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
  // System audio capture state
  const [captureSystemAudio, setCaptureSystemAudio] = useState(false);
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [selectedMicId, setSelectedMicId] = useState<string | undefined>();
  const [isNativeRecording, setIsNativeRecording] = useState(false);
  const [_nativeSessionId, setNativeSessionId] = useState<string | null>(null);
  const [hasScreenRecordingPermission, setHasScreenRecordingPermission] = useState<boolean | null>(null);
  // Live transcription state
  const [enableLiveTranscription, setEnableLiveTranscription] = useState(true);
  const [_isLiveTranscribing, setIsLiveTranscribing] = useState(false);
  const [liveSessionId, setLiveSessionId] = useState<string | null>(null);
  const [_liveTranscriptText, setLiveTranscriptText] = useState<string>('');
  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioWorkletRef = useRef<AudioWorkletNode | null>(null);
  const liveTranscriptionContextRef = useRef<AudioContext | null>(null);
  const liveTranscriptionStreamRef = useRef<MediaStream | null>(null);

  // Listen for transcription progress events
  useEffect(() => {
    let unlisten: UnlistenFn | null = null;

    const setupListener = async () => {
      unlisten = await listen<TranscriptionProgress>('transcription-progress', (event) => {
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

  // Listen for live transcription complete events
  useEffect(() => {
    let unlisten: UnlistenFn | null = null;

    const setupListener = async () => {
      unlisten = await listen<TranscriptionCompleteEvent>('transcription-complete', (event) => {
        if (event.payload.sessionId === liveSessionId) {
          setLiveTranscriptText(event.payload.fullText);
          setIsLiveTranscribing(false);
        }
      });
    };

    setupListener();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, [liveSessionId]);

  // Start live transcription with AudioWorklet
  const startLiveTranscription = useCallback(async (stream: MediaStream, sessionId: string) => {
    console.log('[LiveTranscription] Starting for session:', sessionId);
    try {
      // Log stream track info
      const tracks = stream.getAudioTracks();
      console.log('[LiveTranscription] Audio tracks:', tracks.length);
      for (const track of tracks) {
        const settings = track.getSettings();
        console.log('[LiveTranscription] Track settings:', JSON.stringify(settings));
      }

      // Clone the stream to avoid interference with other consumers
      // Each track clone gets its own audio pipeline
      const clonedStream = stream.clone();
      liveTranscriptionStreamRef.current = clonedStream;
      console.log('[LiveTranscription] Cloned stream for transcription');

      // Create a dedicated AudioContext for live transcription
      console.log('[LiveTranscription] Creating dedicated AudioContext...');
      const audioContext = new AudioContext();
      liveTranscriptionContextRef.current = audioContext;
      console.log('[LiveTranscription] AudioContext sampleRate:', audioContext.sampleRate);
      console.log('[LiveTranscription] AudioContext state:', audioContext.state);

      // Resume if suspended (needed for some browsers)
      if (audioContext.state === 'suspended') {
        console.log('[LiveTranscription] Resuming suspended AudioContext...');
        await audioContext.resume();
        console.log('[LiveTranscription] AudioContext resumed, state:', audioContext.state);
      }

      // Load the AudioWorklet module
      console.log('[LiveTranscription] Loading AudioWorklet module...');
      await audioContext.audioWorklet.addModule('/audio-processor.js');
      console.log('[LiveTranscription] AudioWorklet module loaded');

      // Create the worklet node
      const workletNode = new AudioWorkletNode(audioContext, 'audio-sample-processor');
      audioWorkletRef.current = workletNode;

      // Create MediaStreamSource from the CLONED stream
      console.log('[LiveTranscription] Creating MediaStreamSource from cloned stream');
      const source = audioContext.createMediaStreamSource(clonedStream);

      // Handle messages from the worklet (audio samples)
      let sampleCount = 0;
      workletNode.port.onmessage = async (event) => {
        if (event.data.type === 'samples') {
          sampleCount++;
          const samples = Array.from(event.data.samples as Float32Array);

          // Debug: Log sample statistics every 10th chunk
          if (sampleCount % 10 === 1) {
            const minVal = Math.min(...samples);
            const maxVal = Math.max(...samples);
            const energy = samples.reduce((acc, s) => acc + s * s, 0) / samples.length;
            console.log(`[LiveTranscription] Chunk #${sampleCount}: count=${samples.length}, min=${minVal.toFixed(6)}, max=${maxVal.toFixed(6)}, energy=${energy.toFixed(6)}`);
          }

          try {
            await invoke('feed_live_audio', {
              sessionId,
              samples,
            });
          } catch (e) {
            console.error('Failed to feed audio:', e);
          }
        }
      };

      // Connect the audio pipeline
      source.connect(workletNode);
      console.log('[LiveTranscription] Audio pipeline connected');

      // Start the live transcription session
      const config: LiveTranscriptionConfig = {
        model: undefined, // Use default
        language: 'en', // Force English to avoid language detection confusion
        useVad: true,
        confirmationThreshold: 2,
      };

      console.log('[LiveTranscription] Invoking start_live_transcription...');
      await invoke('start_live_transcription', {
        sessionId,
        config,
      });

      setIsLiveTranscribing(true);
      console.log('[LiveTranscription] Successfully started for session:', sessionId);
    } catch (error) {
      console.error('[LiveTranscription] Failed to start:', error);
      addToast('Live transcription unavailable. Recording will continue.', 'warning');
    }
  }, [addToast]);

  // Stop live transcription
  const stopLiveTranscription = useCallback(async () => {
    if (!liveSessionId) return;

    try {
      // Stop the worklet
      if (audioWorkletRef.current) {
        audioWorkletRef.current.port.postMessage({ command: 'stop' });
        audioWorkletRef.current.disconnect();
        audioWorkletRef.current = null;
      }

      // Stop the cloned stream tracks
      if (liveTranscriptionStreamRef.current) {
        liveTranscriptionStreamRef.current.getTracks().forEach(track => track.stop());
        liveTranscriptionStreamRef.current = null;
      }

      // Close the dedicated audio context
      if (liveTranscriptionContextRef.current) {
        await liveTranscriptionContextRef.current.close();
        liveTranscriptionContextRef.current = null;
      }

      // Stop the transcription session
      await invoke('stop_live_transcription', {
        sessionId: liveSessionId,
      });

      console.log('[LiveTranscription] Stopped for session:', liveSessionId);
    } catch (error) {
      console.error('Failed to stop live transcription:', error);
    }
  }, [liveSessionId]);

  // Load audio devices on mount
  useEffect(() => {
    const loadDevices = async () => {
      try {
        const devices = await invoke<AudioDevice[]>('get_audio_devices');
        setAudioDevices(devices);
        // Set default device
        const defaultDevice = devices.find(d => d.isDefault);
        if (defaultDevice) {
          setSelectedMicId(defaultDevice.id);
        }
      } catch (e) {
        console.error('Failed to load audio devices:', e);
      }
    };
    loadDevices();
  }, []);

  // Check screen recording permission when system audio is enabled
  useEffect(() => {
    if (captureSystemAudio) {
      checkScreenRecordingPermission();
    }
  }, [captureSystemAudio]);

  const checkScreenRecordingPermission = async () => {
    try {
      const permissions = await invoke<{ microphone: boolean; screenRecording: boolean }>('check_audio_permissions');
      setHasScreenRecordingPermission(permissions.screenRecording);
    } catch (e) {
      console.error('Failed to check permissions:', e);
      setHasScreenRecordingPermission(false);
    }
  };

  const openScreenRecordingSettings = async () => {
    try {
      await invoke('open_screen_recording_settings');
      // Re-check permission after a delay (user needs time to grant it)
      setTimeout(checkScreenRecordingPermission, 1000);
    } catch (e) {
      console.error('Failed to open settings:', e);
    }
  };

  // Listen for native recording progress
  useEffect(() => {
    let unlisten: UnlistenFn | null = null;

    const setupListener = async () => {
      unlisten = await listen<RecordingProgressEvent>('recording-progress', (event) => {
        if (event.payload.state === 'recording') {
          setDuration(Math.floor(event.payload.durationMs / 1000));
          setAudioLevel(event.payload.micLevel * 100);
        } else if (event.payload.state === 'complete') {
          // Recording completed - don't set audioBlob since file is already on disk
          setIsRecording(false);
          setIsNativeRecording(false);
        } else if (event.payload.state === 'error') {
          addToast('Recording failed. Please check permissions.', 'error');
          setIsRecording(false);
          setIsNativeRecording(false);
        }
      });
    };

    if (isNativeRecording) {
      setupListener();
    }

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, [isNativeRecording, addToast]);

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
        return type;
      }
    }
    return '';
  };

  // Audio level analysis
  const startAudioAnalysis = (stream: MediaStream) => {
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
    // Generate a session ID for live transcription
    const sessionId = crypto.randomUUID();
    setLiveSessionId(sessionId);
    setLiveTranscriptText('');

    // Use native recording if system audio is enabled
    if (captureSystemAudio) {
      await startNativeRecording();
      return;
    }

    // Use browser MediaRecorder for mic-only recording
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

      // Start live transcription if enabled
      console.log('[Recording] enableLiveTranscription:', enableLiveTranscription);
      if (enableLiveTranscription) {
        console.log('[Recording] Starting live transcription...');
        await startLiveTranscription(stream, sessionId);
      }

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: actualMimeType });
        setAudioBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
        stopAudioAnalysis();

        // Stop live transcription
        if (enableLiveTranscription) {
          await stopLiveTranscription();
        }
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

  const startNativeRecording = async () => {
    try {
      const nativeSessionId = crypto.randomUUID();
      setNativeSessionId(nativeSessionId);

      // Use the same session ID for live transcription that we set in startRecording
      const transcriptionSessionId = liveSessionId || nativeSessionId;

      const config: RecordingConfig = {
        micDeviceId: selectedMicId,
        captureSystemAudio: true,
        sampleRate: 16000,
        micVolume: 1.0,
        systemVolume: 0.7,
      };

      await invoke('start_system_recording', {
        sessionId: nativeSessionId,
        config,
      });

      // Start live transcription from mic if enabled
      // We capture mic audio via browser API for live transcription
      // while native recording captures both mic + system audio to file
      if (enableLiveTranscription) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          streamRef.current = stream;
          await startLiveTranscription(stream, transcriptionSessionId);
        } catch (e) {
          console.warn('Could not start live transcription during system audio recording:', e);
          // Continue without live transcription - native recording will still work
        }
      }

      setIsRecording(true);
      setIsNativeRecording(true);
      setDuration(0);
    } catch (error) {
      console.error('Failed to start native recording:', error);
      addToast('Failed to start recording. Please check microphone and screen recording permissions.', 'error');
    }
  };

  const stopRecording = async () => {
    if (isNativeRecording) {
      await stopNativeRecording();
      return;
    }

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

  const stopNativeRecording = async () => {
    try {
      // Stop live transcription if it was running
      if (enableLiveTranscription) {
        await stopLiveTranscription();
        // Also stop the browser mic stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      }

      const audioPath = await invoke<string>('stop_system_recording');
      setIsRecording(false);
      setIsNativeRecording(false);

      // Immediately save and transcribe the native recording
      await saveNativeRecording(audioPath);
    } catch (error) {
      console.error('Failed to stop native recording:', error);
      addToast('Failed to stop recording.', 'error');
      setIsRecording(false);
      setIsNativeRecording(false);
    }
  };

  const saveNativeRecording = async (audioPath: string) => {
    if (!currentFolder) return;

    setIsSaving(true);
    setIsTranscribing(true);
    setTranscriptionProgress(null);

    try {
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
      setNativeSessionId(null);
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

          {/* Live Transcription Display */}
          {isRecording && enableLiveTranscription && liveSessionId && (
            <LiveTranscriptionDisplay
              sessionId={liveSessionId}
              isActive={isRecording && !isPaused}
              onError={(error) => {
                console.error('[LiveTranscription] Error:', error);
              }}
            />
          )}

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

          {/* System Audio Toggle - shown before recording starts */}
          {!isRecording && !audioBlob && !isTranscribing && (
            <div className="mt-8 p-4 rounded-xl border border-[var(--border)] bg-[var(--card)]/50 max-w-sm mx-auto">
              <div className="flex items-center justify-between mb-4">
                <div className="text-left">
                  <label className="text-sm font-medium text-[var(--foreground)]">Capture System Audio</label>
                  <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                    Record audio from other apps (meetings, videos)
                  </p>
                </div>
                <button
                  onClick={() => setCaptureSystemAudio(!captureSystemAudio)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    captureSystemAudio ? 'bg-[var(--primary)]' : 'bg-[var(--muted)]'
                  }`}
                  role="switch"
                  aria-checked={captureSystemAudio}
                >
                  <div
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                      captureSystemAudio ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Microphone Selection */}
              {audioDevices.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-[var(--muted-foreground)] mb-1.5 block">Microphone</label>
                  <select
                    value={selectedMicId || ''}
                    onChange={(e) => setSelectedMicId(e.target.value || undefined)}
                    className="w-full h-9 px-3 text-sm rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]"
                  >
                    {audioDevices.map(device => (
                      <option key={device.id} value={device.id}>
                        {device.name} {device.isDefault ? '(Default)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {captureSystemAudio && hasScreenRecordingPermission === false && (
                <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <p className="text-xs text-amber-500 mb-2">
                    Screen Recording permission required
                  </p>
                  <button
                    onClick={openScreenRecordingSettings}
                    className="text-xs font-medium text-amber-500 hover:text-amber-400 underline"
                  >
                    Open System Settings
                  </button>
                </div>
              )}

              {captureSystemAudio && hasScreenRecordingPermission === true && (
                <p className="text-xs text-[var(--success)] mt-3 flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  Screen Recording permission granted
                </p>
              )}

              {captureSystemAudio && hasScreenRecordingPermission === null && (
                <p className="text-xs text-[var(--muted-foreground)] mt-3">
                  Checking permission...
                </p>
              )}

              {/* Live Transcription Toggle */}
              <div className="mt-4 pt-4 border-t border-[var(--border)]">
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <label className="text-sm font-medium text-[var(--foreground)]">Live Transcription</label>
                    <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                      See text as you speak (requires WhisperKit)
                    </p>
                  </div>
                  <button
                    onClick={() => setEnableLiveTranscription(!enableLiveTranscription)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      enableLiveTranscription ? 'bg-[var(--primary)]' : 'bg-[var(--muted)]'
                    }`}
                    role="switch"
                    aria-checked={enableLiveTranscription}
                  >
                    <div
                      className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                        enableLiveTranscription ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Instructions */}
          <p className="mt-6 text-[var(--muted-foreground)] text-sm max-w-xs mx-auto leading-relaxed">
            {isRecording && isPaused
              ? 'Recording paused. Click play to resume or stop to finish.'
              : isRecording
              ? captureSystemAudio
                ? 'Recording mic + system audio... Stop when finished.'
                : 'Recording... Pause or stop when finished.'
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
