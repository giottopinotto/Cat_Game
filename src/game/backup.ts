import type { Animal } from '../data/types';
import { getAllPhotos, loadAnimals, kvGet, replaceAll, type PhotoRecord } from './db';
import { forgetPhotos } from './photos';
import { normalizePlayer, type PlayerData } from './store';

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
  if (typeof u !== 'string' || !u.startsWith('data:image/')) throw new Error('Il backup contiene una foto non valida.');
  return (await fetch(u)).blob();
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
  const photos: PhotoRecord[] = await Promise.all(
    data.photos.map(async (p) => ({ id: p.id, card: await dataUrlToBlob(p.card), thumb: await dataUrlToBlob(p.thumb) })),
  );
  await replaceAll(data.animals, photos, normalizePlayer(data.player));
  forgetPhotos();
  return data.animals.length;
}
