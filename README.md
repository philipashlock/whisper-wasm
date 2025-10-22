# Whisper WASM React Demo - Real-time Speech-to-Text

A React application for real-time speech-to-text transcription using OpenAI's Whisper model compiled to WebAssembly.

## Features

- Real-time microphone transcription
- Multiple language support
- Multiple Whisper model sizes (tiny, base, small)
- Runs entirely in the browser (WebAssembly)
- Audio level visualization
- Continuous transcription with streaming

## Setup & Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Deployment

Deploy the `dist/` directory to any static hosting service:

```bash
npm run build
# Deploy dist/ to Vercel, Netlify, GitHub Pages, etc.
```

## License

MIT


## References

- [Whisper.wasm](https://github.com/timur00kh/whisper.wasm?tab=readme-ov-file) - A TypeScript wrapper for whisper.cpp that brings OpenAI's Whisper speech recognition to the browser and Node.js using WebAssembly.
- [Whisper.cpp GitHub](https://github.com/ggerganov/whisper.cpp)
- [Whisper.cpp Web Demo](https://ggml.ai/whisper.cpp/)
- [Emscripten Deployment Guide](https://emscripten.org/docs/compiling/Deploying-Pages.html)