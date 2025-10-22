import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';
import { defineConfig as defineVitestConfig } from 'vitest/config';

// Plugin to replace relative paths with absolute paths with base
function replaceRelativePathsPlugin(basePath: string) {
  return {
    name: 'replace-relative-paths',
    transformIndexHtml(html) {
      // Replace relative paths with absolute paths with base
      return html.replace(/src="\.\//g, `src="${basePath}`);
    },
  };
}

export default defineConfig(({ mode }) => {
  // Vitest configuration
  if (process.env.NODE_ENV === 'test') {
    return defineVitestConfig({
      test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./src/__tests__/setup.ts'],
      },
      resolve: {
        alias: {
          '@wasm': resolve(__dirname, 'wasm'),
        },
      },
    });
  }
  if (mode === 'library') {
    // Configuration for library build
    return {
      plugins: [
        dts({
          insertTypesEntry: true,
          include: ['src/**/*'],
          exclude: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
        }),
      ],
      build: {
        lib: {
          entry: resolve(__dirname, 'src/index.ts'),
          name: 'WhisperWasm',
          fileName: (format) => `index.${format}.js`,
          formats: ['es', 'cjs', 'umd'],
        },
        rollupOptions: {},
        outDir: 'dist',
        // Copy WASM files to dist
        // copyPublicDir: false,
        assetsInclude: ['**/*.wasm', '**/*.js'],
        assetsInlineLimit: 0,
      },
      resolve: {
        alias: {
          '@wasm': resolve(__dirname, 'wasm'),
        },
      },
      // Settings for WASM file processing
      optimizeDeps: {
        // exclude: ['@wasm/libmain.js', '@wasm/libstream.js', '@wasm/libcommand.js', '@wasm/libbench.js']
      },
    };
  }

  if (mode === 'demo') {
    // Configuration for demo build
    const basePath = process.env.DEMO_BASE_PATH || '/';
    return {
      base: basePath,
      root: 'demo',
      plugins: [replaceRelativePathsPlugin(basePath)],
      build: {
        outDir: '../demo-dist',
        rollupOptions: {
          input: {
            main: resolve(__dirname, 'demo/index.html'),
          },
        },
        // Copy WASM files to demo
        // copyPublicDir: false,
        assetsInclude: ['**/*.wasm', '**/*.js'],
        assetsInlineLimit: 0,
      },
      resolve: {
        alias: {
          '@wasm': resolve(__dirname, 'wasm'),
        },
      },
      server: {
        port: 3000,
        open: true,
      },
      // Settings for WASM file processing
      optimizeDeps: {
        // exclude: ['@wasm/libmain.js', '@wasm/libstream.js', '@wasm/libcommand.js', '@wasm/libbench.js']
      },
    };
  }

  // Default configuration
  return {
    resolve: {
      alias: {
        '@wasm': resolve(__dirname, 'wasm'),
      },
    },
    optimizeDeps: {
      exclude: [
        '@wasm/libmain.js',
        '@wasm/libstream.js',
        '@wasm/libcommand.js',
        '@wasm/libbench.js',
      ],
    },
  };
});
