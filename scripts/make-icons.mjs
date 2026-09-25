// Genera le icone PNG dell'app partendo dal logo SVG (serve Playwright/Chromium).
// Uso: node scripts/make-icons.mjs [percorso-di-playwright]
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { chromium } = await import(process.argv[2] ?? 'playwright');
const svg = readFileSync(join(root, 'public/favicon.svg'), 'utf8');
const paw = svg.replace(/<rect[^>]*\/>/, '').replace(/<defs>.*<\/defs>/, '');

// "full": logo con angoli arrotondati; "bleed": sfondo pieno (icone maskable e Apple).
const variants = [
  { file: 'icon-192.png', size: 192, bleed: false },
  { file: 'icon-512.png', size: 512, bleed: false },
  { file: 'icon-maskable-512.png', size: 512, bleed: true, scale: 0.72 },
  { file: 'apple-touch-icon.png', size: 180, bleed: true, scale: 0.85 },
];

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const page = await browser.newPage();
for (const v of variants) {
  const inner = v.bleed
    ? `<div style="width:${v.size}px;height:${v.size}px;background:linear-gradient(#c9b0fb,#8b63e0);display:grid;place-items:center">
         <div style="width:${v.size * v.scale}px;height:${v.size * v.scale}px">${paw.replace('<svg', '<svg width="100%" height="100%"')}</div></div>`
    : `<div style="width:${v.size}px;height:${v.size}px">${svg.replace('<svg', '<svg width="100%" height="100%"')}</div>`;
  await page.setViewportSize({ width: v.size, height: v.size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${inner}</body></html>`);
  const png = await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: v.size, height: v.size } });
  writeFileSync(join(root, 'public/icons', v.file), png);
  console.log('ok', v.file);
}
await browser.close();
