import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        nodePolyfills({
          // Enable polyfills for specific globals and modules
          globals: {
            Buffer: true,
            global: true,
            process: true,
          },
          // Exclude modules that should be externalized or mocked
          exclude: ['fs', 'net'],
        }),
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        global: 'globalThis',
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
          buffer: 'buffer',
          stream: 'stream-browserify',
          'node:stream/web': 'stream-browserify',
        }
      },
      optimizeDeps: {
        esbuildOptions: {
          define: {
            global: 'globalThis',
          },
        },
        exclude: ['@google/genai'],
      },
      build: {
        commonjsOptions: {
          transformMixedEsModules: true,
        },
      },
    };
});
