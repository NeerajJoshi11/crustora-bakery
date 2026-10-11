import { resolve } from 'path';
import { defineConfig } from 'vite';
import { handleApiRequest } from './server/api.js';

export default defineConfig({
  plugins: [
    {
      name: 'supabase-postgres-api',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url && req.url.startsWith('/api')) {
            await handleApiRequest(req, res);
          } else {
            next();
          }
        });
      }
    }
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html')
      }
    }
  }
});
