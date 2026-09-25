export interface BadgeSummary {
  cats: number;
  dogs: number;
  entries: number;
  zones: number;
  km: number;
  maxFriend: number;
  bestRarity: number;
  coats: number;
  night: number;
  streakBest: number;
  park: number;
}

export interface BadgeDef {
  id: string;
  name: string;
  tiers: [number, number, number];
  unit: string;
  metric: (s: BadgeSummary) => number;
  /** Testo personalizzato per ogni livello (altrimenti "N unit"). */
  tierText?: (n: number) => string;
  /** Obiettivo in breve, per le medaglie in cui "valore / obiettivo" non ha senso. */
  goal?: (n: number) => string;
}

export const TIER_NAMES = ['Bronzo', 'Argento', 'Oro'];
export const TIER_COLORS = ['#cd7f32', '#a9b4c2', '#f5b400'];
export const TIER_XP = [50, 100, 200];

const RARITY_NAMES = ['Comune', 'Non comune', 'Raro', 'Epico', 'Leggendario'];

export const BADGES: BadgeDef[] = [
  { id: 'gattaro', name: 'Gattaro', tiers: [1, 10, 50], unit: 'gatti catturati', metric: (s) => s.cats },
  { id: 'cinofilo', name: 'Cinofilo', tiers: [1, 10, 50], unit: 'cani catturati', metric: (s) => s.dogs },
  { id: 'collezionista', name: 'Collezionista', tiers: [5, 20, 50], unit: "voci dell'album", metric: (s) => s.entries },
  { id: 'esploratore', name: 'Esploratore', tiers: [10, 50, 200], unit: 'zone esplorate', metric: (s) => s.zones },
  { id: 'camminatore', name: 'Camminatore', tiers: [5, 25, 100], unit: 'km percorsi', metric: (s) => Math.floor(s.km) },
  {
    id: 'amico',
    name: 'Amico fedele',
   
    tiers: [2, 3, 5],
    unit: 'livello di amicizia',
    metric: (s) => s.maxFriend,
    tierText: (n) => `Un animale al livello di amicizia ${n}`,
    goal: (n) => `Amicizia ${n}`,
  },
  {
    id: 'rarita',
    name: 'Cacciatore di rarità',
   
    tiers: [2, 3, 4],
    unit: 'rarità',
    metric: (s) => s.bestRarity,
    tierText: (n) => `Cattura un animale ${RARITY_NAMES[n]}`,
    goal: (n) => `Trova un ${RARITY_NAMES[n]}`,
  },
  { id: 'arcobaleno', name: 'Arcobaleno', tiers: [3, 6, 10], unit: 'mantelli di gatto diversi', metric: (s) => s.coats },
  { id: 'nottambulo', name: 'Nottambulo', tiers: [1, 5, 20], unit: 'catture di notte (21-5)', metric: (s) => s.night },
  { id: 'costanza', name: 'Costanza', tiers: [3, 7, 30], unit: 'giorni di fila', metric: (s) => s.streakBest },
  { id: 'parco', name: 'Amico dei parchi', tiers: [1, 10, 30], unit: 'catture nei parchi', metric: (s) => s.park },
];

export function tierText(b: BadgeDef, tier: number): string {
  const n = b.tiers[tier];
  return b.tierText ? b.tierText(n) : `${n} ${b.unit}`;
}

/** Livello raggiunto (0 = nessuno, 3 = oro). */
export function badgeTier(b: BadgeDef, s: BadgeSummary): number {
  const v = b.metric(s);
  return b.tiers.filter((t) => v >= t).length;
}
