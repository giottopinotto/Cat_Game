// Valuta il riconoscimento su immagini di esempio etichettate (una per razza ImageNet).
//
//   git clone --depth 1 https://github.com/EliSchwartz/imagenet-sample-images /tmp/imagenet
//   npm run dev                        # in un altro terminale
//   IMAGES=/tmp/imagenet node eval/run.mjs
//
// Variabili: IMAGES (cartella immagini), URL (server di sviluppo), PLAYWRIGHT (modulo), CHROMIUM (eseguibile).
import { readdirSync, readFileSync } from 'node:fs';

const dir = process.env.IMAGES ?? '/tmp/imagenet';
const url = process.env.URL ?? 'http://localhost:5173/eval/vision.html';
const { chromium } = await import(process.env.PLAYWRIGHT ?? 'playwright');
const { DOG_LABELS, CAT_LABELS } = await import('../src/vision/labels.ts').catch(() => ({ DOG_LABELS: null, CAT_LABELS: null }));

const wanted = new Set([...(DOG_LABELS ?? []), ...(CAT_LABELS ?? [])]);
const files = readdirSync(dir)
  .filter((f) => /\.jpe?g$/i.test(f))
  .map((f) => ({ f, label: f.replace(/^n\d+_/, '').replace(/\.jpe?g$/i, '').replace(/_/g, ' ') }))
  .filter(({ label }) => !wanted.size || wanted.has(label));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM });
const page = await browser.newPage();
await page.route('**/evalimg/**', (route) =>
  route.fulfill({ body: readFileSync(`${dir}/${decodeURIComponent(route.request().url().split('/evalimg/')[1])}`), contentType: 'image/jpeg' }),
);
await page.goto(url);
await page.evaluate(() => window.ready);

const results = [];
for (const { f, label } of files) results.push(await page.evaluate(([u, l]) => window.evalOne(u, l), [`/evalimg/${encodeURIComponent(f)}`, label]));
await browser.close();

const dogs = results.filter((r) => r.expected?.startsWith('dog-'));
const pct = (n, d) => `${n}/${d} (${Math.round((n / d) * 100)}%)`;
console.log(`Specie corretta:        ${pct(results.filter((r) => r.speciesOk).length, results.length)}`);
console.log(`Razza proposta giusta:  ${pct(dogs.filter((r) => r.suggested === r.expected).length, dogs.length)}`);
console.log(`Razza tra i suggeriti:  ${pct(dogs.filter((r) => r.inSuggestions).length, dogs.length)}`);
console.log(`Tempo medio:            ${Math.round(results.reduce((s, r) => s + r.ms, 0) / results.length)} ms`);
for (const r of results.filter((r) => !r.speciesOk || (r.expected?.startsWith('dog-') && r.suggested !== r.expected)))
  console.log(`  ✗ ${r.label} → ${r.suggested}`);
