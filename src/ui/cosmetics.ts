import { AVATAR_IDS } from './avatars';

// Premi dei livelli: a ogni livello, dal 2 al 50, si sblocca qualcosa di nuovo.
// Avatar, cornici per l'avatar, sfondi del profilo e "pacchetti" delle carte.

export type RewardKind = 'avatar' | 'cornice' | 'sfondo' | 'pacchetto';

export interface Cosmetic {
  id: string;
  name: string;
  level: number;
}

export interface LevelReward {
  level: number;
  kind: RewardKind;
  id: string;
  name: string;
}

export const LEVEL_REWARDS: LevelReward[] = [
  { level: 2, kind: 'avatar', id: 'bassotto', name: 'Bassotto' },
  { level: 3, kind: 'cornice', id: 'foglie', name: 'Foglie' },
  { level: 4, kind: 'sfondo', id: 'prato', name: 'Prato' },
  { level: 5, kind: 'pacchetto', id: 'stelle', name: 'Notte di stelle' },
  { level: 6, kind: 'avatar', id: 'corgi', name: 'Corgi' },
  { level: 7, kind: 'cornice', id: 'stelle', name: 'Stelle' },
  { level: 8, kind: 'sfondo', id: 'tramonto', name: 'Tramonto' },
  { level: 9, kind: 'cornice', id: 'cuori', name: 'Cuori' },
  { level: 10, kind: 'avatar', id: 'gufo', name: 'Gufo' },
  { level: 11, kind: 'pacchetto', id: 'zampette', name: 'Zampette' },
  { level: 12, kind: 'sfondo', id: 'mare', name: 'Mare' },
  { level: 13, kind: 'cornice', id: 'bolle', name: 'Bolle' },
  { level: 14, kind: 'avatar', id: 'barboncino', name: 'Barboncino' },
  { level: 15, kind: 'cornice', id: 'arcobaleno', name: 'Arcobaleno' },
  { level: 16, kind: 'sfondo', id: 'bosco', name: 'Bosco' },
  { level: 17, kind: 'pacchetto', id: 'fiori', name: 'Fiori' },
  { level: 18, kind: 'avatar', id: 'pinguino', name: 'Pinguino' },
  { level: 19, kind: 'cornice', id: 'zampette', name: 'Zampette' },
  { level: 20, kind: 'sfondo', id: 'caramelle', name: 'Caramelle' },
  { level: 21, kind: 'cornice', id: 'fiori', name: 'Fiori' },
  { level: 22, kind: 'avatar', id: 'gatto-tigre', name: 'Tigrotto' },
  { level: 23, kind: 'pacchetto', id: 'onde', name: 'Onde' },
  { level: 24, kind: 'sfondo', id: 'zampette', name: 'Zampette' },
  { level: 25, kind: 'cornice', id: 'neve', name: 'Neve' },
  { level: 26, kind: 'avatar', id: 'volpe-artica', name: 'Volpe artica' },
  { level: 27, kind: 'cornice', id: 'oro', name: 'Oro' },
  { level: 28, kind: 'sfondo', id: 'citta', name: 'Città di notte' },
  { level: 29, kind: 'pacchetto', id: 'fuoco', name: 'Fuoco' },
  { level: 30, kind: 'avatar', id: 'lupo', name: 'Lupo' },
  { level: 31, kind: 'cornice', id: 'ghiaccio', name: 'Ghiaccio' },
  { level: 32, kind: 'sfondo', id: 'notte', name: 'Notte stellata' },
  { level: 33, kind: 'cornice', id: 'fiamma', name: 'Fiamma' },
  { level: 34, kind: 'avatar', id: 'gatto-pirata', name: 'Gatto pirata' },
  { level: 35, kind: 'pacchetto', id: 'ghiaccio', name: 'Ghiaccio' },
  { level: 36, kind: 'sfondo', id: 'aurora', name: 'Aurora' },
  { level: 37, kind: 'cornice', id: 'fulmine', name: 'Fulmine' },
  { level: 38, kind: 'avatar', id: 'leone', name: 'Leone' },
  { level: 39, kind: 'cornice', id: 'galassia', name: 'Galassia' },
  { level: 40, kind: 'sfondo', id: 'spazio', name: 'Spazio' },
  { level: 41, kind: 'pacchetto', id: 'galassia', name: 'Galassia' },
  { level: 42, kind: 'avatar', id: 'cane-astronauta', name: 'Cane astronauta' },
  { level: 43, kind: 'cornice', id: 'diamante', name: 'Diamante' },
  { level: 44, kind: 'avatar', id: 'gatto-mago', name: 'Gatto mago' },
  { level: 45, kind: 'sfondo', id: 'oro', name: 'Oro' },
  { level: 46, kind: 'avatar', id: 'unicorno', name: 'Unicorno' },
  { level: 47, kind: 'pacchetto', id: 'oro', name: 'Oro' },
  { level: 48, kind: 'avatar', id: 'drago', name: 'Drago' },
  { level: 49, kind: 'cornice', id: 'corona', name: 'Corona' },
  { level: 50, kind: 'avatar', id: 'gatto-re', name: 'Re dei gatti' },
];

export const KIND_NAMES: Record<RewardKind, string> = {
  avatar: 'Avatar',
  cornice: 'Cornice',
  sfondo: 'Sfondo del profilo',
  pacchetto: 'Pacchetto delle carte',
};

const fromTrack = (kind: RewardKind, base: Cosmetic): Cosmetic[] => [
  base,
  ...LEVEL_REWARDS.filter((r) => r.kind === kind).map((r) => ({ id: r.id, name: r.name, level: r.level })),
];

export const FRAMES = fromTrack('cornice', { id: 'base', name: 'Semplice', level: 1 });
export const BANNERS = fromTrack('sfondo', { id: 'nessuno', name: 'Semplice', level: 1 });
export const PACKS = fromTrack('pacchetto', { id: 'classico', name: 'Classico', level: 1 });

export const DEFAULT_FRAME = 'base';
export const DEFAULT_BANNER = 'nessuno';
export const DEFAULT_PACK = 'classico';

/** Livello a cui si sblocca un avatar (1 = subito). */
export function avatarLevel(id: string): number {
  return LEVEL_REWARDS.find((r) => r.kind === 'avatar' && r.id === id)?.level ?? 1;
}

/** Avatar in ordine: prima quelli liberi, poi quelli del percorso. */
export const AVATAR_LIST: Cosmetic[] = [
  ...AVATAR_IDS.filter((id) => avatarLevel(id) === 1).map((id) => ({ id, name: id, level: 1 })),
  ...LEVEL_REWARDS.filter((r) => r.kind === 'avatar').map((r) => ({ id: r.id, name: r.name, level: r.level })),
];

/** Id valido e sbloccato al livello dato, altrimenti quello di base. */
export function pickCosmetic(list: Cosmetic[], id: unknown, level: number): string {
  const c = list.find((x) => x.id === id);
  return c && c.level <= level ? c.id : list[0].id;
}

/** Avatar valido e sbloccato, altrimenti `fallback`. */
export function pickAvatar(id: unknown, level: number, fallback: string): string {
  return typeof id === 'string' && AVATAR_IDS.includes(id) && avatarLevel(id) <= level ? id : fallback;
}

/** Il premio di un livello (se c'è). */
export function rewardAt(level: number): LevelReward | undefined {
  return LEVEL_REWARDS.find((r) => r.level === level);
}

/** Il prossimo premio dopo il livello attuale. */
export function nextReward(level: number): LevelReward | undefined {
  return LEVEL_REWARDS.find((r) => r.level > level);
}
