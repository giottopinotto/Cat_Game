// Pagina di valutazione del riconoscimento (solo sviluppo, non inclusa nella build).
// Vedi eval/run.mjs.
import { LABEL_TO_ENTRY } from '../src/data/entries';
import { analyzePhoto } from '../src/vision/analyze';
import { loadVision } from '../src/vision/engine';
import { CAT_LABELS } from '../src/vision/labels';

async function toCanvas(url: string): Promise<HTMLCanvasElement> {
  const img = new Image();
  img.src = url;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  c.getContext('2d')!.drawImage(img, 0, 0);
  return c;
}

Object.assign(window, {
  ready: loadVision().then(() => true),
  /** Analizza un'immagine di cui si conosce l'etichetta ImageNet attesa. */
  async evalOne(url: string, label: string) {
    const t0 = performance.now();
    const a = await analyzePhoto(await toCanvas(url));
    const species = CAT_LABELS.includes(label) ? 'cat' : 'dog';
    const expected = LABEL_TO_ENTRY.get(label)?.id ?? null;
    return {
      label,
      ms: Math.round(performance.now() - t0),
      speciesOk: a?.species === species,
      expected,
      suggested: a?.suggested ?? null,
      inSuggestions: !!expected && !!a?.suggestions.some((s) => s.entryId === expected),
      coat: a?.coat,
    };
  },
});
