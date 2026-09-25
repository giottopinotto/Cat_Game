import type { CoatId } from '../data/types';

// Stima del mantello di un gatto dai colori dei pixel al centro del riquadro.
// È un'euristica: l'app propone il risultato e il giocatore lo conferma.

export interface CoatColors {
  white: number;
  black: number;
  orange: number;
  grey: number;
  brown: number;
}

type ColorName = keyof CoatColors;

function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, max === 0 ? 0 : d / max, max / 255];
}

export function colorOf(r: number, g: number, b: number): ColorName | null {
  const [h, s, v] = rgbToHsv(r, g, b);
  if (v < 0.2) return 'black';
  if (s < 0.14) return v > 0.7 ? 'white' : 'grey';
  if (v > 0.8 && s < 0.2) return 'white';
  const warm = h >= 8 && h <= 50;
  if (warm && s >= 0.42 && v >= 0.38) return 'orange';
  if (warm || (h > 50 && h <= 65 && s < 0.4)) return v < 0.28 ? 'black' : 'brown';
  if (s < 0.25) return v > 0.7 ? 'white' : 'grey';
  return null; // verde, blu...: probabilmente sfondo
}

/**
 * Proporzioni dei colori dentro un'ellisse centrata sull'immagine, pesando di
 * più i pixel centrali (i bordi del riquadro contengono spesso sfondo).
 */
export function coatColors(data: Uint8ClampedArray, width: number, height: number): CoatColors {
  const acc: CoatColors = { white: 0, black: 0, orange: 0, grey: 0, brown: 0 };
  let total = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const nx = (x + 0.5) / width - 0.5;
      const ny = (y + 0.5) / height - 0.5;
      const d = (nx * nx) / 0.16 + (ny * ny) / 0.16; // ellisse che occupa ~80% del riquadro
      if (d > 1) continue;
      const i = (y * width + x) * 4;
      const c = colorOf(data[i], data[i + 1], data[i + 2]);
      if (!c) continue;
      const w = 1.5 - d;
      acc[c] += w;
      total += w;
    }
  }
  if (total > 0) for (const k of Object.keys(acc) as ColorName[]) acc[k] /= total;
  return acc;
}

/** Dalle proporzioni dei colori al mantello più probabile. */
export function coatFromColors(c: CoatColors): CoatId {
  const { white: W, black: K, orange: O, grey: G, brown: B } = c;
  if (O > 0.12 && K > 0.12 && W > 0.15) return 'tricolore';
  // Tartarugato: chiazze rosse e nere, poco marrone (il soriano ha invece molto marrone).
  if (O > 0.22 && K > 0.25 && B < 0.3 && W < 0.15) return 'tartarugato';
  if (O > 0.3) return W > 0.18 ? 'rosso_bianco' : 'rosso';
  if (W > 0.65) return 'bianco';
  if (K > 0.6 && W < 0.12) return 'nero';
  if (K > 0.25 && W > 0.22 && B + G < 0.35 && O < 0.1) return 'bianco_nero';
  // Grigio "tinta unita": se ci sono strisce scure è un tigrato grigio.
  if (G > 0.5 && K < 0.15 && B < 0.2) return 'grigio';
  return W > 0.2 ? 'tigrato_bianco' : 'tigrato';
}

/** Proporzioni dei colori contando solo i pixel che la maschera indica come "gatto". */
export function coatColorsMasked(data: Uint8ClampedArray, mask: Uint8Array, cls: number): CoatColors | null {
  const acc: CoatColors = { white: 0, black: 0, orange: 0, grey: 0, brown: 0 };
  let inMask = 0;
  let total = 0;
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] !== cls) continue;
    inMask++;
    const c = colorOf(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
    if (!c) continue;
    acc[c]++;
    total++;
  }
  // Maschera troppo piccola: meglio il metodo classico.
  if (inMask < mask.length * 0.08 || total === 0) return null;
  for (const k of Object.keys(acc) as ColorName[]) acc[k] /= total;
  return acc;
}

/**
 * Analizza un canvas (già ritagliato sul gatto). Se c'è la maschera della
 * sagoma usa solo il pelo del gatto, altrimenti un'ellisse al centro.
 */
export function coatFromCanvas(
  canvas: HTMLCanvasElement,
  masker?: (c: HTMLCanvasElement) => Uint8Array | null,
  cls = 8,
): { coat: CoatId; colors: CoatColors; masked: boolean } {
  const size = 96;
  const small = document.createElement('canvas');
  small.width = size;
  small.height = size;
  const ctx = small.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(canvas, 0, 0, size, size);
  const data = ctx.getImageData(0, 0, size, size).data;
  let mask: Uint8Array | null = null;
  try {
    mask = masker?.(small) ?? null;
  } catch {
    mask = null;
  }
  const masked = mask && mask.length === size * size ? coatColorsMasked(data, mask, cls) : null;
  const colors = masked ?? coatColors(data, size, size);
  return { coat: coatFromColors(colors), colors, masked: !!masked };
}
