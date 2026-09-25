import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Animal } from '../data/types';
import { importBackup } from './backup';
import { wipeAll } from './db';
import { activeEvents, eventBonus, upcomingEvents } from './events';
import { cleanText, decodeCard, encodeCard } from './friends';
import { distanceM } from './geo';
import { inHome, makeHomeZone, privatize } from './privacy';
import { useGame, type CaptureDraft } from './store';
import { backupDue } from '../ui/backupActions';

const animal: Animal = {
  id: 'abc-123',
  species: 'cat',
  entryId: 'cat-eu-nero',
  name: 'Salem',
  rarity: 'non_comune',
  stats: [50, 50, 50],
  coverPhotoId: 'p1',
  encounters: [{ at: 1, lat: 45, lng: 9, photoId: 'p1' }],
  createdAt: 1,
};

const qr = (arr: unknown[]) => 'ZIG1:' + JSON.stringify(arr);

describe('carte degli amici (QR)', () => {
  it('codifica e rilegge una carta, senza posizione né foto', () => {
    const text = encodeCard(animal, 'Giulia', 'gatto-rosso');
    expect(text).not.toContain('45');
    expect(text).not.toContain('p1');
    const card = decodeCard(text)!;
    expect(card.from).toBe('Giulia');
    expect(card.name).toBe('Salem');
    expect(card.rarity).toBe('non_comune');
    expect(card.species).toBe('cat');
  });

  it('rarità e statistiche non si possono falsificare', () => {
    const a = decodeCard(qr(['X', 'gatto-rosso', 'id1', 'dog-labrador', 'Fido', 0, 5]))!;
    expect(a.rarity).toBe('comune');
    const b = decodeCard(qr(['X', 'gatto-rosso', 'id1', 'dog-labrador', 'Fido', 1, 99]))!;
    expect(b.rarity).toBe('raro');
    expect(b.friendship).toBe(5);
    expect(b.stats).toEqual(a.stats);
  });

  it('rifiuta QR estranei o malformati', () => {
    expect(decodeCard('https://sito-strano.it')).toBeNull();
    expect(decodeCard('ZIG1:{not json')).toBeNull();
    expect(decodeCard(qr(['X', 'a', 'id1', 'razza-inventata', 'n', 0, 1]))).toBeNull();
    expect(decodeCard(qr(['X', 'a', '<script>', 'dog-labrador', 'n', 0, 1]))).toBeNull();
    expect(decodeCard(qr(['X', 'a', 'id1', 'dog-labrador']))).toBeNull();
    expect(decodeCard('ZIG1:' + 'x'.repeat(1000))).toBeNull();
    expect(decodeCard(42)).toBeNull();
  });

  it('pulisce nomi e avatar', () => {
    const c = decodeCard(qr(['A‮B\u0000C'.padEnd(80, 'z'), '../../evil', 'id1', 'dog-labrador', '', 0, 1]))!;
    expect(c.from).toMatch(/^ABC/);
    expect(c.from.length).toBeLessThanOrEqual(20);
    expect(c.avatar).toBe('gatto-rosso');
    expect(c.name).toBe('Labrador retriever');
    expect(cleanText('  ciao\n ')).toBe('ciao');
  });
});

describe('zona privata di casa', () => {
  const home = { lat: 45.4642, lng: 9.19 };

  it('il centro è spostato ma casa resta dentro', () => {
    for (let i = 0; i < 50; i++) {
      const z = makeHomeZone(home, 150);
      const d = distanceM(z, home);
      expect(d).toBeGreaterThan(15);
      expect(d).toBeLessThan(150 * 0.4);
      expect(inHome(z, home)).toBe(true);
    }
  });

  it('le catture vicino a casa salvano solo il centro della zona', () => {
    const z = makeHomeZone(home, 300);
    const near = privatize<{ lat: number; lng: number; priv?: boolean }>(z, { lat: home.lat + 0.0005, lng: home.lng });
    expect(near).toMatchObject({ lat: z.lat, lng: z.lng, priv: true });
    const far = privatize<{ lat: number; lng: number; priv?: boolean }>(z, { lat: home.lat + 0.02, lng: home.lng });
    expect(far.priv).toBeUndefined();
    expect(far.lat).toBe(home.lat + 0.02);
  });
});

describe('eventi a tempo', () => {
  const ev = { species: 'cat' as const, rarity: 'comune' as const, coat: 'nero' as const, reencounter: false, newEntry: false, inPark: false };

  it('attiva gli eventi giusti nei giorni giusti', () => {
    expect(activeEvents(new Date(2026, 9, 4)).map((e) => e.id)).toContain('animali');
    expect(activeEvents(new Date(2027, 0, 3)).map((e) => e.id)).toContain('natale');
    expect(activeEvents(new Date(2026, 8, 25)).length).toBe(0);
    expect(activeEvents(new Date(2026, 8, 27)).map((e) => e.id)).toEqual(['domenica']);
  });

  it('calcola il bonus e sceglie il più alto', () => {
    expect(eventBonus(ev, 80, new Date(2026, 9, 4))).toMatchObject({ xp: 80 });
    expect(eventBonus(ev, 80, new Date(2026, 10, 17))).toMatchObject({ xp: 160 });
    expect(eventBonus({ ...ev, coat: 'rosso' }, 80, new Date(2026, 10, 17))).toBeNull();
    expect(eventBonus(ev, 80, new Date(2026, 8, 25))).toBeNull();
  });

  it('elenca i prossimi eventi in ordine', () => {
    const up = upcomingEvents(new Date(2026, 8, 25));
    expect(up.map((u) => u.event.id)).toEqual(['animali', 'halloween', 'gatto-nero']);
  });
});

describe('promemoria backup', () => {
  const D = 86400000;
  it('solo con catture non salvate e non troppo spesso', () => {
    const now = 100 * D;
    expect(backupDue({ lastBackupAt: 0, backupNagAt: 0 }, now - D, 2, now)).toBe(false);
    expect(backupDue({ lastBackupAt: 0, backupNagAt: 0 }, now - D, 3, now)).toBe(true);
    expect(backupDue({ lastBackupAt: 0, backupNagAt: now - D }, now - D, 3, now)).toBe(false);
    expect(backupDue({ lastBackupAt: now - 20 * D, backupNagAt: 0 }, now - D, 5, now)).toBe(true);
    expect(backupDue({ lastBackupAt: now - 20 * D, backupNagAt: 0 }, now - 30 * D, 5, now)).toBe(false);
    expect(backupDue({ lastBackupAt: now - 3 * D, backupNagAt: 0 }, now - D, 5, now)).toBe(false);
  });
});

describe('nello store', () => {
  const draft = (lat: number): CaptureDraft => ({
    species: 'cat',
    entryId: 'cat-eu-nero',
    name: 'Salem',
    heterochromia: false,
    card: new Blob(['c']),
    thumb: new Blob(['t']),
    lat,
    lng: 9.19,
    park: false,
  });

  beforeEach(async () => {
    await new Promise((r) => setTimeout(r, 20));
    await wipeAll();
    await useGame.getState().init();
    useGame.getState().finishOnboarding('Test', 'gatto-rosso');
  });

  it('creare la zona nasconde le catture già fatte vicino a casa', async () => {
    await useGame.getState().captureNew(draft(45.4642));
    await useGame.getState().captureNew(draft(45.5));
    const n = await useGame.getState().setHome({ lat: 45.4642, lng: 9.19 }, 150);
    expect(n).toBe(1);
    const [far, near] = useGame.getState().animals;
    expect(near.encounters[0].priv).toBe(true);
    expect(near.encounters[0].lat).not.toBe(45.4642);
    expect(far.encounters[0].priv).toBeUndefined();
    const again = await useGame.getState().captureNew(draft(45.4643));
    expect(again.animal.encounters[0].priv).toBe(true);
  });

  it('non accetta le proprie carte come carte amiche', async () => {
    const out = await useGame.getState().captureNew(draft(45.5));
    const own = decodeCard(encodeCard(out.animal, 'Test', 'gatto-rosso'))!;
    expect(useGame.getState().addFriendCard(own)).toBe('own');
    const other = decodeCard(qr(['Luca', 'gatto-rosso', 'zz-1', 'dog-labrador', 'Fido', 0, 2]))!;
    expect(useGame.getState().addFriendCard(other)).toBe('new');
    expect(useGame.getState().addFriendCard(other)).toBe('updated');
    expect(useGame.getState().player.friends).toHaveLength(1);
  });
});

describe('backup con i nuovi dati', () => {
  it('controlla zona di casa, impostazioni, diario e carte amiche', async () => {
    await new Promise((r) => setTimeout(r, 20));
    const file = new File(
      [
        JSON.stringify({
          app: 'zampe-in-giro',
          version: 1,
          animals: [],
          photos: [],
          player: {
            home: { lat: 45, lng: 9, r: 99999 },
            settings: { sound: 'forte', theme: 'viola', vibration: false },
            dailyWalk: { '2026-09-01': 1200, 'hack<script>': 5, '2026-09-02': 1e12 },
            friends: [
              { id: 'f1', entryId: 'dog-labrador', from: 'Luca', rarity: 'leggendario', stats: [100, 100, 100], friendship: 5 },
              { id: 'f2', entryId: 'razza-finta' },
            ],
          },
        }),
      ],
      'b.json',
    );
    await importBackup(file);
    await useGame.getState().init();
    const p = useGame.getState().player;
    expect(p.home).toBeNull();
    expect(p.settings).toEqual({ sound: true, vibration: false, theme: 'auto' });
    expect(p.dailyWalk).toEqual({ '2026-09-01': 1200, '2026-09-02': 1e6 });
    expect(p.friends).toHaveLength(1);
    expect(p.friends[0].rarity).toBe('comune');
  });
});
