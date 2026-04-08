import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@cvg-his-v2/design-system/vue': resolve(
        __dirname,
        '../../packages/design-system/src/vue'
      ),
      '@cvg-his-v2/design-system/src/vue': resolve(
        __dirname,
        '../../packages/design-system/src/vue'
      ),
      '@cvg-his-v2/design-system/src/tokens': resolve(
        __dirname,
        '../../packages/design-system/src/tokens'
      )
    }
  },
  server: {
    port: 3002,
    allowedHosts: ['tired-bugs-refuse.loca.lt', '.loca.lt'],
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vue-vendor': ['vue', 'vue-router', 'pinia']
        }
      }
    }
  }
});
