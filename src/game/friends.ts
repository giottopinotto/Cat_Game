import { getEntry } from '../data/entries';
import { RARITIES, type Animal, type Rarity, type Species, type Stats } from '../data/types';
import { AVATAR_IDS, DEFAULT_AVATAR } from '../ui/avatars';
import { friendshipLevel, makeStats } from './progress';

// Carte degli amici: si scambiano di persona con un QR code, senza internet.
// Il QR contiene solo i dati della carta (niente foto, niente posizione, niente
// date precise) e chi lo riceve controlla tutto prima di salvarlo.

export interface FriendCard {
  /** Codice casuale della carta originale (non dice niente di chi l'ha catturata). */
  id: string;
  from: string;
  avatar: string;
  species: Species;
  entryId: string;
  name: string;
  rarity: Rarity;
  heterochromia?: boolean;
  stats: Stats;
  friendship: number;
  receivedAt: number;
}

const PREFIX = 'ZIG1:';
export const MAX_FRIEND_CARDS = 300;
const MAX_QR_TEXT = 400;
const MAX_NAME = 20;

const isId = (v: unknown): v is string => typeof v === 'string' && /^[\w-]{1,64}$/.test(v);

/** Tiene solo caratteri stampabili (niente caratteri di controllo) e taglia la lunghezza. */
export function cleanText(v: unknown, max = MAX_NAME): string {
  if (typeof v !== 'string') return '';
  return v.replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩]/g, '').trim().slice(0, max);
}

/** Rarità corretta per la voce: quella della razza, due livelli in più con gli occhi di due colori. */
function expectedRarity(entryRarity: Rarity, het: boolean): Rarity {
  const i = RARITIES.indexOf(entryRarity) + (het ? 2 : 0);
  return RARITIES[Math.min(RARITIES.length - 1, i)];
}

/** Testo da mettere nel QR per una propria carta. */
export function encodeCard(animal: Animal, playerName: string, avatar: string): string {
  return (
    PREFIX +
    JSON.stringify([
      cleanText(playerName) || 'Esploratore',
      avatar,
      animal.id,
      animal.entryId,
      cleanText(animal.name),
      animal.heterochromia ? 1 : 0,
      friendshipLevel(animal),
    ])
  );
}

/**
 * Legge il testo di un QR. Restituisce la carta se è valida, altrimenti null.
 * Rarità e statistiche non si leggono dal QR: si ricalcolano, così non si possono falsificare.
 */
export function decodeCard(text: unknown, now = Date.now()): FriendCard | null {
  if (typeof text !== 'string' || text.length > MAX_QR_TEXT || !text.startsWith(PREFIX)) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(text.slice(PREFIX.length));
  } catch {
    return null;
  }
  if (!Array.isArray(raw) || raw.length !== 7) return null;
  const [from, avatar, id, entryId, name, het, friendship] = raw;
  return cleanFriendCard({ from, avatar, id, entryId, name, heterochromia: het === 1, friendship, receivedAt: now });
}

/** Controlla una carta amica (da QR o da backup) e ricostruisce i campi derivati. */
export function cleanFriendCard(v: unknown): FriendCard | null {
  const x = v as Partial<FriendCard> | null;
  if (!x || !isId(x.id) || typeof x.entryId !== 'string') return null;
  const entry = getEntry(x.entryId);
  if (!entry) return null;
  const het = x.heterochromia === true;
  const f = typeof x.friendship === 'number' && Number.isFinite(x.friendship) ? Math.round(x.friendship) : 1;
  const at = typeof x.receivedAt === 'number' && Number.isFinite(x.receivedAt) ? x.receivedAt : Date.now();
  return {
    id: x.id,
    from: cleanText(x.from) || 'Un amico',
    avatar: AVATAR_IDS.includes(x.avatar as string) ? (x.avatar as string) : DEFAULT_AVATAR,
    species: entry.species,
    entryId: entry.id,
    name: cleanText(x.name) || entry.name,
    rarity: expectedRarity(entry.rarity, het),
    heterochromia: het || undefined,
    stats: makeStats(entry, x.id),
    friendship: Math.min(5, Math.max(1, f)),
    receivedAt: Math.min(Date.now() + 86400000, Math.max(0, at)),
  };
}
