// Audio file handler for Whisper.wasm
export interface AudioInfo {
  sampleRate: number;
  duration: number;
  channels: number;
}

export type ProgressCallback = (message: string) => void;
export type SuccessCallback = (audioData: Float32Array, audioInfo: AudioInfo) => void;
export type ErrorCallback = (error: string) => void;

export class AudioHandler {
  private readonly kMaxAudio_s: number = 30 * 60; // 30 minutes maximum
  private readonly kMaxRecording_s: number = 2 * 60; // 2 minutes for recording
  private readonly kSampleRate: number = 16000; // 16kHz sample rate for Whisper

  private context: AudioContext | null = null;

  constructor() {
    // Initialize AudioContext
    if (typeof window !== 'undefined') {
      (window as any).AudioContext =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      (window as any).OfflineAudioContext =
        (window as any).OfflineAudioContext || (window as any).webkitOfflineAudioContext;
    }
  }

  /**
   * Creates AudioContext with proper settings for Whisper
   */
  createAudioContext(): AudioContext {
    if (!this.context) {
      this.context = new AudioContext({
        sampleRate: this.kSampleRate,
        // channelCount: 1,
        // echoCancellation: false,
        // autoGainControl: true,
        // noiseSuppression: true,
      });
    }
    return this.context;
  }

  /**
   * Loads and processes audio file
   * @param file - audio file
   * @param onProgress - progress callback
   * @param onSuccess - success callback
   * @param onError - error callback
   */
  async loadAudio(
    file: File,
    onProgress: ProgressCallback,
    onSuccess: SuccessCallback,
    onError: ErrorCallback,
  ): Promise<void> {
    if (!file) {
      onError('No file selected');
      return;
    }

    onProgress(`Loading audio: ${file.name}, size: ${file.size} bytes`);
    onProgress('Please wait...');

    try {
      const context = this.createAudioContext();

      // Read file
      const arrayBuffer = await this.readFileAsArrayBuffer(file);
      const uint8Array = new Uint8Array(arrayBuffer);

      // Decode audio
      const audioBuffer = await context.decodeAudioData(uint8Array.buffer);

      // Create OfflineAudioContext for rendering
      const offlineContext = new OfflineAudioContext(
        audioBuffer.numberOfChannels,
        audioBuffer.length,
        audioBuffer.sampleRate,
      );

      // Create source and connect to context
      const source = offlineContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(offlineContext.destination);
      source.start(0);

      // Render audio
      const renderedBuffer = await offlineContext.startRendering();
      const audio = renderedBuffer.getChannelData(0);

      onProgress(`Audio loaded, size: ${audio.length} samples`);

      onSuccess(audio, {
        sampleRate: audioBuffer.sampleRate,
        duration: audio.length / audioBuffer.sampleRate,
        channels: audioBuffer.numberOfChannels,
      });
    } catch (error) {
      console.error('Audio decoding error:', error);
      onError(`Audio decoding error: ${(error as Error).message}`);
    }
  }

  /**
   * Reads file as ArrayBuffer
   */
  private readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target?.result as ArrayBuffer);
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Checks Web Audio API support
   */
  isSupported(): boolean {
    return !!(window.AudioContext || (window as any).webkitAudioContext);
  }

  /**
   * Gets information about supported formats
   */
  getSupportedFormats(): string[] {
    return ['MP3', 'WAV', 'OGG', 'M4A', 'FLAC', 'AAC'];
  }
}
