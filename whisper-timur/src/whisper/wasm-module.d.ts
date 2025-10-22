declare module '@wasm/libmain.js' {
  import type { WhisperWasmModule } from './types';
  const Module: WhisperWasmModule;
  export = Module;
}

declare module '@wasm/whisper-main.js?url' {
  const s: string;
  export default s;
}

declare module '@wasm/libmain.js?url' {
  const s: string;
  export default s;
}

declare module '@wasm/libmain.js?raw' {
  const s: string;
  export default s;
}

declare module '@wasm/libmain.mjs' {
  import type { WhisperWasmModule } from './types';
  const Module: WhisperWasmModule;
  export default Module;
}
