import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Download, Loader, AlertCircle, CheckCircle, Trash2 } from 'lucide-react';

const MODELS = [
  { id: 'tiny.en', name: 'Tiny (English)', size: '75 MB', url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en.bin', speed: 'Very Fast', accuracy: 'Basic' },
  { id: 'base.en', name: 'Base (English)', size: '142 MB', url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin', speed: 'Fast', accuracy: 'Good' },
  { id: 'base', name: 'Base (Multilingual)', size: '142 MB', url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin', speed: 'Fast', accuracy: 'Good' },
  { id: 'tiny.en-q5_1', name: 'Tiny (Q5_1)', size: '31 MB', url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en-q5_1.bin', speed: 'Very Fast', accuracy: 'Basic' },
  { id: 'base.en-q5_1', name: 'Base (Q5_1)', size: '57 MB', url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en-q5_1.bin', speed: 'Fast', accuracy: 'Good' },
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

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const instanceRef = useRef<number | null>(null);
  const audio0Ref = useRef<Float32Array | null>(null);
  const audioRef = useRef<Float32Array | null>(null);
  const intervalRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const doRecordingRef = useRef(false);
  const moduleRef = useRef<any>(null);

  const kSampleRate = 16000;
  const kRestartRecording_s = 120;
  const kIntervalAudio_ms = 5000;

  const addLog = (msg: string) => {
    console.log(msg);
    setDebugLog(prev => [...prev.slice(-20), `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  // Initialize Module object
  useEffect(() => {
    addLog('Initializing...');

    // Wait for stream.js to load
    const checkModule = setInterval(() => {
      if (typeof window.Module !== 'undefined') {
        moduleRef.current = window.Module;
        addLog('✓ Module loaded successfully');
        clearInterval(checkModule);
      }
    }, 100);

    // Setup Module callbacks
    window.Module = window.Module || {
      print: (text: string) => addLog(text),
      printErr: (text: string) => addLog('ERROR: ' + text),
      setStatus: (text: string) => {
        addLog('Status: ' + text);
        setStatus(text);
      },
      monitorRunDependencies: () => {},
      preRun: () => addLog('Preparing...'),
      postRun: () => addLog('✓ Initialized successfully!')
    } as any;

    return () => {
      stopRecording();
      clearInterval(checkModule);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Load model
  const loadModel = async () => {
    setDownloading(true);
    setDownloadProgress(0);
    setError('');

    try {
      const url = selectedModel.url;
      const dst = 'whisper.bin';
      const sizeMB = parseInt(selectedModel.size);

      addLog(`Downloading ${selectedModel.name} model...`);

      if (typeof window.loadRemote === 'function') {
        await new Promise<void>((resolve, reject) => {
          const progressCallback = (progress: number) => {
            setDownloadProgress(Math.round(progress * 100));
          };

          const storeCallback = (fname: string, buf: Uint8Array) => {
            try {
              addLog(`Storing model in WASM filesystem...`);
              try {
                window.Module.FS_unlink(fname);
              } catch (e) {
                // File doesn't exist, ignore
              }

              window.Module.FS_createDataFile("/", fname, buf, true, true);
              addLog(`✓ Model loaded: ${fname} (${buf.length} bytes)`);
              setModelLoaded(true);
              setDownloading(false);
              resolve();
            } catch (err) {
              addLog(`✗ Error storing model: ${(err as Error).message}`);
              reject(err);
            }
          };

          const cancelCallback = () => {
            setError('Model download cancelled');
            setDownloading(false);
            reject(new Error('Cancelled'));
          };

          window.loadRemote!(url, dst, sizeMB, progressCallback, storeCallback, cancelCallback, addLog);
        });
      } else {
        addLog('loadRemote not available, using fetch...');
        const response = await fetch(url);
        const contentLength = +(response.headers.get('Content-Length') || 0);
        const reader = response.body?.getReader();

        if (!reader) throw new Error('Failed to get reader');

        let receivedLength = 0;
        const chunks: Uint8Array[] = [];

        while(true) {
          const {done, value} = await reader.read();
          if (done) break;

          chunks.push(value);
          receivedLength += value.length;
          setDownloadProgress(Math.round((receivedLength / contentLength) * 100));
        }

        const allChunks = new Uint8Array(receivedLength);
        let position = 0;
        for(const chunk of chunks) {
          allChunks.set(chunk, position);
          position += chunk.length;
        }

        try {
          window.Module.FS_unlink('whisper.bin');
        } catch (e) {
          // File doesn't exist, ignore
        }

        window.Module.FS_createDataFile("/", 'whisper.bin', allChunks, true, true);
        addLog(`✓ Model loaded via fetch`);
        setModelLoaded(true);
        setDownloading(false);
      }
    } catch (err) {
      setError(`Failed to download model: ${(err as Error).message}`);
      addLog(`✗ Download failed: ${(err as Error).message}`);
      setDownloading(false);
    }
  };

  // Start recording
  const startRecording = async () => {
    try {
      setError('');
      addLog('Starting recording...');

      if (!instanceRef.current && window.Module && window.Module.init) {
        addLog(`Initializing whisper instance with language: ${selectedLanguage}`);
        instanceRef.current = window.Module.init('whisper.bin', selectedLanguage);
        if (!instanceRef.current) {
          throw new Error('Failed to initialize whisper');
        }
        addLog(`✓ Whisper instance created: ${instanceRef.current}`);
      }

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

      doRecordingRef.current = true;
      setIsRecording(true);
      setStatus('recording');

      const chunks: Blob[] = [];
      mediaRecorderRef.current = new MediaRecorder(stream);

      mediaRecorderRef.current.ondataavailable = async (e) => {
        chunks.push(e.data);

        const blob = new Blob(chunks, { type: 'audio/ogg; codecs=opus' });
        const arrayBuffer = await blob.arrayBuffer();

        if (!audioContextRef.current) return;

        try {
          const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
          const offlineContext = new OfflineAudioContext(
            audioBuffer.numberOfChannels,
            audioBuffer.length,
            audioBuffer.sampleRate
          );
          const source = offlineContext.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(offlineContext.destination);
          source.start(0);

          const renderedBuffer = await offlineContext.startRendering();
          audioRef.current = renderedBuffer.getChannelData(0);

          const audioAll = new Float32Array(
            audio0Ref.current == null ? audioRef.current.length : audio0Ref.current.length + audioRef.current.length
          );
          if (audio0Ref.current != null) {
            audioAll.set(audio0Ref.current, 0);
          }
          audioAll.set(audioRef.current, audio0Ref.current == null ? 0 : audio0Ref.current.length);

          if (instanceRef.current && window.Module.set_audio) {
            window.Module.set_audio(instanceRef.current, audioAll);
            addLog(`Audio chunk processed: ${audioAll.length} samples`);
          }
        } catch (err) {
          addLog(`✗ Audio processing error: ${(err as Error).message}`);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        if (doRecordingRef.current) {
          setTimeout(() => {
            startRecording();
          }, 0);
        }
      };

      mediaRecorderRef.current.start(kIntervalAudio_ms);
      addLog(`✓ Recording started (${kIntervalAudio_ms}ms chunks)`);

      // Update transcription display
      intervalRef.current = window.setInterval(() => {
        if (window.Module && window.Module.get_transcribed) {
          const transcribed = window.Module.get_transcribed();
          if (transcribed && transcribed.length > 1) {
            setTranscribedText(prev => prev + transcribed + '\n');
          }
        }

        if (window.Module && window.Module.get_status) {
          const currentStatus = window.Module.get_status();
          if (currentStatus) {
            setStatus(currentStatus);
          }
        }

        if (audioRef.current && audioRef.current.length > kSampleRate * kRestartRecording_s) {
          if (doRecordingRef.current) {
            addLog('Restarting recording (120s limit)');
            audio0Ref.current = audioRef.current;
            audioRef.current = null;
            if (mediaRecorderRef.current) {
              mediaRecorderRef.current.stop();
            }
            if (streamRef.current) {
              streamRef.current.getTracks().forEach(track => track.stop());
            }
          }
        }
      }, 100);

    } catch (err) {
      setError(`Microphone access error: ${(err as Error).message}`);
      addLog(`✗ Recording error: ${(err as Error).message}`);
    }
  };

  // Stop recording
  const stopRecording = () => {
    addLog('Stopping recording...');
    doRecordingRef.current = false;
    setIsRecording(false);
    setStatus('paused');
    setAudioLevel(0);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

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

    audio0Ref.current = null;
    audioRef.current = null;
    audioContextRef.current = null;
    addLog('✓ Recording stopped');
  };

  // Visualize audio levels
  const visualize = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

    const draw = () => {
      if (!doRecordingRef.current) return;
      animationFrameRef.current = requestAnimationFrame(draw);
      analyserRef.current!.getByteFrequencyData(dataArray);

      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      setAudioLevel(Math.min(100, (average / 255) * 200));
    };

    draw();
  };

  const clearTranscription = () => {
    setTranscribedText('');
    setDebugLog([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Whisper.cpp Real-time Transcription</h1>
          <p className="text-slate-300">WebAssembly-powered speech recognition in your browser</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500 rounded-lg flex items-center gap-3">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Model Selection */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <h2 className="text-xl font-semibold mb-4">Model Configuration</h2>

            <div className="mb-4">
              <label className="block text-sm text-slate-300 mb-2">Select Model</label>
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
                        ? 'bg-purple-600 border-2 border-purple-400'
                        : 'bg-white/5 hover:bg-white/10 border-2 border-transparent'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium">{model.name}</span>
                      <span className="text-sm text-slate-300">{model.size}</span>
                    </div>
                    <div className="flex gap-3 text-xs text-slate-400">
                      <span>Speed: {model.speed}</span>
                      <span>Accuracy: {model.accuracy}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-slate-300 mb-2">Language</label>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                disabled={isRecording}
                className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code} className="bg-slate-900">
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
              <div className="mt-3 bg-white/5 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-purple-500 h-full transition-all duration-300"
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
            )}
          </div>

          {/* Recording Controls */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <h2 className="text-xl font-semibold mb-4">Recording Controls</h2>

            <div className="mb-6">
              <div className="flex items-center justify-center mb-4">
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={!modelLoaded}
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
              <p className="text-center text-sm text-slate-400 mt-2">
                {isRecording ? 'Recording...' : modelLoaded ? 'Click to start' : 'Load model first'}
              </p>
            </div>

            <div className="p-3 bg-white/5 rounded-lg">
              <div className="text-sm text-slate-400">Status</div>
              <div className="text-lg font-bold">{status}</div>
            </div>
          </div>
        </div>

        {/* Transcription Display */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Real-time Transcription</h2>
            {transcribedText && (
              <button
                onClick={clearTranscription}
                className="text-sm text-slate-400 hover:text-white flex items-center gap-2"
              >
                <Trash2 size={16} />
                Clear
              </button>
            )}
          </div>

          <div className="bg-black/30 rounded-lg p-4 min-h-[300px] max-h-[500px] overflow-y-auto font-mono text-sm">
            {transcribedText ? (
              <pre className="whitespace-pre-wrap text-green-400">{transcribedText}</pre>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <Mic size={48} className="mx-auto mb-4 opacity-50" />
                <p>Transcription will appear here in real-time as you speak</p>
              </div>
            )}
          </div>
        </div>

        {/* Debug Log */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
          <h2 className="text-xl font-semibold mb-4">Debug Log</h2>
          <div className="bg-black/30 rounded-lg p-4 max-h-[200px] overflow-y-auto font-mono text-xs">
            {debugLog.length > 0 ? (
              debugLog.map((log, i) => (
                <div key={i} className="text-slate-300 mb-1">{log}</div>
              ))
            ) : (
              <div className="text-slate-500 text-center">Debug information will appear here</div>
            )}
          </div>
        </div>

        {/* Integration Status */}
        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <AlertCircle size={18} />
            Integration Status
          </h3>
          <ul className="text-sm text-slate-300 space-y-1 ml-6 list-disc">
            <li>This page loads whisper.cpp WASM from https://ggml.ai/whisper.cpp/</li>
            <li>To use your localhost version, change the script URLs in index.html to http://localhost:8000/</li>
            <li>Models are downloaded from Hugging Face and cached in IndexedDB</li>
            <li>All processing happens locally in WebAssembly - no server required</li>
            <li>Check the debug log above for detailed information about the initialization process</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
