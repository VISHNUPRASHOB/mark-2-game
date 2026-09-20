import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsInlineLimit: 4096,
    target: 'es2020'
  },
  preview: {
    host: true,
    allowedHosts: true
  },
  server: {
    host: true,
    allowedHosts: true
  }
});
