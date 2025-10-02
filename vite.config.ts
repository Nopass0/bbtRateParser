import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const apiProxyTarget = 'https://www.bybit.com';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/bybit': {
        target: apiProxyTarget,
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/bybit/, '/x-api/fiat/otc/item/online')
      }
    }
  }
});
