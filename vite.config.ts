import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        strictPort: true,
      },
      plugins: [react()],
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
        }
      }
    };
});
