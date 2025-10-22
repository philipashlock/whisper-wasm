import { getAllModels, getModelConfig, ModelID, WhisperModel } from './ModelConfig';
import { Logger, LoggerLevelsType } from '../utils/Logger';

export interface ModelListConfig {
  models: WhisperModel[];
  cacheEnabled?: boolean;
  maxCacheSize?: number; // in bytes
}

export interface ProgressCallback {
  (progress: number): void;
}

export interface ModelManagerOptions {
  logLevel: LoggerLevelsType;
}

export class ModelManager {
  private cacheEnabled: boolean = true;
  private models = getAllModels();
  private logger: Logger;

  constructor(options: ModelManagerOptions = { logLevel: Logger.levels.ERROR }) {
    this.logger = new Logger(options.logLevel, 'ModelManager');
  }

  /**
   * Loads model by name
   */
  async loadModel(
    modelId: ModelID,
    saveToIndexedDB: boolean = true,
    progressCallback?: ProgressCallback,
  ): Promise<Uint8Array> {
    const model = getModelConfig(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found in config`);
    }

    // Check cache in IndexedDB
    if (this.cacheEnabled && saveToIndexedDB) {
      const cachedModel = await this.getCachedModel(modelId);
      if (cachedModel) {
        this.logger.info(`Model ${modelId} loaded from cache`);
        if (progressCallback) progressCallback(100);
        return cachedModel;
      }
    }

    // Load model by URL
    this.logger.info(`Loading model ${modelId} from ${model.url}`);
    const response = await fetch(model.url);
    if (!response.ok) {
      throw new Error(`Failed to load model: ${response.statusText}`);
    }

    const contentLength = response.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;
    let loaded = 0;

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    const chunks: Uint8Array[] = [];

    try {
      let done = false;
      while (!done) {
        const result = await reader.read();
        done = result.done;

        if (!done && result.value) {
          chunks.push(result.value);
          loaded += result.value.length;

          if (progressCallback && total > 0) {
            const progress = Math.round((loaded / total) * 100);
            progressCallback(progress);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    // Combine all chunks into one array
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const modelData = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      modelData.set(chunk, offset);
      offset += chunk.length;
    }

    // Save to IndexedDB if needed
    if (this.cacheEnabled && saveToIndexedDB) {
      await this.saveModelToCache(modelId, modelData);
    }

    if (progressCallback) progressCallback(100);
    return modelData;
  }

  /**
   * Loads WASM model by URL and saves it to IndexedDB using the URL itself as key.
   */
  async loadModelByUrl(modelUrl: string, progressCallback?: ProgressCallback): Promise<Uint8Array> {
    try {
      // First try to get from cache by URL
      if (this.cacheEnabled) {
        const cached = await this.getCachedModelByUrl(modelUrl);
        if (cached) {
          this.logger.info(`WASM module loaded from cache by URL: ${modelUrl}`);
          if (progressCallback) progressCallback(100);
          return cached;
        }
      }

      // If not in cache, load from network
      this.logger.info(`Loading WASM module from URL: ${modelUrl}`);
      const response = await fetch(modelUrl);
      if (!response.ok) {
        throw new Error(`Failed to load WASM module: ${response.statusText}`);
      }

      const contentLength = response.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;
      let loaded = 0;

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const chunks: Uint8Array[] = [];

      try {
        let done = false;
        while (!done) {
          const result = await reader.read();
          done = result.done;

          if (!done && result.value) {
            chunks.push(result.value);
            loaded += result.value.length;

            if (progressCallback && total > 0) {
              const progress = Math.round((loaded / total) * 100);
              progressCallback(progress);
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      // Combine all chunks into one array
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const modelData = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        modelData.set(chunk, offset);
        offset += chunk.length;
      }

      // Save to cache by URL
      if (this.cacheEnabled) {
        await this.saveModelToCacheByUrl(modelUrl, modelData);
      }

      if (progressCallback) progressCallback(100);
      return modelData;
    } catch (error) {
      this.logger.error(error);
      throw new Error('Failed to load WASM module');
    }
  }

  /**
   * Get model from IndexedDB by URL (key is the URL itself)
   */
  private async getCachedModelByUrl(modelUrl: string): Promise<Uint8Array | null> {
    try {
      const db = await this.openIndexedDB();
      const transaction = db.transaction(['modelsByUrl'], 'readonly');
      const store = transaction.objectStore('modelsByUrl');

      return new Promise<Uint8Array | null>((resolve, reject) => {
        const request = store.get(modelUrl);

        request.onsuccess = () => {
          const result = request.result;
          if (result && result.data) {
            resolve(result.data);
          } else {
            resolve(null);
          }
        };

        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      this.logger.error('Error reading model from cache by URL:', error);
      return null;
    }
  }

  /**
   * Saves model to IndexedDB by URL (key is the URL itself)
   */
  private async saveModelToCacheByUrl(modelUrl: string, modelData: Uint8Array): Promise<void> {
    try {
      const db = await this.openIndexedDB();
      const transaction = db.transaction(['modelsByUrl'], 'readwrite');
      const store = transaction.objectStore('modelsByUrl');

      await new Promise<void>((resolve, reject) => {
        const request = store.put({
          url: modelUrl,
          data: modelData,
          timestamp: Date.now(),
          size: modelData.length,
        });

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      this.logger.info(`Model saved to cache by URL: ${modelUrl}`);
    } catch (error) {
      this.logger.error('Error saving model to cache by URL:', error);
    }
  }

  /**
   * Gets list of available models with cache information
   */
  async getAvailableModels(): Promise<WhisperModel[]> {
    const models = [...this.models];

    if (!this.cacheEnabled) {
      return models;
    }

    try {
      // Get list of loaded models from IndexedDB
      const cachedModels = await this.getCachedModelNames();

      // Enrich models array with cache information
      return models.map((model) => ({
        ...model,
        cached: cachedModels.includes(model.id),
      }));
    } catch (error) {
      this.logger.error('Error checking cache status:', error);
      return models;
    }
  }

  /**
   * Gets list of available models without cache check (synchronously)
   */
  getAvailableModelsSync(): WhisperModel[] {
    return [...this.models];
  }

  /**
   * Gets model by name from config
   */
  getModelConfig(modelName: ModelID): WhisperModel | undefined {
    return getModelConfig(modelName);
  }

  /**
   * Saves model to IndexedDB
   */
  private async saveModelToCache(modelName: ModelID, modelData: Uint8Array): Promise<void> {
    try {
      const db = await this.openIndexedDB();
      const transaction = db.transaction(['models'], 'readwrite');
      const store = transaction.objectStore('models');

      await new Promise<void>((resolve, reject) => {
        const request = store.put({
          name: modelName,
          data: modelData,
          timestamp: Date.now(),
          size: modelData.length,
        });

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      this.logger.info(`Model ${modelName} saved to cache`);
    } catch (error) {
      this.logger.error('Error saving model to cache:', error);
    }
  }

  /**
   * Gets model from IndexedDB cache
   */
  private async getCachedModel(modelName: ModelID): Promise<Uint8Array | null> {
    try {
      const db = await this.openIndexedDB();
      const transaction = db.transaction(['models'], 'readonly');
      const store = transaction.objectStore('models');

      return new Promise<Uint8Array | null>((resolve, reject) => {
        const request = store.get(modelName);

        request.onsuccess = () => {
          const result = request.result;
          if (result && result.data) {
            resolve(result.data);
          } else {
            resolve(null);
          }
        };

        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      this.logger.error('Error getting cached model:', error);
      return null;
    }
  }

  /**
   * Gets list of model names loaded in cache
   */
  private async getCachedModelNames(): Promise<ModelID[]> {
    try {
      const db = await this.openIndexedDB();
      const transaction = db.transaction(['models'], 'readonly');
      const store = transaction.objectStore('models');

      return new Promise<ModelID[]>((resolve, reject) => {
        const request = store.getAllKeys();

        request.onsuccess = () => {
          const keys = request.result as ModelID[];
          resolve(keys);
        };

        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      this.logger.error('Error getting cached model names:', error);
      return [];
    }
  }

  /**
   * Opens IndexedDB for model caching
   */
  private async openIndexedDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('WhisperModels', 2);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object store for models by ID
        if (!db.objectStoreNames.contains('models')) {
          const store = db.createObjectStore('models', { keyPath: 'name' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('size', 'size', { unique: false });
        }

        // Create object store for models by URL
        if (!db.objectStoreNames.contains('modelsByUrl')) {
          const store = db.createObjectStore('modelsByUrl', { keyPath: 'url' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('size', 'size', { unique: false });
        }
      };
    });
  }

  /**
   * Clears model cache
   */
  async clearCache(): Promise<void> {
    try {
      const db = await this.openIndexedDB();
      const transaction = db.transaction(['models', 'modelsByUrl'], 'readwrite');

      // Clear store for models by ID
      const modelsStore = transaction.objectStore('models');
      await new Promise<void>((resolve, reject) => {
        const request = modelsStore.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      // Clear store for models by URL
      const modelsByUrlStore = transaction.objectStore('modelsByUrl');
      await new Promise<void>((resolve, reject) => {
        const request = modelsByUrlStore.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      this.logger.info('Model cache cleared');
    } catch (error) {
      this.logger.error('Error clearing cache:', error);
    }
  }

  /**
   * Gets cache information
   */
  async getCacheInfo(): Promise<{ count: number; totalSize: number }> {
    try {
      const db = await this.openIndexedDB();
      const transaction = db.transaction(['models'], 'readonly');
      const store = transaction.objectStore('models');

      return new Promise((resolve, reject) => {
        const request = store.getAll();

        request.onsuccess = () => {
          const models = request.result;
          const totalSize = models.reduce((sum, model) => sum + (model.size || 0), 0);
          resolve({ count: models.length, totalSize });
        };

        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      this.logger.error('Error getting cache info:', error);
      return { count: 0, totalSize: 0 };
    }
  }
}
