import { useState } from 'react';
import { useAppStore } from '../../stores/appStore';
import { ModelManager } from './ModelManager';

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
  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-xl font-semibold mb-4">General Settings</h2>
      <p className="text-[var(--muted-foreground)]">
        General settings coming soon. This will include theme preferences,
        audio input device selection, and export format options.
      </p>
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
