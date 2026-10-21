import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build` → normal multi-file production build in /dist
// `npm run build:single` → one self-contained index.html in /dist-single
export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === 'single' ? [viteSingleFile()] : [])],
  build: { outDir: mode === 'single' ? 'dist-single' : 'dist' },
  // `npm run dev` → forward chatbot calls to the local API server (`npm run dev:api`)
  server: { proxy: { '/api': 'http://localhost:3000' } },
}));
