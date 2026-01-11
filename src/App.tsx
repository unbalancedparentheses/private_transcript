import { useEffect, useState, useCallback } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { MainContent } from './components/layout/MainContent';
import { OnboardingView } from './components/onboarding/OnboardingView';
import { GlobalSearch } from './components/search/GlobalSearch';
import { ChatPanel } from './components/chat';
import { useAppStore } from './stores/appStore';
import { logger } from './lib/logger';

function App() {
  const { initialized, initialize, onboardingComplete } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const init = async () => {
      logger.info('App initializing...', { context: 'App' });
      await initialize();
      logger.info('App initialized successfully', { context: 'App' });
      setLoading(false);
    };
    init();
  }, [initialize]);

  // Global keyboard shortcut for search (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCloseSearch = useCallback(() => setSearchOpen(false), []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show onboarding if not complete (no workspace or no models)
  if (initialized && !onboardingComplete) {
    return <OnboardingView />;
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <MainContent />
      <GlobalSearch isOpen={searchOpen} onClose={handleCloseSearch} />
      <ChatPanel />
    </div>
  );
}

export default App;
