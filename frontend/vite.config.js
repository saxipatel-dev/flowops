import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    strictPort: true,
    // Same-origin API calls keep the session cookie simple (no CORS needed).
    // The end-to-end tests point this at a separate API that uses the test database.
    proxy: {
      '/api': process.env.API_PROXY_TARGET || 'http://localhost:4000',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    include: ['src/**/*.test.{js,jsx}'],
  },
});
