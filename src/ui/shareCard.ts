import { getEntry, SPECIES_NAME } from '../data/entries';
import { RARITY_INFO, STAT_LABELS, type Animal } from '../data/types';
import { getPhoto } from '../game/db';
import { pawPoints } from '../game/progress';

// Disegna la carta dell'animale in un'immagine PNG da condividere.

const W = 900;
const H = 1300;

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

async function loadImage(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

export async function renderCardImage(animal: Animal): Promise<Blob> {
  const rec = await getPhoto(animal.coverPhotoId);
  const entry = getEntry(animal.entryId);
  const color = RARITY_INFO[animal.rarity].color;
  await Promise.all(['700 64px Fredoka', '500 34px Fredoka'].map((f) => document.fonts?.load(f).catch(() => null)));

  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;

  // Cornice colorata della rarità.
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.25, color);
  g.addColorStop(1, color);
  roundRect(ctx, 0, 0, W, H, 60);
  ctx.fillStyle = g;
  ctx.fill();
  roundRect(ctx, 22, 22, W - 44, H - 44, 44);
  ctx.fillStyle = '#fffdff';
  ctx.fill();

  // Foto.
  const px = 22;
  const py = 22;
  const pw = W - 44;
  const ph = 800;
  ctx.save();
  roundRect(ctx, px, py, pw, ph, 44);
  ctx.clip();
  if (rec) {
    const img = await loadImage(rec.card);
    const s = Math.max(pw / img.naturalWidth, ph / img.naturalHeight);
    const iw = img.naturalWidth * s;
    const ih = img.naturalHeight * s;
    ctx.drawImage(img, px + (pw - iw) / 2, py + (ph - ih) / 2, iw, ih);
  }
  ctx.restore();

  // Punti Zampa.
  ctx.font = '700 38px Fredoka, sans-serif';
  const pz = `${pawPoints(animal)} PZ`;
  const pzW = ctx.measureText(pz).width + 44;
  roundRect(ctx, 50, 50, pzW, 64, 32);
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fill();
  ctx.fillStyle = '#2a2440';
  ctx.fillText(pz, 72, 96);

  // Testi.
  ctx.fillStyle = '#2a2440';
  ctx.font = '700 72px Fredoka, sans-serif';
  ctx.fillText(`${SPECIES_NAME[animal.species].emoji} ${animal.name}`, 60, 910, W - 120);
  ctx.font = '500 36px Fredoka, sans-serif';
  ctx.fillStyle = '#6f6a86';
  ctx.fillText(entry?.name ?? '', 60, 962, W - 120);

  // Rarità.
  const label = RARITY_INFO[animal.rarity].label;
  ctx.font = '600 32px Fredoka, sans-serif';
  const rw = ctx.measureText(label).width + 48;
  roundRect(ctx, W - 60 - rw, 874, rw, 54, 27);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillText(label, W - 60 - rw + 24, 912);

  // Statistiche.
  STAT_LABELS.forEach((l, i) => {
    const y = 1010 + i * 62;
    ctx.fillStyle = '#2a2440';
    ctx.font = '500 32px Fredoka, sans-serif';
    ctx.fillText(l, 60, y + 24);
    roundRect(ctx, 250, y, 480, 26, 13);
    ctx.fillStyle = '#ede6f7';
    ctx.fill();
    roundRect(ctx, 250, y, (480 * animal.stats[i]) / 100, 26, 13);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.fillStyle = '#2a2440';
    ctx.font = '700 32px Fredoka, sans-serif';
    ctx.fillText(String(animal.stats[i]), 760, y + 24);
  });

  ctx.fillStyle = '#b3a99c';
  ctx.font = '500 30px Fredoka, sans-serif';
  ctx.fillText('🐾 Zampe in Giro', 60, H - 58);

  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('png'))), 'image/png'));
}

/** Condivide l'immagine (se possibile) oppure la scarica. */
export async function shareAnimal(animal: Animal): Promise<void> {
  const blob = await renderCardImage(animal);
  const file = new File([blob], `${animal.name.replace(/[^\p{L}\p{N}]+/gu, '_')}.png`, { type: 'image/png' });
  const text = `Guarda chi ho incontrato su Zampe in Giro: ${animal.name}!`;
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: animal.name, text });
      return;
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return;
    }
  }
  downloadBlob(blob, file.name);
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
