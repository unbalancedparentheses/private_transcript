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
      {/* Header */}
      <header className="h-16 px-8 flex items-center justify-between border-b border-[var(--border)] bg-[var(--card)]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setView('list')}
            className="w-8 h-8 rounded-lg hover:bg-[var(--muted)] flex items-center justify-center transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-[var(--foreground)]">Settings</h1>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-[var(--border)] bg-[var(--card)]">
        <div className="px-8 flex gap-1">
          <TabButton
            active={activeTab === 'models'}
            onClick={() => setActiveTab('models')}
          >
            Models
          </TabButton>
          <TabButton
            active={activeTab === 'general'}
            onClick={() => setActiveTab('general')}
          >
            General
          </TabButton>
          <TabButton
            active={activeTab === 'about'}
            onClick={() => setActiveTab('about')}
          >
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
      className={`px-4 py-3 text-sm font-medium transition-colors relative ${
        active
          ? 'text-[var(--foreground)]'
          : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
      }`}
    >
      {children}
      {active && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary)]" />
      )}
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

  return (
    <div className="p-6 max-w-2xl space-y-8">
      <div>
        <h2 className="text-xl font-semibold mb-6">General Settings</h2>
      </div>

      {/* Ollama Connection Status */}
      <div className="space-y-4">
        <h3 className="font-medium text-sm uppercase tracking-wider text-[var(--muted-foreground)]">
          Ollama Connection
        </h3>
        <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--card)]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full ${
                  ollamaStatus?.connected
                    ? 'bg-green-500'
                    : ollamaStatus === null
                    ? 'bg-yellow-500 animate-pulse'
                    : 'bg-red-500'
                }`}
              />
              <span className="font-medium">
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
              {checkingOllama ? 'Checking...' : 'Refresh'}
            </Button>
          </div>

          {ollamaStatus?.connected && ollamaStatus.models.length > 0 && (
            <div className="mb-4">
              <p className="text-sm text-[var(--muted-foreground)] mb-2">Available models:</p>
              <div className="flex flex-wrap gap-2">
                {ollamaStatus.models.map((model) => (
                  <span
                    key={model}
                    className="px-2 py-1 text-xs rounded-full bg-[var(--muted)] text-[var(--muted-foreground)]"
                  >
                    {model}
                  </span>
                ))}
              </div>
            </div>
          )}

          {ollamaStatus?.error && (
            <p className="text-sm text-[var(--destructive)] mb-4">{ollamaStatus.error}</p>
          )}

          <div className="flex items-center gap-2">
            <label className="text-sm text-[var(--muted-foreground)]">Endpoint:</label>
            <input
              type="text"
              value={ollamaEndpoint}
              onChange={(e) => handleEndpointChange(e.target.value)}
              className="flex-1 h-8 px-3 text-sm rounded-md border border-[var(--border)] bg-[var(--background)]
                         focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              placeholder="http://localhost:11434"
            />
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className="space-y-4">
        <h3 className="font-medium text-sm uppercase tracking-wider text-[var(--muted-foreground)]">
          Appearance
        </h3>
        <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--card)]">
          <label className="text-sm font-medium mb-3 block">Theme</label>
          <div className="flex gap-2">
            {(['light', 'dark', 'system'] as const).map((t) => (
              <button
                key={t}
                onClick={() => handleThemeChange(t)}
                className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                  theme === t
                    ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]'
                    : 'border-[var(--border)] hover:bg-[var(--muted)]'
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Export Settings */}
      <div className="space-y-4">
        <h3 className="font-medium text-sm uppercase tracking-wider text-[var(--muted-foreground)]">
          Export
        </h3>
        <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--card)] space-y-4">
          <div>
            <label className="text-sm font-medium mb-3 block">Default Export Format</label>
            <div className="flex gap-2">
              {(['markdown', 'pdf', 'docx'] as const).map((format) => (
                <button
                  key={format}
                  onClick={() => handleDefaultFormatChange(format)}
                  className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                    defaultExportFormat === format
                      ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]'
                      : 'border-[var(--border)] hover:bg-[var(--muted)]'
                  }`}
                >
                  {format.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium">Auto-open exported files</label>
              <p className="text-xs text-[var(--muted-foreground)]">
                Open files in default application after export
              </p>
            </div>
            <button
              onClick={() => handleAutoOpenChange(!autoOpenExports)}
              className={`w-11 h-6 rounded-full transition-colors ${
                autoOpenExports ? 'bg-[var(--primary)]' : 'bg-[var(--muted)]'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                  autoOpenExports ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Debug Settings */}
      <div className="space-y-4">
        <h3 className="font-medium text-sm uppercase tracking-wider text-[var(--muted-foreground)]">
          Developer
        </h3>
        <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--card)]">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium">Enable Debug Logging</label>
              <p className="text-xs text-[var(--muted-foreground)]">
                Show detailed logs in browser console
              </p>
            </div>
            <button
              onClick={() => {
                const current = localStorage.getItem('DEBUG') === 'true';
                localStorage.setItem('DEBUG', String(!current));
                window.location.reload();
              }}
              className={`w-11 h-6 rounded-full transition-colors ${
                localStorage.getItem('DEBUG') === 'true' ? 'bg-[var(--primary)]' : 'bg-[var(--muted)]'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                  localStorage.getItem('DEBUG') === 'true' ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AboutSection() {
  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-xl font-semibold mb-4">About Private Transcript</h2>

      <div className="space-y-4">
        <div className="p-4 rounded-lg bg-[var(--muted)]">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🔒</span>
            <span className="font-medium">100% Private</span>
          </div>
          <p className="text-sm text-[var(--muted-foreground)]">
            All transcription and note generation happens locally on your device.
            Your audio and text never leave your computer.
          </p>
        </div>

        <div className="p-4 rounded-lg bg-[var(--muted)]">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🚫</span>
            <span className="font-medium">No Cloud Required</span>
          </div>
          <p className="text-sm text-[var(--muted-foreground)]">
            Works completely offline after initial model download.
            No internet connection required for transcription or note generation.
          </p>
        </div>

        <div className="p-4 rounded-lg bg-[var(--muted)]">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🧠</span>
            <span className="font-medium">Powered by Open Source</span>
          </div>
          <p className="text-sm text-[var(--muted-foreground)]">
            Uses Whisper for speech recognition and LLaMA for note generation.
            Both models run natively on your hardware with GPU acceleration.
          </p>
        </div>
      </div>

      <div className="mt-8 text-sm text-[var(--muted-foreground)]">
        <p>Version 1.0.0</p>
        <p className="mt-1">Built with Tauri, React, and Rust</p>
      </div>
    </div>
  );
}
