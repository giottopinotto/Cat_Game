import { FilesetResolver, ImageClassifier, ImageSegmenter, ObjectDetector, type Category } from '@mediapipe/tasks-vision';
import type { Species } from '../data/types';

// Tutta l'intelligenza artificiale gira sul telefono: i modelli e il runtime
// WebAssembly sono serviti dallo stesso sito dell'app (cartella public/).

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Detection {
  species: Species;
  score: number;
  box: Box;
}

/** Impostazioni del riconoscimento (modificabili dallo strumento di valutazione in eval/). */
export const visionConfig = {
  classifierModel: 'models/efficientnet_lite0_f32.tflite',
  /** Più ritagli della stessa foto (anche specchiati), mediati: meno errori. */
  tta: true,
};

const asset = (path: string) => new URL(path, new URL(import.meta.env.BASE_URL, document.baseURI)).href;

let filesetP: Promise<Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>> | null = null;
let detectorP: Promise<ObjectDetector> | null = null;
let classifierP: Promise<ImageClassifier> | null = null;
let segmenterP: Promise<ImageSegmenter> | null = null;

function fileset() {
  filesetP ??= FilesetResolver.forVisionTasks(asset('mediapipe/wasm'));
  return filesetP;
}

// Se il caricamento fallisce (es. rete assente) si potrà riprovare.
function retryable<T>(p: Promise<T>, reset: () => void): Promise<T> {
  p.catch(reset);
  return p;
}

export function loadDetector(): Promise<ObjectDetector> {
  detectorP ??= retryable(
    fileset().then((fs) =>
      ObjectDetector.createFromOptions(fs, {
        baseOptions: { modelAssetPath: asset('models/efficientdet_lite0.tflite'), delegate: 'CPU' },
        runningMode: 'VIDEO',
        scoreThreshold: 0.3,
        maxResults: 5,
        categoryAllowlist: ['cat', 'dog'],
      }),
    ),
    () => {
      detectorP = null;
      filesetP = null;
    },
  );
  return detectorP;
}

export function loadClassifier(): Promise<ImageClassifier> {
  classifierP ??= retryable(
    fileset().then((fs) =>
      ImageClassifier.createFromOptions(fs, {
        baseOptions: { modelAssetPath: asset(visionConfig.classifierModel), delegate: 'CPU' },
        runningMode: 'IMAGE',
        maxResults: -1,
      }),
    ),
    () => {
      classifierP = null;
      filesetP = null;
    },
  );
  return classifierP;
}

/** Segmentazione (DeepLab v3): disegna la sagoma esatta di cani e gatti, pixel per pixel. */
export function loadSegmenter(): Promise<ImageSegmenter> {
  segmenterP ??= retryable(
    fileset().then((fs) =>
      ImageSegmenter.createFromOptions(fs, {
        baseOptions: { modelAssetPath: asset('models/deeplab_v3.tflite'), delegate: 'CPU' },
        runningMode: 'IMAGE',
        outputCategoryMask: true,
        outputConfidenceMasks: false,
      }),
    ),
    () => {
      segmenterP = null;
      filesetP = null;
    },
  );
  return segmenterP;
}

/** Classi di DeepLab (PASCAL VOC) che ci interessano. */
export const SEG_CAT = 8;
export const SEG_DOG = 12;

/** Maschera dell'immagine: per ogni pixel l'indice della classe (0 = sfondo). */
export function segment(segmenter: ImageSegmenter, source: HTMLCanvasElement): Uint8Array | null {
  const res = segmenter.segment(source);
  try {
    return res.categoryMask ? new Uint8Array(res.categoryMask.getAsUint8Array()) : null;
  } finally {
    res.close();
  }
}

/** Carica tutti i modelli (la prima volta scarica circa 35 MB, poi restano in cache). */
export async function loadVision(): Promise<void> {
  await Promise.all([loadDetector(), loadClassifier(), loadSegmenter()]);
}

// MediaPipe in modalità VIDEO vuole timestamp sempre crescenti.
let lastTs = 0;
function nextTs(): number {
  lastTs = Math.max(lastTs + 1, performance.now());
  return lastTs;
}

type Source = HTMLVideoElement | HTMLCanvasElement | HTMLImageElement | ImageBitmap;

/** Cerca cani e gatti nell'immagine (veloce: si usa anche sull'anteprima live). */
export function detectAnimals(detector: ObjectDetector, source: Source): Detection[] {
  const res = detector.detectForVideo(source, nextTs());
  return res.detections
    .map((d) => {
      const c = d.categories[0];
      const b = d.boundingBox!;
      return {
        species: (c.categoryName === 'cat' ? 'cat' : 'dog') as Species,
        score: c.score,
        box: { x: b.originX, y: b.originY, w: b.width, h: b.height },
      };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * Copia rimpicciolita dell'immagine (lato lungo = maxSide): il rilevatore lavora
 * comunque a bassa risoluzione, e ridurre prima è molto più veloce sul telefono.
 */
export function downscale(source: HTMLVideoElement | HTMLCanvasElement, maxSide: number, reuse?: HTMLCanvasElement) {
  const w = source instanceof HTMLVideoElement ? source.videoWidth : source.width;
  const h = source instanceof HTMLVideoElement ? source.videoHeight : source.height;
  const scale = Math.min(1, maxSide / Math.max(w, h));
  const c = reuse ?? document.createElement('canvas');
  const cw = Math.max(1, Math.round(w * scale));
  const ch = Math.max(1, Math.round(h * scale));
  if (c.width !== cw) c.width = cw;
  if (c.height !== ch) c.height = ch;
  c.getContext('2d')!.drawImage(source, 0, 0, cw, ch);
  return { canvas: c, scale };
}

/** Riporta i riquadri trovati sull'immagine piccola alle coordinate di quella originale. */
export function scaleDetections(dets: Detection[], scale: number): Detection[] {
  return dets.map((d) => ({ ...d, box: { x: d.box.x / scale, y: d.box.y / scale, w: d.box.w / scale, h: d.box.h / scale } }));
}

/** Sceglie l'animale "protagonista": sicuro, grande e vicino al centro. */
export function pickMain(dets: Detection[], width: number, height: number): Detection | null {
  let best: Detection | null = null;
  let bestVal = 0;
  for (const d of dets) {
    const area = (d.box.w * d.box.h) / (width * height);
    const cx = (d.box.x + d.box.w / 2) / width - 0.5;
    const cy = (d.box.y + d.box.h / 2) / height - 0.5;
    const central = 1 - Math.min(1, Math.hypot(cx, cy));
    const val = d.score * (0.4 + Math.sqrt(area)) * (0.6 + 0.4 * central);
    if (val > bestVal) {
      bestVal = val;
      best = d;
    }
  }
  return best;
}

/** Ritaglia un'area (allargata di `pad`) in un nuovo canvas. */
export function cropCanvas(src: HTMLCanvasElement, box: Box, pad = 0.1, maxSide = 600): HTMLCanvasElement {
  const x0 = Math.max(0, box.x - box.w * pad);
  const y0 = Math.max(0, box.y - box.h * pad);
  const x1 = Math.min(src.width, box.x + box.w * (1 + pad));
  const y1 = Math.min(src.height, box.y + box.h * (1 + pad));
  const w = Math.max(1, x1 - x0);
  const h = Math.max(1, y1 - y0);
  const scale = Math.min(1, maxSide / Math.max(w, h));
  const out = document.createElement('canvas');
  out.width = Math.round(w * scale);
  out.height = Math.round(h * scale);
  out.getContext('2d')!.drawImage(src, x0, y0, w, h, 0, 0, out.width, out.height);
  return out;
}

/** Punteggi del classificatore ImageNet (etichetta → probabilità). */
export function classify(classifier: ImageClassifier, source: Source): Map<string, number> {
  const res = classifier.classify(source);
  const out = new Map<string, number>();
  const cats: Category[] = res.classifications[0]?.categories ?? [];
  for (const c of cats) out.set(c.categoryName, (out.get(c.categoryName) ?? 0) + c.score);
  return out;
}
