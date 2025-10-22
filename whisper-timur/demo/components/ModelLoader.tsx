import React, { useState, useEffect } from 'react';
import { ModelManager, WhisperWasmService, getAllModels } from '../../src/index';
import type { WhisperModel, ModelID } from '../../src/whisper/ModelConfig';

type Model = WhisperModel & {
  cached: boolean;
};

interface ModelLoaderProps {
  modelManager: ModelManager;
  whisperService: WhisperWasmService;
  wasmSupported: boolean | null;
  onModelLoaded: (loaded: boolean) => void;
}

export const ModelLoader: React.FC<ModelLoaderProps> = ({
  modelManager,
  whisperService,
  wasmSupported,
  onModelLoaded,
}) => {
  const [availableModels, setAvailableModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState<ModelID>('base');
  const [modelLoaded, setModelLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const loadAvailableModels = async () => {
    try {
      const models = await modelManager.getAvailableModels();
      setAvailableModels(models.map((model) => ({ ...model, cached: model.cached ?? false })));
    } catch (error) {
      console.error('Error loading models:', error);
      // Fallback to sync version
      setAvailableModels(
        getAllModels().map((model) => ({ ...model, cached: model.cached ?? false })),
      );
    }
  };

  const loadModel = async () => {
    setLoading(true);
    setProgress(0);
    console.log('Loading model:', selectedModel);
    try {
      const modelData = await modelManager.loadModel(selectedModel, true, (progress) => {
        setProgress(progress);
      });
      console.log('Model data loaded, size:', modelData.length);
      await whisperService.initModel(modelData);
      console.log('WASM module loaded successfully');
      setModelLoaded(true);
      onModelLoaded(true);

      // Update model list after loading
      await loadAvailableModels();
    } catch (error) {
      console.error('Error loading model:', error);
      onModelLoaded(false);
    } finally {
      setLoading(false);
      loadAvailableModels();
    }
  };

  const clearCache = async () => {
    try {
      await modelManager.clearCache();
      await loadAvailableModels();
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  };

  useEffect(() => {
    loadAvailableModels();
  }, []);

  return (
    <div className="section">
      <h2>2. Load Model</h2>
      <div style={{ marginBottom: '10px' }}>
        <select
          className="select"
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value as ModelID)}
        >
          {availableModels.map((model) => (
            <option key={model.id} value={model.id}>
              {model.cached ? '✅' : '⬇️'} {model.name} ({model.size}MB) -
              {model.language === 'en' ? 'English' : 'Multilingual'}
              {model.quantized ? ' [Quantized]' : ''}
            </option>
          ))}
        </select>
      </div>
      <button onClick={loadModel} disabled={loading || !wasmSupported}>
        {loading ? 'Loading...' : 'Load Model'}
      </button>
      <button onClick={clearCache} style={{ marginLeft: '10px' }} disabled={loading}>
        🗑️ Clear Cache
      </button>
      {loading && progress > 0 && (
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }}>
            {progress}%
          </div>
        </div>
      )}
      <div className="debug-info">✅ = cached, ⬇️ = needs download</div>
      {modelLoaded && <div className="status-success">Model loaded!</div>}
    </div>
  );
};
