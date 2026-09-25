import * as maplibregl from 'maplibre-gl';
import type { GeoJSONSource, MapGeoJSONFeature, StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { useEffect, useRef, useState } from 'react';
import { create } from 'zustand';
import { RARITY_INFO, type Animal } from '../data/types';
import { hexPolygon } from '../game/geo';
import { useLocation, type Fix } from '../game/location';
import { photoUrl } from '../game/photos';
import { useGame } from '../game/store';
import { go } from '../router';
import { avatarSvg } from '../ui/avatars';
import { IconBubble } from '../ui/icons';

// Il worker di MapLibre va impacchettato da Vite insieme alle sue dipendenze.
maplibregl.setWorkerUrl(mapWorkerUrl);

// Mappa gratuita: stile vettoriale OpenFreeMap (dati OpenStreetMap), senza chiavi.
const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

// Piano B se OpenFreeMap non risponde: tile raster di CARTO (dati OpenStreetMap).
const FALLBACK_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
};

const ITALY: [number, number] = [12.5, 42.3];
const PLAY_ZOOM = 17;
const PLAY_PITCH = 55;

/** La mappa segue il giocatore finché non la si sposta col dito. */
export const useFollow = create<{ on: boolean }>(() => ({ on: true }));

/** Accesso alla mappa dal resto dell'app (centratura, riconoscimento parchi). */
export const mapApi = {
  map: null as maplibregl.Map | null,
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
    if (!map || !map.isStyleLoaded()) return false;
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

function circle(lng: number, lat: number, radiusM: number): GeoJSON.Feature<GeoJSON.Polygon> {
  const pts: [number, number][] = [];
  const dLat = radiusM / 111320;
  const dLng = radiusM / (111320 * Math.cos((lat * Math.PI) / 180));
  for (let i = 0; i <= 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    pts.push([lng + dLng * Math.cos(a), lat + dLat * Math.sin(a)]);
  }
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [pts] } };
}

function zonesGeoJSON(zones: string[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: zones.map((z) => {
      const [q, r] = z.split(',').map(Number);
      return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [hexPolygon(q, r)] } };
    }),
  };
}

const EMPTY: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };

// ---- Stile "da gioco": toni pastello lilla e menta ------------------------
// Si ricolorano i livelli della mappa in base al tipo e al nome; se un livello
// non esiste o non accetta il colore, lo si lascia com'è.

const PALETTE = {
  land: '#f4effb',
  residential: '#efe8f8',
  park: '#d3f0dd',
  wood: '#c4e8d0',
  water: '#c3e2f6',
  building: '#e3d9f3',
  buildingTop: '#e9e1f7',
  road: '#ffffff',
  roadMajor: '#fdf8ff',
  casing: '#d9cdef',
  rail: '#cbbfe0',
  label: '#5a5078',
};

function setPaint(map: maplibregl.Map, id: string, prop: string, value: string | number) {
  try {
    map.setPaintProperty(id, prop as Parameters<maplibregl.Map["setPaintProperty"]>[1], value);
  } catch {
    /* proprietà non supportata da questo livello */
  }
}

function applyGameStyle(map: maplibregl.Map) {
  for (const layer of map.getStyle().layers ?? []) {
    const id = layer.id;
    const name = id.toLowerCase();
    switch (layer.type) {
      case 'background':
        setPaint(map, id, 'background-color', PALETTE.land);
        break;
      case 'fill':
        if (/water|ocean|lake|river/.test(name)) setPaint(map, id, 'fill-color', PALETTE.water);
        else if (/wood|forest/.test(name)) setPaint(map, id, 'fill-color', PALETTE.wood);
        else if (/park|grass|garden|pitch|meadow|scrub|cemetery|golf|landcover/.test(name)) setPaint(map, id, 'fill-color', PALETTE.park);
        else if (/building/.test(name)) setPaint(map, id, 'fill-color', PALETTE.building);
        else if (/residential|landuse|suburb|neighbourhood/.test(name)) setPaint(map, id, 'fill-color', PALETTE.residential);
        break;
      case 'fill-extrusion':
        setPaint(map, id, 'fill-extrusion-color', PALETTE.buildingTop);
        setPaint(map, id, 'fill-extrusion-opacity', 0.85);
        break;
      case 'line':
        if (/water|river|stream|canal/.test(name)) setPaint(map, id, 'line-color', PALETTE.water);
        else if (/rail|transit/.test(name)) setPaint(map, id, 'line-color', PALETTE.rail);
        else if (/casing|outline/.test(name)) setPaint(map, id, 'line-color', PALETTE.casing);
        else if (/motorway|trunk|primary/.test(name)) setPaint(map, id, 'line-color', PALETTE.roadMajor);
        else if (/road|street|highway|secondary|tertiary|minor|service|path|track|bridge|tunnel/.test(name)) setPaint(map, id, 'line-color', PALETTE.road);
        break;
      case 'symbol':
        setPaint(map, id, 'text-color', PALETTE.label);
        setPaint(map, id, 'text-halo-color', '#ffffff');
        break;
      case 'raster':
        // Mappa di riserva (immagini): la si ammorbidisce verso il pastello.
        setPaint(map, id, 'raster-saturation', -0.35);
        setPaint(map, id, 'raster-brightness-min', 0.12);
        setPaint(map, id, 'raster-hue-rotate', 12);
        break;
    }
  }
}

function addGameLayers(map: maplibregl.Map) {
  if (map.getSource('zones')) return;
  map.addSource('zones', { type: 'geojson', data: EMPTY });
  map.addSource('accuracy', { type: 'geojson', data: EMPTY });
  map.addLayer({ id: 'zones-fill', type: 'fill', source: 'zones', paint: { 'fill-color': '#9f7aea', 'fill-opacity': 0.12 } });
  map.addLayer({
    id: 'zones-line',
    type: 'line',
    source: 'zones',
    paint: { 'line-color': '#9f7aea', 'line-opacity': 0.4, 'line-width': 1.5, 'line-dasharray': [2, 2] },
  });
  map.addLayer({ id: 'accuracy-fill', type: 'fill', source: 'accuracy', paint: { 'fill-color': '#15b3a2', 'fill-opacity': 0.12 } });
}

/** Posizione più recente in cui è stato visto un animale. */
function lastSeen(a: Animal): [number, number] {
  const e = a.encounters[a.encounters.length - 1];
  return [e.lng, e.lat];
}

function animalMarkerEl(a: Animal): HTMLElement {
  const el = document.createElement('button');
  el.className = `animal-marker r-${a.rarity}`;
  el.setAttribute('aria-label', a.name);
  el.style.setProperty('--rarity', RARITY_INFO[a.rarity].color);
  const ring = document.createElement('div');
  ring.className = 'ring';
  const img = document.createElement('img');
  img.alt = '';
  ring.appendChild(img);
  const tip = document.createElement('div');
  tip.className = 'tip';
  el.append(ring, tip);
  void photoUrl(a.coverPhotoId, 'thumb').then((u) => u && (img.src = u));
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    go(`animale/${a.id}`);
  });
  return el;
}

export function MapView() {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const playerRef = useRef<{ marker: maplibregl.Marker; el: HTMLElement } | null>(null);
  const markers = useRef(new Map<string, { marker: maplibregl.Marker; key: string }>());
  const [failed, setFailed] = useState(false);
  const [styleReady, setStyleReady] = useState(0);
  const fix = useLocation((s) => s.fix);
  const animals = useGame((s) => s.animals);
  const zones = useGame((s) => s.player.zones);
  const avatar = useGame((s) => s.player.avatar);

  // Creazione della mappa (una volta sola).
  useEffect(() => {
    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: container.current!,
        style: STYLE_URL,
        center: ITALY,
        zoom: 5,
        attributionControl: { compact: true },
        maxPitch: 70,
      });
    } catch {
      setFailed(true);
      return;
    }
    mapRef.current = map;
    mapApi.map = map;

    let fallback = false;
    const useFallback = () => {
      if (fallback || map.isStyleLoaded()) return;
      fallback = true;
      map.setStyle(FALLBACK_STYLE);
    };
    const timer = setTimeout(useFallback, 10000);
    map.on('error', (e) => {
      if (!map.isStyleLoaded() && /style|Failed to fetch|NetworkError/i.test(String(e.error?.message ?? ''))) useFallback();
    });
    map.on('style.load', () => {
      applyGameStyle(map);
      addGameLayers(map);
      setStyleReady((n) => n + 1);
    });
    // Se il giocatore sposta la mappa col dito smettiamo di seguirlo.
    map.on('dragstart', () => mapApi.setFollow(false));

    return () => {
      clearTimeout(timer);
      map.remove();
      mapRef.current = null;
      mapApi.map = null;
      // I segnaposto appartenevano alla mappa appena distrutta.
      playerRef.current = null;
      markers.current.clear();
    };
  }, []);

  // Segnaposto del giocatore e cerchio di precisione.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !fix) return;
    if (!playerRef.current) {
      const el = document.createElement('div');
      el.className = 'player-marker';
      el.innerHTML = '<div class="pulse"></div><div class="heading" hidden></div><div class="dot"></div>';
      const marker = new maplibregl.Marker({ element: el }).setLngLat([fix.lng, fix.lat]).addTo(map);
      playerRef.current = { marker, el };
      map.jumpTo({ center: [fix.lng, fix.lat], zoom: PLAY_ZOOM, pitch: PLAY_PITCH });
    }
    const { marker, el } = playerRef.current;
    marker.setLngLat([fix.lng, fix.lat]);
    const heading = el.querySelector<HTMLElement>('.heading')!;
    heading.hidden = fix.heading === null || Number.isNaN(fix.heading);
    if (!heading.hidden) heading.style.transform = `rotate(${fix.heading}deg)`;
    (map.getSource('accuracy') as GeoJSONSource | undefined)?.setData(circle(fix.lng, fix.lat, Math.min(fix.accuracy, 300)));
    if (useFollow.getState().on) map.easeTo({ center: [fix.lng, fix.lat], duration: 900 });
  }, [fix, styleReady]);

  useEffect(() => {
    const dot = playerRef.current?.el.querySelector('.dot');
    if (dot) dot.innerHTML = avatarSvg(avatar);
  }, [avatar, fix !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  // Zone esplorate.
  useEffect(() => {
    (mapRef.current?.getSource('zones') as GeoJSONSource | undefined)?.setData(zonesGeoJSON(zones));
  }, [zones, styleReady]);

  // Animali catturati sulla mappa, nel punto dell'ultimo incontro.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const current = markers.current;
    const seen = new Set<string>();
    for (const a of animals) {
      seen.add(a.id);
      const key = `${a.coverPhotoId}|${a.rarity}|${a.encounters.length}`;
      const existing = current.get(a.id);
      if (existing?.key === key) continue;
      existing?.marker.remove();
      const marker = new maplibregl.Marker({ element: animalMarkerEl(a), anchor: 'bottom' }).setLngLat(lastSeen(a)).addTo(map);
      current.set(a.id, { marker, key });
    }
    for (const [id, m] of current) {
      if (!seen.has(id)) {
        m.marker.remove();
        current.delete(id);
      }
    }
  }, [animals]);

  return (
    <div className="map-wrap">
      <div ref={container} style={{ position: 'absolute', inset: 0 }} />
      {failed && (
        <div className="map-fallback">
          <div>
            <div style={{ marginBottom: 8 }}>
              <IconBubble name="map" size={64} />
            </div>
            La mappa non è disponibile su questo dispositivo, ma puoi comunque catturare animali!
          </div>
        </div>
      )}
    </div>
  );
}

/** Riporta la mappa sul giocatore e riattiva l'inseguimento. */
export function recenter(fix: Fix | null) {
  mapApi.setFollow(true);
  if (fix) mapApi.map?.flyTo({ center: [fix.lng, fix.lat], zoom: PLAY_ZOOM, pitch: PLAY_PITCH, bearing: 0, duration: 900 });
}
