import { getEntry } from '../data/entries';
import { RARITIES, type Animal, type Encounter, type Rarity, type Stats } from '../data/types';
import { getAllPhotos, loadAnimals, kvGet, replaceAll, type PhotoRecord } from './db';
import { AVATAR_IDS } from '../ui/avatars';
import { forgetPhotos } from './photos';
import { cleanFriendCard, MAX_FRIEND_CARDS, type FriendCard } from './friends';
import { isHomeZone } from './privacy';
import { DEFAULT_SETTINGS, normalizePlayer, type PlayerData, type ThemeChoice } from './store';

// Tutti i dati vivono solo sul telefono: il backup permette di salvarli in un
// file e ripristinarli (es. cambiando telefono).

const APP_ID = 'zampe-in-giro';

interface BackupFile {
  app: typeof APP_ID;
  version: 1;
  exportedAt: number;
  player: PlayerData;
  animals: Animal[];
  photos: { id: string; card: string; thumb: string }[];
}

function blobToDataUrl(b: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(b);
  });
}

async function dataUrlToBlob(u: unknown): Promise<Blob> {
  // Solo immagini incorporate nel file: mai indirizzi esterni.
  if (typeof u !== 'string' || !/^data:image\/(jpeg|png|webp);base64,/.test(u)) throw new Error('Il backup contiene una foto non valida.');
  try {
    return await (await fetch(u)).blob();
  } catch {
    throw new Error('Il backup contiene una foto rovinata.');
  }
}

export async function exportBackup(): Promise<{ blob: Blob; filename: string }> {
  const [animals, photos, player] = await Promise.all([loadAnimals(), getAllPhotos(), kvGet<PlayerData>('player')]);
  const data: BackupFile = {
    app: APP_ID,
    version: 1,
    exportedAt: Date.now(),
    player: normalizePlayer(player),
    animals,
    photos: await Promise.all(
      photos.map(async (p) => ({ id: p.id, card: await blobToDataUrl(p.card), thumb: await blobToDataUrl(p.thumb) })),
    ),
  };
  const d = new Date();
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { blob: new Blob([JSON.stringify(data)], { type: 'application/json' }), filename: `zampe-in-giro-backup-${stamp}.json` };
}

// ---- Controllo del contenuto del file ---------------------------------------
// Un backup è un file che arriva "da fuori": si accetta solo ciò che ha la forma
// giusta, così un file rovinato o modificato non può bloccare l'app.

const MAX_ANIMALS = 5000;
const MAX_TEXT = 64;

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isId = (v: unknown): v is string => typeof v === 'string' && /^[\w-]{1,64}$/.test(v);
const text = (v: unknown, fallback: string) => (typeof v === 'string' ? v.slice(0, MAX_TEXT) : fallback);
const clamp = (v: unknown, min: number, max: number, fallback: number) => (isNum(v) ? Math.min(max, Math.max(min, v)) : fallback);

function cleanEncounter(e: unknown): Encounter | null {
  const x = e as Partial<Encounter> | null;
  if (!x || !isNum(x.at) || !isNum(x.lat) || !isNum(x.lng) || !isId(x.photoId)) return null;
  if (Math.abs(x.lat) > 90 || Math.abs(x.lng) > 180) return null;
  return { at: x.at, lat: x.lat, lng: x.lng, park: x.park === true || undefined, priv: x.priv === true || undefined, photoId: x.photoId };
}

function cleanAnimal(a: unknown): Animal | null {
  const x = a as Partial<Animal> | null;
  if (!x || !isId(x.id) || typeof x.entryId !== 'string') return null;
  const entry = getEntry(x.entryId);
  if (!entry || entry.species !== x.species) return null;
  const encounters = (Array.isArray(x.encounters) ? x.encounters : []).map(cleanEncounter).filter((e): e is Encounter => !!e);
  if (!encounters.length) return null;
  const rarity: Rarity = RARITIES.includes(x.rarity as Rarity) ? (x.rarity as Rarity) : entry.rarity;
  const stats = (Array.isArray(x.stats) && x.stats.length === 3 ? x.stats : [50, 50, 50]).map((v) => clamp(v, 0, 100, 50)) as Stats;
  const cover = encounters.some((e) => e.photoId === x.coverPhotoId) ? (x.coverPhotoId as string) : encounters[0].photoId;
  return {
    id: x.id,
    species: entry.species,
    entryId: entry.id,
    name: text(x.name, entry.name).trim() || entry.name,
    rarity,
    heterochromia: x.heterochromia === true || undefined,
    stats,
    coverPhotoId: cover,
    encounters,
    createdAt: clamp(x.createdAt, 0, Date.now() + 86400000, encounters[0].at),
  };
}

function cleanPlayer(p: unknown): PlayerData {
  const x = (p ?? {}) as Partial<PlayerData>;
  const base = normalizePlayer(undefined);
  const strings = (v: unknown, max: number) => (Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string' && s.length < 40).slice(0, max) : []);
  return {
    ...base,
    name: text(x.name, 'Esploratore').trim() || 'Esploratore',
    avatar: AVATAR_IDS.includes(x.avatar as string) ? (x.avatar as string) : base.avatar,
    xp: clamp(x.xp, 0, 1e9, 0),
    createdAt: clamp(x.createdAt, 0, Date.now() + 86400000, base.createdAt),
    onboarded: true,
    walkedM: clamp(x.walkedM, 0, 1e9, 0),
    zones: strings(x.zones, 100000),
    activeDays: strings(x.activeDays, 10000),
    missionsDone: clamp(x.missionsDone, 0, 1e7, 0),
    badgeTiers: Object.fromEntries(
      Object.entries(x.badgeTiers ?? {}).filter(([k, v]) => typeof k === 'string' && isNum(v)).map(([k, v]) => [k, clamp(v, 0, 3, 0)]),
    ),
    home: isHomeZone(x.home) ? { lat: x.home.lat, lng: x.home.lng, r: x.home.r } : null,
    settings: {
      sound: typeof x.settings?.sound === 'boolean' ? x.settings.sound : DEFAULT_SETTINGS.sound,
      vibration: typeof x.settings?.vibration === 'boolean' ? x.settings.vibration : DEFAULT_SETTINGS.vibration,
      theme: (['auto', 'light', 'dark'] as ThemeChoice[]).includes(x.settings?.theme as ThemeChoice) ? x.settings!.theme : DEFAULT_SETTINGS.theme,
    },
    lastBackupAt: clamp(x.lastBackupAt, 0, Date.now() + 86400000, 0),
    backupNagAt: clamp(x.backupNagAt, 0, Date.now() + 86400000, 0),
    dailyWalk: Object.fromEntries(
      Object.entries(x.dailyWalk ?? {})
        .filter(([k, v]) => /^\d{4}-\d{2}-\d{2}$/.test(k) && isNum(v))
        .slice(-400)
        .map(([k, v]) => [k, clamp(v, 0, 1e6, 0)]),
    ),
    friends: (Array.isArray(x.friends) ? x.friends : [])
      .slice(0, MAX_FRIEND_CARDS)
      .map(cleanFriendCard)
      .filter((f): f is FriendCard => !!f),
  };
}

/** Ripristina un backup sostituendo tutti i dati attuali. Restituisce il numero di animali. */
export async function importBackup(file: File): Promise<number> {
  let data: BackupFile;
  try {
    data = JSON.parse(await file.text());
  } catch {
    throw new Error('Il file non è un backup valido.');
  }
  if (data?.app !== APP_ID || !Array.isArray(data.animals) || !Array.isArray(data.photos)) {
    throw new Error('Questo file non è un backup di Zampe in Giro.');
  }
  if (data.animals.length > MAX_ANIMALS) throw new Error('Il backup è troppo grande.');
  const animals = data.animals.map(cleanAnimal).filter((a): a is Animal => !!a);
  const needed = new Set(animals.flatMap((a) => a.encounters.map((e) => e.photoId)));
  const photos: PhotoRecord[] = await Promise.all(
    data.photos
      .filter((p) => isId(p?.id) && needed.has(p.id))
      .map(async (p) => ({ id: p.id, card: await dataUrlToBlob(p.card), thumb: await dataUrlToBlob(p.thumb) })),
  );
  await replaceAll(animals, photos, cleanPlayer(data.player));
  forgetPhotos();
  return animals.length;
}
