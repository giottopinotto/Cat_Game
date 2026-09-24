import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// base "./" = percorsi relativi: l'app funziona in qualsiasi sottocartella
// (es. https://utente.github.io/Cat_Game/) senza configurazioni extra.
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Zampe in Giro',
        short_name: 'Zampe',
        description: 'Cattura con la fotocamera i cani e i gatti veri che incontri per strada!',
        lang: 'it',
        theme_color: '#ff8a3d',
        background_color: '#fff6ea',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Solo i caratteri latini servono all'italiano; il resto si scarica se serve.
        globIgnores: ['**/mediapipe/**', '**/models/**', '**/fredoka-hebrew*', '**/fredoka-latin-ext*'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            // Modelli AI e runtime wasm: grandi, si scaricano una volta sola.
            urlPattern: ({ url }) => /\/(models|mediapipe)\//.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'ai-models',
              expiration: { maxEntries: 12 },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            // Stile, tile vettoriali, font e icone della mappa (OpenFreeMap).
            urlPattern: ({ url }) => url.hostname === 'tiles.openfreemap.org',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'map-tiles',
              expiration: { maxEntries: 4000, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  worker: {
    format: 'es',
  },
  build: {
    chunkSizeWarningLimit: 1500,
  },
});
