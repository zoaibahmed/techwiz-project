import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Keep Vite inside Client: never serve the repository root or load its env files.
const clientRoot = fileURLToPath(new URL('.', import.meta.url));
export default defineConfig({
  root: clientRoot,
  envDir: clientRoot,
  plugins: [react()],
  server: {
    strictPort: true,
    fs: { strict: true, allow: [clientRoot] },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: { strictPort: true },
  optimizeDeps: {
    include: ['leaflet'],
  },
});
