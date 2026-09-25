import { create } from 'zustand';

export type GeoStatus = 'idle' | 'waiting' | 'ok' | 'denied' | 'unavailable';

export interface Fix {
  lat: number;
  lng: number;
  accuracy: number;
  heading: number | null;
  /** Velocità in m/s (se il dispositivo la fornisce). */
  speed: number | null;
  at: number;
}

interface LocationState {
  status: GeoStatus;
  fix: Fix | null;
  error: string | null;
}

export const useLocation = create<LocationState>(() => ({ status: 'idle', fix: null, error: null }));

/** Precisione massima (metri) accettata per registrare una cattura. */
export const CAPTURE_MAX_ACCURACY = 150;

type Listener = (fix: Fix) => void;
const listeners = new Set<Listener>();
let watchId: number | null = null;

export function onFix(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Avvia (una volta sola) il monitoraggio della posizione. */
export function startLocation(): void {
  if (watchId !== null) return;
  if (!('geolocation' in navigator)) {
    useLocation.setState({ status: 'unavailable', error: 'Il tuo dispositivo non supporta la geolocalizzazione.' });
    return;
  }
  if (useLocation.getState().status !== 'ok') useLocation.setState({ status: 'waiting', error: null });
  watchId = navigator.geolocation.watchPosition(
    (p) => {
      const fix: Fix = {
        lat: p.coords.latitude,
        lng: p.coords.longitude,
        accuracy: p.coords.accuracy,
        heading: p.coords.heading ?? null,
        speed: p.coords.speed ?? null,
        at: p.timestamp || Date.now(),
      };
      useLocation.setState({ status: 'ok', fix, error: null });
      listeners.forEach((l) => l(fix));
    },
    (err) => {
      if (err.code === err.PERMISSION_DENIED) {
        stopLocation();
        useLocation.setState({ status: 'denied', error: 'Hai negato il permesso di usare la posizione.' });
      } else if (!useLocation.getState().fix) {
        useLocation.setState({
          status: 'waiting',
          error: err.code === err.TIMEOUT ? 'Il GPS ci sta mettendo un po\'…' : 'Posizione non disponibile al momento.',
        });
      }
    },
    { enableHighAccuracy: true, maximumAge: 3000, timeout: 20000 },
  );
}

export function stopLocation(): void {
  if (watchId !== null) navigator.geolocation.clearWatch(watchId);
  watchId = null;
}

/** Spegne il GPS e dimentica l'ultima posizione (modalità "posizione solo per le foto"). */
export function releaseLocation(): void {
  stopLocation();
  if (useLocation.getState().status !== 'denied') useLocation.setState({ status: 'idle', fix: null, error: null });
}

/** Riprova dopo un rifiuto (serve un gesto dell'utente su alcuni browser). */
export function retryLocation(): void {
  stopLocation();
  useLocation.setState({ status: 'waiting', error: null });
  startLocation();
}

/** Oltre ~25 km/h si è su un veicolo: niente catture (e mai giocare mentre si guida!). */
export const MAX_CAPTURE_SPEED = 7;

export function tooFast(fix: Fix | null): boolean {
  return !!fix && fix.speed !== null && fix.speed > MAX_CAPTURE_SPEED && Date.now() - fix.at < 30000;
}

export function captureFixOk(fix: Fix | null): fix is Fix {
  return !!fix && fix.accuracy <= CAPTURE_MAX_ACCURACY && Date.now() - fix.at < 2 * 60 * 1000;
}

/** Aspetta una posizione buona per la cattura (null se non arriva entro `ms`). */
export function waitForFix(ms: number): Promise<Fix | null> {
  const now = useLocation.getState().fix;
  if (captureFixOk(now)) return Promise.resolve(now);
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      unsub();
      resolve(null);
    }, ms);
    const unsub = useLocation.subscribe((s) => {
      if (captureFixOk(s.fix) || s.status === 'denied' || s.status === 'unavailable') {
        clearTimeout(timer);
        unsub();
        resolve(captureFixOk(s.fix) ? s.fix : null);
      }
    });
  });
}
