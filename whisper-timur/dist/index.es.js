const p = class p {
  constructor(e = p.levels.INFO, t = "") {
    this.level = e, this.prefix = t;
  }
  debug(...e) {
    this.level <= p.levels.DEBUG && console.debug(`[${this.prefix}] [DEBUG]`, ...e);
  }
  info(...e) {
    this.level <= p.levels.INFO && console.info(`[${this.prefix}] [INFO]`, ...e);
  }
  warn(...e) {
    this.level <= p.levels.WARN && console.warn(`[${this.prefix}] [WARN]`, ...e);
  }
  error(...e) {
    this.level <= p.levels.ERROR && console.error(`[${this.prefix}] [ERROR]`, ...e);
  }
  setLevel(e) {
    this.level = e;
  }
  getLevel() {
    return this.level;
  }
};
p.levels = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};
let b = p;
const z = async () => WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11])), _ = {
  language: "auto",
  threads: 4,
  translate: !1
};
function M(c) {
  const e = String(c).trim().replace(",", "."), t = e.split(":").map(Number);
  if (t.some(Number.isNaN)) throw new Error(`Bad time: "${c}"`);
  let r = 0, o = 0, s = 0;
  if (t.length === 3)
    [r, o] = t, s = parseFloat(e.split(":").pop() || "0");
  else if (t.length === 2)
    [o] = t, s = parseFloat(e.split(":").pop() || "0");
  else
    throw new Error(`Bad time format: "${c}"`);
  return Math.floor(((r * 60 + o) * 60 + s) * 1e3);
}
function B(c) {
  const t = /^\s*\[?\s*([0-9]{1,2}:[0-9]{2}:(?:[0-9]{2}[.,][0-9]{1,3})|[0-9]{1,2}:[0-9]{2}[.,][0-9]{1,3})\s*-->\s*([0-9]{1,2}:[0-9]{2}:(?:[0-9]{2}[.,][0-9]{1,3})|[0-9]{1,2}:[0-9]{2}[.,][0-9]{1,3})\s*\]?\s*(.*)\s*$/.exec(c);
  if (!t)
    throw new Error("Line does not match VTT-like pattern: " + c);
  const r = t[1], o = t[2], s = t[3] || "", n = M(r), i = M(o);
  if (i < n)
    throw new Error("End time is before start time");
  return {
    startMs: n,
    endMs: i,
    start: r,
    end: o,
    text: s
  };
}
function q(c) {
  return new Promise((e) => setTimeout(e, c));
}
function R(c, e) {
  let t = null, r = !1, o = null, s = null;
  return { timeoutError: () => new Promise((a, g) => {
    s = a, o = g, t = setTimeout(() => {
      !r && o && (r = !0, o(new Error(e)));
    }, c);
  }), clear: () => {
    t && (clearTimeout(t), t = null), s && (s(), s = null), r = !0, o = null;
  } };
}
function W(c, e = 16e3 * 100) {
  const t = [];
  for (let r = 0; r < c.length; r += e)
    t.push(c.subarray(r, r + e));
  return t;
}
class x {
  constructor(e, t) {
    this.whisperService = e, this.logger = new b((t == null ? void 0 : t.logLevel) || b.levels.ERROR, "TranscriptionSession");
  }
  async *streamimg(e, t = {}) {
    const { timeoutMs: r = 3e4 } = t, o = W(e);
    let s = 0;
    for await (const n of o) {
      const i = [];
      let a = null, g = !1, d, f = 0;
      const { timeoutError: m, clear: u } = R(r, "Transcribe timeout"), h = () => this.whisperService.transcribe(
        n,
        (l) => {
          f = l.timeEnd, l.timeStart += s, l.timeEnd += s, this.logger.debug("Transcription segment in session:", l), a ? (a(l), a = null) : i.push(l), u();
        },
        t
      ).then(() => {
        this.logger.debug("Transcription done in session then"), g = !0, s += f, u(), a == null || a(void 0);
      }).catch((l) => {
        this.logger.debug("Transcription error in session catch:", l), d = l, u(), a == null || a(void 0);
      });
      for (h(); ; ) {
        if (d) {
          if (t.restartModelOnError) {
            this.whisperService.restartModel(), h();
            continue;
          }
          throw d;
        }
        if (g) break;
        if (i.length)
          yield i.shift();
        else
          try {
            const l = await Promise.race([
              new Promise(
                (w) => a = w
              ),
              m()
            ]);
            l && (yield l);
          } catch (l) {
            d = l;
          }
      }
      t.sleepMsBetweenChunks && await q(t.sleepMsBetweenChunks);
    }
  }
}
class L extends EventTarget {
  on(e, t) {
    return this.addEventListener(e, t), () => this.removeEventListener(e, t);
  }
  emit(e, t) {
    this.dispatchEvent(new CustomEvent(e, { detail: t }));
  }
}
class A {
  constructor(e) {
    this.wasmModule = null, this.instance = null, this.modelFileName = "whisper.bin", this.isTranscribing = !1, this.bus = new L(), this.modelData = null, this.logger = new b((e == null ? void 0 : e.logLevel) ?? b.levels.ERROR, "WhisperWasmService"), e != null && e.init && this.loadWasmScript();
  }
  async checkWasmSupport() {
    return await z();
  }
  async loadWasmScript() {
    this.wasmModule = await (await import("./libmain-D9-QM3iM.mjs")).default({
      print: (e, ...t) => {
        this.logger.debug(t), e.startsWith("[") ? (this.logger.info(e), this.bus.emit("transcribe", e)) : (this.logger.debug(e), this.bus.emit("system_info", e));
      },
      printErr: (e, ...t) => {
        this.logger.debug(t), this.logger.warn(e), this.bus.emit("transcribeError", e);
      }
    });
  }
  async loadWasmModule(e) {
    if (!await this.checkWasmSupport())
      throw new Error("WASM is not supported");
    return this.modelData = e, this.wasmModule && (this.wasmModule.FS_unlink(this.modelFileName), this.wasmModule.free()), await this.loadWasmScript(), await q(100), this.storeFS(this.modelFileName, e), this.instance = this.wasmModule.init(this.modelFileName), Promise.resolve();
  }
  restartModel() {
    if (!this.modelData)
      throw new Error("Model not loaded");
    return this.loadWasmModule(this.modelData);
  }
  storeFS(e, t) {
    if (!this.wasmModule)
      throw new Error("WASM module not loaded");
    try {
      this.wasmModule.FS_unlink(e);
    } catch {
    }
    this.wasmModule.FS_createDataFile("/", e, t, !0, !0, !0);
  }
  async transcribe(e, t, r = {}) {
    if (this.isTranscribing)
      throw new Error("Already transcribing");
    if (!this.wasmModule)
      throw new Error("WASM module not loaded");
    if (!this.instance)
      throw new Error("WASM instance not loaded");
    const o = 120;
    e.length > 16e3 * o && this.logger.warn(
      "It's not recommended to transcribe audio data that is longer than 120 seconds"
    ), this.isTranscribing = !0;
    const {
      language: s = "auto",
      threads: n = 4,
      translate: i = !1
    } = {
      ..._,
      ...r
    }, a = [], g = Date.now();
    return this.wasmModule.full_default(this.instance, e, s, n, i), await new Promise((d, f) => {
      const m = this.bus.on("transcribe", (l) => {
        const { startMs: w, endMs: y, text: T } = B(l.detail), v = {
          timeStart: w,
          timeEnd: y,
          text: T,
          raw: l.detail
        };
        a.push(v), t == null || t(v);
      }), u = setTimeout(
        () => {
          this.isTranscribing = !1, m(), h(), this.logger.error("Transcribe timeout"), f(new Error("Transcribe timeout")), this.bus.emit("transcribeError", "Transcribe timeout");
        },
        o * 2 * 1e3
      ), h = this.bus.on("transcribeError", (l) => {
        this.isTranscribing = !1, m(), h(), clearTimeout(u), this.logger.debug("Transcribe error", l.detail), d({ segments: a, transcribeDurationMs: Date.now() - g });
      });
    });
  }
  createSession() {
    return new x(this, { logLevel: this.logger.getLevel() });
  }
}
const S = {
  "tiny.en": {
    id: "tiny.en",
    name: "Tiny English",
    size: 75,
    language: "en",
    quantized: !1,
    url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en.bin"
  },
  tiny: {
    id: "tiny",
    name: "Tiny Multilingual",
    size: 75,
    language: "multilingual",
    quantized: !1,
    url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin"
  },
  "base.en": {
    id: "base.en",
    name: "Base English",
    size: 142,
    language: "en",
    quantized: !1,
    url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin"
  },
  base: {
    id: "base",
    name: "Base Multilingual",
    size: 142,
    language: "multilingual",
    quantized: !1,
    url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin"
  },
  "small.en": {
    id: "small.en",
    name: "Small English",
    size: 466,
    language: "en",
    quantized: !1,
    url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.en.bin"
  },
  small: {
    id: "small",
    name: "Small Multilingual",
    size: 466,
    language: "multilingual",
    quantized: !1,
    url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin"
  },
  "tiny.en-q5_1": {
    id: "tiny.en-q5_1",
    name: "Tiny English (Q5_1)",
    size: 31,
    language: "en",
    quantized: !0,
    url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en-q5_1.bin"
  },
  "tiny-q5_1": {
    id: "tiny-q5_1",
    name: "Tiny Multilingual (Q5_1)",
    size: 31,
    language: "multilingual",
    quantized: !0,
    url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny-q5_1.bin"
  },
  "base.en-q5_1": {
    id: "base.en-q5_1",
    name: "Base English (Q5_1)",
    size: 57,
    language: "en",
    quantized: !0,
    url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en-q5_1.bin"
  },
  "base-q5_1": {
    id: "base-q5_1",
    name: "Base Multilingual (Q5_1)",
    size: 57,
    language: "multilingual",
    quantized: !0,
    url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base-q5_1.bin"
  },
  "small.en-q5_1": {
    id: "small.en-q5_1",
    name: "Small English (Q5_1)",
    size: 182,
    language: "en",
    quantized: !0,
    url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.en-q5_1.bin"
  },
  "small-q5_1": {
    id: "small-q5_1",
    name: "Small Multilingual (Q5_1)",
    size: 182,
    language: "multilingual",
    quantized: !0,
    url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small-q5_1.bin"
  },
  "medium.en-q5_0": {
    id: "medium.en-q5_0",
    name: "Medium English (Q5_0)",
    size: 515,
    language: "en",
    quantized: !0,
    url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.en-q5_0.bin"
  },
  "medium-q5_0": {
    id: "medium-q5_0",
    name: "Medium Multilingual (Q5_0)",
    size: 515,
    language: "multilingual",
    quantized: !0,
    url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium-q5_0.bin"
  },
  "large-q5_0": {
    id: "large-q5_0",
    name: "Large Multilingual (Q5_0)",
    size: 1030,
    language: "multilingual",
    quantized: !0,
    url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-q5_0.bin"
  }
};
function D() {
  return Object.values(S).map(({ url: c, ...e }) => e);
}
function E(c) {
  return S[c];
}
class F {
  constructor(e = { logLevel: b.levels.ERROR }) {
    this.cacheEnabled = !0, this.models = D(), this.logger = new b(e.logLevel, "ModelManager");
  }
  /**
   * Loads model by name
   */
  async loadModel(e, t = !0, r) {
    var h;
    const o = E(e);
    if (!o)
      throw new Error(`Model ${e} not found in config`);
    if (this.cacheEnabled && t) {
      const l = await this.getCachedModel(e);
      if (l)
        return this.logger.info(`Model ${e} loaded from cache`), r && r(100), l;
    }
    this.logger.info(`Loading model ${e} from ${o.url}`);
    const s = await fetch(o.url);
    if (!s.ok)
      throw new Error(`Failed to load model: ${s.statusText}`);
    const n = s.headers.get("content-length"), i = n ? parseInt(n, 10) : 0;
    let a = 0;
    const g = (h = s.body) == null ? void 0 : h.getReader();
    if (!g)
      throw new Error("Response body is not readable");
    const d = [];
    try {
      let l = !1;
      for (; !l; ) {
        const w = await g.read();
        if (l = w.done, !l && w.value && (d.push(w.value), a += w.value.length, r && i > 0)) {
          const y = Math.round(a / i * 100);
          r(y);
        }
      }
    } finally {
      g.releaseLock();
    }
    const f = d.reduce((l, w) => l + w.length, 0), m = new Uint8Array(f);
    let u = 0;
    for (const l of d)
      m.set(l, u), u += l.length;
    return this.cacheEnabled && t && await this.saveModelToCache(e, m), r && r(100), m;
  }
  /**
   * Loads WASM model by URL and saves it to IndexedDB using the URL itself as key.
   */
  async loadModelByUrl(e, t) {
    var r;
    try {
      if (this.cacheEnabled) {
        const u = await this.getCachedModelByUrl(e);
        if (u)
          return this.logger.info(`WASM module loaded from cache by URL: ${e}`), t && t(100), u;
      }
      this.logger.info(`Loading WASM module from URL: ${e}`);
      const o = await fetch(e);
      if (!o.ok)
        throw new Error(`Failed to load WASM module: ${o.statusText}`);
      const s = o.headers.get("content-length"), n = s ? parseInt(s, 10) : 0;
      let i = 0;
      const a = (r = o.body) == null ? void 0 : r.getReader();
      if (!a)
        throw new Error("Response body is not readable");
      const g = [];
      try {
        let u = !1;
        for (; !u; ) {
          const h = await a.read();
          if (u = h.done, !u && h.value && (g.push(h.value), i += h.value.length, t && n > 0)) {
            const l = Math.round(i / n * 100);
            t(l);
          }
        }
      } finally {
        a.releaseLock();
      }
      const d = g.reduce((u, h) => u + h.length, 0), f = new Uint8Array(d);
      let m = 0;
      for (const u of g)
        f.set(u, m), m += u.length;
      return this.cacheEnabled && await this.saveModelToCacheByUrl(e, f), t && t(100), f;
    } catch (o) {
      throw this.logger.error(o), new Error("Failed to load WASM module");
    }
  }
  /**
   * Get model from IndexedDB by URL (key is the URL itself)
   */
  async getCachedModelByUrl(e) {
    try {
      const o = (await this.openIndexedDB()).transaction(["modelsByUrl"], "readonly").objectStore("modelsByUrl");
      return new Promise((s, n) => {
        const i = o.get(e);
        i.onsuccess = () => {
          const a = i.result;
          a && a.data ? s(a.data) : s(null);
        }, i.onerror = () => n(i.error);
      });
    } catch (t) {
      return this.logger.error("Error reading model from cache by URL:", t), null;
    }
  }
  /**
   * Saves model to IndexedDB by URL (key is the URL itself)
   */
  async saveModelToCacheByUrl(e, t) {
    try {
      const s = (await this.openIndexedDB()).transaction(["modelsByUrl"], "readwrite").objectStore("modelsByUrl");
      await new Promise((n, i) => {
        const a = s.put({
          url: e,
          data: t,
          timestamp: Date.now(),
          size: t.length
        });
        a.onsuccess = () => n(), a.onerror = () => i(a.error);
      }), this.logger.info(`Model saved to cache by URL: ${e}`);
    } catch (r) {
      this.logger.error("Error saving model to cache by URL:", r);
    }
  }
  /**
   * Gets list of available models with cache information
   */
  async getAvailableModels() {
    const e = [...this.models];
    if (!this.cacheEnabled)
      return e;
    try {
      const t = await this.getCachedModelNames();
      return e.map((r) => ({
        ...r,
        cached: t.includes(r.id)
      }));
    } catch (t) {
      return this.logger.error("Error checking cache status:", t), e;
    }
  }
  /**
   * Gets list of available models without cache check (synchronously)
   */
  getAvailableModelsSync() {
    return [...this.models];
  }
  /**
   * Gets model by name from config
   */
  getModelConfig(e) {
    return E(e);
  }
  /**
   * Saves model to IndexedDB
   */
  async saveModelToCache(e, t) {
    try {
      const s = (await this.openIndexedDB()).transaction(["models"], "readwrite").objectStore("models");
      await new Promise((n, i) => {
        const a = s.put({
          name: e,
          data: t,
          timestamp: Date.now(),
          size: t.length
        });
        a.onsuccess = () => n(), a.onerror = () => i(a.error);
      }), this.logger.info(`Model ${e} saved to cache`);
    } catch (r) {
      this.logger.error("Error saving model to cache:", r);
    }
  }
  /**
   * Gets model from IndexedDB cache
   */
  async getCachedModel(e) {
    try {
      const o = (await this.openIndexedDB()).transaction(["models"], "readonly").objectStore("models");
      return new Promise((s, n) => {
        const i = o.get(e);
        i.onsuccess = () => {
          const a = i.result;
          a && a.data ? s(a.data) : s(null);
        }, i.onerror = () => n(i.error);
      });
    } catch (t) {
      return this.logger.error("Error getting cached model:", t), null;
    }
  }
  /**
   * Gets list of model names loaded in cache
   */
  async getCachedModelNames() {
    try {
      const r = (await this.openIndexedDB()).transaction(["models"], "readonly").objectStore("models");
      return new Promise((o, s) => {
        const n = r.getAllKeys();
        n.onsuccess = () => {
          const i = n.result;
          o(i);
        }, n.onerror = () => s(n.error);
      });
    } catch (e) {
      return this.logger.error("Error getting cached model names:", e), [];
    }
  }
  /**
   * Opens IndexedDB for model caching
   */
  async openIndexedDB() {
    return new Promise((e, t) => {
      const r = indexedDB.open("WhisperModels", 2);
      r.onerror = () => t(r.error), r.onsuccess = () => e(r.result), r.onupgradeneeded = (o) => {
        const s = o.target.result;
        if (!s.objectStoreNames.contains("models")) {
          const n = s.createObjectStore("models", { keyPath: "name" });
          n.createIndex("timestamp", "timestamp", { unique: !1 }), n.createIndex("size", "size", { unique: !1 });
        }
        if (!s.objectStoreNames.contains("modelsByUrl")) {
          const n = s.createObjectStore("modelsByUrl", { keyPath: "url" });
          n.createIndex("timestamp", "timestamp", { unique: !1 }), n.createIndex("size", "size", { unique: !1 });
        }
      };
    });
  }
  /**
   * Clears model cache
   */
  async clearCache() {
    try {
      const t = (await this.openIndexedDB()).transaction(["models", "modelsByUrl"], "readwrite"), r = t.objectStore("models");
      await new Promise((s, n) => {
        const i = r.clear();
        i.onsuccess = () => s(), i.onerror = () => n(i.error);
      });
      const o = t.objectStore("modelsByUrl");
      await new Promise((s, n) => {
        const i = o.clear();
        i.onsuccess = () => s(), i.onerror = () => n(i.error);
      }), this.logger.info("Model cache cleared");
    } catch (e) {
      this.logger.error("Error clearing cache:", e);
    }
  }
  /**
   * Gets cache information
   */
  async getCacheInfo() {
    try {
      const r = (await this.openIndexedDB()).transaction(["models"], "readonly").objectStore("models");
      return new Promise((o, s) => {
        const n = r.getAll();
        n.onsuccess = () => {
          const i = n.result, a = i.reduce((g, d) => g + (d.size || 0), 0);
          o({ count: i.length, totalSize: a });
        }, n.onerror = () => s(n.error);
      });
    } catch (e) {
      return this.logger.error("Error getting cache info:", e), { count: 0, totalSize: 0 };
    }
  }
}
export {
  F as ModelManager,
  A as WhisperWasmService,
  D as getAllModels
};
