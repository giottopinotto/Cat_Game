import { kvGet, kvSet } from './db';

// Identità del giocatore per gli amici: una coppia di chiavi (firma digitale ECDSA P-256)
// creata sul telefono. La chiave privata non esce mai dal telefono (non è nemmeno
// esportabile); la chiave pubblica va nel QR, così gli amici possono verificare che gli
// aggiornamenti arrivino davvero da te.

const ALG = { name: 'ECDSA', namedCurve: 'P-256' } as const;
const SIGN = { name: 'ECDSA', hash: 'SHA-256' } as const;

interface StoredIdentity {
  priv: CryptoKey;
  pub: string;
  /** Numero dell'ultimo aggiornamento inviato: cresce sempre, così un link vecchio non sovrascrive uno nuovo. */
  seq: number;
}

export function toB64url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromB64url(s: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/.test(s)) return null;
  try {
    const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

let cached: Promise<StoredIdentity> | null = null;

async function create(): Promise<StoredIdentity> {
  const pair = await crypto.subtle.generateKey(ALG, false, ['sign', 'verify']);
  const pub = toB64url(new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey)));
  const id: StoredIdentity = { priv: pair.privateKey, pub, seq: 0 };
  await kvSet('identity', id);
  return id;
}

async function load(): Promise<StoredIdentity> {
  const stored = await kvGet<StoredIdentity>('identity');
  if (stored?.priv && stored.pub) return stored;
  return create();
}

export function getIdentity(): Promise<StoredIdentity> {
  cached ??= load().catch((e) => {
    cached = null;
    throw e;
  });
  return cached;
}

/** Dimentica l'identità in memoria (dopo "cancella tutti i dati" o un ripristino). */
export function resetIdentityCache(): void {
  cached = null;
}

/** Prossimo numero di aggiornamento (salvato subito). */
export async function nextSeq(): Promise<number> {
  const id = await getIdentity();
  id.seq = Math.max(id.seq, Math.floor(Date.now() / 1000)) + 1;
  await kvSet('identity', id);
  return id.seq;
}

export async function sign(data: Uint8Array): Promise<string> {
  const id = await getIdentity();
  return toB64url(new Uint8Array(await crypto.subtle.sign(SIGN, id.priv, data as BufferSource)));
}

export async function verify(pub: string, data: Uint8Array, sig: string): Promise<boolean> {
  const raw = fromB64url(pub);
  const s = fromB64url(sig);
  if (!raw || raw.length !== 65 || !s || s.length !== 64) return false;
  try {
    const key = await crypto.subtle.importKey('raw', raw as BufferSource, ALG, false, ['verify']);
    return await crypto.subtle.verify(SIGN, key, s as BufferSource, data as BufferSource);
  } catch {
    return false;
  }
}

/** Codice breve e stabile che identifica un amico (dalla sua chiave pubblica). */
export async function fingerprint(pub: string): Promise<string> {
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pub)));
  return toB64url(hash.slice(0, 12));
}
