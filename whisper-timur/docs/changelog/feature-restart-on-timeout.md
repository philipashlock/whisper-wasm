# Changelog - Feature: Restart on Timeout

**Branch**: `feature/restart-on-timeout`  
**Date**: September 16, 2025  
**Total commits**: 5  
**Files changed**: 20+ files across core library, demo application, and tests

## 🚀 New Features

### Timeout Handling & Error Recovery

- **Added timeout support for transcription sessions** - Implemented configurable timeout handling (default: 30 seconds) to prevent transcription from hanging indefinitely
- **Introduced automatic model restart on errors** - Added `restartModelOnError` option to automatically restart the Whisper model when WebAssembly execution fails
- **Created timeout error utility** - New `createTimeoutError` function for managing transcription timeouts with proper cleanup

### Enhanced Demo Application

- **Complete React-based demo application** - Rebuilt the demo with modern React components and TypeScript
- **Interactive audio processing** - Added components for audio file loading, model selection, and real-time transcription
- **Theme support** - Implemented dark/light theme toggle functionality
- **Improved user experience** - Better UI with styled components and progress indicators

## 🔧 API Changes

### Method Renaming

- **BREAKING**: Renamed `loadWasmModule()` to `initModel()` for better clarity and consistency
- **Added**: `restartModel()` method to restart the model without reloading the WASM module

### Enhanced TranscriptionSession

- **New options**:
  - `timeoutMs` - Set custom timeout duration for transcription (default: 30,000ms)
  - `restartModelOnError` - Enable automatic model restart on errors
  - `sleepMsBetweenChunks` - Control delay between audio chunk processing

## 🛠️ Improvements

### Code Organization

- **Better error handling** - More robust error management throughout the transcription pipeline

### Documentation

- **Added comprehensive FAQ section** - Documented common issues and solutions including:
  - WebAssembly execution termination handling
  - Background tab throttling solutions
  - Performance optimization tips
  - Error recovery strategies
- **Updated README** - Reflected API changes and added troubleshooting guidance

## 🧪 Testing

### Enhanced Test Coverage

- **Added timeout handling tests** - Comprehensive test suite for transcription timeout scenarios
- **Error recovery testing** - Tests for automatic model restart functionality
- **Updated existing tests** - Modified tests to accommodate API changes

## 📦 Dependencies

### Added

- React and React-DOM for demo application
- TypeScript types for better development experience in demo application

## 🔄 Migration Guide

### For Users Upgrading from Previous Versions

1. **Method Rename**: Replace all instances of `loadWasmModule()` with `initModel()`
2. **New Options**: Consider adding timeout and error recovery options to your transcription sessions:
   ```typescript
   const session = new TranscriptionSession(whisperService);
   for await (const segment of session.streamimg(audioData, {
     timeoutMs: 30000, // 30 seconds timeout
     restartModelOnError: true, // Auto-restart on errors
     sleepMsBetweenChunks: 100, // Delay between chunks
   })) {
     // Process segment
   }
   ```

## 🐛 Known Issues

- WebAssembly execution may be throttled in background tabs on some browsers
- First transcription includes model initialization time
- Large audio files should be processed in chunks for better performance

## 📝 Commit History

- `0f0ec20` - test: add timeout handling tests for transcription in WhisperWasmService
- `fcff8c1` - refactor: reorganize utility files
- `a6982de` - feat: implement demo application with React components for audio processing and transcription
- `5ce3443` - chore: remove unused import for createTimeoutError in WhisperWasmService
- `0bcdd42` - refactor: rename loadWasmModule to initModel and add timeout handling in TranscriptionSession
