import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: {
      entry: 'src/widget-entry.jsx',
      name: 'ChatWidget',
      formats: ['iife'],
      fileName: () => 'widget.js'
    }
  }
});