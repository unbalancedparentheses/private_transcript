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
      {/* Header */}
      <header className="h-14 px-6 flex items-center justify-between border-b border-[var(--border)] bg-[var(--card)]/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          {currentFolder && (
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--primary)]/10 to-[var(--gradient-end)]/10 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
                <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
              </svg>
            </div>
          )}
          <div>
            <h1 className="text-base font-semibold text-[var(--foreground)]">
              {currentFolder?.name || currentWorkspace?.name || 'Private Transcript'}
            </h1>
            {currentFolder && sessions.length > 0 && (
              <p className="text-[10px] text-[var(--muted-foreground)] -mt-0.5">
                {sessions.length} {sessions.length === 1 ? 'recording' : 'recordings'}
              </p>
            )}
          </div>
        </div>
        {currentFolder && (
          <Button onClick={() => setView('recording')} size="sm" variant="gradient" className="gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="4" />
            </svg>
            Record
          </Button>
        )}
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {!currentFolder ? (
          <div className="h-full flex items-center justify-center p-8 animate-fade-in">
            <div className="text-center max-w-sm">
              <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-[var(--primary)]/10 to-[var(--gradient-end)]/10 flex items-center justify-center">
                <span className="text-3xl">{config?.icon || '📝'}</span>
              </div>
              <h2 className="text-xl font-semibold mb-2 text-[var(--foreground)]">
                Select a {config?.folderLabel?.slice(0, -1).toLowerCase() || 'folder'}
              </h2>
              <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
                Choose a {config?.folderLabel?.toLowerCase() || 'folder'} from the sidebar to get started.
              </p>
            </div>
          </div>
        ) : sessions.length === 0 ? (
          <div className="h-full flex items-center justify-center p-8 animate-fade-in">
            <div className="text-center max-w-sm">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-[var(--primary)]/10 to-[var(--success)]/10 flex items-center justify-center relative">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5">
                  <path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z" />
                  <path d="M19 10v2a7 7 0 01-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="22" />
                </svg>
                <div className="absolute inset-0 rounded-full border-2 border-[var(--primary)]/20 animate-ping" />
              </div>
              <h2 className="text-xl font-semibold mb-2 text-[var(--foreground)]">
                Ready to record
              </h2>
              <p className="text-sm text-[var(--muted-foreground)] leading-relaxed mb-6">
                Capture and transcribe conversations locally on your device.
              </p>
              <Button onClick={() => setView('recording')} variant="gradient" className="gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="4" />
                </svg>
                Start Recording
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-4 max-w-3xl mx-auto">
            <div className="grid gap-2 stagger-children">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => selectSession(session)}
                  className="card card-hover w-full text-left p-4 group"
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className="w-9 h-9 rounded-lg bg-[var(--muted)] flex items-center justify-center flex-shrink-0
                                    group-hover:bg-[var(--primary)]/10 transition-colors">
                      {session.status === 'complete' ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2">
                          <path d="M9 12l2 2 4-4" />
                          <circle cx="12" cy="12" r="10" />
                        </svg>
                      ) : session.status === 'error' ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--destructive)" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="15" y1="9" x2="9" y2="15" />
                          <line x1="9" y1="9" x2="15" y2="15" />
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
                          <path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z" />
                          <path d="M19 10v2a7 7 0 01-14 0v-2" />
                        </svg>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-medium text-sm text-[var(--foreground)] truncate">
                          {session.title || formatDate(session.createdAt)}
                        </h3>
                        <StatusBadge status={session.status} />
                      </div>
                      <p className="text-xs text-[var(--muted-foreground)] line-clamp-1 leading-relaxed">
                        {session.transcript
                          ? session.transcript.slice(0, 120) + (session.transcript.length > 120 ? '...' : '')
                          : session.status === 'transcribing'
                          ? 'Transcribing audio...'
                          : session.status === 'error'
                          ? 'Failed to transcribe'
                          : 'Processing...'}
                      </p>
                    </div>

                    {/* Timestamp & Arrow */}
                    <div className="flex items-center gap-2 text-[var(--muted-foreground)] flex-shrink-0">
                      <span className="text-[10px] whitespace-nowrap">
                        {formatDistanceToNow(new Date(session.createdAt * 1000), { addSuffix: true })}
                      </span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                           className="opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </div>
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
  const config: Record<string, { label: string; className: string }> = {
    pending: {
      label: 'Pending',
      className: 'bg-[var(--muted)] text-[var(--muted-foreground)]'
    },
    transcribing: {
      label: 'Transcribing',
      className: 'bg-[var(--primary)]/10 text-[var(--primary)]'
    },
    generating: {
      label: 'Generating',
      className: 'bg-purple-500/10 text-purple-600'
    },
    complete: {
      label: 'Complete',
      className: 'bg-[var(--success)]/10 text-[var(--success)]'
    },
    error: {
      label: 'Error',
      className: 'bg-[var(--destructive)]/10 text-[var(--destructive)]'
    },
  };

  const { label, className } = config[status] || config.pending;

  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-md ${className}`}>
      {status === 'transcribing' && (
        <span className="w-1 h-1 rounded-full bg-current mr-1 animate-pulse" />
      )}
      {label}
    </span>
  );
}
