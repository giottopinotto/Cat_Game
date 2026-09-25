import { ALL_ENTRIES, getEntry } from '../data/entries';
import { RARITIES, type Animal, type Rarity, type Species } from '../data/types';
import { AVATAR_IDS, DEFAULT_AVATAR } from '../ui/avatars';
import { BADGES } from './badges';
import { fingerprint, fromB64url, nextSeq, sign, toB64url, verify, getIdentity } from './identity';
import { friendshipLevel } from './progress';

// Amici senza server.
// - Ci si aggiunge di persona, inquadrando il QR dell'altro: il QR contiene il profilo
//   e la chiave pubblica di chi lo mostra.
// - Poi gli aggiornamenti arrivano con un link mandato in chat. I dati stanno dopo il "#",
//   parte che il browser non invia mai a nessun sito, e sono firmati: vengono accettati solo
//   se la firma corrisponde alla chiave ricevuta di persona.
// Dentro ci sono solo dati di gioco: mai posizioni, foto, date o orari delle catture.

export interface FriendAnimal {
  entryId: string;
  species: Species;
  name: string;
  rarity: Rarity;
  heterochromia?: boolean;
  friendship: number;
}

export interface Friend {
  /** Codice ricavato dalla chiave pubblica. */
  id: string;
  pub: string;
  seq: number;
  /** Quando abbiamo ricevuto l'ultimo aggiornamento (ora di questo telefono). */
  receivedAt: number;
  name: string;
  avatar: string;
  xp: number;
  /** Km a piedi, se l'amico sceglie di mostrarli. */
  km: number | null;
  badges: Record<string, number>;
  /** Voci dell'album scoperte. */
  found: string[];
  rarityCounts: number[];
  total: number;
  cards: FriendAnimal[];
  /** True se la collezione non è completa (il QR ha poco spazio). */
  partial: boolean;
}

export interface SharePrefs {
  shareKm: boolean;
  shareNames: boolean;
}

const PREFIX = 'ZIG2';
export const MAX_FRIENDS = 100;
const MAX_CARDS = 500;
const MAX_NAME = 20;
const MAX_XP = 50_000_000;
/** Lunghezza massima del testo nel QR: oltre diventa difficile da inquadrare. */
export const QR_MAX = 750;
/** Lunghezza massima accettata per un link o un QR. */
const MAX_TOKEN = 40_000;
/** Limite dei dati decompressi (protezione da file "gonfiati"). */
const MAX_JSON = 300_000;

/** Tiene solo caratteri stampabili (niente caratteri di controllo o di inversione del testo). */
export function cleanText(v: unknown, max = MAX_NAME): string {
  if (typeof v !== 'string') return '';
  return v.replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩]/g, '').trim().slice(0, max);
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const clampInt = (v: unknown, min: number, max: number, fallback: number) => (isNum(v) ? Math.min(max, Math.max(min, Math.round(v))) : fallback);

function rarityOf(entryRarity: Rarity, het: boolean): Rarity {
  return RARITIES[Math.min(RARITIES.length - 1, RARITIES.indexOf(entryRarity) + (het ? 2 : 0))];
}

// ---- Voci dell'album scoperte, come sequenza di bit ------------------------

function foundToBits(ids: Set<string>): string {
  const bytes = new Uint8Array(Math.ceil(ALL_ENTRIES.length / 8));
  ALL_ENTRIES.forEach((e, i) => {
    if (ids.has(e.id)) bytes[i >> 3] |= 1 << (i & 7);
  });
  return toB64url(bytes);
}

function bitsToFound(v: unknown): string[] {
  const bytes = typeof v === 'string' && v.length <= 200 ? fromB64url(v) : null;
  if (!bytes) return [];
  return ALL_ENTRIES.filter((_, i) => (bytes[i >> 3] ?? 0) & (1 << (i & 7))).map((e) => e.id);
}

// ---- Compressione ---------------------------------------------------------

async function deflate(text: string): Promise<Uint8Array> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function inflate(data: Uint8Array): Promise<string | null> {
  try {
    const reader = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_JSON) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
    const all = new Uint8Array(size);
    let o = 0;
    for (const c of chunks) {
      all.set(c, o);
      o += c.length;
    }
    return new TextDecoder().decode(all);
  } catch {
    return null;
  }
}

// ---- Creazione del proprio profilo -----------------------------------------

export interface MyProfileInput {
  name: string;
  avatar: string;
  xp: number;
  walkedM: number;
  badgeTiers: Record<string, number>;
  animals: Animal[];
  prefs: SharePrefs;
}

const RANK = (a: Animal) => RARITIES.indexOf(a.rarity) * 10 + friendshipLevel(a);

function payload(p: MyProfileInput, seq: number, maxCards: number) {
  const sorted = [...p.animals].sort((a, b) => RANK(b) - RANK(a));
  const counts = [0, 0, 0, 0, 0];
  for (const a of p.animals) counts[RARITIES.indexOf(a.rarity)]++;
  const cards = sorted.slice(0, maxCards).map((a) => [a.entryId, p.prefs.shareNames ? cleanText(a.name) : '', a.heterochromia ? 1 : 0, friendshipLevel(a)]);
  return {
    q: seq,
    n: cleanText(p.name) || 'Esploratore',
    a: p.avatar,
    x: Math.round(p.xp),
    k: p.prefs.shareKm ? Math.round(p.walkedM / 100) / 10 : -1,
    b: p.badgeTiers,
    e: foundToBits(new Set(p.animals.map((a) => a.entryId))),
    r: counts,
    t: p.animals.length,
    c: cards,
    p: cards.length < p.animals.length ? 1 : 0,
  };
}

async function token(p: MyProfileInput, seq: number, maxCards: number, pub: string): Promise<string> {
  const data = toB64url(await deflate(JSON.stringify(payload(p, seq, maxCards))));
  const head = `${PREFIX}.${pub}.${data}`;
  return `${head}.${await sign(new TextEncoder().encode(head))}`;
}

/**
 * Crea il proprio "biglietto": il testo firmato del profilo. Per il QR si tiene corto
 * (si tolgono carte finché ci sta), per il link ci sono tutte (fino a 500).
 */
export async function makeToken(p: MyProfileInput, forQr: boolean): Promise<string> {
  const { pub } = await getIdentity();
  const seq = await nextSeq();
  let max = Math.min(MAX_CARDS, p.animals.length);
  let t = await token(p, seq, max, pub);
  while (forQr && t.length > QR_MAX && max > 0) {
    max = max > 40 ? 40 : Math.floor(max * 0.7);
    t = await token(p, seq, max, pub);
  }
  return t;
}

// ---- Lettura del biglietto di un amico -------------------------------------

/**
 * Verifica la firma e controlla ogni campo. Restituisce l'amico, oppure null se il testo
 * non è valido. I valori derivati (rarità, livello) si ricalcolano, non si leggono.
 */
export async function readToken(text: unknown, now = Date.now()): Promise<Friend | null> {
  if (typeof text !== 'string' || text.length > MAX_TOKEN) return null;
  const parts = text.trim().split('.');
  if (parts.length !== 4 || parts[0] !== PREFIX) return null;
  const [, pub, data, sig] = parts;
  if (!(await verify(pub, new TextEncoder().encode(`${PREFIX}.${pub}.${data}`), sig))) return null;
  const bytes = fromB64url(data);
  const json = bytes && (await inflate(bytes));
  if (!json) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return null;
  }
  const x = raw as Record<string, unknown> | null;
  if (!x || typeof x !== 'object' || !isNum(x.q)) return null;
  return cleanFriend({
    id: await fingerprint(pub),
    pub,
    seq: x.q,
    receivedAt: now,
    name: x.n,
    avatar: x.a,
    xp: x.x,
    km: x.k,
    badges: x.b,
    found: bitsToFound(x.e),
    rarityCounts: x.r,
    total: x.t,
    cards: Array.isArray(x.c) ? x.c.slice(0, MAX_CARDS).map((c) => (Array.isArray(c) ? { entryId: c[0], name: c[1], heterochromia: c[2] === 1, friendship: c[3] } : null)) : [],
    partial: x.p === 1,
  });
}

function cleanCard(v: unknown): FriendAnimal | null {
  const x = v as Partial<FriendAnimal> | null;
  if (!x || typeof x.entryId !== 'string') return null;
  const entry = getEntry(x.entryId);
  if (!entry) return null;
  const het = x.heterochromia === true;
  return {
    entryId: entry.id,
    species: entry.species,
    name: cleanText(x.name) || entry.name,
    rarity: rarityOf(entry.rarity, het),
    heterochromia: het || undefined,
    friendship: clampInt(x.friendship, 1, 5, 1),
  };
}

/** Controlla un amico (da QR, link o backup): tutto ciò che non ha la forma giusta viene scartato o corretto. */
export function cleanFriend(v: unknown): Friend | null {
  const x = v as Partial<Record<keyof Friend, unknown>> | null;
  if (!x || typeof x.id !== 'string' || !/^[\w-]{16}$/.test(x.id)) return null;
  if (typeof x.pub !== 'string' || fromB64url(x.pub)?.length !== 65) return null;
  if (!isNum(x.seq)) return null;
  const cards = (Array.isArray(x.cards) ? x.cards : []).slice(0, MAX_CARDS).map(cleanCard).filter((c): c is FriendAnimal => !!c);
  const validBadges = new Set(BADGES.map((b) => b.id));
  const badges = Object.fromEntries(
    Object.entries((x.badges && typeof x.badges === 'object' ? x.badges : {}) as Record<string, unknown>)
      .filter(([k, t]) => validBadges.has(k) && isNum(t))
      .map(([k, t]) => [k, clampInt(t, 0, 3, 0)]),
  );
  const found = (Array.isArray(x.found) ? x.found : []).filter((id): id is string => typeof id === 'string' && !!getEntry(id)).slice(0, ALL_ENTRIES.length);
  const counts = Array.isArray(x.rarityCounts) ? x.rarityCounts.slice(0, 5).map((n) => clampInt(n, 0, 100000, 0)) : [];
  while (counts.length < 5) counts.push(0);
  const total = Math.max(clampInt(x.total, 0, 100000, 0), cards.length);
  return {
    id: x.id,
    pub: x.pub,
    seq: x.seq,
    receivedAt: clampInt(x.receivedAt, 0, Date.now() + 86400000, Date.now()),
    name: cleanText(x.name) || 'Un amico',
    avatar: AVATAR_IDS.includes(x.avatar as string) ? (x.avatar as string) : DEFAULT_AVATAR,
    xp: clampInt(x.xp, 0, MAX_XP, 0),
    km: isNum(x.km) && x.km >= 0 ? Math.min(1e6, Math.round(x.km * 10) / 10) : null,
    badges,
    found: [...new Set([...found, ...cards.map((c) => c.entryId)])],
    rarityCounts: counts,
    total,
    cards,
    partial: x.partial === true || cards.length < total,
  };
}

/** Estrae il biglietto da un link dell'app (…#/amico/<biglietto>). */
export function tokenFromLink(url: string): string | null {
  const m = /#\/amico\/(ZIG2\.[A-Za-z0-9_.-]+)$/.exec(url.trim());
  return m ? m[1] : null;
}
