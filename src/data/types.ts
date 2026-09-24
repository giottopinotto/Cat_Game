export type Species = 'cat' | 'dog';

export type Rarity = 'comune' | 'non_comune' | 'raro' | 'epico' | 'leggendario';

export const RARITIES: Rarity[] = ['comune', 'non_comune', 'raro', 'epico', 'leggendario'];

export const RARITY_INFO: Record<Rarity, { label: string; color: string; xp: number; pz: number }> = {
  comune: { label: 'Comune', color: '#8d99ae', xp: 50, pz: 100 },
  non_comune: { label: 'Non comune', color: '#2fb866', xp: 80, pz: 180 },
  raro: { label: 'Raro', color: '#3b82f6', xp: 150, pz: 300 },
  epico: { label: 'Epico', color: '#a855f7', xp: 300, pz: 500 },
  leggendario: { label: 'Leggendario', color: '#f5a800', xp: 600, pz: 800 },
};

export function rarityIndex(r: Rarity): number {
  return RARITIES.indexOf(r);
}

/** Statistiche di una carta: energia, coccole, furbizia (0-100). */
export type Stats = [number, number, number];

export const STAT_LABELS = ['Energia', 'Coccole', 'Furbizia'] as const;

export type CoatId =
  | 'tigrato'
  | 'tigrato_bianco'
  | 'bianco_nero'
  | 'rosso'
  | 'rosso_bianco'
  | 'nero'
  | 'grigio'
  | 'bianco'
  | 'tartarugato'
  | 'tricolore';

/** Una voce dell'album: una razza (o un mantello, per i gatti europei). */
export interface BreedEntry {
  id: string;
  species: Species;
  name: string;
  group: string;
  rarity: Rarity;
  fact: string;
  /** Etichette del modello AI (ImageNet) che corrispondono a questa voce. */
  labels?: string[];
  /** Solo gatti europei: il mantello rappresentato da questa voce. */
  coat?: CoatId;
  /** Statistiche base specifiche (altrimenti si usano quelle del gruppo). */
  base?: Stats;
}

export interface Encounter {
  at: number;
  lat: number;
  lng: number;
  place?: string;
  /** Catturato dentro un parco o un giardino. */
  park?: boolean;
  photoId: string;
}

/** Un singolo animale incontrato dal giocatore. */
export interface Animal {
  id: string;
  species: Species;
  entryId: string;
  name: string;
  rarity: Rarity;
  heterochromia?: boolean;
  stats: Stats;
  coverPhotoId: string;
  encounters: Encounter[];
  createdAt: number;
}
