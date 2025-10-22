export type ModelID =
  | 'tiny.en'
  | 'tiny'
  | 'base.en'
  | 'base'
  | 'small.en'
  | 'small'
  | 'tiny.en-q5_1'
  | 'tiny-q5_1'
  | 'base.en-q5_1'
  | 'base-q5_1'
  | 'small.en-q5_1'
  | 'small-q5_1'
  | 'medium.en-q5_0'
  | 'medium-q5_0'
  | 'large-q5_0';

export interface WhisperModel {
  id: ModelID;
  name: string;
  size: number; // in MB
  language: 'en' | 'multilingual';
  quantized: boolean;
  cached?: boolean;
}

// Model configuration with Hugging Face links
export const MODEL_CONFIG: Record<ModelID, WhisperModel & { url: string }> = {
  'tiny.en': {
    id: 'tiny.en',
    name: 'Tiny English',
    size: 75,
    language: 'en',
    quantized: false,
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en.bin',
  },
  tiny: {
    id: 'tiny',
    name: 'Tiny Multilingual',
    size: 75,
    language: 'multilingual',
    quantized: false,
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin',
  },
  'base.en': {
    id: 'base.en',
    name: 'Base English',
    size: 142,
    language: 'en',
    quantized: false,
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin',
  },
  base: {
    id: 'base',
    name: 'Base Multilingual',
    size: 142,
    language: 'multilingual',
    quantized: false,
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin',
  },
  'small.en': {
    id: 'small.en',
    name: 'Small English',
    size: 466,
    language: 'en',
    quantized: false,
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.en.bin',
  },
  small: {
    id: 'small',
    name: 'Small Multilingual',
    size: 466,
    language: 'multilingual',
    quantized: false,
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin',
  },
  'tiny.en-q5_1': {
    id: 'tiny.en-q5_1',
    name: 'Tiny English (Q5_1)',
    size: 31,
    language: 'en',
    quantized: true,
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en-q5_1.bin',
  },
  'tiny-q5_1': {
    id: 'tiny-q5_1',
    name: 'Tiny Multilingual (Q5_1)',
    size: 31,
    language: 'multilingual',
    quantized: true,
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny-q5_1.bin',
  },
  'base.en-q5_1': {
    id: 'base.en-q5_1',
    name: 'Base English (Q5_1)',
    size: 57,
    language: 'en',
    quantized: true,
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en-q5_1.bin',
  },
  'base-q5_1': {
    id: 'base-q5_1',
    name: 'Base Multilingual (Q5_1)',
    size: 57,
    language: 'multilingual',
    quantized: true,
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base-q5_1.bin',
  },
  'small.en-q5_1': {
    id: 'small.en-q5_1',
    name: 'Small English (Q5_1)',
    size: 182,
    language: 'en',
    quantized: true,
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.en-q5_1.bin',
  },
  'small-q5_1': {
    id: 'small-q5_1',
    name: 'Small Multilingual (Q5_1)',
    size: 182,
    language: 'multilingual',
    quantized: true,
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small-q5_1.bin',
  },
  'medium.en-q5_0': {
    id: 'medium.en-q5_0',
    name: 'Medium English (Q5_0)',
    size: 515,
    language: 'en',
    quantized: true,
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.en-q5_0.bin',
  },
  'medium-q5_0': {
    id: 'medium-q5_0',
    name: 'Medium Multilingual (Q5_0)',
    size: 515,
    language: 'multilingual',
    quantized: true,
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium-q5_0.bin',
  },
  'large-q5_0': {
    id: 'large-q5_0',
    name: 'Large Multilingual (Q5_0)',
    size: 1030,
    language: 'multilingual',
    quantized: true,
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-q5_0.bin',
  },
};

// Utility functions for working with configuration
export function getModelInfo(modelId: ModelID): WhisperModel | null {
  const config = MODEL_CONFIG[modelId];
  if (!config) return null;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { url, ...modelInfo } = config;
  return modelInfo;
}

export function getAllModels(): WhisperModel[] {
  return Object.values(MODEL_CONFIG).map(({ url, ...modelInfo }) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    void url; // Suppress unused variable warning
    return modelInfo;
  });
}

export function getModelConfig(modelId: ModelID) {
  return MODEL_CONFIG[modelId];
}
