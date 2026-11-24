import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset paths so the same build works inside the Capacitor WebView.
  base: './',
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1200,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
} as any);
