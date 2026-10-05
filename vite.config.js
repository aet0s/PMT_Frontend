import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

function cspPlugin(apiUrl, isProd) {
  return {
    name: 'html-csp-transform',
    transformIndexHtml(html) {
      let connectSrc = "'self'";
      let imgSrc = "'self' data: blob:";

      if (apiUrl) {
        try {
          const parsed = new URL(apiUrl);
          const origin = parsed.origin;
          const wsProtocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
          const wsOrigin = `${wsProtocol}//${parsed.host}`;
          connectSrc += ` ${origin} ${wsOrigin}`;
          imgSrc += ` ${origin}`;
        } catch {
          connectSrc += ` ${apiUrl}`;
        }
      }

      if (isProd) {
        if (!connectSrc.includes('https:')) connectSrc += ' https: wss:';
        if (!imgSrc.includes('https:')) imgSrc += ' https:';
      } else {
        connectSrc += ' http: ws: https: wss:';
        imgSrc += ' http: https:';
      }

      const csp = `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src ${imgSrc}; connect-src ${connectSrc}; object-src 'none'; base-uri 'self';`;
      const metaTag = `<meta http-equiv="Content-Security-Policy" content="${csp}" />`;

      return html.replace('<!-- CSP_META -->', metaTag);
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.VITE_API_URL || env.VITE_API_TARGET || env.VITE_SERVER_URL || 'http://localhost:5000';
  const isProd = mode === 'production';

  return {
    plugins: [
      react(),
      tailwindcss(),
      cspPlugin(apiTarget, isProd)
    ],
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
  };
});
