import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Animal } from '../data/types';
import { wipeAll } from './db';
import { cleanFriend, cleanText, makeToken, QR_MAX, readToken, tokenFromLink, type MyProfileInput } from './friends';
import { resetIdentityCache, sign, toB64url } from './identity';
import { useGame } from './store';

const animal = (i: number, over: Partial<Animal> = {}): Animal => ({
  id: `a${i}`,
  species: 'cat',
  entryId: i % 2 ? 'cat-eu-nero' : 'dog-labrador',
  name: `Micio ${i}`,
  rarity: 'non_comune',
  stats: [50, 50, 50],
  coverPhotoId: 'p',
  encounters: [{ at: 1700000000000, lat: 45.4642, lng: 9.19, photoId: 'p' }],
  createdAt: 1700000000000,
  ...over,
});

const me = (animals: Animal[], over: Partial<MyProfileInput> = {}): MyProfileInput => ({
  name: 'Giulia',
  avatar: 'gatto-rosso',
  xp: 1234,
  walkedM: 5400,
  badgeTiers: { gattaro: 2, inventata: 3 },
  animals,
  prefs: { shareKm: true, shareNames: true },
  ...over,
});

/** Simula un altro telefono: identità nuova. */
async function otherPhone() {
  await wipeAll();
  resetIdentityCache();
}

beforeEach(async () => {
  await new Promise((r) => setTimeout(r, 20));
  await otherPhone();
});

describe('profilo firmato', () => {
  it('si legge e contiene solo dati di gioco', async () => {
    const t = await makeToken(me([animal(1), animal(2)]), false);
    const f = (await readToken(t))!;
    expect(f.name).toBe('Giulia');
    expect(f.total).toBe(2);
    expect(f.km).toBe(5.4);
    expect(f.badges).toEqual({ gattaro: 2 });
    expect(f.cards.map((c) => c.name).sort()).toEqual(['Micio 1', 'Micio 2']);
    expect(f.found.sort()).toEqual(['cat-eu-nero', 'dog-labrador']);
    // Niente posizioni né date nei dati.
    const json = JSON.stringify(f);
    expect(json).not.toContain('45.46');
    expect(json).not.toContain('1700000000000');
  });

  it('rispetta le scelte di privacy', async () => {
    const f = (await readToken(await makeToken(me([animal(1)], { prefs: { shareKm: false, shareNames: false } }), false)))!;
    expect(f.km).toBeNull();
    expect(f.cards[0].name).toBe('Europeo nero');
  });

  it('il QR resta corto anche con tante carte', async () => {
    const many = Array.from({ length: 300 }, (_, i) => animal(i));
    const qr = await makeToken(me(many), true);
    expect(qr.length).toBeLessThanOrEqual(QR_MAX);
    const f = (await readToken(qr))!;
    expect(f.total).toBe(300);
    expect(f.partial).toBe(true);
    const full = (await readToken(await makeToken(me(many), false)))!;
    expect(full.cards).toHaveLength(300);
  });

  it('rifiuta dati modificati o firme false', async () => {
    const t = await makeToken(me([animal(1)]), false);
    const [p, pub, data, sig] = t.split('.');
    const tampered = data.slice(0, -2) + (data.endsWith('A') ? 'BB' : 'AA');
    expect(await readToken([p, pub, tampered, sig].join('.'))).toBeNull();
    // Chiave pubblica di un altro con la firma di questo telefono.
    const other = await makeToken(me([animal(1)]), false);
    await otherPhone();
    const mine = await makeToken(me([animal(1)]), false);
    expect(await readToken([p, other.split('.')[1], mine.split('.')[2], mine.split('.')[3]].join('.'))).toBeNull();
    expect(await readToken('ZIG2.x.y.z')).toBeNull();
    expect(await readToken('https://sito.it')).toBeNull();
    expect(await readToken('ZIG2.' + 'a'.repeat(50000))).toBeNull();
    expect(await readToken(42)).toBeNull();
  });

  it('i valori impossibili vengono corretti: rarità e livello non si falsificano', async () => {
    // Un profilo "truccato" ma firmato correttamente dal suo autore.
    const { pub } = await (await import('./identity')).getIdentity();
    const json = JSON.stringify({
      q: 5,
      n: 'A‮B<script>'.padEnd(60, 'z'),
      a: '__proto__',
      x: 1e12,
      k: -5,
      b: { gattaro: 99, hack: 3 },
      r: [1, -3, 'x'],
      t: 2,
      c: [['dog-labrador', 'Fido', 0, 99], ['razza-finta', 'X', 0, 1], 'boh', ['cat-eu-bianco', 'Neve', 1, 2]],
    });
    const data = toB64url(new Uint8Array(await new Response(new Blob([json]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer()));
    const head = `ZIG2.${pub}.${data}`;
    const f = (await readToken(`${head}.${await sign(new TextEncoder().encode(head))}`))!;
    expect(f.name.length).toBeLessThanOrEqual(20);
    expect(f.name).not.toContain('‮');
    expect(f.avatar).toBe('gatto-rosso');
    expect(f.xp).toBe(50_000_000);
    expect(f.km).toBeNull();
    expect(f.badges).toEqual({ gattaro: 3 });
    expect(f.rarityCounts).toEqual([1, 0, 0, 0, 0]);
    expect(f.cards).toHaveLength(2);
    expect(f.cards[0]).toMatchObject({ rarity: 'comune', friendship: 5 });
    expect(f.cards[1]).toMatchObject({ rarity: 'leggendario', heterochromia: true });
  });

  it('protegge dai dati "gonfiati"', async () => {
    const { pub } = await (await import('./identity')).getIdentity();
    const json = JSON.stringify({ q: 1, n: 'x', pad: 'a'.repeat(2_000_000) });
    const data = toB64url(new Uint8Array(await new Response(new Blob([json]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer()));
    expect(data.length).toBeLessThan(40000);
    const head = `ZIG2.${pub}.${data}`;
    expect(await readToken(`${head}.${await sign(new TextEncoder().encode(head))}`)).toBeNull();
  });

  it('estrae il codice dal link', () => {
    expect(tokenFromLink('https://x.github.io/Cat_Game/#/amico/ZIG2.aa.bb.cc')).toBe('ZIG2.aa.bb.cc');
    expect(tokenFromLink('https://x.github.io/Cat_Game/#/profilo')).toBeNull();
    expect(cleanText(' ciao\n')).toBe('ciao');
    expect(cleanFriend({ id: 'x' })).toBeNull();
  });
});

describe('amici nello store', () => {
  async function friendToken(name: string) {
    await otherPhone();
    const qr = await makeToken(me([animal(1)], { name }), true);
    const later = await makeToken(me([animal(1), animal(2)], { name }), false);
    return { qr, later };
  }

  it('di persona si aggiunge, via link solo se già amico e più recente', async () => {
    const luca = await friendToken('Luca');
    const stranger = await friendToken('Estraneo');
    await otherPhone(); // il mio telefono
    await useGame.getState().init();
    useGame.getState().finishOnboarding('Io', 'gatto-rosso');
    const save = useGame.getState().saveFriend;

    expect(await save((await readToken(stranger.later))!, false)).toBe('unknown');
    expect(await save((await readToken(luca.qr))!, true)).toBe('new');
    expect(await save((await readToken(luca.later))!, false)).toBe('updated');
    expect(useGame.getState().player.friends[0].total).toBe(2);
    expect(await save((await readToken(luca.qr))!, false)).toBe('old');
    expect(useGame.getState().player.friends).toHaveLength(1);

    const mine = (await readToken(await makeToken(me([]), true)))!;
    expect(await save(mine, true)).toBe('self');
  });
});
