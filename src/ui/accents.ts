// Colori principali che il giocatore può scegliere. Il lilla è quello di sempre
// (usa i valori esatti del foglio di stile); gli altri si calcolano da tonalità,
// saturazione e luminosità.

export interface Accent {
  id: string;
  name: string;
  /** Tonalità (0-360), saturazione e luminosità del colore principale. */
  h: number;
  s: number;
  l: number;
}

export const ACCENTS: Accent[] = [
  { id: 'lilla', name: 'Lilla', h: 262, s: 73, l: 70 },
  { id: 'rosa', name: 'Rosa', h: 332, s: 75, l: 66 },
  { id: 'corallo', name: 'Corallo', h: 6, s: 80, l: 65 },
  { id: 'arancio', name: 'Arancio', h: 26, s: 88, l: 60 },
  { id: 'oro', name: 'Oro', h: 40, s: 82, l: 52 },
  { id: 'menta', name: 'Menta', h: 165, s: 55, l: 46 },
  { id: 'azzurro', name: 'Azzurro', h: 205, s: 78, l: 58 },
  { id: 'indaco', name: 'Indaco', h: 232, s: 65, l: 64 },
];

export const DEFAULT_ACCENT = 'lilla';
export const ACCENT_IDS = ACCENTS.map((a) => a.id);

export function getAccent(id: string): Accent {
  return ACCENTS.find((a) => a.id === id) ?? ACCENTS[0];
}

export const hsl = (h: number, s: number, l: number, a = 1) => (a < 1 ? `hsla(${h}, ${s}%, ${l}%, ${a})` : `hsl(${h}, ${s}%, ${l}%)`);

/** Colore principale pronto da usare (anche fuori dal CSS, es. sulla mappa). */
export function accentColor(id: string): string {
  const a = getAccent(id);
  return id === DEFAULT_ACCENT ? '#9f7aea' : hsl(a.h, a.s, a.l);
}
