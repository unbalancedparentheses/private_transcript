import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { ModelInfo, DownloadProgress } from '../../types';
import { Button } from '../ui/Button';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function ModelManager() {
  const [whisperModels, setWhisperModels] = useState<ModelInfo[]>([]);
  const [llmModels, setLlmModels] = useState<ModelInfo[]>([]);
  const [downloadedModels, setDownloadedModels] = useState<string[]>([]);
  const [loadedWhisperModel, setLoadedWhisperModel] = useState<string | null>(null);
  const [loadedLlmModel, setLoadedLlmModel] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<Record<string, DownloadProgress>>({});
  const [loading, setLoading] = useState(true);
  const [totalSize, setTotalSize] = useState<number>(0);

  useEffect(() => {
    loadData();
  }, []);

  // Listen for download progress events
  useEffect(() => {
    const unlisten = listen<DownloadProgress>('model-download-progress', (event) => {
      setDownloadProgress((prev) => ({
        ...prev,
        [event.payload.modelId]: event.payload,
      }));

      if (event.payload.status === 'complete') {
        // Refresh data after download completes
        loadData();
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const loadData = async () => {
    try {
      const [whisper, llm, downloaded, whisperLoaded, llmLoaded, size] = await Promise.all([
        invoke<ModelInfo[]>('get_available_whisper_models'),
        invoke<ModelInfo[]>('get_available_llm_models'),
        invoke<string[]>('get_downloaded_models'),
        invoke<string | null>('get_loaded_whisper_model'),
        invoke<string | null>('get_loaded_llm_model'),
        invoke<number>('get_models_total_size'),
      ]);

      setWhisperModels(whisper);
      setLlmModels(llm);
      setDownloadedModels(downloaded);
      setLoadedWhisperModel(whisperLoaded);
      setLoadedLlmModel(llmLoaded);
      setTotalSize(size);
    } catch (error) {
      console.error('Failed to load model data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (modelId: string) => {
    try {
      await invoke('download_model', { modelId });
    } catch (error) {
      console.error('Failed to download model:', error);
    }
  };

  const handleDelete = async (modelId: string) => {
    try {
      await invoke('delete_model', { modelId });
      await loadData();
    } catch (error) {
      console.error('Failed to delete model:', error);
    }
  };

  const handleLoadWhisper = async (modelId: string) => {
    try {
      if (loadedWhisperModel) {
        await invoke('unload_whisper_model');
      }
      await invoke('load_whisper_model', { modelId });
      setLoadedWhisperModel(modelId);
    } catch (error) {
      console.error('Failed to load whisper model:', error);
    }
  };

  const handleLoadLlm = async (modelId: string) => {
    try {
      if (loadedLlmModel) {
        await invoke('unload_llm_model');
      }
      await invoke('load_llm_model', { modelId });
      setLoadedLlmModel(modelId);
    } catch (error) {
      console.error('Failed to load LLM model:', error);
    }
  };

  const isDownloaded = (modelId: string) => downloadedModels.includes(modelId);
  const isDownloading = (modelId: string) => {
    const progress = downloadProgress[modelId];
    return progress && progress.status === 'downloading';
  };
  const getProgress = (modelId: string) => downloadProgress[modelId];

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-muted-foreground">Loading models...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      <div>
        <h2 className="text-xl font-semibold mb-2">Model Manager</h2>
        <p className="text-muted-foreground mb-4">
          Manage AI models for transcription and note generation. Total storage used: {formatBytes(totalSize)}
        </p>
      </div>

      {/* Whisper Models */}
      <div>
        <h3 className="font-semibold mb-3">Speech Recognition (Whisper)</h3>
        <div className="space-y-2">
          {whisperModels.map((model) => {
            const downloaded = isDownloaded(model.id);
            const downloading = isDownloading(model.id);
            const progress = getProgress(model.id);
            const isLoaded = loadedWhisperModel === model.id;

            return (
              <div
                key={model.id}
                className={`p-4 rounded-lg border ${
                  isLoaded ? 'border-primary bg-primary/5' : 'border-border'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-medium flex items-center gap-2">
                      {model.name}
                      {isLoaded && (
                        <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">{model.description}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {formatBytes(model.sizeBytes)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {downloaded ? (
                      <>
                        {!isLoaded && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleLoadWhisper(model.id)}
                          >
                            Load
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(model.id)}
                          disabled={isLoaded}
                        >
                          Delete
                        </Button>
                      </>
                    ) : downloading ? (
                      <Button size="sm" disabled>
                        Downloading...
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => handleDownload(model.id)}>
                        Download
                      </Button>
                    )}
                  </div>
                </div>
                {downloading && progress && (
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
              </div>
            );
          })}
        </div>
      </div>

      {/* LLM Models */}
      <div>
        <h3 className="font-semibold mb-3">Note Generation (LLM)</h3>
        <div className="space-y-2">
          {llmModels.map((model) => {
            const downloaded = isDownloaded(model.id);
            const downloading = isDownloading(model.id);
            const progress = getProgress(model.id);
            const isLoaded = loadedLlmModel === model.id;

            return (
              <div
                key={model.id}
                className={`p-4 rounded-lg border ${
                  isLoaded ? 'border-primary bg-primary/5' : 'border-border'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-medium flex items-center gap-2">
                      {model.name}
                      {isLoaded && (
                        <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">{model.description}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {formatBytes(model.sizeBytes)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {downloaded ? (
                      <>
                        {!isLoaded && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleLoadLlm(model.id)}
                          >
                            Load
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(model.id)}
                          disabled={isLoaded}
                        >
                          Delete
                        </Button>
                      </>
                    ) : downloading ? (
                      <Button size="sm" disabled>
                        Downloading...
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => handleDownload(model.id)}>
                        Download
                      </Button>
                    )}
                  </div>
                </div>
                {downloading && progress && (
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
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
