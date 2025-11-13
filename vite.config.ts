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
        strictPort: true,
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
        }),
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        // Magenta.js needs these globals
        global: 'globalThis',
        'process.env': {},
        'process.hrtime': '(() => { const start = performance.now(); return () => [0, Math.floor((performance.now() - start) * 1e6)]; })()',
        Buffer: '(function(){ const w=typeof window!=="undefined"?window:{}; return w.Buffer||{isBuffer:function(){return false}}; })()'
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
          buffer: 'buffer',
          'whatwg-url/lib/public-api.js': path.resolve(__dirname, 'src/shims/whatwg-url.js'),
          'whatwg-url': path.resolve(__dirname, 'src/shims/whatwg-url.js'),
          jsfxr: path.resolve(__dirname, 'src/shims/jsfxr.js'),
        }
      },
      optimizeDeps: {
        esbuildOptions: {
          define: {
            global: 'globalThis',
          },
        },
        exclude: ['@google/genai', 'node-fetch', 'fetch-blob', 'formdata-polyfill', 'node-domexception', 'jsfxr'],
      },
    };
});
