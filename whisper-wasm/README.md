# Whisper.cpp WebAssembly React Demo

A proof-of-concept React application that integrates [whisper.cpp](https://github.com/ggerganov/whisper.cpp) WebAssembly for real-time, browser-based speech-to-text transcription. All processing happens **locally in the browser** — no server-side processing required.

## Features

- **Real-time transcription** - Stream audio from your microphone and get live transcription
- **Multiple models** - Choose from Tiny, Base models with various quantization levels
- **Multi-language support** - 10+ languages including English, Spanish, French, German, etc.
- **Fully client-side** - All audio processing happens in your browser via WebAssembly
- **Model caching** - Downloaded models are cached in IndexedDB for faster subsequent loads
- **Visual feedback** - Real-time audio level visualization and status updates

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Modern browser with WebAssembly support (Chrome, Edge, Safari, Firefox)

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:3000/` in your browser.

### Building for Production

```bash
# Build the app
npm run build

# Preview the production build
npm run preview
```

## Architecture Overview

### Key Files

```
whisper-claude/
├── public/
│   ├── helpers.js          # IndexedDB caching & model downloads
│   ├── stream.js           # Compiled WASM module (contains embedded .wasm binary)
│   └── coi-serviceworker.js # (Not used - Vite provides CORS headers)
├── src/
│   ├── App.tsx             # Main application component
│   ├── main.tsx            # React entry point
│   ├── types/whisper.d.ts  # TypeScript definitions for WASM APIs
│   └── index.css           # Tailwind CSS styles
├── index.html              # HTML entry point
└── vite.config.ts          # Vite configuration with CORS headers
```

### WASM Module Files

The whisper.cpp build produces these files that are served from the `public/` directory:

1. **`stream.js`** - Main JavaScript glue code that loads and interfaces with the WASM module. Contains the WebAssembly binary embedded as base64.
2. **`helpers.js`** - Utility functions for IndexedDB caching and model file downloads from Hugging Face.
3. **`coi-serviceworker.js`** - Service worker that adds CORS headers (not needed with Vite, included for reference).

### How It Works

1. **WASM Initialization**: On page load, `stream.js` initializes the WebAssembly module and sets up the global `Module` object
2. **Model Download**: User selects a model, which is downloaded from Hugging Face and cached in IndexedDB
3. **Audio Capture**: MediaRecorder API captures microphone input at 16kHz (Whisper's required sample rate)
4. **Audio Processing**: Audio chunks are processed every 5 seconds:
   - Blob → ArrayBuffer → AudioBuffer
   - Resampled to Float32Array via OfflineAudioContext
   - Passed to WASM via `Module.set_audio()`
5. **Transcription**: WASM processes audio and returns transcribed text via `Module.get_transcribed()`

## Critical: CORS Configuration

### The Challenge

WebAssembly with SharedArrayBuffer requires specific Cross-Origin policies to enable multi-threading. However, **strict policies can block module loading**.

### The Solution

Use `Cross-Origin-Embedder-Policy: credentialless` instead of `require-corp`:

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless', // ← Key change
    },
  },
})
```

### Why This Matters

| Policy | SharedArrayBuffer | ES Modules | CDN Resources |
|--------|------------------|------------|---------------|
| `require-corp` | ✅ Yes | ❌ Breaks | ❌ Breaks |
| `credentialless` | ✅ Yes | ✅ Works | ✅ Works |
| None | ❌ No | ✅ Works | ✅ Works |

**`credentialless`** provides the best of both worlds:
- Enables WASM SharedArrayBuffer for better performance
- Allows normal module imports (like `lucide-react`)
- Permits loading external resources (fonts, CDNs)

### Production Deployment

For production environments (Netlify, Vercel, Cloudflare Pages, etc.), add these headers:

**Netlify** (`netlify.toml`):
```toml
[[headers]]
  for = "/*"
  [headers.values]
    Cross-Origin-Opener-Policy = "same-origin"
    Cross-Origin-Embedder-Policy = "credentialless"
```

**Vercel** (`vercel.json`):
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
        { "key": "Cross-Origin-Embedder-Policy", "value": "credentialless" }
      ]
    }
  ]
}
```

**Apache** (`.htaccess`):
```apache
<IfModule mod_headers.c>
  Header set Cross-Origin-Opener-Policy "same-origin"
  Header set Cross-Origin-Embedder-Policy "credentialless"
</IfModule>
```

**Nginx** (`nginx.conf`):
```nginx
add_header Cross-Origin-Opener-Policy "same-origin" always;
add_header Cross-Origin-Embedder-Policy "credentialless" always;
```

## Integration into Existing React Apps

### Step 1: Copy Required Files

Copy these files to your React app's `public/` folder:
```bash
cp whisper-claude/public/helpers.js your-app/public/
cp whisper-claude/public/stream.js your-app/public/
```

### Step 2: Update HTML

Add these scripts to your `index.html` (before closing `</body>`):

```html
<script>
  var dbName = 'whisper.ggerganov.com';
  var dbVersion = 1;
</script>
<script defer src="/helpers.js"></script>
<script defer src="/stream.js"></script>
```

### Step 3: Configure Build Tool

**Vite:**
```typescript
// vite.config.ts
export default defineConfig({
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    },
  },
})
```

**Create React App:**

Use [CRACO](https://craco.js.org/) or [react-app-rewired](https://github.com/timarney/react-app-rewired) to add custom headers in development.

**Next.js:**
```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'credentialless' },
        ],
      },
    ]
  },
}
```

### Step 4: Add TypeScript Types

Copy the type definitions:
```bash
cp whisper-claude/src/types/whisper.d.ts your-app/src/types/
```

### Step 5: Use the Whisper API

Create a custom hook:

```typescript
// src/hooks/useWhisper.ts
import { useEffect, useState, useRef } from 'react';

interface WhisperModule {
  init(modelPath: string, language: string): number | null;
  set_audio(instance: number, audioData: Float32Array): void;
  get_transcribed(): string;
  get_status(): string;
  FS_createDataFile(path: string, filename: string, data: Uint8Array, canRead: boolean, canWrite: boolean): void;
  FS_unlink(filename: string): void;
}

declare global {
  interface Window {
    Module: WhisperModule;
    loadRemote?: (
      url: string,
      dst: string,
      sizeMB: number,
      progressCb: (progress: number) => void,
      storeCb: (filename: string, buffer: Uint8Array) => void,
      cancelCb: () => void,
      logCb: (message: string) => void
    ) => void;
  }
}

export function useWhisper() {
  const [isReady, setIsReady] = useState(false);
  const instanceRef = useRef<number | null>(null);

  useEffect(() => {
    const checkModule = setInterval(() => {
      if (typeof window.Module !== 'undefined') {
        setIsReady(true);
        clearInterval(checkModule);
      }
    }, 100);

    return () => clearInterval(checkModule);
  }, []);

  const loadModel = async (
    modelUrl: string,
    language: string,
    onProgress?: (progress: number) => void
  ) => {
    if (!window.loadRemote) {
      throw new Error('loadRemote not available');
    }

    return new Promise<void>((resolve, reject) => {
      window.loadRemote!(
        modelUrl,
        'whisper.bin',
        75, // size in MB
        (progress) => onProgress?.(progress),
        (filename, buffer) => {
          try {
            window.Module.FS_unlink(filename);
          } catch (e) {}

          window.Module.FS_createDataFile("/", filename, buffer, true, true);
          instanceRef.current = window.Module.init(filename, language);
          resolve();
        },
        () => reject(new Error('Cancelled')),
        console.log
      );
    });
  };

  const transcribe = (audioData: Float32Array): string => {
    if (!instanceRef.current) {
      throw new Error('Model not loaded');
    }

    window.Module.set_audio(instanceRef.current, audioData);
    return window.Module.get_transcribed();
  };

  return { isReady, loadModel, transcribe };
}
```

### Step 6: Use in Components

```typescript
import { useWhisper } from './hooks/useWhisper';

function MyComponent() {
  const { isReady, loadModel, transcribe } = useWhisper();

  const handleLoadModel = async () => {
    await loadModel(
      'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en.bin',
      'en',
      (progress) => console.log(`Loading: ${progress * 100}%`)
    );
  };

  // ... implement audio capture and transcription
}
```

## Whisper.cpp WASM API Reference

### Global Objects

#### `window.Module`

The main WASM module interface:

```typescript
interface WhisperModule {
  // Initialize whisper instance
  init(modelPath: string, language: string): number | null;

  // Pass audio data for transcription
  set_audio(instance: number, audioData: Float32Array): void;

  // Get transcribed text
  get_transcribed(): string;

  // Get current status
  get_status(): string;

  // File system operations
  FS_createDataFile(path: string, filename: string, data: Uint8Array, canRead: boolean, canWrite: boolean): void;
  FS_unlink(filename: string): void;

  // Callbacks
  print?: (text: string) => void;
  printErr?: (text: string) => void;
  setStatus?: (text: string) => void;
}
```

#### `window.loadRemote`

Helper function for downloading models with caching:

```typescript
function loadRemote(
  url: string,              // Model URL
  dst: string,              // Destination filename
  sizeMB: number,           // Expected size in MB
  progressCb: (n: number) => void,  // Progress callback (0-1)
  storeCb: (filename: string, buffer: Uint8Array) => void,  // Store callback
  cancelCb: () => void,     // Cancel callback
  logCb: (msg: string) => void  // Log callback
): void;
```

### Audio Processing Flow

```typescript
// 1. Capture audio from microphone
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
const mediaRecorder = new MediaRecorder(stream);

// 2. Process audio chunks
mediaRecorder.ondataavailable = async (e) => {
  const blob = new Blob([e.data], { type: 'audio/ogg; codecs=opus' });
  const arrayBuffer = await blob.arrayBuffer();

  // 3. Decode to AudioBuffer
  const audioContext = new AudioContext({ sampleRate: 16000 });
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  // 4. Convert to Float32Array
  const audioData = audioBuffer.getChannelData(0);

  // 5. Send to WASM
  window.Module.set_audio(instanceId, audioData);
};

// 6. Poll for results
setInterval(() => {
  const text = window.Module.get_transcribed();
  console.log('Transcription:', text);
}, 100);
```

## Available Models

Models are downloaded from [Hugging Face](https://huggingface.co/ggerganov/whisper.cpp):

| Model | Size | Speed | Accuracy | URL |
|-------|------|-------|----------|-----|
| Tiny (English) | 75 MB | Very Fast | Basic | `ggml-tiny.en.bin` |
| Tiny (Q5_1) | 31 MB | Very Fast | Basic | `ggml-tiny.en-q5_1.bin` |
| Base (English) | 142 MB | Fast | Good | `ggml-base.en.bin` |
| Base (Q5_1) | 57 MB | Fast | Good | `ggml-base.en-q5_1.bin` |
| Base (Multilingual) | 142 MB | Fast | Good | `ggml-base.bin` |

Full URL format:
```
https://huggingface.co/ggerganov/whisper.cpp/resolve/main/[model-name]
```

## Supported Languages

English, Spanish, French, German, Italian, Portuguese, Russian, Japanese, Chinese, Korean, and many more.

## Troubleshooting

### Blank Page / App Not Loading

**Issue**: White screen, no UI visible

**Solution**: Check browser console for errors. Most common causes:
1. Missing CORS headers - verify `credentialless` policy is set
2. Module import errors - check that `helpers.js` and `stream.js` are in `public/`
3. Script load order - ensure scripts use `defer` attribute

### SharedArrayBuffer Not Available

**Issue**: `SharedArrayBuffer is not defined`

**Solution**: CORS headers are missing or incorrect. Must use:
```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: credentialless
```

### Model Download Fails

**Issue**: Models won't download or show CORS errors

**Causes**:
1. Network issues - check internet connection
2. Hugging Face rate limiting - try again later
3. Wrong model URL - verify URL is correct

**Solution**: Check browser console for specific error messages

### Audio Not Recording

**Issue**: Microphone access denied or no audio captured

**Solutions**:
1. Grant microphone permissions in browser
2. Use HTTPS in production (required for microphone access)
3. Check browser compatibility (modern browsers only)

### lucide-react Icons Not Loading

**Issue**: Icons fail to load with CORP errors

**Solution**: This was fixed by using `credentialless` instead of `require-corp`. If still seeing issues:
1. Clear browser cache
2. Restart dev server
3. Check that `optimizeDeps.exclude` includes `lucide-react` in `vite.config.ts`

## Browser Compatibility

- ✅ **Chrome/Edge** 95+ (full support)
- ✅ **Firefox** 100+ (full support)
- ✅ **Safari** 16.4+ (full support)
- ⚠️ **Mobile Safari** iOS 16.4+ (works but may be slower)
- ❌ Internet Explorer (not supported)

## Performance Notes

- **Desktop**: Real-time transcription on modern CPUs
- **Mobile**: Works but may lag on older devices
- **Model size vs accuracy**: Smaller models (Tiny) are faster but less accurate
- **Quantized models**: Q5_1 variants are smaller and faster with minimal accuracy loss

## Development

### Project Structure

```
whisper-claude/
├── origin/               # Original reference files
│   ├── claude.md        # Original context document
│   ├── claude2.md       # Additional technical notes
│   ├── helpers.js       # Source copy
│   ├── stream.js        # Source copy
│   └── whisper-test.html # Standalone HTML test
├── public/              # Static assets
│   ├── helpers.js       # WASM helper functions
│   ├── stream.js        # WASM module
│   └── test-server.js   # Simple Node.js test server
├── src/                 # React source code
│   ├── App.tsx          # Main app component
│   ├── main.tsx         # React entry point
│   ├── types/           # TypeScript definitions
│   └── index.css        # Tailwind styles
└── vite.config.ts       # Build configuration
```

### Key Configuration Files

**`vite.config.ts`** - Critical for CORS headers:
```typescript
headers: {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'credentialless',
}
```

**`index.html`** - Script loading order matters:
```html
<!-- Global variables first -->
<script>var dbName = 'whisper.ggerganov.com';</script>
<!-- React app -->
<script type="module" src="/src/main.tsx"></script>
<!-- WASM scripts deferred -->
<script defer src="/helpers.js"></script>
<script defer src="/stream.js"></script>
```

## License

This project is a proof-of-concept demonstration. Please refer to the [whisper.cpp license](https://github.com/ggerganov/whisper.cpp/blob/master/LICENSE) for the underlying WASM module.

## Credits

- [whisper.cpp](https://github.com/ggerganov/whisper.cpp) - C/C++ port of OpenAI's Whisper
- [Emscripten](https://emscripten.org/) - WebAssembly compiler toolchain
- [React](https://react.dev/) - UI framework
- [Vite](https://vitejs.dev/) - Build tool
- [Tailwind CSS](https://tailwindcss.com/) - Styling

## References

- [Whisper.cpp GitHub](https://github.com/ggerganov/whisper.cpp)
- [Whisper.cpp Web Demo](https://ggml.ai/whisper.cpp/)
- [Emscripten Deployment Guide](https://emscripten.org/docs/compiling/Deploying-Pages.html)
- [SharedArrayBuffer Requirements](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer#security_requirements)
