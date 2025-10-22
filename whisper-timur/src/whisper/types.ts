type WithPrefix<T, P extends string> = {
  [K in keyof T as K extends string ? `${P}${K}` : never]: T[K];
};

// Interface for whisper.cpp WASM module
export interface WhisperWasmModule extends WithPrefix<typeof FS, 'FS_'> {
  init: (modelPath: string) => number;
  // init: typeof FS.init;
  full_default: (
    instance: number,
    audio: Float32Array,
    language: string,
    threads: number,
    translate: boolean,
  ) => string;
  print: (e: string) => void;
  printErr: (e: string) => void;
  free: () => void;
  // Other module methods;
}

// WASM module loading status
export interface WasmModuleStatus {
  wasmLoaded: boolean;
  modelLoaded: boolean;
  instance: number | null;
  currentModel: string | null;
}

export interface WhisperWasmServiceCallbackParams {
  timeStart: number;
  timeEnd: number;
  text: string;
  raw: string;
}

export type WhisperWasmServiceCallback = (p: WhisperWasmServiceCallbackParams) => void;

export const whisperWasmTranscriptionDefaultOptions: WhisperWasmTranscriptionOptions = {
  language: 'auto' as const,
  threads: 4,
  translate: false,
} as const;

export type WhisperWasmTranscriptionOptions = {
  language?: string;
  threads?: number;
  translate?: boolean;
};
