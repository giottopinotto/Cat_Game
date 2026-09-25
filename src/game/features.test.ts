import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { importBackup } from './backup';
import { wipeAll } from './db';
import { activeEvents, eventBonus, upcomingEvents } from './events';
import { distanceM } from './geo';
import { inHome, makeHomeZone, privatize } from './privacy';
import { useGame, type CaptureDraft } from './store';
import { backupDue } from '../ui/backupActions';


describe('zona privata di casa', () => {
  const home = { lat: 45.4642, lng: 9.19 };

  it('il centro è spostato ma casa resta dentro', () => {
    for (let i = 0; i < 50; i++) {
      const z = makeHomeZone(home, 150);
      const d = distanceM(z, home);
      expect(d).toBeGreaterThan(10);
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
    expect(distanceM(near.encounters[0], { lat: 45.4642, lng: 9.19 })).toBeGreaterThan(10);
    expect(far.encounters[0].priv).toBeUndefined();
    const again = await useGame.getState().captureNew(draft(45.4643));
    expect(again.animal.encounters[0].priv).toBe(true);
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
            settings: { sound: 'forte', theme: 'viola', vibration: false, accent: 'javascript:alert(1)' },
            frame: 'corona',
            banner: 'inventato',
            xp: 10,
            albumSeen: ['cat-eu-nero', '<b>x</b>', 42],
            dailyWalk: { '2026-09-01': 1200, 'hack<script>': 5, '2026-09-02': 1e12 },
            friends: [{ id: 'f1', entryId: 'dog-labrador', from: 'Luca' }],
          },
        }),
      ],
      'b.json',
    );
    await importBackup(file);
    await useGame.getState().init();
    const p = useGame.getState().player;
    expect(p.home).toBeNull();
    expect(p.settings).toEqual({ sound: true, vibration: false, theme: 'auto', shareKm: true, shareNames: true, gpsOnlyPhoto: true, accent: 'lilla', fx: true });
    expect(p.dailyWalk).toEqual({ '2026-09-01': 1200, '2026-09-02': 1e6 });
    expect(p.friends).toHaveLength(0);
    // Cornice non ancora sbloccata a quel livello e sfondo inesistente: si torna a quelli di base.
    expect(p.frame).toBe('base');
    expect(p.banner).toBe('nessuno');
    expect(p.albumSeen).toEqual(['cat-eu-nero']);
  });
});

describe('grafica: colori e cornici', () => {
  it('colori e cornici accettano solo valori conosciuti e sbloccati', async () => {
    const { ACCENT_IDS, getAccent } = await import('../ui/accents');
    const { pickCosmetic, pickAvatar, FRAMES, BANNERS, LEVEL_REWARDS, rewardAt } = await import('../ui/cosmetics');
    expect(ACCENT_IDS).toContain('lilla');
    expect(getAccent('non-esiste').id).toBe('lilla');
    expect(pickCosmetic(FRAMES, 'corona', 48)).toBe('base');
    expect(pickCosmetic(FRAMES, 'corona', 49)).toBe('corona');
    expect(pickCosmetic(BANNERS, '__proto__', 50)).toBe('nessuno');
    expect(pickAvatar('drago', 47, 'gatto-rosso')).toBe('gatto-rosso');
    expect(pickAvatar('drago', 48, 'gatto-rosso')).toBe('drago');
    expect(pickAvatar('<script>', 50, 'gatto-rosso')).toBe('gatto-rosso');
    // Un premio per ogni livello dal 2 al 50, tutti diversi e disegnati.
    expect(LEVEL_REWARDS.map((r) => r.level)).toEqual(Array.from({ length: 49 }, (_, i) => i + 2));
    expect(new Set(LEVEL_REWARDS.map((r) => `${r.kind}:${r.id}`)).size).toBe(49);
    expect(rewardAt(50)?.id).toBe('gatto-re');
    const { AVATAR_IDS } = await import('../ui/avatars');
    for (const r of LEVEL_REWARDS.filter((x) => x.kind === 'avatar')) expect(AVATAR_IDS).toContain(r.id);
  });

  it('lo store non permette cornici bloccate', async () => {
    await new Promise((r) => setTimeout(r, 20));
    await wipeAll();
    await useGame.getState().init();
    useGame.getState().finishOnboarding('Test', 'gatto-rosso');
    useGame.getState().updateProfile('Test', 'gatto-rosso', 'galassia', 'prato');
    expect(useGame.getState().player.frame).toBe('base');
    // Livello 1: il prato si sblocca al livello 2.
    expect(useGame.getState().player.banner).toBe('nessuno');
  });
});

describe('premi disegnati', () => {
  it('ogni cornice, sfondo e pacchetto del percorso ha il suo stile', async () => {
    // Lettura diretta del file (Vitest svuota gli import dei fogli di stile).
    const fs = (await import(/* @vite-ignore */ `node:${'fs'}`)) as { readFileSync(p: URL, e: string): string };
    const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
    const { LEVEL_REWARDS } = await import('../ui/cosmetics');
    const prefix = { cornice: '.frame-', sfondo: '.banner-', pacchetto: '.pack.skin-' } as const;
    for (const r of LEVEL_REWARDS) {
      if (r.kind === 'avatar') continue;
      expect(css, `${r.kind} ${r.id}`).toContain(`${prefix[r.kind]}${r.id} {`);
    }
  });
});
