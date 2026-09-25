import { distanceM, type LatLng } from './geo';

// Zona privata di casa: dentro questo cerchio le catture non salvano il punto
// preciso ma solo il centro della zona, che a sua volta è spostato a caso
// rispetto alla posizione reale. Così né la mappa né un backup rivelano dove abiti.

export interface HomeZone {
  lat: number;
  lng: number;
  /** Raggio in metri. */
  r: number;
}

export const HOME_RADII = [150, 300, 500] as const;

/** Crea la zona attorno a `real`, con il centro spostato a caso fino a un terzo del raggio. */
export function makeHomeZone(real: LatLng, r: number, rand: () => number = Math.random): HomeZone {
  const dist = r * (0.15 + 0.2 * rand());
  const angle = rand() * Math.PI * 2;
  const dLat = (dist * Math.sin(angle)) / 111320;
  const dLng = (dist * Math.cos(angle)) / (111320 * Math.cos((real.lat * Math.PI) / 180));
  // Arrotondato a circa 10 m: non serve più precisione.
  const round = (v: number) => Math.round(v * 1e4) / 1e4;
  return { lat: round(real.lat + dLat), lng: round(real.lng + dLng), r };
}

export function inHome(home: HomeZone | null | undefined, p: LatLng): boolean {
  return !!home && distanceM(home, p) <= home.r;
}

/** Posizione da salvare per una cattura: quella vera, o il centro della zona se si è a casa. */
export function privatize<T extends LatLng & { priv?: boolean }>(home: HomeZone | null | undefined, p: T): T {
  return inHome(home, p) ? { ...p, lat: home!.lat, lng: home!.lng, priv: true } : p;
}

export function isHomeZone(v: unknown): v is HomeZone {
  const x = v as HomeZone | null;
  return (
    !!x &&
    typeof x.lat === 'number' &&
    typeof x.lng === 'number' &&
    Math.abs(x.lat) <= 90 &&
    Math.abs(x.lng) <= 180 &&
    (HOME_RADII as readonly number[]).includes(x.r)
  );
}
