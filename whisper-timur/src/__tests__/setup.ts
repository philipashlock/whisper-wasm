// Vitest setup file
import { vi } from 'vitest';

// Mock global objects for browser environment
Object.defineProperty(window, 'indexedDB', {
  value: {
    open: vi.fn(),
  },
  writable: true,
});

// Mock console methods to avoid noise in tests
global.console = {
  ...console,
  // Uncomment to ignore specific log levels
  // log: vi.fn(),
  // debug: vi.fn(),
  // info: vi.fn(),
  // warn: vi.fn(),
  // error: vi.fn(),
};
