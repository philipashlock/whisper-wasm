import React, { useState, useMemo } from 'react';
import { WhisperWasmService, ModelManager } from '../src/index';
import { WasmSupportCheck } from './components/WasmSupportCheck';
import { ModelLoader } from './components/ModelLoader';
import { AudioLoader } from './components/AudioLoader';
import { Transcription } from './components/Transcription';

export const App: React.FC = () => {
  const [wasmSupported, setWasmSupported] = useState<boolean | null>(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [status, setStatus] = useState('');

  const whisperService = useMemo(() => new WhisperWasmService({ logLevel: 0 }), []);
  const modelManager = useMemo(() => new ModelManager(), []);

  const handleSupportCheck = (supported: boolean | null) => {
    setWasmSupported(supported);
    setStatus(supported ? 'WASM is supported' : 'WASM is not supported');
  };

  const handleModelLoaded = (loaded: boolean) => {
    setModelLoaded(loaded);
    setStatus(loaded ? 'Model loaded successfully!' : 'Error loading model');
  };

  const handleFileSelect = (file: File | null) => {
    setAudioFile(file);
    if (file) {
      setStatus(`File ${file.name} selected (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    }
  };

  return (
    <div className="app-container">
      <h1>Whisper.wasm Demo</h1>

      <WasmSupportCheck whisperService={whisperService} onSupportCheck={handleSupportCheck} />

      <ModelLoader
        modelManager={modelManager}
        whisperService={whisperService}
        wasmSupported={wasmSupported}
        onModelLoaded={handleModelLoaded}
      />

      <AudioLoader onFileSelect={handleFileSelect} />

      <Transcription
        whisperService={whisperService}
        audioFile={audioFile}
        modelLoaded={modelLoaded}
      />

      {status && <div className="status-info">{status}</div>}
    </div>
  );
};
