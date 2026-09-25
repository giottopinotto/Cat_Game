import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import type { Plugin } from 'vite';

// Server esterni che l'app può contattare: solo quelli della mappa.
const MAP_HOSTS = 'https://tiles.openfreemap.org https://basemaps.cartocdn.com';

/**
 * Content Security Policy (solo nella versione pubblicata): il browser rifiuta
 * script, collegamenti e contenuti che non vengono dall'app o dai server della mappa.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "worker-src 'self' blob:",
  `connect-src 'self' data: blob: ${MAP_HOSTS}`,
  `img-src 'self' data: blob: ${MAP_HOSTS}`,
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "media-src 'self' blob: mediastream:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ');

function securityHeaders(): Plugin {
  return {
    name: 'security-meta',
    apply: 'build',
    transformIndexHtml: (html) =>
      html.replace(
        '<meta charset="UTF-8" />',
        `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />\n    <meta name="referrer" content="strict-origin" />`,
      ),
  };
}

// base "./" = percorsi relativi: l'app funziona in qualsiasi sottocartella
// (es. https://utente.github.io/Cat_Game/) senza configurazioni extra.
export default defineConfig({
  base: './',
  plugins: [
    react(),
    securityHeaders(),
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
            urlPattern: ({ url }) => url.hostname === 'tiles.openfreemap.org' || url.hostname === 'basemaps.cartocdn.com',
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
