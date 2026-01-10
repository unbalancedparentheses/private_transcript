import { useEffect, useState } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { MainContent } from './components/layout/MainContent';
import { OnboardingView } from './components/onboarding/OnboardingView';
import { useAppStore } from './stores/appStore';

function App() {
  const { initialized, initialize, workspaces } = useAppStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      await initialize();
      setLoading(false);
    };
    init();
  }, [initialize]);

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

  // Show onboarding if no workspaces exist
  if (initialized && workspaces.length === 0) {
    return <OnboardingView />;
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <MainContent />
    </div>
  );
}

export default App;
