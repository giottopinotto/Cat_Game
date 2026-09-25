import { X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { SPECIES_NAME } from '../data/entries';
import type { Species } from '../data/types';
import { captureFixOk, releaseLocation, startLocation, tooFast, useLocation, waitForFix, type Fix } from '../game/location';
import { useGame } from '../game/store';
import type { CaptureOutcome } from '../game/store';
import { mapApi } from '../map/MapView';
import { back } from '../router';
import { vibrate } from '../ui/common';
import { GameIcon, IconBubble } from '../ui/icons';
import { play } from '../ui/sound';
import { analyzePhoto, type Analysis } from '../vision/analyze';
import { detectAnimals, downscale, loadDetector, loadVisionStaged, pickMain, scaleDetections, type Box } from '../vision/engine';
import { BLURRY, grabFrame, makePhotos, sharpness } from '../vision/photo';
import { ConfirmPanel } from './ConfirmPanel';
import { Reveal } from './Reveal';

export interface Shot {
  analysis: Analysis;
  card: Blob;
  thumb: Blob;
  cardUrl: string;
  fix: Fix;
  park: boolean;
  /** La foto sembra mossa o sfocata. */
  blurry: boolean;
}

type Phase =
  | { k: 'live' }
  | { k: 'analyzing' }
  | { k: 'notfound' }
  | { k: 'nogps' }
  | { k: 'confirm'; shot: Shot }
  | { k: 'reveal'; outcome: CaptureOutcome; cardUrl: string };

type CameraState = 'starting' | 'ready' | 'denied' | 'nocamera' | 'unsupported';
type ModelState = 'loading' | 'ready' | 'error';

interface LiveDet {
  box: Box;
  species: Species;
  at: number;
  /** Quanta parte dell'inquadratura occupa l'animale (0-1). */
  area: number;
}

interface ZoomRange {
  min: number;
  max: number;
  value: number;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** Sotto questa frazione dell'inquadratura l'animale è piccolo: meglio lo zoom. */
const SMALL_AREA = 0.035;

/** Riquadro della foto → coordinate sullo schermo (video in modalità "cover"). */
function toScreen(box: Box, video: HTMLVideoElement): Box {
  const cw = video.clientWidth;
  const ch = video.clientHeight;
  const vw = video.videoWidth || 1;
  const vh = video.videoHeight || 1;
  const s = Math.max(cw / vw, ch / vh);
  const ox = (cw - vw * s) / 2;
  const oy = (ch - vh * s) / 2;
  return { x: box.x * s + ox, y: box.y * s + oy, w: box.w * s, h: box.h * s };
}

/** Raggio dell'anello di zampette: attorno all'animale, ma sempre dentro lo schermo. */
function ringRadius(box?: Box): number {
  const max = Math.min(window.innerWidth, window.innerHeight) * 0.42;
  if (!box) return Math.min(120, max);
  return Math.round(Math.min(max, Math.max(60, Math.max(box.w, box.h) / 2 + 26)));
}

export function CaptureScreen() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const frozenRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [phase, setPhase] = useState<Phase>({ k: 'live' });
  const [camera, setCamera] = useState<CameraState>('starting');
  const [models, setModels] = useState<ModelState>('loading');
  const [det, setDet] = useState<LiveDet | null>(null);
  const [flash, setFlash] = useState(0);
  const burstAt = useRef({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<ZoomRange | null>(null);
  const { fix, status: gpsStatus } = useLocation();
  const wantCamera = phase.k === 'live' || phase.k === 'analyzing' || phase.k === 'notfound';

  // Modelli AI (la prima volta vengono scaricati, poi restano in cache).
  const loadModels = useCallback(() => {
    setModels('loading');
    // Si può inquadrare appena è pronto il rilevatore; il resto si prepara dietro le quinte.
    loadVisionStaged(() => setModels('ready')).catch(() => setModels((m) => (m === 'ready' ? m : 'error')));
  }, []);
  useEffect(loadModels, [loadModels]);

  // Posizione solo per le foto: il GPS si accende qui e si spegne uscendo.
  useEffect(() => {
    startLocation();
    return () => {
      if (useGame.getState().player.settings.gpsOnlyPhoto) releaseLocation();
    };
  }, []);

  // Fotocamera posteriore, accesa solo quando serve.
  useEffect(() => {
    if (!wantCamera) return;
    let cancelled = false;
    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCamera('unsupported');
        return;
      }
      setCamera('starting');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1600 }, height: { ideal: 1200 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const v = videoRef.current!;
        v.srcObject = stream;
        await v.play().catch(() => {});
        // Zoom ottico/digitale del telefono, se disponibile (Chrome su Android).
        const track = stream.getVideoTracks()[0];
        const caps = (track.getCapabilities?.() ?? {}) as { zoom?: { min: number; max: number } };
        if (caps.zoom && caps.zoom.max >= 1.5) setZoom({ min: caps.zoom.min, max: Math.min(caps.zoom.max, 5), value: caps.zoom.min });
        setCamera('ready');
      } catch (e) {
        const name = (e as DOMException).name;
        setCamera(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'nocamera');
      }
    }
    void start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [wantCamera]);

  // Rilevamento dal vivo: il mirino segue il cane o il gatto inquadrato.
  useEffect(() => {
    if (phase.k !== 'live' || camera !== 'ready' || models !== 'ready') return;
    let raf = 0;
    let last = 0;
    let alive = true;
    let announced = false;
    // Il mirino lavora su una copia piccola del fotogramma: leggero e fluido anche sui telefoni meno potenti.
    const small = document.createElement('canvas');
    void loadDetector().then((detector) => {
      const loop = (t: number) => {
        if (!alive) return;
        const v = videoRef.current;
        if (v && v.readyState >= 2 && t - last > 300) {
          last = t;
          try {
            const { canvas, scale } = downscale(v, 320, small);
            const main = pickMain(scaleDetections(detectAnimals(detector, canvas), scale), v.videoWidth, v.videoHeight);
            if (main) {
              if (!announced) vibrate(15);
              announced = true;
              setDet({
                box: toScreen(main.box, v),
                species: main.species,
                at: t,
                area: (main.box.w * main.box.h) / (v.videoWidth * v.videoHeight),
              });
            } else setDet((d) => (d && t - d.at > 700 ? null : d));
          } catch {
            /* un fotogramma perso non è un problema */
          }
        }
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    });
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, [phase.k, camera, models]);

  const gpsOk = captureFixOk(fix);
  const moving = tooFast(fix);
  // Si può scattare appena si vede l'immagine: se la AI o il GPS non sono ancora pronti,
  // la foto resta ferma e si aspettano dopo (l'animale intanto non scappa più).
  const gpsBlocked = gpsStatus === 'denied' || gpsStatus === 'unavailable';
  const canShoot = phase.k === 'live' && camera === 'ready' && models !== 'error' && !gpsBlocked && !moving;

  /** Foto già analizzata che aspetta solo la posizione GPS. */
  const pendingRef = useRef<Omit<Shot, 'fix' | 'park'> | null>(null);
  const [waitingGps, setWaitingGps] = useState(false);

  async function finishWithFix() {
    const pending = pendingRef.current;
    if (!pending) return;
    let fixNow = useLocation.getState().fix;
    if (!captureFixOk(fixNow)) {
      setPhase({ k: 'analyzing' });
      setWaitingGps(true);
      fixNow = await waitForFix(45000);
      setWaitingGps(false);
    }
    if (!fixNow) {
      setPhase({ k: 'nogps' });
      return;
    }
    pendingRef.current = null;
    const park = mapApi.isInPark(fixNow.lng, fixNow.lat);
    setPhase({ k: 'confirm', shot: { ...pending, fix: fixNow, park } });
  }

  async function shoot() {
    const v = videoRef.current;
    if (!v || !v.videoWidth || !canShoot || tooFast(useLocation.getState().fix)) return;
    // Lo scatto è istantaneo: si copia il fotogramma, si ferma l'immagine e solo
    // dopo che lo schermo ha mostrato il flash parte l'analisi (che richiede tempo).
    // Tre fotogrammi in rapida successione: si tiene il più nitido (mani che tremano, animale che si muove).
    // Lo schermo si "ferma" subito sul primo fotogramma; gli altri due si prendono dietro le quinte.
    vibrate(30);
    play('shutter');
    burstAt.current = det
      ? { x: det.box.x + det.box.w / 2, y: det.box.y + det.box.h / 2 }
      : { x: window.innerWidth / 2, y: window.innerHeight * 0.45 };
    const frames = [grabFrame(v)];
    const frozen = frozenRef.current;
    if (frozen) {
      frozen.width = frames[0].width;
      frozen.height = frames[0].height;
      frozen.getContext('2d')!.drawImage(frames[0], 0, 0);
    }
    setFlash((n) => n + 1);
    setPhase({ k: 'analyzing' });
    for (let i = 0; i < 2; i++) {
      await wait(45);
      frames.push(grabFrame(v));
    }
    v.pause();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const scored = frames.map((f) => ({ f, s: sharpness(f) })).sort((a, b) => b.s - a.s);
    const frame = scored[0].f;
    const blurry = scored[0].s < BLURRY;
    try {
      const analysis = await analyzePhoto(frame);
      if (!analysis) {
        vibrate([40, 60, 40]);
        play('error');
        setPhase({ k: 'notfound' });
        return;
      }
      const photos = await makePhotos(frame, analysis.box);
      pendingRef.current = { analysis, ...photos, blurry };
      await finishWithFix();
    } catch (e) {
      console.error(e);
      setPhase({ k: 'notfound' });
    }
  }

  function again() {
    setDet(null);
    void videoRef.current?.play().catch(() => {});
    setPhase({ k: 'live' });
  }

  let status = 'Inquadra un cane o un gatto';
  if (models === 'error') status = 'Errore nel caricare la AI';
  else if (moving) status = 'Ti stai muovendo troppo veloce: fermati per catturare';
  else if (gpsBlocked) status = gpsStatus === 'denied' ? 'Serve la posizione GPS' : 'GPS non disponibile';
  else if (models === 'loading') status = "Scatta pure! Intanto preparo l'occhio magico…";
  else if (!gpsOk) status = 'Scatta pure! Cerco il GPS…';
  else if (det && det.area < SMALL_AREA) status = zoom ? 'È piccolo: usa lo zoom qui sotto' : 'È un po\' lontano, ma puoi scattare';
  else if (det) status = `${SPECIES_NAME[det.species].one} trovato! Scatta!`;

  function applyZoom(value: number) {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track || !zoom) return;
    const z = Math.min(zoom.max, Math.max(zoom.min, value));
    void track.applyConstraints({ advanced: [{ zoom: z } as MediaTrackConstraintSet] }).then(
      () => setZoom({ ...zoom, value: z }),
      () => {},
    );
  }

  return (
    <div className="capture">
      <video ref={videoRef} playsInline muted autoPlay style={{ visibility: wantCamera ? 'visible' : 'hidden' }} />
      <canvas
        ref={frozenRef}
        className="frozen"
        style={{ visibility: phase.k === 'analyzing' || phase.k === 'notfound' || phase.k === 'nogps' ? 'visible' : 'hidden' }}
      />

      {phase.k === 'live' && camera === 'ready' && (
        <div
          className={`reticle ${det ? 'found' : 'idle'}`}
          style={
            det
              ? { left: det.box.x, top: det.box.y, width: det.box.w, height: det.box.h }
              : { left: '18%', top: '26%', width: '64%', height: '40%' }
          }
        >
          <i />
          <i />
          <i />
          <i />
          {/* Anello di zampette: si stringe sull'animale quando lo riconosce. */}
          <div
            className={`paw-ring ${det && canShoot ? 'locked' : ''}`}
            key={det ? 'on' : 'off'}
            style={{ '--r': `${ringRadius(det?.box)}px` } as CSSProperties}
            aria-hidden
          >
            {Array.from({ length: 8 }, (_, i) => (
              <b key={i} style={{ '--i': i } as CSSProperties} />
            ))}
          </div>
          {det && <span className="tag">{SPECIES_NAME[det.species].one}!</span>}
        </div>
      )}

      <div className="capture-top">
        <button className="icon-btn" aria-label="Chiudi" onClick={() => back()}>
          <X size={24} />
        </button>
        {phase.k === 'live' && <div className={`capture-status ${det && canShoot ? 'found' : ''}`}>{status}</div>}
        <span className="gps-chip" title="Precisione GPS">
          <GameIcon name="pin" size={14} /> {gpsOk ? `±${Math.round(fix!.accuracy)} m` : '…'}
        </span>
      </div>

      {phase.k === 'live' && (
        <div className="capture-bottom">
          {zoom && (
            <div className="zoom-row" role="group" aria-label="Zoom">
              {[1, 2, 3].filter((z) => z <= zoom.max + 0.01).map((z) => (
                <button key={z} className={Math.abs(zoom.value - Math.max(z, zoom.min)) < 0.05 ? 'active' : ''} onClick={() => applyZoom(z)}>
                  {z}×
                </button>
              ))}
            </div>
          )}
          <button className={`shutter ${det && canShoot ? 'ready' : ''}`} disabled={!canShoot} aria-label="Scatta" onClick={shoot}>
            <span />
          </button>
          <div className="capture-hint">Non avvicinarti troppo: la foto va bene anche da lontano</div>
        </div>
      )}

      {flash > 0 && <div className="flash" key={flash} />}
      {flash > 0 && (
        <div className="shot-burst" key={`b${flash}`} style={{ left: burstAt.current.x, top: burstAt.current.y }} aria-hidden>
          {Array.from({ length: 14 }, (_, i) => (
            <b key={i} style={{ '--a': `${(i / 14) * 360 + (i % 2) * 12}deg`, '--d': `${90 + (i % 3) * 45}px` } as CSSProperties} />
          ))}
        </div>
      )}

      {phase.k === 'analyzing' && (
        <div className="scanning">
          <div className="line" />
          <div className="label row">
            {waitingGps ? (
              <>
                <GameIcon name="satellite" /> Foto presa! Cerco la posizione GPS…
              </>
            ) : (
              <>
                <GameIcon name="search" /> {models === 'ready' ? 'Analizzo la foto…' : "Foto presa! Preparo l'occhio magico…"}
              </>
            )}
          </div>
        </div>
      )}

      {phase.k === 'nogps' && (
        <Message
          icon="satellite"
          title="Niente segnale GPS"
          text="La foto è pronta, ma serve la posizione per salvarla. Spostati all'aperto, lontano dai palazzi, e riprova."
          action="Riprova"
          onAction={() => void finishWithFix()}
        />
      )}

      {phase.k === 'notfound' && (
        <Message icon="search" title="Nessun cane o gatto" text="Non sono riuscito a trovarlo nella foto. Prova a inquadrarlo meglio, con più luce e senza muoverti." action="Riprova" onAction={again} />
      )}

      {phase.k === 'live' && camera === 'starting' && (
        <div className="capture-msg" style={{ background: '#000' }}>
          <div className="box">
            <div className="loader" />
            <p>Accendo la fotocamera…</p>
          </div>
        </div>
      )}
      {wantCamera && camera === 'denied' && (
        <Message
          icon="camera"
          title="Serve la fotocamera"
          text="Per catturare gli animali devi permettere l'uso della fotocamera. Attivala nelle impostazioni del browser per questo sito e riprova."
          action="Torna alla mappa"
          onAction={() => back()}
        />
      )}
      {wantCamera && (camera === 'nocamera' || camera === 'unsupported') && (
        <Message
          icon="camera-off"
          title="Fotocamera non disponibile"
          text={
            camera === 'unsupported'
              ? "Questo browser non permette di usare la fotocamera. Apri l'app con Chrome o Safari (indirizzo https)."
              : 'Non trovo nessuna fotocamera su questo dispositivo.'
          }
          action="Torna alla mappa"
          onAction={() => back()}
        />
      )}
      {models === 'error' && phase.k === 'live' && (
        <Message
          icon="bot"
          title="AI non caricata"
          text="Serve una connessione a internet per scaricare il riconoscimento la prima volta (circa 35 MB, una volta sola: meglio con il Wi-Fi)."
          action="Riprova"
          onAction={loadModels}
        />
      )}

      {phase.k === 'confirm' && (
        <ConfirmPanel shot={phase.shot} onRetake={again} onDone={(outcome) => setPhase({ k: 'reveal', outcome, cardUrl: phase.shot.cardUrl })} />
      )}
      {phase.k === 'reveal' && <Reveal outcome={phase.outcome} cardUrl={phase.cardUrl} onAgain={again} />}
    </div>
  );
}

function Message(props: { icon: string; title: string; text: string; action: string; onAction: () => void }) {
  return (
    <div className="capture-msg">
      <div className="box">
        <div className="emoji">
          <IconBubble name={props.icon} size={76} />
        </div>
        <h2>{props.title}</h2>
        <p>{props.text}</p>
        <button className="btn btn-primary" onClick={props.onAction}>
          {props.action}
        </button>
      </div>
    </div>
  );
}
