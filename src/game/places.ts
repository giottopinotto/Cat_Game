// Nome della via / quartiere dove è avvenuto un incontro, tramite Nominatim
// (OpenStreetMap, gratuito). Una richiesta per cattura, con cache in memoria.

const cache = new Map<string, string | undefined>();
let last = 0;

interface NominatimResult {
  address?: Record<string, string>;
}

function label(addr: Record<string, string>): string | undefined {
  const street = addr.road ?? addr.pedestrian ?? addr.footway ?? addr.path ?? addr.square;
  const area = addr.park ?? addr.leisure;
  const town = addr.city ?? addr.town ?? addr.village ?? addr.municipality ?? addr.county;
  const near = street ?? area ?? addr.suburb ?? addr.neighbourhood ?? addr.quarter;
  return [near, town].filter(Boolean).join(', ') || undefined;
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | undefined> {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (cache.has(key)) return cache.get(key);
  // Regola d'uso di Nominatim: al massimo una richiesta al secondo.
  const wait = last + 1100 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  last = Date.now();
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=17&accept-language=it&lat=${lat}&lon=${lng}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return undefined;
    const data = (await res.json()) as NominatimResult;
    const name = data.address ? label(data.address) : undefined;
    cache.set(key, name);
    return name;
  } catch {
    return undefined;
  }
}
