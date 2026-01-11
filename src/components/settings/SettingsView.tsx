import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from '../../stores/appStore';
import { ModelManager } from './ModelManager';
import { Button } from '../ui/Button';
import type { OllamaStatus } from '../../types';

type Tab = 'models' | 'general' | 'about';

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
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
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
          <TabButton active={activeTab === 'about'} onClick={() => setActiveTab('about')}>
            About
          </TabButton>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'models' && <ModelManager />}
        {activeTab === 'general' && <GeneralSettings />}
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
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [autoOpenExports, setAutoOpenExports] = useState(true);
  const [defaultExportFormat, setDefaultExportFormat] = useState<'markdown' | 'pdf' | 'docx'>('markdown');
  const [obsidianVaultPath, setObsidianVaultPath] = useState('');
  const [obsidianTags, setObsidianTags] = useState('transcript');

  useEffect(() => {
    // Load saved settings
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null;
    if (savedTheme) setTheme(savedTheme);

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

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);

    // Apply theme
    const root = document.documentElement;
    if (newTheme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
    } else {
      root.classList.toggle('dark', newTheme === 'dark');
    }
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
        <h3 className="text-[11px] font-medium text-[var(--muted-foreground)] uppercase tracking-wide px-1">
          Ollama Connection
        </h3>
        <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--card)] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  ollamaStatus?.connected
                    ? 'bg-[var(--success)]'
                    : ollamaStatus === null
                    ? 'bg-[var(--warning)] animate-pulse'
                    : 'bg-[var(--destructive)]'
                }`}
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

          <div className="flex items-center gap-2">
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
        </div>
      </section>

      {/* Appearance */}
      <section className="space-y-2">
        <h3 className="text-[11px] font-medium text-[var(--muted-foreground)] uppercase tracking-wide px-1">
          Appearance
        </h3>
        <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--card)]">
          <div className="flex items-center justify-between">
            <label className="text-[13px] font-medium">Theme</label>
            <div className="inline-flex p-0.5 rounded-md bg-[var(--secondary)]">
              {(['light', 'dark', 'system'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => handleThemeChange(t)}
                  className={`px-2.5 py-1 text-[12px] font-medium rounded transition-all ${
                    theme === t
                      ? 'bg-[var(--card)] text-[var(--foreground)] shadow-sm'
                      : 'text-[var(--muted-foreground)]'
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Export Settings */}
      <section className="space-y-2">
        <h3 className="text-[11px] font-medium text-[var(--muted-foreground)] uppercase tracking-wide px-1">
          Export
        </h3>
        <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--card)] space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-[13px] font-medium">Default Format</label>
            <div className="inline-flex p-0.5 rounded-md bg-[var(--secondary)]">
              {(['markdown', 'pdf', 'docx'] as const).map((format) => (
                <button
                  key={format}
                  onClick={() => handleDefaultFormatChange(format)}
                  className={`px-2.5 py-1 text-[12px] font-medium rounded transition-all ${
                    defaultExportFormat === format
                      ? 'bg-[var(--card)] text-[var(--foreground)] shadow-sm'
                      : 'text-[var(--muted-foreground)]'
                  }`}
                >
                  {format.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-[13px] font-medium">Auto-open exported files</label>
              <p className="text-[11px] text-[var(--muted-foreground)]">
                Open in default application after export
              </p>
            </div>
            <button
              onClick={() => handleAutoOpenChange(!autoOpenExports)}
              className={`w-9 h-5 rounded-full transition-colors ${
                autoOpenExports ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                  autoOpenExports ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      </section>

      {/* Obsidian Integration */}
      <section className="space-y-2">
        <h3 className="text-[11px] font-medium text-[var(--muted-foreground)] uppercase tracking-wide px-1">
          Obsidian
        </h3>
        <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--card)] space-y-3">
          <div>
            <label className="text-[13px] font-medium mb-1 block">Vault Path</label>
            <input
              type="text"
              value={obsidianVaultPath}
              onChange={(e) => handleObsidianVaultChange(e.target.value)}
              className="w-full h-7 px-2 text-[13px] rounded-md border border-[var(--border)] bg-[var(--background)]
                         focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              placeholder="/Users/you/Documents/Obsidian Vault"
            />
          </div>

          <div>
            <label className="text-[13px] font-medium mb-1 block">Default Tags</label>
            <input
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
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <span>Export enabled</span>
            </div>
          )}
        </div>
      </section>

      {/* Debug Settings */}
      <section className="space-y-2">
        <h3 className="text-[11px] font-medium text-[var(--muted-foreground)] uppercase tracking-wide px-1">
          Developer
        </h3>
        <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--card)]">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-[13px] font-medium">Debug Logging</label>
              <p className="text-[11px] text-[var(--muted-foreground)]">
                Show detailed logs in console
              </p>
            </div>
            <button
              onClick={() => {
                const current = localStorage.getItem('DEBUG') === 'true';
                localStorage.setItem('DEBUG', String(!current));
                window.location.reload();
              }}
              className={`w-9 h-5 rounded-full transition-colors ${
                localStorage.getItem('DEBUG') === 'true' ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                  localStorage.getItem('DEBUG') === 'true' ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      </section>
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
