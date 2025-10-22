# Whisper WASM Monorepo

Speech-to-text transcription using OpenAI's Whisper compiled to WebAssembly.

## Structure

```
whisper-wasm/                   # Git repo root
├── .gitignore                  # Ignores node_modules, app dist, etc.
├── package.json                # Workspace configuration
│
├── whisper-timur/              # Custom Whisper.wasm library
│   ├── src/                    # Library source
│   ├── wasm/                   # Docker-built WASM files (COMMIT THIS!)
│   ├── dist/                   # Built library (COMMIT THIS!)
│   └── package.json            # name: "@timur00kh/whisper.wasm"
│
└── whisper-wasm/               # React app
    ├── src/                    # App source
    ├── dist/                   # Build output (gitignored)
    └── package.json            # depends on: "@timur00kh/whisper.wasm": "*"
```

## Quick Start

```bash
# Install dependencies (from repo root)
npm install

# Build everything
npm run build

# Start dev server
npm run dev
```

## Important Files to COMMIT

✅ **whisper-timur/wasm/** - Your Docker-built WASM binaries (10MB)
✅ **whisper-timur/dist/** - Built library (4MB) - needed for deployment
✅ **whisper-timur/src/** - Library source code
✅ **whisper-wasm/src/** - App source code
✅ **package.json** files - All of them

❌ **node_modules/** - Auto-generated
❌ **whisper-wasm/dist/** - Build output (regenerated on deploy)

## Deployment

Deploy to any static host:

```bash
npm run build
# Deploy whisper-wasm/dist/ folder
```

The workspace symlinks are automatically recreated by `npm install` on the server.

See [DEPLOYMENT.md](../DEPLOYMENT.md) for detailed deployment instructions.

## Development

```bash
# Build library only
npm run build:lib

# Build app only  
npm run build:app

# Dev server (app with hot reload)
npm run dev

# Dev server (library demo)
npm run dev:lib
```

## License

MIT
