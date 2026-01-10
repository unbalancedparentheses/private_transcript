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
  llmProvider: 'local' | 'cloud';
  llmModel: string;
  ollamaEndpoint: string;
  openrouterApiKey?: string;
  openrouterModel?: string;
  defaultWorkspaceId?: string;
  audioInputDevice?: string;
  exportFormat: 'markdown' | 'pdf' | 'docx';
  autoSave: boolean;
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
