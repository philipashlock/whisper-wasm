/**
 * TypeScript type definitions for whisper.cpp WebAssembly module
 */

export interface WhisperModule {
  /**
   * Initialize a new Whisper instance
   * @param modelPath Path to the model file (e.g., 'whisper.bin')
   * @param language Language code (e.g., 'en', 'es', 'fr')
   * @returns Instance ID or null if failed
   */
  init(modelPath: string, language: string): number | null;

  /**
   * Set audio data for transcription
   * @param instance Instance ID returned from init()
   * @param audioData Float32Array of audio samples (16kHz mono)
   */
  set_audio(instance: number, audioData: Float32Array): void;

  /**
   * Get transcribed text
   * @returns Transcribed text string
   */
  get_transcribed(): string;

  /**
   * Get current processing status
   * @returns Status string
   */
  get_status(): string;

  /**
   * Create a data file in the WASM filesystem
   * @param path Directory path (usually "/")
   * @param filename Name of the file
   * @param data Uint8Array of file data
   * @param canRead Read permission
   * @param canWrite Write permission
   */
  FS_createDataFile(
    path: string,
    filename: string,
    data: Uint8Array,
    canRead: boolean,
    canWrite: boolean
  ): void;

  /**
   * Delete a file from the WASM filesystem
   * @param filename Name of the file to delete
   */
  FS_unlink(filename: string): void;

  /**
   * Print callback
   */
  print?: (text: string) => void;

  /**
   * Print error callback
   */
  printErr?: (text: string) => void;

  /**
   * Status callback
   */
  setStatus?: (text: string) => void;

  /**
   * Monitor run dependencies
   */
  monitorRunDependencies?: (left: number) => void;

  /**
   * Pre-run callback
   */
  preRun?: () => void;

  /**
   * Post-run callback
   */
  postRun?: () => void;
}

/**
 * Load remote file with progress tracking and caching
 * @param url URL to download from
 * @param dst Destination filename
 * @param sizeMB Expected size in megabytes
 * @param progressCb Progress callback (0-1)
 * @param storeCb Store callback when download complete
 * @param cancelCb Cancel callback
 * @param logCb Log callback
 */
export type LoadRemoteFunction = (
  url: string,
  dst: string,
  sizeMB: number,
  progressCb: (progress: number) => void,
  storeCb: (filename: string, buffer: Uint8Array) => void,
  cancelCb: () => void,
  logCb: (message: string) => void
) => void;

declare global {
  interface Window {
    Module: WhisperModule;
    loadRemote?: LoadRemoteFunction;
  }

  // Global variables used by helpers.js
  var dbName: string;
  var dbVersion: number;
}

export {};
