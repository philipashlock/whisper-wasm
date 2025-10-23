# Whisper WASM - Real-time Speech-to-Text in Your Browser

A React application that provides real-time, browser-based speech-to-text transcription using OpenAI's Whisper compiled to WebAssembly. All processing happens **locally in the browser** — no server required!

## Features

- 🎤 **Real-time transcription** - Stream audio from your microphone and get live transcription
- 🌍 **Multi-language support** - 10+ languages including English, Spanish, French, German, etc.
- 🔒 **Fully client-side** - All audio processing happens in your browser via WebAssembly
- 📦 **Model caching** - Downloaded models are cached in IndexedDB for faster subsequent loads
- 🎯 **Multiple models** - Choose from Tiny, Base models with various quantization levels
- 📊 **Visual feedback** - Real-time audio level visualization and status updates

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

## Project Structure

```
whisper-wasm/                    # Root monorepo
├── whisper-wasm/                # React application
│   ├── src/
│   │   └── App.tsx              # Main app component
│   ├── package.json             # Uses github:philipashlock/whisper.wasm
│   └── dist/                    # Build output (for deployment)
│
└── whisper.wasm.npm/            # Library development (separate repo)
    └── [GitHub: philipashlock/whisper.wasm]
```

## Library Dependency

This app uses the whisper.wasm library directly from GitHub:

```json
{
  "dependencies": {
    "@timur00kh/whisper.wasm": "github:philipashlock/whisper.wasm#main"
  }
}
```

**Benefits:**
- ✅ No Docker required for app development
- ✅ Fast npm install (~60 seconds)
- ✅ Pre-compiled WASM binaries from GitHub
- ✅ TypeScript library builds automatically via `prepare` script

## Development

### Working on the App

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Working on the Library Locally

If you need to make changes to the whisper.wasm library:

```bash
# Clone the library repository
git clone https://github.com/philipashlock/whisper.wasm.git ../whisper.wasm.npm

# Link it locally
cd ../whisper.wasm.npm
npm link

# Link in the app
cd ../whisper-wasm
npm link @timur00kh/whisper.wasm

# Make your changes to the library...
# When done, unlink and reinstall from GitHub:
npm unlink @timur00kh/whisper.wasm
npm install
```

## Deployment

### Firebase Hosting

This app is configured for Firebase Hosting:

```bash
# Build the app
npm run build

# Deploy to Firebase
firebase deploy
```

The build output in `whisper-wasm/dist/` will be deployed.

### Other Platforms

The app is a static site and can be deployed to any hosting platform:

- **Netlify**: Deploy the `whisper-wasm/dist/` directory
- **Vercel**: Deploy the `whisper-wasm/` directory
- **GitHub Pages**: Deploy the `whisper-wasm/dist/` directory
- **Cloudflare Pages**: Deploy the `whisper-wasm/` directory

**Important**: Ensure your hosting platform serves the correct headers for WebAssembly:
```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: credentialless
```

See [whisper-wasm/README.md](whisper-wasm/README.md) for platform-specific header configuration.

## Architecture

### How It Works

1. **Library Installation**: npm installs the whisper.wasm library from GitHub
   - Pre-compiled WASM binaries are included (~10MB)
   - TypeScript wrapper builds automatically via `prepare` script
   - No Docker required!

2. **Model Download**: User selects a model, which is downloaded from Hugging Face and cached in IndexedDB

3. **Audio Capture**: MediaRecorder API captures microphone input at 16kHz

4. **Transcription**: Audio is processed by the WASM module and transcribed in real-time

### Key Files

- `whisper-wasm/src/App.tsx` - Main React application
- `whisper-wasm/package.json` - Dependencies (includes GitHub library)
- `whisper-wasm/vite.config.ts` - Build configuration with CORS headers
- `firebase.json` - Firebase deployment configuration

## Available Models

Models are downloaded from [Hugging Face](https://huggingface.co/ggerganov/whisper.cpp):

| Model | Size | Speed | Accuracy |
|-------|------|-------|----------|
| Tiny (English) | 75 MB | Very Fast | Basic |
| Tiny (Q5_1) | 31 MB | Very Fast | Basic |
| Base (English) | 142 MB | Fast | Good |
| Base (Q5_1) | 57 MB | Fast | Good |

## Browser Compatibility

- ✅ **Chrome/Edge** 95+ (full support)
- ✅ **Firefox** 100+ (full support)
- ✅ **Safari** 16.4+ (full support)
- ⚠️ **Mobile Safari** iOS 16.4+ (works but may be slower)
- ❌ Internet Explorer (not supported)

## Troubleshooting

### Model Download Fails

Check internet connection and try again. Models are cached in IndexedDB after first download.

### Microphone Not Working

- Grant microphone permissions in browser
- Use HTTPS in production (required for microphone access)
- Check browser compatibility

### Audio Quality Issues

- Ensure good microphone quality
- Use smaller models (Tiny) for faster processing
- Check that sample rate is 16kHz

## Related Repositories

- **Library Repository**: [philipashlock/whisper.wasm](https://github.com/philipashlock/whisper.wasm) - The TypeScript wrapper library
- **Original Library**: [timur00kh/whisper.wasm](https://github.com/timur00kh/whisper.wasm) - Original upstream
- **Whisper.cpp**: [ggml-org/whisper.cpp](https://github.com/ggml-org/whisper.cpp) - C++ implementation

## Documentation

- [CONTEXT.md](CONTEXT.md) - Project architecture and development workflow
- [Library README](https://github.com/philipashlock/whisper.wasm#readme) - Library documentation

## License

MIT

## Credits

- [whisper.cpp](https://github.com/ggml-org/whisper.cpp) - C/C++ port of OpenAI's Whisper
- [OpenAI Whisper](https://github.com/openai/whisper) - Original speech recognition model
- [Emscripten](https://emscripten.org/) - WebAssembly compiler toolchain
- [React](https://react.dev/) - UI framework
- [Vite](https://vitejs.dev/) - Build tool
