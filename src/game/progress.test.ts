import { describe, expect, it } from 'vitest';
import { getEntry } from '../data/entries';
import type { Animal } from '../data/types';
import { friendshipLevel, levelInfo, makeStats, pawPoints, xpToNext } from './progress';

function animal(days: number[]): Animal {
  return {
    id: 'a',
    species: 'cat',
    entryId: 'cat-eu-tigrato',
    name: 'Micio',
    rarity: 'comune',
    stats: [50, 50, 50],
    coverPhotoId: 'p',
    createdAt: 0,
    encounters: days.map((d) => ({ at: new Date(2026, 0, d, 12).getTime(), lat: 0, lng: 0, photoId: `p${d}` })),
  };
}

describe('livelli', () => {
  it('parte dal livello 1', () => {
    expect(levelInfo(0)).toEqual({ level: 1, into: 0, needed: xpToNext(1) });
  });

  it('sale di livello esattamente alla soglia', () => {
    expect(levelInfo(xpToNext(1) - 1).level).toBe(1);
    expect(levelInfo(xpToNext(1)).level).toBe(2);
    expect(levelInfo(xpToNext(1) + xpToNext(2)).level).toBe(3);
  });

  it('non supera il livello massimo', () => {
    expect(levelInfo(10_000_000).level).toBe(50);
  });
});

describe('amicizia', () => {
  it('conta i giorni diversi, non gli incontri', () => {
    expect(friendshipLevel(animal([1]))).toBe(1);
    expect(friendshipLevel(animal([1, 1, 1]))).toBe(1);
    expect(friendshipLevel(animal([1, 2]))).toBe(2);
    expect(friendshipLevel(animal([1, 2, 3, 4]))).toBe(3);
    expect(friendshipLevel(animal(Array.from({ length: 12 }, (_, i) => i + 1)))).toBe(5);
  });

  it('i Punti Zampa crescono con l\'amicizia', () => {
    expect(pawPoints(animal([1, 2]))).toBeGreaterThan(pawPoints(animal([1])));
  });
});

describe('statistiche', () => {
  it('sono deterministiche e tra 8 e 99', () => {
    const e = getEntry('dog-labrador')!;
    const a = makeStats(e, 'seme');
    expect(makeStats(e, 'seme')).toEqual(a);
    for (const v of a) {
      expect(v).toBeGreaterThanOrEqual(8);
      expect(v).toBeLessThanOrEqual(99);
    }
  });
});
