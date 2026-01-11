import { useAppStore } from '../../stores/appStore';
import { WORKSPACE_CONFIG } from '../../types';
import { Button } from '../ui/Button';
import { RecordingView } from '../recording/RecordingView';
import { SessionDetail } from '../session/SessionDetail';
import { SettingsView } from '../settings/SettingsView';
import { formatDistanceToNow } from 'date-fns';

export function MainContent() {
  const {
    currentWorkspace,
    currentFolder,
    sessions,
    currentSession,
    view,
    setView,
    selectSession,
  } = useAppStore();

  const config = currentWorkspace
    ? WORKSPACE_CONFIG[currentWorkspace.workspaceType as keyof typeof WORKSPACE_CONFIG]
    : null;

  if (view === 'recording') {
    return <RecordingView />;
  }

  if (view === 'session' && currentSession) {
    return <SessionDetail />;
  }

  if (view === 'settings') {
    return <SettingsView />;
  }

  return (
    <main className="flex-1 flex flex-col overflow-hidden bg-[var(--background)]">
      {/* Header with titlebar drag region */}
      <header
        className="h-[52px] px-4 flex items-end pb-2 justify-between border-b border-[var(--border)] select-none"
        data-tauri-drag-region
      >
        <div className="flex items-center gap-2">
          <h1 className="text-[13px] font-semibold text-[var(--foreground)]">
            {currentFolder?.name || currentWorkspace?.name || 'Private Transcript'}
          </h1>
          {currentFolder && sessions.length > 0 && (
            <span className="text-[11px] text-[var(--muted-foreground)]">
              {sessions.length}
            </span>
          )}
        </div>
        {currentFolder && (
          <Button onClick={() => setView('recording')} size="sm" className="gap-1">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="8" />
            </svg>
            Record
          </Button>
        )}
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {!currentFolder ? (
          <div className="h-full flex items-center justify-center p-6">
            <div className="text-center max-w-xs">
              <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-[var(--secondary)] flex items-center justify-center">
                <span className="text-2xl">{config?.icon || '📝'}</span>
              </div>
              <h2 className="text-[15px] font-semibold mb-1 text-[var(--foreground)]">
                Select a {config?.folderLabel?.slice(0, -1).toLowerCase() || 'folder'}
              </h2>
              <p className="text-[13px] text-[var(--muted-foreground)]">
                Choose from the sidebar to get started.
              </p>
            </div>
          </div>
        ) : sessions.length === 0 ? (
          <div className="h-full flex items-center justify-center p-6">
            <div className="text-center max-w-xs">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[var(--secondary)] flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" strokeWidth="1.5">
                  <path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z" />
                  <path d="M19 10v2a7 7 0 01-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="22" />
                </svg>
              </div>
              <h2 className="text-[15px] font-semibold mb-1 text-[var(--foreground)]">
                No recordings yet
              </h2>
              <p className="text-[13px] text-[var(--muted-foreground)] mb-4">
                Start recording to capture and transcribe audio.
              </p>
              <Button onClick={() => setView('recording')} className="gap-1.5">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="12" r="8" />
                </svg>
                Start Recording
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-3">
            <div className="space-y-px">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => selectSession(session)}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-[var(--secondary)] transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    {/* Status indicator */}
                    <div className="flex-shrink-0">
                      {session.status === 'complete' ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2">
                          <path d="M9 12l2 2 4-4" />
                          <circle cx="12" cy="12" r="10" />
                        </svg>
                      ) : session.status === 'error' ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--destructive)" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="15" y1="9" x2="9" y2="15" />
                          <line x1="9" y1="9" x2="15" y2="15" />
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
                          <path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z" />
                          <path d="M19 10v2a7 7 0 01-14 0v-2" />
                        </svg>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-[13px] font-medium text-[var(--foreground)] truncate">
                          {session.title || formatDate(session.createdAt)}
                        </h3>
                        <StatusBadge status={session.status} />
                      </div>
                      <p className="text-[12px] text-[var(--muted-foreground)] truncate">
                        {session.transcript
                          ? session.transcript.slice(0, 80) + (session.transcript.length > 80 ? '...' : '')
                          : session.status === 'transcribing'
                          ? 'Transcribing...'
                          : session.status === 'error'
                          ? 'Failed'
                          : 'Processing...'}
                      </p>
                    </div>

                    {/* Timestamp */}
                    <span className="text-[11px] text-[var(--muted-foreground)] flex-shrink-0">
                      {formatDistanceToNow(new Date(session.createdAt * 1000), { addSuffix: true })}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'complete') return null; // Don't show badge for complete items

  const config: Record<string, { label: string; className: string }> = {
    pending: {
      label: 'Pending',
      className: 'text-[var(--muted-foreground)]'
    },
    transcribing: {
      label: 'Transcribing',
      className: 'text-[var(--primary)]'
    },
    generating: {
      label: 'Generating',
      className: 'text-[var(--primary)]'
    },
    error: {
      label: 'Error',
      className: 'text-[var(--destructive)]'
    },
  };

  const { label, className } = config[status] || config.pending;

  return (
    <span className={`text-[11px] ${className}`}>
      {status === 'transcribing' && (
        <span className="inline-block w-1 h-1 rounded-full bg-current mr-1 animate-pulse" />
      )}
      {label}
    </span>
  );
}
