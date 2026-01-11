import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useAppStore } from '../../stores/appStore';
import { WORKSPACE_CONFIG, WorkspaceType, ModelInfo, DownloadProgress } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

type Step = 'welcome' | 'workspace' | 'models' | 'ready';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function OnboardingView() {
  const { createWorkspace, setOnboardingComplete } = useAppStore();
  const [step, setStep] = useState<Step>('welcome');
  const [selectedType, setSelectedType] = useState<WorkspaceType | null>(null);
  const [workspaceName, setWorkspaceName] = useState('');
  const [finishing, setFinishing] = useState(false);

  // Model selection state
  const [whisperModels, setWhisperModels] = useState<ModelInfo[]>([]);
  const [llmModels, setLlmModels] = useState<ModelInfo[]>([]);
  const [selectedWhisperModel, setSelectedWhisperModel] = useState<string | null>(null);
  const [selectedLlmModel, setSelectedLlmModel] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<Record<string, DownloadProgress>>({});
  const [downloading, setDownloading] = useState(false);
  const [modelsReady, setModelsReady] = useState(false);

  // Load available models when entering models step
  useEffect(() => {
    if (step === 'models') {
      loadModels();
    }
  }, [step]);

  // Listen for download progress events
  useEffect(() => {
    console.log('Setting up download progress listener');
    const unlisten = listen<DownloadProgress>('model-download-progress', (event) => {
      console.log('Received download progress:', event.payload);
      setDownloadProgress((prev) => ({
        ...prev,
        [event.payload.modelId]: event.payload,
      }));

      // Check if download completed
      if (event.payload.status === 'complete') {
        checkModelsReady();
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  // Auto-proceed when both models are downloaded and verified
  useEffect(() => {
    if (modelsReady && step === 'models' && !downloading) {
      // Give a short delay so the user sees the success state
      const timer = setTimeout(() => {
        setStep('ready');
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [modelsReady, step, downloading]);

  const loadModels = async () => {
    try {
      const [whisper, llm, downloaded] = await Promise.all([
        invoke<ModelInfo[]>('get_available_whisper_models'),
        invoke<ModelInfo[]>('get_available_llm_models'),
        invoke<string[]>('get_downloaded_models'),
      ]);

      setWhisperModels(whisper);
      setLlmModels(llm);

      // Pre-select recommended models
      setSelectedWhisperModel('whisper-base');
      setSelectedLlmModel('llama-3.2-3b');

      // Check if models already downloaded
      const whisperDownloaded = downloaded.some((id) =>
        whisper.some((m) => m.id === id)
      );
      const llmDownloaded = downloaded.some((id) =>
        llm.some((m) => m.id === id)
      );

      if (whisperDownloaded && llmDownloaded) {
        setModelsReady(true);
      }
    } catch (error) {
      console.error('Failed to load models:', error);
    }
  };

  const checkModelsReady = async () => {
    try {
      const ready = await invoke<boolean>('are_models_ready');
      setModelsReady(ready);
    } catch (error) {
      console.error('Failed to check models:', error);
    }
  };

  const handleDownloadModels = async () => {
    if (!selectedWhisperModel || !selectedLlmModel) return;

    setDownloading(true);
    try {
      // Download and verify Whisper model (backend loads to verify)
      console.log('Starting Whisper download:', selectedWhisperModel);
      await invoke('download_model', { modelId: selectedWhisperModel });
      console.log('Whisper model ready');

      // Download and verify LLM model (backend loads to verify)
      console.log('Starting LLM download:', selectedLlmModel);
      await invoke('download_model', { modelId: selectedLlmModel });
      console.log('LLM model ready');

      setModelsReady(true);
    } catch (error) {
      console.error('Failed to download/load models:', error);
      // Show error to user
      setDownloadProgress((prev) => ({
        ...prev,
        [selectedWhisperModel!]: {
          ...prev[selectedWhisperModel!],
          status: 'error',
          errorMessage: String(error),
        },
      }));
    } finally {
      setDownloading(false);
    }
  };

  const handleSelectType = (type: WorkspaceType) => {
    setSelectedType(type);
    setWorkspaceName(WORKSPACE_CONFIG[type].label);
  };

  const handleContinueToModels = () => {
    if (!selectedType || !workspaceName.trim()) return;
    setStep('models');
  };

  const handleFinish = async () => {
    if (!selectedType || !workspaceName.trim()) return;

    setFinishing(true);
    try {
      // Create workspace now that models are ready
      await createWorkspace(workspaceName.trim(), selectedType);
      // Mark onboarding as complete
      setOnboardingComplete(true);
    } catch (error) {
      console.error('Failed to complete setup:', error);
    } finally {
      setFinishing(false);
    }
  };

  const getDownloadStatus = (modelId: string) => {
    return downloadProgress[modelId];
  };

  const isModelDownloading = (modelId: string) => {
    const progress = getDownloadStatus(modelId);
    return progress && (progress.status === 'downloading' || progress.status === 'verifying');
  };

  const isModelVerifying = (modelId: string) => {
    const progress = getDownloadStatus(modelId);
    return progress && progress.status === 'verifying';
  };

  const isModelDownloaded = (modelId: string) => {
    const progress = getDownloadStatus(modelId);
    return progress && progress.status === 'complete';
  };

  const getModelError = (modelId: string) => {
    const progress = getDownloadStatus(modelId);
    return progress?.status === 'error' ? progress.errorMessage : null;
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
                  <Button onClick={handleContinueToModels} disabled={!workspaceName.trim()}>
                    Continue
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 'models' && (
          <div>
            <h2 className="text-2xl font-bold text-center mb-2">Download AI Models</h2>
            <p className="text-center text-muted-foreground mb-8">
              These models run entirely on your device. No internet required after download.
            </p>

            {/* Whisper Model Selection */}
            <div className="mb-6">
              <h3 className="font-semibold mb-3">Speech Recognition (Whisper)</h3>
              <div className="space-y-2">
                {whisperModels.map((model) => {
                  const progress = getDownloadStatus(model.id);
                  const isDownloading = isModelDownloading(model.id);
                  const isDownloaded = isModelDownloaded(model.id);

                  return (
                    <button
                      key={model.id}
                      onClick={() => !downloading && setSelectedWhisperModel(model.id)}
                      disabled={downloading}
                      className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                        selectedWhisperModel === model.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      } ${downloading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">
                            {model.name}
                            {model.id === 'whisper-base' && (
                              <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                                Recommended
                              </span>
                            )}
                            {isDownloaded && (
                              <span className="ml-2 text-xs bg-green-500/20 text-green-600 px-2 py-0.5 rounded">
                                Downloaded
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">{model.description}</div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatBytes(model.sizeBytes)}
                        </div>
                      </div>
                      {isDownloading && progress && (
                        <div className="mt-3">
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all"
                              style={{ width: `${progress.percent}%` }}
                            />
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {formatBytes(progress.downloadedBytes)} / {formatBytes(progress.totalBytes)}
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* LLM Model Selection */}
            <div className="mb-8">
              <h3 className="font-semibold mb-3">Note Generation (LLM)</h3>
              <div className="space-y-2">
                {llmModels.map((model) => {
                  const progress = getDownloadStatus(model.id);
                  const isDownloading = isModelDownloading(model.id);
                  const isDownloaded = isModelDownloaded(model.id);

                  return (
                    <button
                      key={model.id}
                      onClick={() => !downloading && setSelectedLlmModel(model.id)}
                      disabled={downloading}
                      className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                        selectedLlmModel === model.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      } ${downloading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">
                            {model.name}
                            {model.id === 'llama-3.2-3b' && (
                              <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                                Recommended
                              </span>
                            )}
                            {isDownloaded && (
                              <span className="ml-2 text-xs bg-green-500/20 text-green-600 px-2 py-0.5 rounded">
                                Downloaded
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">{model.description}</div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatBytes(model.sizeBytes)}
                        </div>
                      </div>
                      {isDownloading && progress && (
                        <div className="mt-3">
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all"
                              style={{ width: `${progress.percent}%` }}
                            />
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {formatBytes(progress.downloadedBytes)} / {formatBytes(progress.totalBytes)}
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Download Progress Section */}
            {downloading && (
              <div className="mb-6 p-4 rounded-lg bg-muted">
                <div className="text-sm font-medium mb-3">
                  {modelsReady ? 'Models verified successfully!' : 'Downloading models...'}
                </div>

                {/* Whisper Progress */}
                {selectedWhisperModel && (
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Whisper ({whisperModels.find(m => m.id === selectedWhisperModel)?.name})</span>
                      <span>
                        {isModelDownloaded(selectedWhisperModel)
                          ? 'Verified ✓'
                          : isModelVerifying(selectedWhisperModel)
                          ? 'Verifying...'
                          : downloadProgress[selectedWhisperModel]
                          ? `${formatBytes(downloadProgress[selectedWhisperModel].downloadedBytes)} / ${formatBytes(downloadProgress[selectedWhisperModel].totalBytes)}`
                          : 'Starting...'}
                      </span>
                    </div>
                    <div className="h-2 bg-background rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isModelDownloaded(selectedWhisperModel) ? 'bg-green-500' : 'bg-primary'
                        }`}
                        style={{ width: `${downloadProgress[selectedWhisperModel]?.percent || 0}%` }}
                      />
                    </div>
                    {getModelError(selectedWhisperModel) && (
                      <div className="text-xs text-red-500 mt-1">
                        {getModelError(selectedWhisperModel)}
                      </div>
                    )}
                  </div>
                )}

                {/* LLM Progress */}
                {selectedLlmModel && (
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>LLM ({llmModels.find(m => m.id === selectedLlmModel)?.name})</span>
                      <span>
                        {isModelDownloaded(selectedLlmModel)
                          ? 'Verified ✓'
                          : isModelVerifying(selectedLlmModel)
                          ? 'Verifying...'
                          : downloadProgress[selectedLlmModel]
                          ? `${formatBytes(downloadProgress[selectedLlmModel].downloadedBytes)} / ${formatBytes(downloadProgress[selectedLlmModel].totalBytes)}`
                          : 'Waiting...'}
                      </span>
                    </div>
                    <div className="h-2 bg-background rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isModelDownloaded(selectedLlmModel) ? 'bg-green-500' : 'bg-primary'
                        }`}
                        style={{ width: `${downloadProgress[selectedLlmModel]?.percent || 0}%` }}
                      />
                    </div>
                    {getModelError(selectedLlmModel) && (
                      <div className="text-xs text-red-500 mt-1">
                        {getModelError(selectedLlmModel)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3">
              {modelsReady ? (
                <Button size="lg" onClick={() => setStep('ready')}>
                  Continue
                </Button>
              ) : (
                <Button
                  size="lg"
                  onClick={handleDownloadModels}
                  disabled={downloading || !selectedWhisperModel || !selectedLlmModel}
                >
                  {downloading ? 'Downloading...' : 'Download Models'}
                </Button>
              )}
            </div>
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
            <Button size="lg" onClick={handleFinish} disabled={finishing}>
              {finishing ? 'Setting up...' : 'Start Using Private Transcript'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
