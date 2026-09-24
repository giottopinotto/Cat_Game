import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Animal } from '../data/types';

export interface PhotoRecord {
  id: string;
  card: Blob;
  thumb: Blob;
}

interface ZampeDB extends DBSchema {
  animals: { key: string; value: Animal };
  photos: { key: string; value: PhotoRecord };
  kv: { key: string; value: unknown };
}

let dbPromise: Promise<IDBPDatabase<ZampeDB>> | null = null;

function db() {
  dbPromise ??= openDB<ZampeDB>('zampe-in-giro', 1, {
    upgrade(d) {
      d.createObjectStore('animals', { keyPath: 'id' });
      d.createObjectStore('photos', { keyPath: 'id' });
      d.createObjectStore('kv');
    },
  });
  return dbPromise;
}

export async function loadAnimals(): Promise<Animal[]> {
  return (await db()).getAll('animals');
}

export async function saveAnimal(a: Animal): Promise<void> {
  await (await db()).put('animals', a);
}

export async function deleteAnimal(a: Animal): Promise<void> {
  const d = await db();
  const tx = d.transaction(['animals', 'photos'], 'readwrite');
  await tx.objectStore('animals').delete(a.id);
  for (const e of a.encounters) await tx.objectStore('photos').delete(e.photoId);
  await tx.done;
}

export async function savePhoto(p: PhotoRecord): Promise<void> {
  await (await db()).put('photos', p);
}

export async function getPhoto(id: string): Promise<PhotoRecord | undefined> {
  return (await db()).get('photos', id);
}

export async function getAllPhotos(): Promise<PhotoRecord[]> {
  return (await db()).getAll('photos');
}

export async function kvGet<T>(key: string): Promise<T | undefined> {
  return (await (await db()).get('kv', key)) as T | undefined;
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  await (await db()).put('kv', value, key);
}

/** Sostituisce tutti i dati (usato dal ripristino del backup). */
export async function replaceAll(animals: Animal[], photos: PhotoRecord[], player: unknown): Promise<void> {
  const d = await db();
  const tx = d.transaction(['animals', 'photos', 'kv'], 'readwrite');
  await tx.objectStore('animals').clear();
  await tx.objectStore('photos').clear();
  for (const a of animals) await tx.objectStore('animals').put(a);
  for (const p of photos) await tx.objectStore('photos').put(p);
  await tx.objectStore('kv').put(player, 'player');
  await tx.done;
}

export async function wipeAll(): Promise<void> {
  const d = await db();
  const tx = d.transaction(['animals', 'photos', 'kv'], 'readwrite');
  await Promise.all([tx.objectStore('animals').clear(), tx.objectStore('photos').clear(), tx.objectStore('kv').clear()]);
  await tx.done;
}

/** Chiede al browser di non cancellare i dati quando lo spazio scarseggia. */
export async function requestPersistence(): Promise<void> {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist();
  } catch {
    /* non supportato: pazienza */
  }
}
