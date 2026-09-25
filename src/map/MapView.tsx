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
import { useTheme } from '../ui/theme';
import { Ambient } from './Ambient';
import { dayPhase, skyColors } from './ambient';
import { accentColor, DEFAULT_ACCENT, getAccent, hsl } from '../ui/accents';

// Il worker di MapLibre va impacchettato da Vite insieme alle sue dipendenze.
maplibregl.setWorkerUrl(mapWorkerUrl);

// Vecchia cache dei riquadri (conteneva anche quelli di CARTO, che ora chiede una chiave).
if (typeof caches !== 'undefined') void caches.delete('map-tiles').catch(() => {});

// Mappa gratuita: stile vettoriale OpenFreeMap (dati OpenStreetMap), senza chiavi.
const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

// Piano B se OpenFreeMap non risponde: le immagini della mappa di OpenStreetMap
// (gratis, senza chiave; si usano solo in caso di emergenza).
const FALLBACK_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
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

type Palette = typeof DAY;

const DAY = {
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
  halo: '#ffffff',
};

// Di sera: viola notte, con strade chiare e parchi verde scuro.
const NIGHT: Palette = {
  land: '#1f1a33',
  residential: '#241e3b',
  park: '#1f3a33',
  wood: '#1c3830',
  water: '#1b2b4a',
  building: '#2e2749',
  buildingTop: '#352d55',
  road: '#4a3f70',
  roadMajor: '#5b4e86',
  casing: '#2a2345',
  rail: '#3d3560',
  label: '#cfc3ee',
  halo: '#1f1a33',
};

function setPaint(map: maplibregl.Map, id: string, prop: string, value: string | number) {
  try {
    map.setPaintProperty(id, prop as Parameters<maplibregl.Map["setPaintProperty"]>[1], value);
  } catch {
    /* proprietà non supportata da questo livello */
  }
}

/** Tavolozza della mappa nel colore scelto (il lilla usa quella disegnata a mano). */
function paletteFor(accentId: string, dark: boolean): Palette {
  if (accentId === DEFAULT_ACCENT) return dark ? NIGHT : DAY;
  const { h } = getAccent(accentId);
  if (dark) {
    return {
      ...NIGHT,
      land: hsl(h, 33, 15),
      residential: hsl(h, 32, 17),
      building: hsl(h, 30, 22),
      buildingTop: hsl(h, 31, 25),
      road: hsl(h, 28, 34),
      roadMajor: hsl(h, 27, 42),
      casing: hsl(h, 33, 20),
      rail: hsl(h, 29, 29),
      label: hsl(h, 60, 85),
      halo: hsl(h, 33, 15),
    };
  }
  return {
    ...DAY,
    land: hsl(h, 60, 96),
    residential: hsl(h, 48, 94),
    building: hsl(h, 45, 90),
    buildingTop: hsl(h, 50, 92),
    roadMajor: hsl(h, 100, 99),
    casing: hsl(h, 50, 87),
    rail: hsl(h, 30, 81),
    label: hsl(h, 20, 38),
  };
}

function applyGameStyle(map: maplibregl.Map, dark: boolean, accentId: string) {
  const PALETTE = paletteFor(accentId, dark);
  const accent = accentColor(accentId);
  for (const id of ['zones-fill', 'zones-line']) {
    if (map.getLayer(id)) setPaint(map, id, id === 'zones-fill' ? 'fill-color' : 'line-color', accent);
  }
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
        setPaint(map, id, 'text-halo-color', PALETTE.halo);
        break;
      case 'raster':
        // Mappa di riserva (immagini): la si ammorbidisce verso il pastello.
        setPaint(map, id, 'raster-saturation', -0.35);
        setPaint(map, id, 'raster-brightness-min', dark ? 0 : 0.12);
        setPaint(map, id, 'raster-brightness-max', dark ? 0.45 : 1);
        setPaint(map, id, 'raster-hue-rotate', 12);
        break;
    }
  }
}

function addGameLayers(map: maplibregl.Map) {
  if (map.getSource('zones')) return;
  map.addSource('zones', { type: 'geojson', data: EMPTY });
  map.addSource('accuracy', { type: 'geojson', data: EMPTY });
  map.addSource('home', { type: 'geojson', data: EMPTY });
  map.addLayer({ id: 'home-fill', type: 'fill', source: 'home', paint: { 'fill-color': '#ff7aa3', 'fill-opacity': 0.1 } });
  map.addLayer({
    id: 'home-line',
    type: 'line',
    source: 'home',
    paint: { 'line-color': '#ff5d8f', 'line-opacity': 0.5, 'line-width': 2, 'line-dasharray': [1, 2] },
  });
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

/** Segnaposto unico per gli animali della zona privata (la loro posizione precisa non esiste). */
function homeMarkerEl(count: number): HTMLElement {
  const el = document.createElement('button');
  el.className = 'home-marker';
  el.setAttribute('aria-label', 'Zona privata di casa');
  el.innerHTML =
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/></svg>';
  if (count) {
    const b = document.createElement('span');
    b.className = 'count';
    b.textContent = String(count);
    el.appendChild(b);
  }
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    go('collezione');
  });
  return el;
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

export function MapView({ active = true }: { active?: boolean }) {
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
  const home = useGame((s) => s.player.home);
  const homeMarker = useRef<maplibregl.Marker | null>(null);

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

    // Si passa al piano B solo se lo stile principale non arriva proprio: un singolo
    // riquadro lento o non scaricato non deve cambiare mappa.
    let fallback = false;
    const useFallback = () => {
      if (fallback || mapApi.ready) return;
      fallback = true;
      map.setStyle(FALLBACK_STYLE);
    };
    const timer = setTimeout(useFallback, 15000);
    map.on('error', (e) => {
      if (!mapApi.ready && /style|Failed to fetch|NetworkError/i.test(String(e.error?.message ?? ''))) useFallback();
    });
    map.on('style.load', () => {
      mapApi.ready = true;
      clearTimeout(timer);
      addGameLayers(map);
      applyGameStyle(map, useTheme.getState().dark, useTheme.getState().accent);
      setStyleReady((n) => n + 1);
    });
    // Se il giocatore sposta la mappa col dito smettiamo di seguirlo.
    map.on('dragstart', () => mapApi.setFollow(false));

    return () => {
      clearTimeout(timer);
      map.remove();
      mapRef.current = null;
      mapApi.map = null;
      mapApi.ready = false;
      // I segnaposto appartenevano alla mappa appena distrutta.
      playerRef.current = null;
      markers.current.clear();
      homeMarker.current = null;
    };
  }, []);

  // Senza posizione (GPS acceso solo per le foto) niente segnaposto del giocatore:
  // la mappa parte dall'ultimo animale trovato.
  const centered = useRef(false);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || fix) return;
    playerRef.current?.marker.remove();
    playerRef.current = null;
    (map.getSource('accuracy') as GeoJSONSource | undefined)?.setData(EMPTY);
    if (centered.current) return;
    const last = [...animals].sort((a, b) => b.encounters[b.encounters.length - 1].at - a.encounters[a.encounters.length - 1].at)[0];
    if (!last) return;
    centered.current = true;
    const [lng, lat] = lastSeen(last);
    map.jumpTo({ center: [lng, lat], zoom: 15.5, pitch: 40 });
  }, [fix, animals, styleReady]);

  // Segnaposto del giocatore e cerchio di precisione.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !fix) return;
    centered.current = true;
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

  // Giorno e notte.
  const dark = useTheme((s) => s.dark);
  const accent = useTheme((s) => s.accent);
  useEffect(() => {
    const map = mapRef.current;
    if (map && mapApi.ready) applyGameStyle(map, dark, accent);
  }, [dark, accent, styleReady]);

  // Cielo (si vede inclinando la mappa): cambia con l'ora del giorno.
  const [skyPhase, setSkyPhase] = useState(dayPhase());
  useEffect(() => {
    const t = setInterval(() => setSkyPhase(dayPhase()), 60000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapApi.ready) return;
    const c = skyColors(dark && skyPhase === 'day' ? 'night' : skyPhase, getAccent(accent).h);
    try {
      map.setSky({ 'sky-color': c.top, 'horizon-color': c.horizon, 'fog-color': c.fog, 'sky-horizon-blend': 0.6, 'horizon-fog-blend': 0.7, 'fog-ground-blend': 0.4 });
    } catch {
      /* cielo non supportato */
    }
  }, [dark, accent, skyPhase, styleReady]);

  // Zone esplorate.
  useEffect(() => {
    (mapRef.current?.getSource('zones') as GeoJSONSource | undefined)?.setData(zonesGeoJSON(zones));
  }, [zones, styleReady]);

  // Zona privata di casa: cerchio e un segnaposto con il numero di animali "di casa".
  const homeCount = animals.filter((a) => a.encounters[a.encounters.length - 1].priv).length;
  useEffect(() => {
    const map = mapRef.current;
    (map?.getSource('home') as GeoJSONSource | undefined)?.setData(home ? circle(home.lng, home.lat, home.r) : EMPTY);
    homeMarker.current?.remove();
    homeMarker.current = null;
    if (map && home) homeMarker.current = new maplibregl.Marker({ element: homeMarkerEl(homeCount) }).setLngLat([home.lng, home.lat]).addTo(map);
  }, [home, homeCount, styleReady]);

  // Animali catturati sulla mappa, nel punto dell'ultimo incontro (quelli di casa no).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const current = markers.current;
    const seen = new Set<string>();
    for (const a of animals) {
      if (a.encounters[a.encounters.length - 1].priv) continue;
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
      <Ambient active={active} />
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
