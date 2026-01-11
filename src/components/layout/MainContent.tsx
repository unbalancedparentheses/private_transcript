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
      <header className="h-16 px-8 flex items-center justify-between border-b border-[var(--border)] bg-[var(--card)]">
        <div className="flex items-center gap-3">
          {currentFolder && (
            <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
                <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
              </svg>
            </div>
          )}
          <div>
            <h1 className="text-lg font-semibold text-[var(--foreground)]">
              {currentFolder?.name || currentWorkspace?.name || 'Private Transcript'}
            </h1>
            {currentFolder && (
              <p className="text-xs text-[var(--muted-foreground)]">
                {sessions.length} {sessions.length === 1 ? 'recording' : 'recordings'}
              </p>
            )}
          </div>
        </div>
        {currentFolder && (
          <Button onClick={() => setView('recording')} className="gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="3" fill="currentColor" />
            </svg>
            New Recording
          </Button>
        )}
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {!currentFolder ? (
          <div className="h-full flex items-center justify-center p-8">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[var(--primary)]/20 to-purple-500/20 flex items-center justify-center">
                <span className="text-4xl">{config?.icon || '📝'}</span>
              </div>
              <h2 className="text-2xl font-semibold mb-3 text-[var(--foreground)]">
                Select a {config?.folderLabel?.slice(0, -1).toLowerCase() || 'folder'}
              </h2>
              <p className="text-[var(--muted-foreground)] leading-relaxed">
                Choose a {config?.folderLabel?.toLowerCase() || 'folder'} from the sidebar or create a new one to start recording and transcribing.
              </p>
            </div>
          </div>
        ) : sessions.length === 0 ? (
          <div className="h-full flex items-center justify-center p-8">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[var(--primary)]/20 to-[var(--success)]/20 flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5">
                  <path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z" />
                  <path d="M19 10v2a7 7 0 01-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="22" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold mb-3 text-[var(--foreground)]">
                Ready to record
              </h2>
              <p className="text-[var(--muted-foreground)] leading-relaxed mb-6">
                Start a new recording to capture and transcribe your conversation. Everything is processed locally on your device.
              </p>
              <Button onClick={() => setView('recording')} size="lg" className="gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="3" fill="currentColor" />
                </svg>
                Start Recording
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-6 max-w-4xl mx-auto">
            <div className="grid gap-3">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => selectSession(session)}
                  className="card card-hover w-full text-left p-5 group"
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="w-10 h-10 rounded-xl bg-[var(--muted)] flex items-center justify-center flex-shrink-0
                                    group-hover:bg-[var(--primary)]/10 transition-colors">
                      {session.status === 'complete' ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2">
                          <path d="M9 12l2 2 4-4" />
                          <circle cx="12" cy="12" r="10" />
                        </svg>
                      ) : session.status === 'error' ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--destructive)" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="15" y1="9" x2="9" y2="15" />
                          <line x1="9" y1="9" x2="15" y2="15" />
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
                          <path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z" />
                          <path d="M19 10v2a7 7 0 01-14 0v-2" />
                        </svg>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-medium text-[var(--foreground)] truncate">
                          {session.title || formatDate(session.createdAt)}
                        </h3>
                        <StatusBadge status={session.status} />
                      </div>
                      <p className="text-sm text-[var(--muted-foreground)] line-clamp-2 leading-relaxed">
                        {session.transcript
                          ? session.transcript.slice(0, 150) + (session.transcript.length > 150 ? '...' : '')
                          : session.status === 'transcribing'
                          ? 'Transcribing audio...'
                          : session.status === 'error'
                          ? 'Failed to transcribe'
                          : 'Processing...'}
                      </p>
                    </div>

                    {/* Timestamp & Arrow */}
                    <div className="flex items-center gap-3 text-[var(--muted-foreground)]">
                      <span className="text-xs whitespace-nowrap">
                        {formatDistanceToNow(new Date(session.createdAt * 1000), { addSuffix: true })}
                      </span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                           className="opacity-0 group-hover:opacity-100 transition-opacity">
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
      className: 'bg-blue-500/10 text-blue-600'
    },
    generating: {
      label: 'Generating',
      className: 'bg-purple-500/10 text-purple-600'
    },
    complete: {
      label: 'Complete',
      className: 'bg-green-500/10 text-green-600'
    },
    error: {
      label: 'Error',
      className: 'bg-red-500/10 text-red-600'
    },
  };

  const { label, className } = config[status] || config.pending;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md ${className}`}>
      {status === 'transcribing' && (
        <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 animate-pulse" />
      )}
      {label}
    </span>
  );
}
