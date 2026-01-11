export type WorkspaceType = 'therapy' | 'legal' | 'research' | 'general';

export interface Workspace {
  id: string;
  name: string;
  workspaceType: WorkspaceType;
  createdAt: number;
  updatedAt: number;
}

export interface Folder {
  id: string;
  workspaceId: string;
  name: string;
  metadata?: string;
  createdAt: number;
  updatedAt: number;
  sessionCount: number;
}

export type SessionStatus = 'pending' | 'transcribing' | 'generating' | 'complete' | 'error';

export interface Session {
  id: string;
  folderId: string;
  title?: string;
  audioPath: string;
  audioDuration?: number;
  transcript?: string;
  transcriptSegments?: string;
  generatedNote?: string;
  noteFormat?: string;
  templateId?: string;
  status: SessionStatus;
  errorMessage?: string;
  createdAt: number;
  updatedAt: number;
}

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
  speaker?: string;
  favorited?: boolean;
}

export interface Template {
  id: string;
  name: string;
  workspaceType: WorkspaceType;
  description?: string;
  prompt: string;
  outputFormat?: string;
  isDefault: boolean;
  isSystem: boolean;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  whisperModel: string;
  llmProvider: 'bundled' | 'local' | 'cloud';
  llmModel: string;
  ollamaEndpoint: string;
  openrouterApiKey?: string;
  openrouterModel?: string;
  defaultWorkspaceId?: string;
  audioInputDevice?: string;
  exportFormat: 'markdown' | 'pdf' | 'docx';
  autoSave: boolean;
  bundledWhisperModel?: string;
  bundledLlmModel?: string;
}

export type ModelType = 'whisper' | 'llm';

export interface ModelInfo {
  id: string;
  name: string;
  modelType: ModelType;
  repoId: string;
  filename: string;
  sizeBytes: number;
  description: string;
}

export type DownloadStatus = 'pending' | 'downloading' | 'verifying' | 'complete' | 'error';

export interface DownloadProgress {
  modelId: string;
  downloadedBytes: number;
  totalBytes: number;
  percent: number;
  status: DownloadStatus;
  errorMessage?: string;
}

export interface OllamaStatus {
  connected: boolean;
  models: string[];
  error?: string;
}

export const WORKSPACE_CONFIG: Record<WorkspaceType, {
  label: string;
  folderLabel: string;
  sessionLabel: string;
  icon: string;
  description: string;
}> = {
  therapy: {
    label: 'Therapy',
    folderLabel: 'Clients',
    sessionLabel: 'Sessions',
    icon: '🧠',
    description: 'For therapists, counselors, and psychologists',
  },
  legal: {
    label: 'Legal',
    folderLabel: 'Cases',
    sessionLabel: 'Recordings',
    icon: '⚖️',
    description: 'For attorneys, paralegals, and legal teams',
  },
  research: {
    label: 'Research',
    folderLabel: 'Projects',
    sessionLabel: 'Interviews',
    icon: '🔬',
    description: 'For qualitative researchers and academics',
  },
  general: {
    label: 'General',
    folderLabel: 'Folders',
    sessionLabel: 'Recordings',
    icon: '📝',
    description: 'For meetings, consultants, and general use',
  },
};

// System audio types
export interface AudioDevice {
  id: string;
  name: string;
  isDefault: boolean;
}

export interface RecordingConfig {
  micDeviceId?: string;
  captureSystemAudio: boolean;
  sampleRate: number;
  micVolume: number;
  systemVolume: number;
}

export type RecordingState = 'idle' | 'recording' | 'stopping';

export interface RecordingStatus {
  state: RecordingState;
  durationMs: number;
  micLevel: number;
  systemLevel: number;
}

export interface RecordingProgressEvent {
  sessionId: string;
  state: string;
  durationMs: number;
  micLevel: number;
  systemLevel: number;
}

export interface AudioPermissions {
  microphone: boolean;
  screenRecording: boolean;
}

// LLM streaming types
export interface LlmStreamEvent {
  sessionId: string;
  token: string;
  done: boolean;
  error?: string;
}

// Live transcription types
export interface LiveTranscriptionConfig {
  model?: string;
  language?: string;
  useVad?: boolean;
  confirmationThreshold?: number;
}

export interface LiveTranscriptionEvent {
  sessionId: string;
  text: string;
  isFinal: boolean;
  timestamp: number;
}

export interface TranscriptionCompleteEvent {
  sessionId: string;
  fullText: string;
}

export interface TranscriptionErrorEvent {
  sessionId: string | null;
  message: string;
  code: string;
}

export interface WorkerReadyEvent {
  model: string;
  modelPath: string | null;
}
