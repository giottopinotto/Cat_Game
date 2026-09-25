import { create } from 'zustand';
import { DEFAULT_AVATAR } from '../ui/avatars';
import { getEntry } from '../data/entries';
import { RARITIES, RARITY_INFO, rarityIndex, type Animal, type Encounter, type Rarity, type Species } from '../data/types';
import { BADGES, badgeTier, TIER_NAMES, TIER_XP, type BadgeDef } from './badges';
import { deleteAnimal, kvGet, kvSet, loadAnimals, requestPersistence, saveAnimal, savePhoto } from './db';
import { distanceM, hexId } from './geo';
import { onFix, type Fix } from './location';
import {
  ALL_DONE_BONUS,
  applyCaptureToMission,
  applyExploreToMission,
  applyWalkToMission,
  generateDailyMissions,
  missionDone,
  missionIcon,
  missionText,
  type CaptureEvent,
  type Mission,
} from './missions';
import { dayKey, friendshipLevel, levelInfo, makeStats } from './progress';
import { badgeSummary } from './summary';

export interface DailyMissions {
  day: string;
  list: Mission[];
  bonusClaimed: boolean;
}

export interface PlayerData {
  name: string;
  avatar: string;
  xp: number;
  createdAt: number;
  onboarded: boolean;
  walkedM: number;
  zones: string[];
  activeDays: string[];
  missions: DailyMissions;
  missionsDone: number;
  badgeTiers: Record<string, number>;
}

export interface Reward {
  icon: string;
  label: string;
  xp: number;
}

export interface CaptureDraft {
  species: Species;
  entryId: string;
  name: string;
  heterochromia: boolean;
  card: Blob;
  thumb: Blob;
  lat: number;
  lng: number;
  park: boolean;
}

export interface CaptureOutcome {
  animal: Animal;
  isNew: boolean;
  newEntry: boolean;
  sameDay: boolean;
  rewards: Reward[];
  xpBefore: number;
  xpAfter: number;
  friendshipBefore: number;
  friendshipAfter: number;
  missionsCompleted: Mission[];
  badges: { badge: BadgeDef; tier: number }[];
}

export interface Toast {
  id: number;
  icon: string;
  text: string;
}

export type Celebration = { kind: 'level'; level: number } | { kind: 'badge'; badge: BadgeDef; tier: number };

interface GameState {
  ready: boolean;
  player: PlayerData;
  animals: Animal[];
  toasts: Toast[];
  celebrations: Celebration[];
  init(): Promise<void>;
  finishOnboarding(name: string, avatar: string): void;
  updateProfile(name: string, avatar: string): void;
  ensureToday(): void;
  captureNew(d: CaptureDraft): Promise<CaptureOutcome>;
  reencounter(animalId: string, d: CaptureDraft): Promise<CaptureOutcome>;
  renameAnimal(id: string, name: string): void;
  setCover(id: string, photoId: string): void;
  releaseAnimal(id: string): Promise<void>;
  toast(icon: string, text: string): void;
  dismissToast(id: number): void;
  dismissCelebration(): void;
  /** Nuova posizione GPS: camminata, zone esplorate e relative sfide. */
  handleFix(fix: Fix): void;
}

export const XP_NEW_ENTRY = 100;
export const XP_FIRST_TODAY = 30;
export const XP_REENCOUNTER = 40;
export const XP_ZONE = 10;
/** Oltre questa pausa tra due posizioni (secondi) la distanza non conta come camminata. */
const MAX_GAP_S = 300;

export const today = () => dayKey(Date.now());

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function defaultPlayer(): PlayerData {
  const day = today();
  return {
    name: '',
    avatar: DEFAULT_AVATAR,
    xp: 0,
    createdAt: Date.now(),
    onboarded: false,
    walkedM: 0,
    zones: [],
    activeDays: [],
    missions: { day, list: generateDailyMissions(day, 0), bonusClaimed: false },
    missionsDone: 0,
    badgeTiers: {},
  };
}

/** Completa i dati salvati con eventuali campi aggiunti in versioni successive. */
export function normalizePlayer(stored: Partial<PlayerData> | undefined): PlayerData {
  const base = defaultPlayer();
  if (!stored) return base;
  return { ...base, ...stored, missions: stored.missions ?? base.missions, badgeTiers: { ...stored.badgeTiers } };
}

/** Rarità aumentata di `steps` livelli (es. occhi di due colori). */
export function bumpRarity(r: Rarity, steps: number): Rarity {
  return RARITIES[Math.min(RARITIES.length - 1, rarityIndex(r) + steps)];
}

export function rarityFor(entryId: string, heterochromia: boolean): Rarity {
  const entry = getEntry(entryId);
  return bumpRarity(entry?.rarity ?? 'comune', heterochromia ? 2 : 0);
}

// ---- Calcolo delle ricompense (funzioni pure) ------------------------------

function withMissions(p: PlayerData, fn: (m: Mission) => Mission) {
  const list = p.missions.list.map(fn);
  const completed = list.filter((m, i) => missionDone(m) && !missionDone(p.missions.list[i]));
  const rewards: Reward[] = completed.map((m) => ({ icon: missionIcon(m.type), label: `Sfida: ${missionText(m)}`, xp: m.reward }));
  let bonusClaimed = p.missions.bonusClaimed;
  if (!bonusClaimed && list.every(missionDone)) {
    bonusClaimed = true;
    rewards.push({ icon: '🎁', label: 'Tutte le sfide di oggi!', xp: ALL_DONE_BONUS });
  }
  return {
    player: { ...p, missions: { ...p.missions, list, bonusClaimed }, missionsDone: p.missionsDone + completed.length },
    completed,
    rewards,
  };
}

function withBadges(p: PlayerData, animals: Animal[]) {
  const s = badgeSummary(animals, p.zones.length, p.walkedM, p.activeDays, today());
  const earned: { badge: BadgeDef; tier: number }[] = [];
  const rewards: Reward[] = [];
  const badgeTiers = { ...p.badgeTiers };
  for (const b of BADGES) {
    const tier = badgeTier(b, s);
    const prev = badgeTiers[b.id] ?? 0;
    for (let t = prev + 1; t <= tier; t++) {
      earned.push({ badge: b, tier: t });
      rewards.push({ icon: b.emoji, label: `Medaglia ${b.name} (${TIER_NAMES[t - 1]})`, xp: TIER_XP[t - 1] });
    }
    if (tier > prev) badgeTiers[b.id] = tier;
  }
  return { player: { ...p, badgeTiers }, earned, rewards };
}

/** Festeggiamento per il nuovo livello (uno solo anche se se ne saltano più di uno). */
function levelUps(xpBefore: number, xpAfter: number): Celebration[] {
  const a = levelInfo(xpBefore).level;
  const b = levelInfo(xpAfter).level;
  return b > a ? [{ kind: 'level', level: b }] : [];
}

const sumXp = (r: Reward[]) => r.reduce((s, x) => s + x.xp, 0);

// ---- Store ------------------------------------------------------------------

let persistTimer: ReturnType<typeof setTimeout> | null = null;
let toastId = 0;
let lastWalk: Fix | null = null;

export const useGame = create<GameState>((set, get) => {
  function persistPlayer(delay = 0) {
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      persistTimer = null;
      void kvSet('player', get().player);
    }, delay);
  }

  /** Applica missioni, medaglie e XP dopo un evento e aggiorna lo stato. */
  function settle(player: PlayerData, animals: Animal[], base: Reward[], missionFn: (m: Mission) => Mission) {
    const xpBefore = get().player.xp;
    const m = withMissions(player, missionFn);
    const b = withBadges(m.player, animals);
    const rewards = [...base, ...m.rewards, ...b.rewards];
    const next = { ...b.player, xp: b.player.xp + sumXp(rewards) };
    set((s) => ({
      player: next,
      animals,
      celebrations: [
        ...s.celebrations,
        ...levelUps(xpBefore, next.xp),
        ...b.earned.map((e) => ({ kind: 'badge' as const, badge: e.badge, tier: e.tier })),
      ],
    }));
    persistPlayer();
    return { rewards, xpBefore, xpAfter: next.xp, completed: m.completed, badges: b.earned };
  }

  function handleFix(fix: Fix) {
    const { ready, player } = get();
    if (!ready || !player.onboarded) return;
    get().ensureToday();

    let walked = 0;
    if (fix.accuracy <= 40) {
      if (!lastWalk) lastWalk = fix;
      else {
        const d = distanceM(lastWalk, fix);
        const dt = (fix.at - lastWalk.at) / 1000;
        // Dopo una pausa lunga (app chiusa) non sappiamo come ci si è spostati: si riparte da qui.
        if (dt <= 0 || dt > MAX_GAP_S) lastWalk = fix;
        // Troppo veloce: in auto o in bus non vale. Dopo qualche minuto senza GPS si accetta solo il passo di un pedone.
        else if (d / dt > (dt > 60 ? 2.5 : 7)) lastWalk = fix;
        else if (d >= Math.max(10, fix.accuracy * 0.8)) {
          walked = d;
          lastWalk = fix;
        }
      }
    }
    const zone = fix.accuracy <= 60 ? hexId(fix) : null;
    const newZone = zone !== null && !player.zones.includes(zone);
    if (!walked && !newZone) return;

    const p = get().player;
    const updated: PlayerData = {
      ...p,
      walkedM: p.walkedM + walked,
      zones: newZone ? [...p.zones, zone!] : p.zones,
    };
    const base: Reward[] = newZone ? [{ icon: '🧭', label: 'Nuova zona esplorata', xp: XP_ZONE }] : [];
    const r = settle(updated, get().animals, base, (m) => {
      let n = walked ? applyWalkToMission(m, walked) : m;
      if (newZone) n = applyExploreToMission(n);
      return n;
    });
    for (const rw of r.rewards) get().toast(rw.icon, `${rw.label} · +${rw.xp} XP`);
    // Solo la camminata: si salva con calma per non scrivere a ogni passo.
    if (!newZone && !r.rewards.length) persistPlayer(15000);
  }

  function captureEvent(species: Species, entryId: string, rarity: Rarity, reencounter: boolean, newEntry: boolean, park: boolean): CaptureEvent {
    return { species, rarity, coat: getEntry(entryId)?.coat, reencounter, newEntry, inPark: park };
  }

  return {
    ready: false,
    player: defaultPlayer(),
    animals: [],
    toasts: [],
    celebrations: [],

    async init() {
      lastWalk = null;
      if (persistTimer) clearTimeout(persistTimer);
      persistTimer = null;
      const [animals, stored] = await Promise.all([loadAnimals(), kvGet<PlayerData>('player')]);
      animals.sort((a, b) => b.createdAt - a.createdAt);
      set({ animals, player: normalizePlayer(stored), ready: true });
      get().ensureToday();
      void requestPersistence();
    },

    finishOnboarding(name, avatar) {
      set((s) => ({ player: { ...s.player, name, avatar, onboarded: true } }));
      persistPlayer();
    },

    updateProfile(name, avatar) {
      set((s) => ({ player: { ...s.player, name, avatar } }));
      persistPlayer();
    },

    ensureToday() {
      const day = today();
      const p = get().player;
      if (p.missions.day === day) return;
      set({ player: { ...p, missions: { day, list: generateDailyMissions(day, get().animals.length), bonusClaimed: false } } });
      persistPlayer();
    },

    async captureNew(d) {
      get().ensureToday();
      const entry = getEntry(d.entryId);
      if (!entry) throw new Error(`Voce sconosciuta: ${d.entryId}`);
      const id = uid();
      const photoId = uid();
      const now = Date.now();
      await savePhoto({ id: photoId, card: d.card, thumb: d.thumb });
      const rarity = rarityFor(d.entryId, d.heterochromia);
      const enc: Encounter = { at: now, lat: d.lat, lng: d.lng, park: d.park, photoId };
      const animal: Animal = {
        id,
        species: d.species,
        entryId: entry.id,
        name: d.name.trim() || entry.name,
        rarity,
        heterochromia: d.heterochromia || undefined,
        stats: makeStats(entry, id),
        coverPhotoId: photoId,
        encounters: [enc],
        createdAt: now,
      };
      await saveAnimal(animal);

      const { animals, player } = get();
      const newEntry = !animals.some((a) => a.entryId === entry.id);
      const day = today();
      const firstToday = !player.activeDays.includes(day);
      const base: Reward[] = [{ icon: '📸', label: `Cattura ${RARITY_INFO[rarity].label.toLowerCase()}`, xp: RARITY_INFO[rarity].xp }];
      if (newEntry) base.push({ icon: '📖', label: "Nuova voce dell'album", xp: XP_NEW_ENTRY });
      if (firstToday) base.push({ icon: '☀️', label: 'Prima cattura di oggi', xp: XP_FIRST_TODAY });

      const updatedPlayer = firstToday ? { ...player, activeDays: [...player.activeDays, day] } : player;
      const ev = captureEvent(d.species, entry.id, rarity, false, newEntry, d.park);
      const r = settle(updatedPlayer, [animal, ...animals], base, (m) => applyCaptureToMission(m, ev));
      return {
        animal,
        isNew: true,
        newEntry,
        sameDay: false,
        rewards: r.rewards,
        xpBefore: r.xpBefore,
        xpAfter: r.xpAfter,
        friendshipBefore: 0,
        friendshipAfter: 1,
        missionsCompleted: r.completed,
        badges: r.badges,
      };
    },

    async reencounter(animalId, d) {
      get().ensureToday();
      const a = get().animals.find((x) => x.id === animalId);
      if (!a) throw new Error('Animale non trovato');
      const photoId = uid();
      const now = Date.now();
      await savePhoto({ id: photoId, card: d.card, thumb: d.thumb });
      const day = today();
      const sameDay = a.encounters.some((e) => dayKey(e.at) === day);
      const enc: Encounter = { at: now, lat: d.lat, lng: d.lng, park: d.park, photoId };
      const updated: Animal = { ...a, encounters: [...a.encounters, enc] };
      await saveAnimal(updated);

      const before = friendshipLevel(a);
      const after = friendshipLevel(updated);
      const base: Reward[] = [];
      if (!sameDay) base.push({ icon: '💞', label: `Hai rivisto ${a.name}`, xp: XP_REENCOUNTER });
      if (after > before) base.push({ icon: '❤️', label: `Amicizia livello ${after}`, xp: 50 * after });

      const { player, animals } = get();
      const firstToday = !player.activeDays.includes(day);
      if (firstToday) base.push({ icon: '☀️', label: 'Primo incontro di oggi', xp: XP_FIRST_TODAY });
      const updatedPlayer = firstToday ? { ...player, activeDays: [...player.activeDays, day] } : player;
      const ev = captureEvent(a.species, a.entryId, a.rarity, true, false, d.park);
      const r = settle(
        updatedPlayer,
        animals.map((x) => (x.id === a.id ? updated : x)),
        base,
        // Rivedere lo stesso animale nello stesso giorno non fa avanzare le sfide.
        (m) => (sameDay ? m : applyCaptureToMission(m, ev)),
      );
      return {
        animal: updated,
        isNew: false,
        newEntry: false,
        sameDay,
        rewards: r.rewards,
        xpBefore: r.xpBefore,
        xpAfter: r.xpAfter,
        friendshipBefore: before,
        friendshipAfter: after,
        missionsCompleted: r.completed,
        badges: r.badges,
      };
    },

    renameAnimal(id, name) {
      const a = get().animals.find((x) => x.id === id);
      if (!a || !name.trim()) return;
      const updated = { ...a, name: name.trim() };
      set((s) => ({ animals: s.animals.map((x) => (x.id === id ? updated : x)) }));
      void saveAnimal(updated);
    },

    setCover(id, photoId) {
      const a = get().animals.find((x) => x.id === id);
      if (!a) return;
      const updated = { ...a, coverPhotoId: photoId };
      set((s) => ({ animals: s.animals.map((x) => (x.id === id ? updated : x)) }));
      void saveAnimal(updated);
    },

    async releaseAnimal(id) {
      const a = get().animals.find((x) => x.id === id);
      if (!a) return;
      await deleteAnimal(a);
      set((s) => ({ animals: s.animals.filter((x) => x.id !== id) }));
    },

    toast(icon, text) {
      const id = ++toastId;
      set((s) => ({ toasts: [...s.toasts.slice(-2), { id, icon, text }] }));
      setTimeout(() => get().dismissToast(id), 3500);
    },

    dismissToast(id) {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    },

    dismissCelebration() {
      set((s) => ({ celebrations: s.celebrations.slice(1) }));
    },

    handleFix,
  };
});

onFix((fix) => useGame.getState().handleFix(fix));

// Se l'app va in secondo piano si salva subito quello che era in attesa (es. i metri camminati).
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'hidden' || !persistTimer) return;
    clearTimeout(persistTimer);
    persistTimer = null;
    void kvSet('player', useGame.getState().player);
  });
}
