import type { Map as MapLibreMap, MapGeoJSONFeature } from 'maplibre-gl';
import { create } from 'zustand';
import type { Fix } from '../game/location';

// Accesso alla mappa dal resto dell'app. Sta in un file a parte, senza MapLibre,
// così la libreria della mappa (pesante) si carica solo quando serve disegnarla.

export const PLAY_ZOOM = 17;
export const PLAY_PITCH = 45;

/** La mappa segue il giocatore finché non la si sposta col dito. */
export const useFollow = create<{ on: boolean }>(() => ({ on: true }));

/** Accesso alla mappa dal resto dell'app (centratura, riconoscimento parchi). */
export const mapApi = {
  map: null as MapLibreMap | null,
  /** Lo stile della mappa è pronto (isStyleLoaded() resta falso finché si caricano i riquadri). */
  ready: false,
  setFollow(on: boolean) {
    useFollow.setState({ on });
  },
  flyTo(lng: number, lat: number) {
    this.setFollow(false);
    this.map?.flyTo({ center: [lng, lat], zoom: 18, pitch: PLAY_PITCH, duration: 1200 });
  },
  /** True se il punto cade dentro un parco o un giardino disegnato sulla mappa. */
  isInPark(lng: number, lat: number): boolean {
    const map = this.map;
    if (!map || !this.ready) return false;
    try {
      const p = map.project([lng, lat]);
      const c = map.getCanvas();
      if (p.x < 0 || p.y < 0 || p.x > c.clientWidth || p.y > c.clientHeight) return false;
      const feats = map.queryRenderedFeatures([
        [p.x - 3, p.y - 3],
        [p.x + 3, p.y + 3],
      ]);
      return feats.some(isParkFeature);
    } catch {
      return false;
    }
  },
};


const PARK_CLASSES = new Set(['park', 'garden', 'recreation_ground', 'village_green', 'dog_park', 'nature_reserve', 'playground']);

function isParkFeature(f: MapGeoJSONFeature): boolean {
  const props = f.properties ?? {};
  if (f.sourceLayer === 'park') return true;
  if (f.sourceLayer === 'landcover' || f.sourceLayer === 'landuse') {
    return PARK_CLASSES.has(String(props.subclass)) || PARK_CLASSES.has(String(props.class));
  }
  return false;
}

/** Riporta la mappa sul giocatore e riattiva l'inseguimento. */
export function recenter(fix: Fix | null) {
  mapApi.setFollow(true);
  if (fix) mapApi.map?.flyTo({ center: [fix.lng, fix.lat], zoom: PLAY_ZOOM, pitch: PLAY_PITCH, bearing: 0, duration: 900 });
}
