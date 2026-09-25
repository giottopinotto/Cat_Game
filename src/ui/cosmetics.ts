// Cornici dell'avatar e sfondi del profilo: si sbloccano salendo di livello.

export interface Cosmetic {
  id: string;
  name: string;
  level: number;
}

export const FRAMES: Cosmetic[] = [
  { id: 'base', name: 'Semplice', level: 1 },
  { id: 'foglie', name: 'Foglie', level: 3 },
  { id: 'stelle', name: 'Stelle', level: 5 },
  { id: 'arcobaleno', name: 'Arcobaleno', level: 8 },
  { id: 'fiori', name: 'Fiori', level: 12 },
  { id: 'oro', name: 'Oro', level: 16 },
  { id: 'fiamma', name: 'Fiamma', level: 20 },
  { id: 'galassia', name: 'Galassia', level: 30 },
  { id: 'corona', name: 'Corona', level: 40 },
];

export const BANNERS: Cosmetic[] = [
  { id: 'nessuno', name: 'Semplice', level: 1 },
  { id: 'prato', name: 'Prato', level: 2 },
  { id: 'tramonto', name: 'Tramonto', level: 6 },
  { id: 'mare', name: 'Mare', level: 10 },
  { id: 'zampette', name: 'Zampette', level: 14 },
  { id: 'notte', name: 'Notte stellata', level: 18 },
  { id: 'aurora', name: 'Aurora', level: 25 },
  { id: 'oro', name: 'Oro', level: 35 },
];

export const DEFAULT_FRAME = 'base';
export const DEFAULT_BANNER = 'nessuno';

/** Id valido e sbloccato al livello dato, altrimenti quello di base. */
export function pickCosmetic(list: Cosmetic[], id: unknown, level: number): string {
  const c = list.find((x) => x.id === id);
  return c && c.level <= level ? c.id : list[0].id;
}

/** Cose sbloccate esattamente a questo livello (per il festeggiamento). */
export function unlockedAt(level: number): { kind: 'cornice' | 'sfondo'; item: Cosmetic }[] {
  return [
    ...FRAMES.filter((f) => f.level === level && f.level > 1).map((item) => ({ kind: 'cornice' as const, item })),
    ...BANNERS.filter((b) => b.level === level && b.level > 1).map((item) => ({ kind: 'sfondo' as const, item })),
  ];
}
