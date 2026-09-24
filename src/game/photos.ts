import { useEffect, useState } from 'react';
import { getPhoto } from './db';

export type PhotoKind = 'card' | 'thumb';

// Le foto stanno in IndexedDB come Blob: qui si crea (una volta sola) l'URL
// temporaneo da usare nei tag <img>.
const urls = new Map<string, Promise<string | null>>();

export function photoUrl(id: string, kind: PhotoKind): Promise<string | null> {
  const key = `${id}:${kind}`;
  let p = urls.get(key);
  if (!p) {
    p = getPhoto(id).then((rec) => (rec ? URL.createObjectURL(rec[kind]) : null));
    urls.set(key, p);
  }
  return p;
}

export function forgetPhotos(): void {
  for (const p of urls.values()) void p.then((u) => u && URL.revokeObjectURL(u));
  urls.clear();
}

export function usePhoto(id: string | undefined, kind: PhotoKind): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    if (!id) {
      setUrl(null);
      return;
    }
    void photoUrl(id, kind).then((u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, [id, kind]);
  return url;
}
