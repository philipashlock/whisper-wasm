import { useState, useRef, useEffect, useMemo } from 'react';
import { Mic, MicOff, Download, Loader, AlertCircle, CheckCircle, Trash2, Sun, Moon } from 'lucide-react';
import { WhisperWasmService, ModelManager } from '@timur00kh/whisper.wasm';

const MODELS = [
  { id: 'tiny.en' as const, name: 'Tiny (English)', size: '75 MB', url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en.bin', speed: 'Very Fast', accuracy: 'Basic' },
  { id: 'base.en' as const, name: 'Base (English)', size: '142 MB', url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin', speed: 'Fast', accuracy: 'Good' },
  { id: 'base' as const, name: 'Base (Multilingual)', size: '142 MB', url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin', speed: 'Fast', accuracy: 'Good' },
  { id: 'tiny.en-q5_1' as const, name: 'Tiny (Q5_1)', size: '31 MB', url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en-q5_1.bin', speed: 'Very Fast', accuracy: 'Basic' },
  { id: 'base.en-q5_1' as const, name: 'Base (Q5_1)', size: '57 MB', url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en-q5_1.bin', speed: 'Fast', accuracy: 'Good' },
];

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ko', name: 'Korean' },
];

export default function App() {
  const [selectedModel, setSelectedModel] = useState(MODELS[0]);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [modelLoaded, setModelLoaded] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [status, setStatus] = useState('not started');
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState('');
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [wasmSupported, setWasmSupported] = useState<boolean | null>(null);
  const [darkMode, setDarkMode] = useState(true);

  // Get the type of the session object from the service method's return type
  type TranscriptionSession = ReturnType<WhisperWasmService['createSession']>;

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<TranscriptionSession | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioChunksRef = useRef<Float32Array[]>([]);
  const processingIntervalRef = useRef<number | null>(null);
  const isProcessingRef = useRef<boolean>(false);

  const kSampleRate = 16000;
  const kIntervalAudio_ms = 2000; // Process audio in 2-second chunks
  const kBufferSize = 4096; // ScriptProcessor buffer size

  const whisperService = useMemo(() => new WhisperWasmService({ logLevel: 1 }), []);
  const modelManager = useMemo(() => new ModelManager(), []);

  const addLog = (msg: string) => {
    console.log(msg);
    setDebugLog(prev => [...prev.slice(-20), `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  useEffect(() => {
    const checkSupport = async () => {
      addLog('Checking WASM support...');
      const supported = await whisperService.checkWasmSupport();
      setWasmSupported(supported);
      addLog(supported ? '✓ WASM is supported' : '✗ WASM is not supported');
      if (!supported) {
        setError('WebAssembly is not supported in this browser.');
      }
    };
    checkSupport();

    return () => {
      stopRecording();
    };
  }, []);

  // Load model
  const loadModel = async () => {
    if (!wasmSupported) {
      setError('Cannot load model, WASM not supported.');
      return;
    }
    setDownloading(true);
    setDownloadProgress(0);
    setError('');
    addLog(`Loading ${selectedModel.name} model...`);

    try {
      const modelData = await modelManager.loadModel(selectedModel.id, true, (p) => setDownloadProgress(p));
      await whisperService.initModel(modelData);
      addLog('✓ Model initialized successfully');
      setModelLoaded(true);
    } catch (err) {
      const errorMessage = `Failed to load model: ${(err as Error).message}`;
      setError(errorMessage);
      addLog(`✗ ${errorMessage}`);
    } finally {
      setDownloading(false);
    }
  };

  // Start recording
  const startRecording = async () => {
    try {
      setError('');
      addLog('Starting recording...');

      // Create a new transcription session
      addLog(`Creating session with language: ${selectedLanguage}`);
      sessionRef.current = whisperService.createSession();
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext({
          sampleRate: kSampleRate,
        });
        addLog(`✓ Audio context created (${kSampleRate}Hz)`);
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;
      addLog('✓ Microphone access granted');

      // Setup visualizer
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;
      visualize();

      setIsRecording(true);
      setStatus('recording');

      // Use ScriptProcessorNode to capture raw audio (deprecated but widely supported)
      // Note: AudioWorklet is the modern replacement but requires more setup
      processorRef.current = audioContextRef.current.createScriptProcessor(kBufferSize, 1, 1);
      audioChunksRef.current = [];

      processorRef.current.onaudioprocess = (e) => {
        if (!sessionRef.current) return;

        // Get the audio data from the input buffer
        const inputData = e.inputBuffer.getChannelData(0);
        // Copy the data (important because the buffer gets reused)
        const audioChunk = new Float32Array(inputData);
        audioChunksRef.current.push(audioChunk);
      };

      // Connect the processor
      source.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);

      // Process accumulated audio chunks at intervals
      processingIntervalRef.current = window.setInterval(async () => {
        // Skip if already processing or no session/data
        if (isProcessingRef.current || !sessionRef.current || audioChunksRef.current.length === 0) {
          if (isProcessingRef.current && audioChunksRef.current.length > 0) {
            addLog('⏳ Skipping chunk - previous transcription still in progress');
          }
          return;
        }

        try {
          isProcessingRef.current = true;

          // Concatenate all accumulated chunks
          const totalLength = audioChunksRef.current.reduce((sum, chunk) => sum + chunk.length, 0);
          const audioData = new Float32Array(totalLength);
          let offset = 0;
          for (const chunk of audioChunksRef.current) {
            audioData.set(chunk, offset);
            offset += chunk.length;
          }

          // Clear the chunks for next interval
          audioChunksRef.current = [];

          addLog(`Processing audio chunk: ${audioData.length} samples`);
          const stream = sessionRef.current.streaming(audioData, {
            language: selectedLanguage,
            threads: 4,
            translate: false,
          });

          for await (const segment of stream) {
            const segmentText = `[${(segment.timeStart / 1000).toFixed(2)}s -> ${(segment.timeEnd / 1000).toFixed(2)}s] ${segment.text}`;
            addLog(`New segment: ${segmentText}`);
            setTranscribedText(prev => prev + ' ' + segment.text.trim());
          }
        } catch (err) {
          const errorMessage = `Audio processing error: ${(err as Error).message}`;
          addLog(`✗ ${errorMessage}`);
          setError(errorMessage);
        } finally {
          isProcessingRef.current = false;
        }
      }, kIntervalAudio_ms);

      addLog(`✓ Recording started (${kIntervalAudio_ms}ms chunks)`);
    } catch (err) {
      const errorMessage = `Microphone access error: ${(err as Error).message}`;
      setError(errorMessage);
      addLog(`✗ ${errorMessage}`);
      setIsRecording(false);
    }
  };

  // Stop recording
  const stopRecording = () => {
    addLog('Stopping recording...');
    setIsRecording(false);
    setStatus('paused');

    // Clear the processing interval
    if (processingIntervalRef.current) {
      clearInterval(processingIntervalRef.current);
      processingIntervalRef.current = null;
    }

    // Reset processing flag
    isProcessingRef.current = false;

    // Disconnect and clean up the audio processor
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    // Clear any remaining audio chunks
    audioChunksRef.current = [];

    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setAudioLevel(0);

    if (sessionRef.current) {
      sessionRef.current = null;
    }

    addLog('✓ Recording stopped');
  };

  // Visualize audio levels
  const visualize = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

    const draw = () => {
      if (!isRecording) return;
      animationFrameRef.current = requestAnimationFrame(draw);
      analyserRef.current!.getByteFrequencyData(dataArray);

      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      setAudioLevel(Math.min(100, (average / 255) * 200));
    };

    draw();
  };

  const clearTranscription = () => {
    setTranscribedText('');
    addLog('Transcription cleared.');
    setDebugLog([]);
  };

  return (
    <div className={`min-h-screen p-8 transition-colors ${
      darkMode
        ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white'
        : 'bg-gradient-to-br from-slate-50 via-purple-50 to-slate-50 text-slate-900'
    }`}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold mb-2">Whisper.cpp Real-time Transcription</h1>
            <p className={darkMode ? 'text-slate-300' : 'text-slate-600'}>WebAssembly-powered speech recognition in your browser</p>
          </div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-3 rounded-lg transition-all ${
              darkMode
                ? 'bg-white/10 hover:bg-white/20 border border-white/20'
                : 'bg-slate-200 hover:bg-slate-300 border border-slate-300'
            }`}
            aria-label="Toggle dark mode"
          >
            {darkMode ? <Sun size={24} /> : <Moon size={24} />}
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500 rounded-lg flex items-center gap-3">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Model Selection */}
          <div className={`backdrop-blur-sm rounded-xl p-6 border ${
            darkMode ? 'bg-white/10 border-white/20' : 'bg-white border-slate-200 shadow-lg'
          }`}>
            <h2 className="text-xl font-semibold mb-4">Model Configuration</h2>

            <div className="mb-4">
              <label className={`block text-sm mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Select Model</label>
              <div className="space-y-2">
                {MODELS.map(model => (
                  <button
                    key={model.id}
                    onClick={() => {
                      setSelectedModel(model);
                      setModelLoaded(false);
                    }}
                    disabled={isRecording}
                    className={`w-full p-3 rounded-lg text-left transition-all ${
                      selectedModel.id === model.id
                        ? 'bg-purple-600 text-white border-2 border-purple-400'
                        : darkMode
                        ? 'bg-white/5 hover:bg-white/10 border-2 border-transparent'
                        : 'bg-slate-100 hover:bg-slate-200 border-2 border-transparent'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium">{model.name}</span>
                      <span className={`text-sm ${selectedModel.id === model.id ? 'text-purple-100' : darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{model.size}</span>
                    </div>
                    <div className={`flex gap-3 text-xs ${selectedModel.id === model.id ? 'text-purple-200' : darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      <span>Speed: {model.speed}</span>
                      <span>Accuracy: {model.accuracy}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className={`block text-sm mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Language</label>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                disabled={isRecording}
                className={`w-full border rounded-lg px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  darkMode
                    ? 'bg-white/5 border-white/20 text-white'
                    : 'bg-white border-slate-300 text-slate-900'
                }`}
              >
                {LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code} className={darkMode ? 'bg-slate-900' : 'bg-white'}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={loadModel}
              disabled={downloading || modelLoaded || isRecording}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:cursor-not-allowed py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
            >
              {downloading ? (
                <>
                  <Loader size={20} className="animate-spin" />
                  Downloading... {downloadProgress}%
                </>
              ) : modelLoaded ? (
                <>
                  <CheckCircle size={20} />
                  Model Loaded
                </>
              ) : (
                <>
                  <Download size={20} />
                  Load Model
                </>
              )}
            </button>

            {downloading && (
              <div className={`mt-3 rounded-full h-2 overflow-hidden ${darkMode ? 'bg-white/5' : 'bg-slate-200'}`}>
                <div
                  className="bg-purple-500 h-full transition-all duration-300"
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
            )}
          </div>

          {/* Recording Controls with Transcription */}
          <div className={`backdrop-blur-sm rounded-xl p-6 border ${
            darkMode ? 'bg-white/10 border-white/20' : 'bg-white border-slate-200 shadow-lg'
          }`}>
            <h2 className="text-xl font-semibold mb-4">Recording & Transcription</h2>

            <div className="mb-6">
              <div className="flex items-center justify-center mb-4">
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={!modelLoaded || !wasmSupported}
                  className={`w-24 h-24 rounded-full flex items-center justify-center transition-all transform hover:scale-105 ${
                    isRecording
                      ? 'bg-red-600 hover:bg-red-700 animate-pulse'
                      : 'bg-purple-600 hover:bg-purple-700'
                  } disabled:bg-slate-700 disabled:cursor-not-allowed disabled:hover:scale-100`}
                >
                  {isRecording ? <MicOff size={40} /> : <Mic size={40} />}
                </button>
              </div>

              <div className="bg-white/5 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 h-full transition-all duration-100"
                  style={{ width: `${audioLevel}%` }}
                />
              </div>
              <p className={`text-center text-sm mt-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {isRecording ? 'Recording...' : modelLoaded ? 'Click to start' : wasmSupported === false ? 'WASM not supported' : 'Load model first'}
              </p>
            </div>

            <div className={`p-3 rounded-lg mb-4 ${darkMode ? 'bg-white/5' : 'bg-slate-100'}`}>
              <div className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Status</div>
              <div className="text-lg font-bold">{status}</div>
            </div>

            {/* Integrated Transcription Display */}
            <div className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold">Live Transcription</h3>
                {transcribedText && (
                  <button
                    onClick={clearTranscription}
                    className={`text-sm flex items-center gap-2 ${
                      darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Trash2 size={16} />
                    Clear
                  </button>
                )}
              </div>

              <div className={`rounded-lg p-4 min-h-[200px] max-h-[300px] overflow-y-auto ${
                darkMode ? 'bg-black/30' : 'bg-slate-50 border border-slate-200'
              }`}>
                {transcribedText ? (
                  <p className="whitespace-pre-wrap leading-relaxed">{transcribedText}</p>
                ) : (
                  <div className={`text-center py-8 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    <Mic size={36} className="mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Transcription will appear here in real-time</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Debug Log */}
        <div className={`backdrop-blur-sm rounded-xl p-6 border ${
          darkMode ? 'bg-white/10 border-white/20' : 'bg-white border-slate-200 shadow-lg'
        }`}>
          <h2 className="text-xl font-semibold mb-4">Debug Log</h2>
          <div className={`rounded-lg p-4 max-h-[200px] overflow-y-auto font-mono text-xs ${
            darkMode ? 'bg-black/30' : 'bg-slate-50 border border-slate-200'
          }`}>
            {debugLog.length > 0 ? (
              debugLog.map((log, i) => (
                <div key={i} className={`mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{log}</div>
              ))
            ) : (
              <div className={`text-center ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Debug information will appear here</div>
            )}
          </div>
        </div>

        {/* Integration Status */}
        <div className={`mt-6 p-4 border rounded-lg ${
          darkMode ? 'bg-blue-500/10 border-blue-500/30' : 'bg-blue-50 border-blue-200'
        }`}>
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <AlertCircle size={18} />
            Integration Status
          </h3>
          <ul className={`text-sm space-y-1 ml-6 list-disc marker:text-purple-400 ${
            darkMode ? 'text-slate-300' : 'text-slate-700'
          }`}>
            <li>Now using <code className={darkMode ? 'text-purple-300' : 'text-purple-700'}>@timur00kh/whisper.wasm</code> library for a high-level API.</li>
            <li>Model management (download/cache) is handled by <code className={darkMode ? 'text-purple-300' : 'text-purple-700'}>ModelManager</code>.</li>
            <li>Streaming transcription is managed by <code className={darkMode ? 'text-purple-300' : 'text-purple-700'}>WhisperWasmService</code> and <code className={darkMode ? 'text-purple-300' : 'text-purple-700'}>TranscriptionSession</code>.</li>
            <li>Check the debug log above for detailed information about the initialization process</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
