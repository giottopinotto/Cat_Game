import type { Box } from './engine';

/** Fotogramma attuale della fotocamera in un canvas a piena risoluzione. */
export function grabFrame(video: HTMLVideoElement): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = video.videoWidth;
  c.height = video.videoHeight;
  c.getContext('2d')!.drawImage(video, 0, 0, c.width, c.height);
  return c;
}

/**
 * Nitidezza della parte centrale dell'immagine (varianza del laplaciano):
 * più è alta, meno la foto è mossa o sfocata.
 */
export function sharpness(src: HTMLCanvasElement): number {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  // Si guarda il 60% centrale, dove di solito c'è l'animale.
  const sw = src.width * 0.6;
  const sh = src.height * 0.6;
  ctx.drawImage(src, src.width * 0.2, src.height * 0.2, sw, sh, 0, 0, size, size);
  const d = ctx.getImageData(0, 0, size, size).data;
  const g = new Float32Array(size * size);
  for (let i = 0; i < g.length; i++) g[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
  let sum = 0;
  let sum2 = 0;
  let n = 0;
  for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
      const i = y * size + x;
      const l = g[i - 1] + g[i + 1] + g[i - size] + g[i + size] - 4 * g[i];
      sum += l;
      sum2 += l * l;
      n++;
    }
  }
  const mean = sum / n;
  return sum2 / n - mean * mean;
}

/** Sotto questa nitidezza la foto è probabilmente mossa. */
export const BLURRY = 25;

/** Rettangolo con proporzioni `aspect` (larghezza/altezza) centrato sull'animale, dentro la foto. */
export function framing(W: number, H: number, box: Box, aspect: number, margin: number): Box {
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  let w = Math.max(box.w * margin, box.h * margin * aspect);
  let h = w / aspect;
  if (w > W) {
    w = W;
    h = w / aspect;
  }
  if (h > H) {
    h = H;
    w = h * aspect;
  }
  const x = Math.min(Math.max(0, cx - w / 2), W - w);
  const y = Math.min(Math.max(0, cy - h / 2), H - h);
  return { x, y, w, h };
}

function toBlob(c: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    c.toBlob((b) => (b ? resolve(b) : reject(new Error('Impossibile salvare la foto'))), 'image/jpeg', quality),
  );
}

function render(src: HTMLCanvasElement, r: Box, outW: number, outH: number): HTMLCanvasElement {
  const scale = Math.min(1, outW / r.w);
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(r.w * scale));
  c.height = Math.max(1, Math.round((r.w * scale * outH) / outW));
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, r.x, r.y, r.w, r.h, 0, 0, c.width, c.height);
  return c;
}

/** Immagine per la carta (verticale 4:5) e miniatura quadrata. */
export async function makePhotos(photo: HTMLCanvasElement, box: Box): Promise<{ card: Blob; thumb: Blob; cardUrl: string }> {
  const cardRect = framing(photo.width, photo.height, box, 0.8, 1.3);
  const thumbRect = framing(photo.width, photo.height, box, 1, 1.12);
  const cardCanvas = render(photo, cardRect, 720, 900);
  const [card, thumb] = await Promise.all([toBlob(cardCanvas, 0.86), toBlob(render(photo, thumbRect, 256, 256), 0.8)]);
  return { card, thumb, cardUrl: URL.createObjectURL(card) };
}
