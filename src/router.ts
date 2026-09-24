import { useSyncExternalStore } from 'react';

// Navigazione con l'hash dell'URL (#/collezione, #/animale/123...): funziona
// su qualsiasi hosting statico e il tasto "indietro" di Android fa la cosa giusta.

function current(): string {
  return decodeURIComponent(location.hash.replace(/^#\/?/, ''));
}

function subscribe(cb: () => void): () => void {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
}

export function useRoute(): string[] {
  const path = useSyncExternalStore(subscribe, current);
  return path ? path.split('/') : [];
}

let navigated = false;

export function go(path: string, replace = false): void {
  const hash = `#/${path}`;
  if (replace) history.replaceState(null, '', hash);
  else {
    navigated = true;
    location.hash = hash;
    return;
  }
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

/** Torna indietro nella cronologia dell'app, oppure alla mappa. */
export function back(fallback = ''): void {
  if (navigated && history.length > 1) history.back();
  else go(fallback, true);
}
