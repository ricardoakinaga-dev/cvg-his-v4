import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve } from 'node:path';

import { loadSpaViteConfig } from '../../packages/shared/config/src/index';

export default defineConfig(({ mode }) => {
  const rawEnv = {
    ...process.env,
    ...loadEnv(mode, __dirname, '')
  };
  const runtimeConfig = loadSpaViteConfig(rawEnv);
  const proxyAccountId =
    typeof rawEnv.VITE_PROXY_ACCOUNT_ID === 'string' ? rawEnv.VITE_PROXY_ACCOUNT_ID.trim() : '';
  const isE2EVisualRuntime = runtimeConfig.disablePwa;

  return {
    plugins: [
      vue(),
      ...(isE2EVisualRuntime
        ? []
        : [
            VitePWA({
              registerType: 'autoUpdate',
              injectRegister: 'auto',
              workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,ttf,webp}'],
                runtimeCaching: [
                  {
                    urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                    handler: 'CacheFirst',
                    options: {
                      cacheName: 'google-fonts-cache',
                      expiration: {
                        maxEntries: 10,
                        maxAgeSeconds: 60 * 60 * 24 * 365
                      },
                      cacheableResponse: {
                        statuses: [0, 200]
                      }
                    }
                  },
                  {
                    urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
                    handler: 'CacheFirst',
                    options: {
                      cacheName: 'gstatic-fonts-cache',
                      expiration: {
                        maxEntries: 10,
                        maxAgeSeconds: 60 * 60 * 24 * 365
                      },
                      cacheableResponse: {
                        statuses: [0, 200]
                      }
                    }
                  }
                ]
              },
              manifest: {
                name: runtimeConfig.appName,
                short_name: 'CVG HIS',
                description: 'Sistema de Gestao Hospitalar Veterinaria',
                theme_color: '#1e40af',
                background_color: '#ffffff',
                display: 'standalone',
                orientation: 'portrait-primary',
                scope: '/',
                start_url: '/',
                id: 'cvg-his-v2',
                categories: ['medical', 'productivity', 'business'],
                icons: [
                  {
                    src: '/icons/icon-192x192.png',
                    sizes: '192x192',
                    type: 'image/png'
                  },
                  {
                    src: '/icons/icon-512x512.png',
                    sizes: '512x512',
                    type: 'image/png'
                  },
                  {
                    src: '/icons/icon-512x512.png',
                    sizes: '512x512',
                    type: 'image/png',
                    purpose: 'maskable'
                  }
                ],
                shortcuts: [
                  {
                    name: 'Nova Triagem',
                    short_name: 'Triagem',
                    description: 'Registrar nova triagem',
                    url: '/triage/new',
                    icons: [{ src: '/icons/icon-96x96.png', sizes: '96x96' }]
                  },
                  {
                    name: 'Agenda',
                    short_name: 'Agenda',
                    description: 'Ver agenda de atendimentos',
                    url: '/appointments',
                    icons: [{ src: '/icons/icon-96x96.png', sizes: '96x96' }]
                  },
                  {
                    name: 'Internados',
                    short_name: 'Internados',
                    description: 'Ver pacientes importados',
                    url: '/inpatient',
                    icons: [{ src: '/icons/icon-96x96.png', sizes: '96x96' }]
                  }
                ]
              },
              devOptions: {
                enabled: true,
                type: 'module',
                navigateFallback: '/'
              }
            })
          ])
    ],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@cvg-his-v2/design-system/vue': resolve(__dirname, '../../packages/design-system/src/vue'),
        '@cvg-his-v2/design-system/src/vue': resolve(
          __dirname,
          '../../packages/design-system/src/vue'
        ),
        '@cvg-his-v2/design-system/src/tokens': resolve(
          __dirname,
          '../../packages/design-system/src/tokens'
        ),
        '@cvg-his-v2/shared-auth-sdk': resolve(
          __dirname,
          '../../packages/shared/auth-sdk/src/index.ts'
        ),
        '@cvg-his-v2/shared-config': resolve(
          __dirname,
          '../../packages/shared/config/src/index.ts'
        ),
        ...(isE2EVisualRuntime
          ? {
              'virtual:pwa-register/vue': resolve(
                __dirname,
                'src/test-support/pwa-register-disabled.ts'
              )
            }
          : {})
      }
    },
    server: {
      port: runtimeConfig.port,
      host: runtimeConfig.host,
      allowedHosts: ['tired-bugs-refuse.loca.lt', '.loca.lt'],
      proxy: {
        '/api': {
          target: runtimeConfig.proxyApiTarget,
          changeOrigin: true,
          ...(proxyAccountId
            ? {
                headers: {
                  'x-account-id': proxyAccountId
                }
              }
            : {}),
          rewrite: (path) => path.replace(/^\/api/, '')
        }
      }
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            'vue-vendor': ['vue', 'vue-router', 'pinia']
          }
        }
      }
    }
  };
});
