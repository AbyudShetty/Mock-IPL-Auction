import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Static data (stats JSON, player CSV, logo) lives in public/ and is copied
// verbatim into dist/, so the fetch paths used by the stats engine keep working.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false
  },
  server: {
    port: 5173,
    open: true
  }
});
