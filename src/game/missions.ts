import { COATS } from '../data/cats';
import { rarityIndex, type CoatId, type Rarity, type Species } from '../data/types';
import { hashString, seededRandom } from './progress';

export type MissionType =
  | 'catch_any'
  | 'catch_cat'
  | 'catch_dog'
  | 'catch_rare'
  | 'catch_coat'
  | 'walk'
  | 'explore'
  | 'reencounter'
  | 'park'
  | 'new_entry';

export interface Mission {
  id: string;
  type: MissionType;
  target: number;
  progress: number;
  reward: number;
  coat?: CoatId;
}

export interface CaptureEvent {
  species: Species;
  rarity: Rarity;
  coat?: CoatId;
  reencounter: boolean;
  newEntry: boolean;
  inPark: boolean;
}

export const ALL_DONE_BONUS = 250;

export function missionDone(m: Mission): boolean {
  return m.progress >= m.target;
}

export function missionText(m: Mission): string {
  const n = m.target;
  switch (m.type) {
    case 'catch_any':
      return `Cattura ${n} animali`;
    case 'catch_cat':
      return n === 1 ? 'Cattura un gatto' : `Cattura ${n} gatti`;
    case 'catch_dog':
      return n === 1 ? 'Cattura un cane' : `Cattura ${n} cani`;
    case 'catch_rare':
      return 'Cattura un animale Non comune o più raro';
    case 'catch_coat': {
      const coat = COATS.find((c) => c.id === m.coat);
      return `Trova un gatto ${coat?.name.toLowerCase() ?? ''}`;
    }
    case 'walk':
      return `Cammina ${(n / 1000).toString().replace('.', ',')} km`;
    case 'explore':
      return `Esplora ${n} nuove zone della mappa`;
    case 'reencounter':
      return 'Rivedi un animale che conosci già';
    case 'park':
      return 'Cattura un animale in un parco';
    case 'new_entry':
      return "Scopri una nuova voce dell'album";
  }
}

export function missionIcon(type: MissionType): string {
  const icons: Record<MissionType, string> = {
    catch_any: '📸',
    catch_cat: '🐱',
    catch_dog: '🐶',
    catch_rare: '💎',
    catch_coat: '🎨',
    walk: '👟',
    explore: '🧭',
    reencounter: '💞',
    park: '🌳',
    new_entry: '📖',
  };
  return icons[type];
}

/** Genera le 3 sfide del giorno in modo deterministico dalla data. */
export function generateDailyMissions(day: string, animalsCount: number): Mission[] {
  const rnd = seededRandom(hashString(`zampe-${day}`));
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];

  const capture: Omit<Mission, 'id' | 'progress'>[] = [
    { type: 'catch_any', target: pick([2, 3, 4]), reward: 150 },
    { type: 'catch_cat', target: pick([1, 2]), reward: 150 },
    { type: 'catch_dog', target: pick([1, 2, 3]), reward: 150 },
  ];
  const move: Omit<Mission, 'id' | 'progress'>[] = [
    { type: 'walk', target: pick([1000, 1500, 2000, 3000]), reward: 150 },
    { type: 'explore', target: pick([3, 4, 5, 6]), reward: 150 },
  ];
  const commonCoats = COATS.filter((c) => rarityIndex(c.rarity) <= 1).map((c) => c.id);
  const special: Omit<Mission, 'id' | 'progress'>[] = [
    { type: 'catch_rare', target: 1, reward: 200 },
    { type: 'catch_coat', target: 1, reward: 200, coat: pick(commonCoats) },
    { type: 'park', target: 1, reward: 200 },
    { type: 'new_entry', target: 1, reward: 200 },
  ];
  if (animalsCount >= 3) special.push({ type: 'reencounter', target: 1, reward: 200 });

  return [pick(capture), pick(move), pick(special)].map((m, i) => ({ ...m, id: `${day}-${i}`, progress: 0 }));
}

function bump(m: Mission, by = 1): Mission {
  return missionDone(m) ? m : { ...m, progress: Math.min(m.target, m.progress + by) };
}

export function applyCaptureToMission(m: Mission, ev: CaptureEvent): Mission {
  switch (m.type) {
    case 'catch_any':
      return ev.reencounter ? m : bump(m);
    case 'catch_cat':
      return !ev.reencounter && ev.species === 'cat' ? bump(m) : m;
    case 'catch_dog':
      return !ev.reencounter && ev.species === 'dog' ? bump(m) : m;
    case 'catch_rare':
      return !ev.reencounter && rarityIndex(ev.rarity) >= 1 ? bump(m) : m;
    case 'catch_coat':
      return ev.species === 'cat' && ev.coat === m.coat ? bump(m) : m;
    case 'reencounter':
      return ev.reencounter ? bump(m) : m;
    case 'park':
      return ev.inPark ? bump(m) : m;
    case 'new_entry':
      return ev.newEntry ? bump(m) : m;
    default:
      return m;
  }
}

export function applyWalkToMission(m: Mission, meters: number): Mission {
  return m.type === 'walk' ? bump(m, meters) : m;
}

export function applyExploreToMission(m: Mission): Mission {
  return m.type === 'explore' ? bump(m) : m;
}
