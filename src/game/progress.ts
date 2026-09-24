import { baseStats, getEntry } from '../data/entries';
import { RARITY_INFO, type Animal, type BreedEntry, type Stats } from '../data/types';

// ---- Livelli del giocatore ------------------------------------------------

export const MAX_LEVEL = 50;

/** XP necessari per passare dal livello `level` al successivo. */
export function xpToNext(level: number): number {
  return 100 + (level - 1) * 60;
}

export function levelInfo(xp: number): { level: number; into: number; needed: number } {
  let level = 1;
  let rest = xp;
  while (level < MAX_LEVEL && rest >= xpToNext(level)) {
    rest -= xpToNext(level);
    level++;
  }
  const needed = xpToNext(level);
  // Al livello massimo la barra resta piena.
  return { level, into: level >= MAX_LEVEL ? needed : rest, needed };
}

const TITLES: [number, string][] = [
  [1, 'Principiante'],
  [5, 'Amico degli animali'],
  [10, 'Esploratore di quartiere'],
  [15, 'Segugio urbano'],
  [20, 'Collezionista esperto'],
  [30, 'Maestro delle zampe'],
  [40, 'Leggenda della città'],
  [50, 'Re e regina delle zampe'],
];

export function levelTitle(level: number): string {
  let title = TITLES[0][1];
  for (const [l, t] of TITLES) if (level >= l) title = t;
  return title;
}

// ---- Amicizia con un animale ---------------------------------------------

/** Giorni diversi di incontro necessari per ogni livello di amicizia (1-5). */
const FRIEND_DAYS = [1, 2, 4, 7, 12];
export const FRIEND_NAMES = ['Conoscente', 'Amico', 'Buon amico', 'Grande amico', 'Migliore amico'];

export function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function distinctDays(animal: Animal): number {
  return new Set(animal.encounters.map((e) => dayKey(e.at))).size;
}

export function friendshipLevel(animal: Animal): number {
  const days = distinctDays(animal);
  let lvl = 1;
  FRIEND_DAYS.forEach((d, i) => {
    if (days >= d) lvl = i + 1;
  });
  return lvl;
}

/** Giorni di incontro mancanti al prossimo livello di amicizia (null se al massimo). */
export function daysToNextFriendship(animal: Animal): number | null {
  const lvl = friendshipLevel(animal);
  if (lvl >= FRIEND_DAYS.length) return null;
  return FRIEND_DAYS[lvl] - distinctDays(animal);
}

// ---- Statistiche e Punti Zampa --------------------------------------------

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Generatore pseudo-casuale deterministico. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Statistiche individuali: base della razza ± variazione personale. */
export function makeStats(entry: BreedEntry, seed: string): Stats {
  const rnd = seededRandom(hashString(seed));
  const base = baseStats(entry);
  return base.map((v) => Math.max(8, Math.min(99, Math.round(v + (rnd() - 0.5) * 26)))) as Stats;
}

/** Punti Zampa: la "forza" della carta. Cresce con l'amicizia. */
export function pawPoints(animal: Animal): number {
  const base = RARITY_INFO[animal.rarity].pz;
  const avg = (animal.stats[0] + animal.stats[1] + animal.stats[2]) / 3;
  const friend = friendshipLevel(animal);
  return Math.round(base * (0.8 + avg / 250) * (1 + 0.15 * (friend - 1)));
}

export function entryOf(animal: Animal): BreedEntry | undefined {
  return getEntry(animal.entryId);
}
