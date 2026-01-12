import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from '../../stores/appStore';
import { ModelManager } from './ModelManager';
import { Button, Card, Switch, StatusDot } from '../ui';
import { logger, type LogEntry, type LogLevel } from '../../lib/logger';
import { useTheme, type Theme } from '../../hooks/useTheme';
import type { OllamaStatus } from '../../types';
import {
  ArrowLeft,
  RefreshCw,
  Check,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';

type Tab = 'models' | 'general' | 'storage' | 'logs' | 'about';

export function SettingsView() {
  const { setView } = useAppStore();
  const [activeTab, setActiveTab] = useState<Tab>('models');

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[var(--background)]">
      {/* Header with titlebar drag region */}
      <header
        className="h-[52px] px-4 flex items-end pb-2 border-b border-[var(--border)] select-none"
        data-tauri-drag-region
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView('list')}
            className="w-6 h-6 rounded hover:bg-[var(--secondary)] flex items-center justify-center transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft size={14} strokeWidth={2} aria-hidden="true" />
          </button>
          <h1 className="text-[13px] font-semibold text-[var(--foreground)]">Settings</h1>
        </div>
      </header>

      {/* Segmented Control for tabs - macOS style */}
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <div className="inline-flex p-0.5 rounded-md bg-[var(--secondary)]">
          <TabButton active={activeTab === 'models'} onClick={() => setActiveTab('models')}>
            Models
          </TabButton>
          <TabButton active={activeTab === 'general'} onClick={() => setActiveTab('general')}>
            General
          </TabButton>
          <TabButton active={activeTab === 'storage'} onClick={() => setActiveTab('storage')}>
            Storage
          </TabButton>
          <TabButton active={activeTab === 'logs'} onClick={() => setActiveTab('logs')}>
            Logs
          </TabButton>
          <TabButton active={activeTab === 'about'} onClick={() => setActiveTab('about')}>
            About
          </TabButton>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'models' && <ModelManager />}
        {activeTab === 'general' && <GeneralSettings />}
        {activeTab === 'storage' && <StorageSection />}
        {activeTab === 'logs' && <LogsSection />}
        {activeTab === 'about' && <AboutSection />}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 text-[12px] font-medium rounded transition-all ${
        active
          ? 'bg-[var(--card)] text-[var(--foreground)] shadow-sm'
          : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
      }`}
    >
      {children}
    </button>
  );
}

function GeneralSettings() {
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus | null>(null);
  const [ollamaEndpoint, setOllamaEndpoint] = useState('http://localhost:11434');
  const [checkingOllama, setCheckingOllama] = useState(false);
  const { theme, setTheme } = useTheme();
  const [autoOpenExports, setAutoOpenExports] = useState(true);
  const [defaultExportFormat, setDefaultExportFormat] = useState<'markdown' | 'pdf' | 'docx'>('markdown');
  const [obsidianVaultPath, setObsidianVaultPath] = useState('');
  const [obsidianTags, setObsidianTags] = useState('transcript');

  useEffect(() => {
    // Load saved settings
    const savedAutoOpen = localStorage.getItem('autoOpenExports');
    if (savedAutoOpen !== null) setAutoOpenExports(savedAutoOpen === 'true');

    const savedFormat = localStorage.getItem('defaultExportFormat') as 'markdown' | 'pdf' | 'docx' | null;
    if (savedFormat) setDefaultExportFormat(savedFormat);

    const savedEndpoint = localStorage.getItem('ollamaEndpoint');
    if (savedEndpoint) setOllamaEndpoint(savedEndpoint);

    const savedVaultPath = localStorage.getItem('obsidianVaultPath');
    if (savedVaultPath) setObsidianVaultPath(savedVaultPath);

    const savedTags = localStorage.getItem('obsidianTags');
    if (savedTags) setObsidianTags(savedTags);

    // Check Ollama status on mount
    checkOllamaStatus();
  }, []);

  const checkOllamaStatus = async () => {
    setCheckingOllama(true);
    try {
      const status = await invoke<OllamaStatus>('check_ollama_status');
      setOllamaStatus(status);
    } catch {
      setOllamaStatus({ connected: false, models: [], error: 'Failed to check status' });
    } finally {
      setCheckingOllama(false);
    }
  };

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
  };

  const handleAutoOpenChange = (value: boolean) => {
    setAutoOpenExports(value);
    localStorage.setItem('autoOpenExports', String(value));
  };

  const handleDefaultFormatChange = (format: 'markdown' | 'pdf' | 'docx') => {
    setDefaultExportFormat(format);
    localStorage.setItem('defaultExportFormat', format);
  };

  const handleEndpointChange = (endpoint: string) => {
    setOllamaEndpoint(endpoint);
    localStorage.setItem('ollamaEndpoint', endpoint);
  };

  const handleObsidianVaultChange = (path: string) => {
    setObsidianVaultPath(path);
    localStorage.setItem('obsidianVaultPath', path);
  };

  const handleObsidianTagsChange = (tags: string) => {
    setObsidianTags(tags);
    localStorage.setItem('obsidianTags', tags);
  };

  return (
    <div className="p-4 max-w-xl space-y-6">
      {/* Ollama Connection Status */}
      <section className="space-y-2">
        <h3 className="section-header">Ollama Connection</h3>
        <Card>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StatusDot
                status={
                  ollamaStatus?.connected
                    ? 'success'
                    : ollamaStatus === null
                    ? 'warning'
                    : 'error'
                }
                pulse={ollamaStatus === null}
              />
              <span className="text-[13px] font-medium">
                {ollamaStatus?.connected
                  ? 'Connected'
                  : ollamaStatus === null
                  ? 'Checking...'
                  : 'Not Connected'}
              </span>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={checkOllamaStatus}
              disabled={checkingOllama}
            >
              <RefreshCw size={12} className={checkingOllama ? 'animate-spin' : ''} aria-hidden="true" />
              Refresh
            </Button>
          </div>

          {ollamaStatus?.connected && ollamaStatus.models.length > 0 && (
            <div>
              <p className="text-[11px] text-[var(--muted-foreground)] mb-1.5">Available models:</p>
              <div className="flex flex-wrap gap-1">
                {ollamaStatus.models.map((model) => (
                  <span
                    key={model}
                    className="px-2 py-0.5 text-[11px] rounded bg-[var(--secondary)] text-[var(--muted-foreground)]"
                  >
                    {model}
                  </span>
                ))}
              </div>
            </div>
          )}

          {ollamaStatus?.error && (
            <p className="text-[12px] text-[var(--destructive)]">{ollamaStatus.error}</p>
          )}

          <div className="flex items-center gap-2 mt-3">
            <label className="text-[12px] text-[var(--muted-foreground)]">Endpoint:</label>
            <input
              type="text"
              value={ollamaEndpoint}
              onChange={(e) => handleEndpointChange(e.target.value)}
              className="flex-1 h-7 px-2 text-[13px] rounded-md border border-[var(--border)] bg-[var(--background)]
                         focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              placeholder="http://localhost:11434"
            />
          </div>
        </Card>
      </section>

      {/* Appearance */}
      <section className="space-y-2">
        <h3 className="section-header">Appearance</h3>
        <Card>
          <div className="flex items-center justify-between">
            <label className="text-[13px] font-medium">Theme</label>
            <div className="segmented-control">
              {([
                { value: 'light', icon: Sun, label: 'Light' },
                { value: 'dark', icon: Moon, label: 'Dark' },
                { value: 'system', icon: Monitor, label: 'System' },
              ] as const).map(({ value, icon: Icon, label }) => (
                <button
                  key={value}
                  onClick={() => handleThemeChange(value)}
                  data-active={theme === value}
                  className="flex items-center gap-1.5"
                  aria-label={`${label} theme`}
                  aria-pressed={theme === value}
                >
                  <Icon size={12} aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </Card>
      </section>

      {/* Export Settings */}
      <section className="space-y-2">
        <h3 className="section-header">Export</h3>
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-[13px] font-medium">Default Format</label>
            <div className="segmented-control">
              {(['markdown', 'pdf', 'docx'] as const).map((format) => (
                <button
                  key={format}
                  onClick={() => handleDefaultFormatChange(format)}
                  data-active={defaultExportFormat === format}
                  aria-pressed={defaultExportFormat === format}
                >
                  {format.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label htmlFor="auto-open" className="text-[13px] font-medium">Auto-open exported files</label>
              <p className="text-[11px] text-[var(--muted-foreground)]">
                Open in default application after export
              </p>
            </div>
            <Switch
              id="auto-open"
              checked={autoOpenExports}
              onChange={handleAutoOpenChange}
              aria-label="Auto-open exported files"
            />
          </div>
        </Card>
      </section>

      {/* Obsidian Integration */}
      <section className="space-y-2">
        <h3 className="section-header">Obsidian</h3>
        <Card className="space-y-3">
          <div>
            <label htmlFor="vault-path" className="text-[13px] font-medium mb-1 block">Vault Path</label>
            <input
              id="vault-path"
              type="text"
              value={obsidianVaultPath}
              onChange={(e) => handleObsidianVaultChange(e.target.value)}
              className="w-full h-7 px-2 text-[13px] rounded-md border border-[var(--border)] bg-[var(--background)]
                         focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              placeholder="/Users/you/Documents/Obsidian Vault"
            />
          </div>

          <div>
            <label htmlFor="default-tags" className="text-[13px] font-medium mb-1 block">Default Tags</label>
            <input
              id="default-tags"
              type="text"
              value={obsidianTags}
              onChange={(e) => handleObsidianTagsChange(e.target.value)}
              className="w-full h-7 px-2 text-[13px] rounded-md border border-[var(--border)] bg-[var(--background)]
                         focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              placeholder="transcript, meeting"
            />
          </div>

          {obsidianVaultPath && (
            <div className="flex items-center gap-1.5 text-[11px] text-[var(--success)]">
              <Check size={12} strokeWidth={2.5} aria-hidden="true" />
              <span>Export enabled</span>
            </div>
          )}
        </Card>
      </section>

      {/* Debug Settings */}
      <section className="space-y-2">
        <h3 className="section-header">Developer</h3>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <label htmlFor="debug-logging" className="text-[13px] font-medium">Debug Logging</label>
              <p className="text-[11px] text-[var(--muted-foreground)]">
                Show detailed logs in console
              </p>
            </div>
            <Switch
              id="debug-logging"
              checked={localStorage.getItem('DEBUG') === 'true'}
              onChange={(checked) => {
                localStorage.setItem('DEBUG', String(checked));
                window.location.reload();
              }}
              aria-label="Enable debug logging"
            />
          </div>
        </Card>
      </section>
    </div>
  );
}

interface StorageItem {
  name: string;
  size: number;
  fileCount: number;
  path: string;
}

interface StorageUsage {
  totalSize: number;
  items: StorageItem[];
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function StorageSection() {
  const [storageUsage, setStorageUsage] = useState<StorageUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStorageUsage();
  }, []);

  const loadStorageUsage = async () => {
    setLoading(true);
    setError(null);
    try {
      const usage = await invoke<StorageUsage>('get_storage_usage');
      setStorageUsage(usage);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 max-w-xl">
        <div className="flex items-center justify-center py-8">
          <div className="w-5 h-5 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
          <span className="ml-2 text-[13px] text-[var(--muted-foreground)]">Calculating storage...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 max-w-xl">
        <div className="p-3 rounded-lg border border-[var(--destructive)] bg-[var(--destructive)]/10">
          <p className="text-[13px] text-[var(--destructive)]">Failed to load storage usage: {error}</p>
          <Button size="sm" variant="secondary" onClick={loadStorageUsage} className="mt-2">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-xl space-y-4">
      {/* Total Storage */}
      <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--card)]">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[15px] font-semibold">Total Storage Used</h3>
          <Button size="sm" variant="ghost" onClick={loadStorageUsage}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
          </Button>
        </div>
        <p className="text-[28px] font-bold text-[var(--primary)]">
          {formatBytes(storageUsage?.totalSize || 0)}
        </p>
      </div>

      {/* Storage Breakdown */}
      <section className="space-y-2">
        <h3 className="text-[11px] font-medium text-[var(--muted-foreground)] uppercase tracking-wide px-1">
          Storage Breakdown
        </h3>
        <div className="space-y-2">
          {storageUsage?.items.map((item, index) => (
            <div
              key={index}
              className="p-3 rounded-lg border border-[var(--border)] bg-[var(--card)]"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[13px] font-medium">{item.name}</span>
                <span className="text-[13px] font-semibold text-[var(--primary)]">
                  {formatBytes(item.size)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[var(--muted-foreground)]">
                  {item.fileCount} {item.fileCount === 1 ? 'file' : 'files'}
                </span>
                <button
                  onClick={() => {
                    // Open the folder in Finder using our backend command
                    invoke('show_in_folder', { path: item.path }).catch((err) => {
                      console.error('Failed to open folder:', err);
                      // Fallback: copy path to clipboard
                      navigator.clipboard.writeText(item.path);
                    });
                  }}
                  className="text-[11px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:underline"
                  title={item.path}
                >
                  Show in Finder
                </button>
              </div>
              {/* Progress bar showing percentage of total */}
              {storageUsage && storageUsage.totalSize > 0 && (
                <div className="mt-2 h-1.5 bg-[var(--secondary)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--primary)] rounded-full transition-all"
                    style={{
                      width: `${Math.max(1, (item.size / storageUsage.totalSize) * 100)}%`,
                    }}
                  />
                </div>
              )}
            </div>
          ))}

          {storageUsage?.items.length === 0 && (
            <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--card)] text-center">
              <p className="text-[13px] text-[var(--muted-foreground)]">No data stored yet</p>
            </div>
          )}
        </div>
      </section>

      {/* Tips */}
      <section className="space-y-2">
        <h3 className="text-[11px] font-medium text-[var(--muted-foreground)] uppercase tracking-wide px-1">
          Tips
        </h3>
        <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--card)]">
          <ul className="text-[12px] text-[var(--muted-foreground)] space-y-1">
            <li>• Delete old recordings to free up space</li>
            <li>• Audio recordings are typically the largest files</li>
            <li>• Model files can be redownloaded if needed</li>
          </ul>
        </div>
      </section>
    </div>
  );
}

const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
  debug: 'text-[var(--muted-foreground)]',
  info: 'text-blue-500',
  warn: 'text-yellow-500',
  error: 'text-red-500',
};

function LogsSection() {
  const [logs, setLogs] = useState<LogEntry[]>(() => logger.getEntries());
  const [filter, setFilter] = useState<LogLevel | 'all'>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = logger.subscribe((entries) => {
      setLogs(entries);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const filteredLogs = filter === 'all' ? logs : logs.filter((log) => log.level === filter);

  const handleCopyLogs = () => {
    const text = filteredLogs
      .map((log) => `${log.timestamp} [${log.level.toUpperCase()}]${log.context ? ` [${log.context}]` : ''} ${log.message}${log.data ? ` ${JSON.stringify(log.data)}` : ''}`)
      .join('\n');
    navigator.clipboard.writeText(text);
  };

  const handleClearLogs = () => {
    logger.clear();
    setLogs([]);
  };

  return (
    <div className="p-4 h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center gap-2">
          <label className="text-[11px] text-[var(--muted-foreground)]">Filter:</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as LogLevel | 'all')}
            className="h-6 px-2 text-[12px] rounded border border-[var(--border)] bg-[var(--background)]"
          >
            <option value="all">All</option>
            <option value="debug">Debug</option>
            <option value="info">Info</option>
            <option value="warn">Warn</option>
            <option value="error">Error</option>
          </select>
        </div>

        <label className="flex items-center gap-1.5 text-[12px] text-[var(--muted-foreground)]">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
            className="rounded"
          />
          Auto-scroll
        </label>

        <div className="flex-1" />

        <Button size="sm" variant="ghost" onClick={handleCopyLogs}>
          Copy All
        </Button>
        <Button size="sm" variant="ghost" onClick={handleClearLogs}>
          Clear
        </Button>
      </div>

      {/* Logs */}
      <div className="flex-1 min-h-0 rounded-lg border border-[var(--border)] bg-[#1a1a1a] overflow-auto font-mono text-[11px]">
        {filteredLogs.length === 0 ? (
          <div className="p-4 text-center text-[var(--muted-foreground)]">
            No logs yet. Logs will appear here as you use the app.
          </div>
        ) : (
          <div className="p-2 space-y-0.5">
            {filteredLogs.map((log, index) => (
              <div key={index} className="flex gap-2 hover:bg-white/5 px-1 rounded">
                <span className="text-[var(--muted-foreground)] shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className={`shrink-0 uppercase w-12 ${LOG_LEVEL_COLORS[log.level]}`}>
                  [{log.level}]
                </span>
                {log.context && (
                  <span className="text-purple-400 shrink-0">[{log.context}]</span>
                )}
                <span className="text-gray-300 break-all">{log.message}</span>
                {log.data !== undefined && (
                  <span className="text-gray-500 break-all">{String(JSON.stringify(log.data))}</span>
                )}
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="mt-2 flex items-center gap-4 text-[11px] text-[var(--muted-foreground)]">
        <span>{filteredLogs.length} entries</span>
        <span className="text-red-400">{logs.filter((l) => l.level === 'error').length} errors</span>
        <span className="text-yellow-400">{logs.filter((l) => l.level === 'warn').length} warnings</span>
      </div>
    </div>
  );
}

function AboutSection() {
  return (
    <div className="p-4 max-w-xl">
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-[var(--primary)] flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z" />
            <path d="M19 10v2a7 7 0 01-14 0v-2" />
          </svg>
        </div>
        <h2 className="text-[15px] font-semibold mb-1">Private Transcript</h2>
        <p className="text-[12px] text-[var(--muted-foreground)]">Version 1.0.0</p>
      </div>

      <div className="space-y-2">
        <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--card)]">
          <div className="flex items-center gap-2.5 mb-1">
            <span className="text-base">🔒</span>
            <span className="text-[13px] font-medium">100% Private</span>
          </div>
          <p className="text-[12px] text-[var(--muted-foreground)] pl-6">
            All processing happens locally. Your data never leaves your device.
          </p>
        </div>

        <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--card)]">
          <div className="flex items-center gap-2.5 mb-1">
            <span className="text-base">📴</span>
            <span className="text-[13px] font-medium">Works Offline</span>
          </div>
          <p className="text-[12px] text-[var(--muted-foreground)] pl-6">
            No internet required after initial model download.
          </p>
        </div>

        <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--card)]">
          <div className="flex items-center gap-2.5 mb-1">
            <span className="text-base">⚡</span>
            <span className="text-[13px] font-medium">GPU Accelerated</span>
          </div>
          <p className="text-[12px] text-[var(--muted-foreground)] pl-6">
            Powered by Whisper and LLaMA with native hardware acceleration.
          </p>
        </div>
      </div>

      <p className="mt-6 text-center text-[11px] text-[var(--muted-foreground)]">
        Built with Tauri, React, and Rust
      </p>
    </div>
  );
}
