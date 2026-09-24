export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_R = 6371000;
const toRad = (d: number) => (d * Math.PI) / 180;

/** Distanza in metri tra due punti (formula dell'emisenoverso). */
export function distanceM(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(m < 10000 ? 1 : 0).replace('.', ',')} km`;
}

// ---- Griglia esagonale delle "zone" da esplorare -------------------------
// Si lavora in coordinate Web Mercator (metri); un esagono di 200 m Mercator
// misura circa 140 m reali alle latitudini italiane.

const MERC_R = 6378137;
const HEX_SIZE = 200;
const SQRT3 = Math.sqrt(3);

function toMerc(p: LatLng): [number, number] {
  const x = (MERC_R * p.lng * Math.PI) / 180;
  const y = MERC_R * Math.log(Math.tan(Math.PI / 4 + (p.lat * Math.PI) / 360));
  return [x, y];
}

function fromMerc(x: number, y: number): [number, number] {
  const lng = ((x / MERC_R) * 180) / Math.PI;
  const lat = ((2 * Math.atan(Math.exp(y / MERC_R)) - Math.PI / 2) * 180) / Math.PI;
  return [lng, lat];
}

function roundHex(q: number, r: number): [number, number] {
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  const rs = Math.round(s);
  const dq = Math.abs(rq - q);
  const dr = Math.abs(rr - r);
  const ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds) rr = -rq - rs;
  return [rq, rr];
}

export function hexOf(p: LatLng): [number, number] {
  const [x, y] = toMerc(p);
  const q = ((SQRT3 / 3) * x - y / 3) / HEX_SIZE;
  const r = ((2 / 3) * y) / HEX_SIZE;
  return roundHex(q, r);
}

export function hexId(p: LatLng): string {
  const [q, r] = hexOf(p);
  return `${q},${r}`;
}

/** Anello chiuso [lng, lat] dei vertici di un esagono. */
export function hexPolygon(q: number, r: number): [number, number][] {
  const cx = HEX_SIZE * (SQRT3 * q + (SQRT3 / 2) * r);
  const cy = HEX_SIZE * 1.5 * r;
  const ring: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30);
    ring.push(fromMerc(cx + HEX_SIZE * Math.cos(a), cy + HEX_SIZE * Math.sin(a)));
  }
  ring.push(ring[0]);
  return ring;
}

/** Tutti gli esagoni entro k passi da (q, r). */
export function hexesAround(q: number, r: number, k: number): [number, number][] {
  const out: [number, number][] = [];
  for (let dq = -k; dq <= k; dq++) {
    for (let dr = Math.max(-k, -dq - k); dr <= Math.min(k, -dq + k); dr++) {
      out.push([q + dq, r + dr]);
    }
  }
  return out;
}
