import { getEntry } from '../data/entries';
import { rarityIndex, type Animal } from '../data/types';
import type { BadgeSummary } from './badges';
import { dayKey, friendshipLevel } from './progress';

/** Giorno successivo in formato AAAA-MM-GG (a mezzogiorno, per evitare problemi con l'ora legale). */
function nextDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d + 1, 12).getTime());
}

/** Serie più lunga e serie attuale di giorni consecutivi con almeno un incontro. */
export function streaks(days: string[], today: string): { best: number; current: number } {
  const sorted = [...new Set(days)].sort();
  let best = 0;
  let run = 0;
  let prev = '';
  for (const d of sorted) {
    run = prev && nextDay(prev) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  // La serie attuale conta se l'ultimo giorno attivo è oggi o ieri.
  const alive = prev === today || nextDay(prev) === today;
  return { best, current: alive ? run : 0 };
}

export function isNight(ts: number): boolean {
  const h = new Date(ts).getHours();
  return h >= 21 || h < 5;
}

export function badgeSummary(animals: Animal[], zones: number, walkedM: number, activeDays: string[], today: string): BadgeSummary {
  const entries = new Set<string>();
  const coats = new Set<string>();
  let cats = 0;
  let dogs = 0;
  let maxFriend = 0;
  let bestRarity = -1;
  let night = 0;
  let park = 0;
  for (const a of animals) {
    if (a.species === 'cat') cats++;
    else dogs++;
    entries.add(a.entryId);
    const coat = getEntry(a.entryId)?.coat;
    if (coat) coats.add(coat);
    maxFriend = Math.max(maxFriend, friendshipLevel(a));
    bestRarity = Math.max(bestRarity, rarityIndex(a.rarity));
    for (const e of a.encounters) {
      if (isNight(e.at)) night++;
      if (e.park) park++;
    }
  }
  return {
    cats,
    dogs,
    entries: entries.size,
    zones,
    km: walkedM / 1000,
    maxFriend,
    bestRarity,
    coats: coats.size,
    night,
    streakBest: streaks(activeDays, today).best,
    park,
  };
}
