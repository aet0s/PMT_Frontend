import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const apiTarget = process.env.VITE_API_URL || process.env.VITE_API_TARGET || process.env.VITE_SERVER_URL || 'http://localhost:5000';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js'
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
        secure: false
      },
      '/uploads': {
        target: apiTarget,
        changeOrigin: true,
        secure: false
      },
      '/socket.io': {
        target: apiTarget,
        changeOrigin: true,
        ws: true,
        secure: false
      }
    }
  }
});
