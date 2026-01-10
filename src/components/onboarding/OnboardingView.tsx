import { useState } from 'react';
import { useAppStore } from '../../stores/appStore';
import { WORKSPACE_CONFIG, WorkspaceType } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

type Step = 'welcome' | 'workspace' | 'setup' | 'ready';

export function OnboardingView() {
  const { createWorkspace, initialize } = useAppStore();
  const [step, setStep] = useState<Step>('welcome');
  const [selectedType, setSelectedType] = useState<WorkspaceType | null>(null);
  const [workspaceName, setWorkspaceName] = useState('');
  const [creating, setCreating] = useState(false);

  const handleSelectType = (type: WorkspaceType) => {
    setSelectedType(type);
    setWorkspaceName(WORKSPACE_CONFIG[type].label);
  };

  const handleCreate = async () => {
    if (!selectedType || !workspaceName.trim()) return;

    setCreating(true);
    try {
      await createWorkspace(workspaceName.trim(), selectedType);
      setStep('ready');
    } catch (error) {
      console.error('Failed to create workspace:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleFinish = async () => {
    await initialize();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        {step === 'welcome' && (
          <div className="text-center">
            <div className="text-6xl mb-6">🔒</div>
            <h1 className="text-3xl font-bold mb-4">Welcome to Private Transcript</h1>
            <p className="text-lg text-muted-foreground mb-8">
              Your conversations stay on your device. 100% private, offline transcription
              with AI-powered note generation.
            </p>
            <Button size="lg" onClick={() => setStep('workspace')}>
              Get Started
            </Button>
          </div>
        )}

        {step === 'workspace' && (
          <div>
            <h2 className="text-2xl font-bold text-center mb-2">Choose your workspace type</h2>
            <p className="text-center text-muted-foreground mb-8">
              Select the type that best fits your needs. You can add more workspaces later.
            </p>

            <div className="grid grid-cols-2 gap-4 mb-8">
              {(Object.entries(WORKSPACE_CONFIG) as [WorkspaceType, typeof WORKSPACE_CONFIG[WorkspaceType]][]).map(
                ([type, config]) => (
                  <button
                    key={type}
                    onClick={() => handleSelectType(type)}
                    className={`p-6 rounded-xl border-2 text-left transition-all ${
                      selectedType === type
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50 hover:bg-accent/50'
                    }`}
                  >
                    <div className="text-3xl mb-3">{config.icon}</div>
                    <h3 className="font-semibold text-lg mb-1">{config.label}</h3>
                    <p className="text-sm text-muted-foreground">{config.description}</p>
                  </button>
                )
              )}
            </div>

            {selectedType && (
              <div className="space-y-4">
                <Input
                  label="Workspace Name"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  placeholder="Enter workspace name"
                />
                <div className="flex justify-end gap-3">
                  <Button variant="ghost" onClick={() => setSelectedType(null)}>
                    Back
                  </Button>
                  <Button onClick={handleCreate} disabled={creating || !workspaceName.trim()}>
                    {creating ? 'Creating...' : 'Continue'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 'ready' && (
          <div className="text-center">
            <div className="text-6xl mb-6">✓</div>
            <h2 className="text-2xl font-bold mb-4">You're all set!</h2>
            <div className="bg-sidebar rounded-xl p-6 mb-8 text-left max-w-md mx-auto">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">🔒</span>
                <span className="font-medium">100% Local Processing</span>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">📁</span>
                <span className="font-medium">Data stored on your device</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-2xl">🚫</span>
                <span className="font-medium">No cloud, no tracking</span>
              </div>
            </div>
            <p className="text-muted-foreground mb-6">
              Your conversations never leave this device.
            </p>
            <Button size="lg" onClick={handleFinish}>
              Start Using Private Transcript
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
