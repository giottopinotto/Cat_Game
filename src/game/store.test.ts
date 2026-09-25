import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { RARITY_INFO } from '../data/types';
import { kvGet, loadAnimals, wipeAll } from './db';
import { bumpRarity, rarityFor, useGame, XP_FIRST_TODAY, XP_NEW_ENTRY, XP_ZONE, type CaptureDraft, type PlayerData } from './store';

const draft = (over: Partial<CaptureDraft> = {}): CaptureDraft => ({
  species: 'cat',
  entryId: 'cat-eu-nero',
  name: 'Salem',
  heterochromia: false,
  card: new Blob(['card']),
  thumb: new Blob(['thumb']),
  lat: 45.4642,
  lng: 9.19,
  park: false,
  ...over,
});

beforeEach(async () => {
  // Lascia terminare i salvataggi rimasti in sospeso dal test precedente.
  await new Promise((r) => setTimeout(r, 20));
  await wipeAll();
  await useGame.getState().init();
  useGame.setState({ celebrations: [], toasts: [] });
  useGame.getState().finishOnboarding('Test', '🧢');
});

describe('rarità', () => {
  it('gli occhi di due colori alzano la rarità di 2 livelli, fino a leggendario', () => {
    expect(bumpRarity('comune', 2)).toBe('raro');
    expect(bumpRarity('epico', 2)).toBe('leggendario');
    expect(rarityFor('cat-eu-bianco', true)).toBe('leggendario');
    expect(rarityFor('dog-labrador', false)).toBe('comune');
  });
});

describe('cattura', () => {
  it('salva l\'animale e assegna le ricompense', async () => {
    const out = await useGame.getState().captureNew(draft());
    expect(out.isNew).toBe(true);
    expect(out.newEntry).toBe(true);
    const labels = out.rewards.map((r) => r.xp);
    expect(labels).toContain(RARITY_INFO.non_comune.xp);
    expect(labels).toContain(XP_NEW_ENTRY);
    expect(labels).toContain(XP_FIRST_TODAY);
    // medaglia Gattaro (bronzo) al primo gatto
    expect(out.badges.map((b) => b.badge.id)).toContain('gattaro');

    const s = useGame.getState();
    expect(s.animals).toHaveLength(1);
    expect(s.player.xp).toBe(out.xpAfter);
    expect(s.player.activeDays).toHaveLength(1);
    expect(await loadAnimals()).toHaveLength(1);
  });

  it('la seconda cattura della stessa voce non dà il bonus album né quello del giorno', async () => {
    await useGame.getState().captureNew(draft());
    const out = await useGame.getState().captureNew(draft({ name: 'Ombra' }));
    expect(out.newEntry).toBe(false);
    expect(out.rewards.map((r) => r.label)).not.toContain("Nuova voce dell'album");
    expect(out.rewards.map((r) => r.label)).not.toContain('Prima cattura di oggi');
  });

  it('rivedere lo stesso animale nello stesso giorno aggiunge la foto ma non XP', async () => {
    const first = await useGame.getState().captureNew(draft());
    const again = await useGame.getState().reencounter(first.animal.id, draft());
    expect(again.sameDay).toBe(true);
    expect(again.animal.encounters).toHaveLength(2);
    expect(again.rewards.filter((r) => r.label.startsWith('Hai rivisto'))).toHaveLength(0);
    expect(again.friendshipAfter).toBe(1);
  });

  it('liberare un animale lo cancella', async () => {
    const first = await useGame.getState().captureNew(draft());
    await useGame.getState().releaseAnimal(first.animal.id);
    expect(useGame.getState().animals).toHaveLength(0);
    expect(await loadAnimals()).toHaveLength(0);
  });

  it('il giocatore viene salvato e ricaricato', async () => {
    await useGame.getState().captureNew(draft());
    await new Promise((r) => setTimeout(r, 20));
    const saved = await kvGet<PlayerData>('player');
    expect(saved?.xp).toBe(useGame.getState().player.xp);
    expect(saved?.name).toBe('Test');
  });
});

describe('camminata ed esplorazione', () => {
  it('una nuova zona dà XP; spostarsi a piedi conta i metri', () => {
    const at = Date.now();
    const s = useGame.getState();
    s.handleFix({ lat: 45.4642, lng: 9.19, accuracy: 10, heading: null, speed: null, at });
    expect(useGame.getState().player.zones).toHaveLength(1);
    expect(useGame.getState().player.xp).toBeGreaterThanOrEqual(XP_ZONE);
    // ~110 m in 80 secondi: camminata
    s.handleFix({ lat: 45.4652, lng: 9.19, accuracy: 10, heading: null, speed: null, at: at + 80_000 });
    expect(useGame.getState().player.walkedM).toBeGreaterThan(100);
  });

  it('dopo una pausa lunga la distanza non conta', () => {
    const at = Date.now();
    const s = useGame.getState();
    s.handleFix({ lat: 45.0, lng: 9.0, accuracy: 10, heading: null, speed: null, at });
    // 3 km dopo un'ora: app chiusa, non sappiamo come ci si è spostati
    s.handleFix({ lat: 45.027, lng: 9.0, accuracy: 10, heading: null, speed: null, at: at + 3_600_000 });
    expect(useGame.getState().player.walkedM).toBe(0);
  });

  it('gli spostamenti troppo veloci (auto, bus) non contano', () => {
    const at = Date.now();
    const s = useGame.getState();
    s.handleFix({ lat: 45.0, lng: 9.0, accuracy: 10, heading: null, speed: null, at });
    // 1,1 km in 20 secondi
    s.handleFix({ lat: 45.01, lng: 9.0, accuracy: 10, heading: null, speed: null, at: at + 20_000 });
    expect(useGame.getState().player.walkedM).toBe(0);
  });
});
