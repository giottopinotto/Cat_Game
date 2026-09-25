import type { ImageClassifier } from '@mediapipe/tasks-vision';
import { euCoatEntryId } from '../data/cats';
import { getEntry, LABEL_TO_ENTRY } from '../data/entries';
import type { CoatId, Rarity, Species } from '../data/types';
import { coatFromCanvas, type CoatColors } from './coat';
import {
  classify,
  cropCanvas,
  detectAnimals,
  downscale,
  loadClassifier,
  loadDetector,
  loadSegmenter,
  segment,
  SEG_CAT,
  pickMain,
  scaleDetections,
  visionConfig,
  type Box,
} from './engine';
import { CAT_LABELS, DOG_LABELS, WILD_DOG_LABELS } from './labels';

export interface Suggestion {
  entryId: string;
  /** Probabilità stimata (0-1) tra le razze della specie. */
  score: number;
}

export interface Analysis {
  species: Species;
  /** Riquadro dell'animale nella foto. */
  box: Box;
  /** Quanto l'AI è sicura che sia davvero un cane/gatto (0-1). */
  confidence: number;
  /** Voci dell'album proposte, dalla più probabile. */
  suggestions: Suggestion[];
  /** Voce proposta di default. */
  suggested: string;
  coat?: CoatId;
  coatColors?: CoatColors;
  /** True se il mantello è stato stimato sulla sagoma esatta del gatto. */
  coatMasked?: boolean;
}

const METICCIO = 'dog-meticcio';
/** Sotto questa sicurezza per un cane si propone "Meticcio". */
const BREED_MIN = 0.35;
const CAT_BREED_MIN = 0.5;

/**
 * Quanto è facile incontrare per strada, in Italia, un animale di una certa rarità.
 * Il classificatore è addestrato come se tutte le razze fossero ugualmente
 * frequenti: moltiplicando per questa "probabilità a priori", quando è indeciso
 * tra un Labrador e un Flat-coated retriever sceglie giustamente il Labrador.
 */
const STREET_PRIOR: Record<Rarity, number> = {
  comune: 1,
  non_comune: 0.6,
  raro: 0.35,
  epico: 0.2,
  leggendario: 0.1,
};

function sum(scores: Map<string, number>, labels: string[]): number {
  return labels.reduce((s, l) => s + (scores.get(l) ?? 0), 0);
}

/** Probabilità delle voci dell'album per una specie (con la probabilità a priori), normalizzate. */
function breedScores(scores: Map<string, number>, labels: string[], extra: Suggestion[] = []): Suggestion[] {
  const byEntry = new Map<string, number>();
  for (const l of labels) {
    const e = LABEL_TO_ENTRY.get(l);
    if (!e) continue;
    byEntry.set(e.id, (byEntry.get(e.id) ?? 0) + (scores.get(l) ?? 0) * STREET_PRIOR[e.rarity]);
  }
  for (const x of extra) byEntry.set(x.entryId, (byEntry.get(x.entryId) ?? 0) + x.score * STREET_PRIOR[getEntry(x.entryId)!.rarity]);
  const total = [...byEntry.values()].reduce((a, b) => a + b, 0) || 1;
  return [...byEntry].map(([entryId, score]) => ({ entryId, score: score / total })).sort((a, b) => b.score - a.score);
}

function dogSuggestions(scores: Map<string, number>): { suggestions: Suggestion[]; suggested: string } {
  const breeds = breedScores(scores, DOG_LABELS);
  const wild = sum(scores, WILD_DOG_LABELS);
  const dogs = sum(scores, DOG_LABELS);
  const top = breeds[0];
  // Tra razze molto incerte, o simile a un lupo: probabilmente un meticcio.
  const mixed = Math.min(0.95, Math.max(0, 1 - (top?.score ?? 0)) * 0.8 + wild / (wild + dogs + 1e-6) * 0.5);
  const suggestions = [...breeds.slice(0, 4), { entryId: METICCIO, score: mixed }].sort((a, b) => b.score - a.score);
  const suggested = top && top.score >= BREED_MIN ? top.entryId : METICCIO;
  return { suggestions, suggested };
}

function catSuggestions(scores: Map<string, number>, coat: CoatId) {
  // Tigrato, "tiger cat" ed "Egyptian cat" sono tutti gatti europei: il mantello lo dice l'analisi dei colori.
  const european = sum(scores, CAT_LABELS) - sum(scores, ['Persian cat', 'Siamese cat']);
  const coatId = euCoatEntryId(coat);
  const all = breedScores(scores, ['Persian cat', 'Siamese cat'], [{ entryId: coatId, score: european }]);
  const suggestions = all.filter((s) => s.entryId === coatId || s.score > 0.1);
  const top = all.find((s) => s.entryId !== coatId);
  const suggested = top && top.score >= CAT_BREED_MIN ? top.entryId : coatId;
  return { suggestions, suggested };
}

/** Specchia orizzontalmente un canvas. */
function mirrored(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  const ctx = c.getContext('2d')!;
  ctx.translate(c.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(src, 0, 0);
  return c;
}

/**
 * Classifica più "viste" dello stesso animale (ritaglio stretto, largo e
 * specchiato) e fa la media: il risultato è più stabile di una sola occhiata.
 */
function classifyTTA(classifier: ImageClassifier, photo: HTMLCanvasElement, box: Box): Map<string, number> {
  const tight = cropCanvas(photo, box, 0.06);
  const views = [tight, mirrored(tight), cropCanvas(photo, box, 0.22)];
  const sum = new Map<string, number>();
  for (const v of views) for (const [k, p] of classify(classifier, v)) sum.set(k, (sum.get(k) ?? 0) + p / views.length);
  return sum;
}

/**
 * Analizza una foto: trova il cane o il gatto, propone la razza (o il mantello)
 * e restituisce null se non c'è nessun animale riconoscibile.
 */
export async function analyzePhoto(photo: HTMLCanvasElement): Promise<Analysis | null> {
  const [detector, classifier] = await Promise.all([loadDetector(), loadClassifier()]);
  const small = downscale(photo, 640);
  const main = pickMain(scaleDetections(detectAnimals(detector, small.canvas), small.scale), photo.width, photo.height);

  let box: Box;
  let crop: HTMLCanvasElement;
  if (main) {
    box = main.box;
    crop = cropCanvas(photo, box, 0.08);
  } else {
    // Primissimo piano: il rilevatore a volte non trova l'animale se riempie la foto.
    box = { x: 0, y: 0, w: photo.width, h: photo.height };
    crop = cropCanvas(photo, box, 0);
  }

  const scores = main && visionConfig.tta ? classifyTTA(classifier, photo, box) : classify(classifier, crop);
  const dogP = sum(scores, DOG_LABELS) + sum(scores, WILD_DOG_LABELS) * 0.5;
  const catP = sum(scores, CAT_LABELS);

  let species: Species;
  let confidence: number;
  if (main) {
    species = main.species;
    // Il classificatore può correggere il rilevatore quando è molto più sicuro.
    if (species === 'dog' && catP > 0.6 && dogP < 0.15) species = 'cat';
    else if (species === 'cat' && dogP > 0.6 && catP < 0.15) species = 'dog';
    confidence = Math.max(main.score, species === 'dog' ? dogP : catP);
  } else if (dogP >= 0.45 && dogP > catP) {
    species = 'dog';
    confidence = dogP;
  } else if (catP >= 0.4 && catP > dogP) {
    species = 'cat';
    confidence = catP;
  } else {
    return null;
  }

  if (species === 'dog') return { species, box, confidence, ...dogSuggestions(scores) };

  const segmenter = await loadSegmenter().catch(() => null);
  const { coat, colors, masked } = coatFromCanvas(
    cropCanvas(photo, box, 0.04),
    segmenter ? (c) => segment(segmenter, c) : undefined,
    SEG_CAT,
  );
  return { species, box, confidence, coat, coatColors: colors, coatMasked: masked, ...catSuggestions(scores, coat) };
}
