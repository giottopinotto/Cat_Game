// Genera icone e "manifest" dell'app per ogni colore principale (vedi src/ui/accents.ts).
// Il lilla usa le icone di sempre in public/icons; gli altri vanno in public/icons/<colore>/.
// Uso: node scripts/make-accent-assets.mjs [percorso-di-playwright]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(root, 'src/ui/accents.ts'), 'utf8');
const accents = [...src.matchAll(/\{ id: '([a-z]+)', name: '[^']+', h: (\d+), s: (\d+), l: (\d+) \}/g)].map((m) => ({
  id: m[1],
  h: +m[2],
}));
if (accents.length < 2) throw new Error('Colori non trovati in accents.ts');

const hsl = (h, s, l) => `hsl(${h}, ${s}%, ${l}%)`;
const colorsOf = (a) =>
  a.id === 'lilla'
    ? { top: '#c9b0fb', bottom: '#8b63e0', theme: '#9f7aea', bg: '#f8f4ff' }
    : { top: hsl(a.h, 90, 84), bottom: hsl(a.h, 67, 63), theme: hsl(a.h, 70, 62), bg: hsl(a.h, 100, 98) };

const favicon = readFileSync(join(root, 'public/favicon.svg'), 'utf8');
const paw = favicon.replace(/<rect[^>]*\/>/, '').replace(/<defs>.*<\/defs>/, '');

const { chromium } = await import(process.argv[2] ?? 'playwright');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const page = await browser.newPage();

const variants = [
  { file: 'icon-192.png', size: 192, bleed: false },
  { file: 'icon-512.png', size: 512, bleed: false },
  { file: 'icon-maskable-512.png', size: 512, bleed: true, scale: 0.72 },
  { file: 'apple-touch-icon.png', size: 180, bleed: true, scale: 0.85 },
];

for (const a of accents) {
  if (a.id === 'lilla') continue;
  const c = colorsOf(a);
  const dir = join(root, 'public/icons', a.id);
  mkdirSync(dir, { recursive: true });
  const svg = favicon.replace('#c9b0fb', c.top).replace('#8b63e0', c.bottom);
  writeFileSync(join(dir, 'favicon.svg'), svg);
  for (const v of variants) {
    const inner = v.bleed
      ? `<div style="width:${v.size}px;height:${v.size}px;background:linear-gradient(${c.top},${c.bottom});display:grid;place-items:center">
           <div style="width:${v.size * v.scale}px;height:${v.size * v.scale}px">${paw.replace('<svg', '<svg width="100%" height="100%"')}</div></div>`
      : `<div style="width:${v.size}px;height:${v.size}px">${svg.replace('<svg', '<svg width="100%" height="100%"')}</div>`;
    await page.setViewportSize({ width: v.size, height: v.size });
    await page.setContent(`<html><body style="margin:0;background:transparent">${inner}</body></html>`);
    writeFileSync(join(dir, v.file), await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: v.size, height: v.size } }));
  }
  // Stesso "id" del manifest principale: è sempre la stessa app, cambia solo l'aspetto.
  const manifest = {
    id: './',
    name: 'Zampe in Giro',
    short_name: 'Zampe',
    description: 'Cattura con la fotocamera i cani e i gatti veri che incontri per strada!',
    lang: 'it',
    theme_color: c.theme,
    background_color: c.bg,
    display: 'standalone',
    orientation: 'portrait',
    start_url: './',
    scope: './',
    icons: [
      { src: `icons/${a.id}/icon-192.png`, sizes: '192x192', type: 'image/png' },
      { src: `icons/${a.id}/icon-512.png`, sizes: '512x512', type: 'image/png' },
      { src: `icons/${a.id}/icon-maskable-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
  writeFileSync(join(root, `public/manifest-${a.id}.webmanifest`), JSON.stringify(manifest, null, 2) + '\n');
  console.log('ok', a.id);
}
await browser.close();
