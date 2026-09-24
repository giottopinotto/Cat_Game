import { X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { SPECIES_NAME } from '../data/entries';
import type { Species } from '../data/types';
import { captureFixOk, useLocation, type Fix } from '../game/location';
import type { CaptureOutcome } from '../game/store';
import { mapApi } from '../map/MapView';
import { back } from '../router';
import { vibrate } from '../ui/common';
import { analyzePhoto, type Analysis } from '../vision/analyze';
import { detectAnimals, loadDetector, loadVision, pickMain, type Box } from '../vision/engine';
import { grabFrame, makePhotos } from '../vision/photo';
import { ConfirmPanel } from './ConfirmPanel';
import { Reveal } from './Reveal';

export interface Shot {
  analysis: Analysis;
  card: Blob;
  thumb: Blob;
  cardUrl: string;
  fix: Fix;
  park: boolean;
}

type Phase =
  | { k: 'live' }
  | { k: 'analyzing'; frozen: string }
  | { k: 'notfound'; frozen: string }
  | { k: 'confirm'; shot: Shot }
  | { k: 'reveal'; outcome: CaptureOutcome; cardUrl: string };

type CameraState = 'starting' | 'ready' | 'denied' | 'nocamera' | 'unsupported';
type ModelState = 'loading' | 'ready' | 'error';

interface LiveDet {
  box: Box;
  species: Species;
  at: number;
}

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

export function CaptureScreen() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [phase, setPhase] = useState<Phase>({ k: 'live' });
  const [camera, setCamera] = useState<CameraState>('starting');
  const [models, setModels] = useState<ModelState>('loading');
  const [det, setDet] = useState<LiveDet | null>(null);
  const [flash, setFlash] = useState(0);
  const { fix, status: gpsStatus } = useLocation();
  const wantCamera = phase.k === 'live' || phase.k === 'analyzing' || phase.k === 'notfound';

  // Modelli AI (la prima volta vengono scaricati, poi restano in cache).
  const loadModels = useCallback(() => {
    setModels('loading');
    loadVision().then(
      () => setModels('ready'),
      () => setModels('error'),
    );
  }, []);
  useEffect(loadModels, [loadModels]);

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
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1440 } },
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
    void loadDetector().then((detector) => {
      const loop = (t: number) => {
        if (!alive) return;
        const v = videoRef.current;
        if (v && v.readyState >= 2 && t - last > 220) {
          last = t;
          try {
            const main = pickMain(detectAnimals(detector, v), v.videoWidth, v.videoHeight);
            if (main) {
              if (!announced) vibrate(15);
              announced = true;
              setDet({ box: toScreen(main.box, v), species: main.species, at: t });
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
  const canShoot = phase.k === 'live' && camera === 'ready' && models === 'ready' && gpsOk;

  async function shoot() {
    const v = videoRef.current;
    const fixNow = useLocation.getState().fix;
    if (!v || !v.videoWidth || !canShoot || !captureFixOk(fixNow)) return;
    vibrate(30);
    setFlash((n) => n + 1);
    const frame = grabFrame(v);
    const frozen = frame.toDataURL('image/jpeg', 0.75);
    setPhase({ k: 'analyzing', frozen });
    try {
      const analysis = await analyzePhoto(frame);
      if (!analysis) {
        vibrate([40, 60, 40]);
        setPhase({ k: 'notfound', frozen });
        return;
      }
      const photos = await makePhotos(frame, analysis.box);
      const park = mapApi.isInPark(fixNow.lng, fixNow.lat);
      setPhase({ k: 'confirm', shot: { analysis, ...photos, fix: fixNow, park } });
    } catch (e) {
      console.error(e);
      setPhase({ k: 'notfound', frozen });
    }
  }

  function again() {
    setDet(null);
    setPhase({ k: 'live' });
  }

  let status = 'Inquadra un cane o un gatto';
  if (models === 'loading') status = "Preparo l'occhio magico…";
  else if (models === 'error') status = 'Errore nel caricare la AI';
  else if (!gpsOk) status = gpsStatus === 'denied' ? 'Serve la posizione GPS' : 'Aspetto il segnale GPS…';
  else if (det) status = `${SPECIES_NAME[det.species].emoji} ${SPECIES_NAME[det.species].one} trovato! Scatta!`;

  return (
    <div className="capture">
      <video ref={videoRef} playsInline muted autoPlay style={{ visibility: phase.k === 'live' ? 'visible' : 'hidden' }} />
      {(phase.k === 'analyzing' || phase.k === 'notfound') && <img className="frozen" src={phase.frozen} alt="" />}

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
          {det && <span className="tag">{SPECIES_NAME[det.species].one}!</span>}
        </div>
      )}

      <div className="capture-top">
        <button className="icon-btn" aria-label="Chiudi" onClick={() => back()}>
          <X size={24} />
        </button>
        {phase.k === 'live' && <div className={`capture-status ${det && canShoot ? 'found' : ''}`}>{status}</div>}
        <span className="gps-chip" title="Precisione GPS">
          {gpsOk ? `📍 ±${Math.round(fix!.accuracy)} m` : '📍 …'}
        </span>
      </div>

      {phase.k === 'live' && (
        <div className="capture-bottom">
          <button className={`shutter ${det && canShoot ? 'ready' : ''}`} disabled={!canShoot} aria-label="Scatta" onClick={shoot}>
            <span />
          </button>
          <div className="capture-hint">Non avvicinarti troppo: la foto va bene anche da lontano 🐾</div>
        </div>
      )}

      {flash > 0 && <div className="flash" key={flash} />}

      {phase.k === 'analyzing' && (
        <div className="scanning">
          <div className="line" />
          <div className="label">🔎 Analizzo la foto…</div>
        </div>
      )}

      {phase.k === 'notfound' && (
        <Message emoji="🙈" title="Nessun cane o gatto" text="Non sono riuscito a trovarlo nella foto. Prova a inquadrarlo meglio, con più luce e senza muoverti." action="Riprova" onAction={again} />
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
          emoji="📷"
          title="Serve la fotocamera"
          text="Per catturare gli animali devi permettere l'uso della fotocamera. Attivala nelle impostazioni del browser per questo sito e riprova."
          action="Torna alla mappa"
          onAction={() => back()}
        />
      )}
      {wantCamera && (camera === 'nocamera' || camera === 'unsupported') && (
        <Message
          emoji="📵"
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
          emoji="🤖"
          title="AI non caricata"
          text="Serve una connessione a internet per scaricare il riconoscimento la prima volta (circa 20 MB)."
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

function Message(props: { emoji: string; title: string; text: string; action: string; onAction: () => void }) {
  return (
    <div className="capture-msg">
      <div className="box">
        <div className="emoji">{props.emoji}</div>
        <h2>{props.title}</h2>
        <p>{props.text}</p>
        <button className="btn btn-primary" onClick={props.onAction}>
          {props.action}
        </button>
      </div>
    </div>
  );
}
