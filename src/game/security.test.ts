import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { importBackup } from './backup';
import { loadAnimals, wipeAll } from './db';
import { tooFast, type Fix } from './location';

const PNG = 'data:image/png;base64,iVBORw0KGgo=';
const fix = (speed: number | null): Fix => ({ lat: 45, lng: 9, accuracy: 10, heading: null, speed, at: Date.now() });

function backupFile(animals: unknown[], photos: unknown[], player: unknown = {}) {
  return new File([JSON.stringify({ app: 'zampe-in-giro', version: 1, exportedAt: 0, player, animals, photos })], 'b.json');
}

const good = {
  id: 'a1',
  species: 'cat',
  entryId: 'cat-eu-nero',
  name: 'Salem',
  rarity: 'non_comune',
  stats: [50, 60, 70],
  coverPhotoId: 'p1',
  createdAt: 1,
  encounters: [{ at: 1, lat: 45, lng: 9, photoId: 'p1' }],
};

beforeEach(() => wipeAll());

describe('ripristino del backup', () => {
  it('scarta gli animali malformati e corregge i valori strani', async () => {
    const n = await importBackup(
      backupFile(
        [
          { ...good, rarity: 'super-mega', name: 'x'.repeat(500), stats: [999, -5, 'a'] },
          { ...good, id: 'a2', entryId: 'cane-inventato' },
          { ...good, id: 'a3', species: 'dog' },
          { ...good, id: '<img onerror=alert(1)>' },
          { ...good, id: 'a4', encounters: [{ at: 1, lat: 999, lng: 9, photoId: 'p1' }] },
        ],
        [{ id: 'p1', card: PNG, thumb: PNG }],
        { xp: 'tanti', name: 42 },
      ),
    );
    expect(n).toBe(1);
    const [a] = await loadAnimals();
    expect(a.rarity).toBe('non_comune');
    expect(a.name.length).toBeLessThanOrEqual(64);
    expect(a.stats).toEqual([100, 0, 50]);
  });

  it('rifiuta foto che non sono immagini incorporate', async () => {
    await expect(importBackup(backupFile([good], [{ id: 'p1', card: 'https://esempio.it/x.png', thumb: PNG }]))).rejects.toThrow();
    await expect(importBackup(backupFile([good], [{ id: 'p1', card: 'data:text/html;base64,PHNjcmlwdD4=', thumb: PNG }]))).rejects.toThrow();
  });

  it('rifiuta file che non sono backup del gioco', async () => {
    await expect(importBackup(new File(['ciao'], 'x.json'))).rejects.toThrow();
    await expect(importBackup(new File([JSON.stringify({ app: 'altro' })], 'x.json'))).rejects.toThrow();
  });
});

describe('blocco in movimento', () => {
  it('niente catture sopra i ~25 km/h', () => {
    expect(tooFast(fix(1.4))).toBe(false); // a piedi
    expect(tooFast(fix(null))).toBe(false); // velocità sconosciuta
    expect(tooFast(fix(14))).toBe(true); // in auto
  });
});
