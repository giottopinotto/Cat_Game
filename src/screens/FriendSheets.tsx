import { useEffect, useRef, useState } from 'react';
import type { Animal } from '../data/types';
import { decodeCard, encodeCard, type FriendCard } from '../game/friends';
import { useGame } from '../game/store';
import { Sheet, vibrate } from '../ui/common';
import { FriendCardBig } from '../ui/FriendCard';
import { IconBubble } from '../ui/icons';
import { QrCode } from '../ui/QrCode';
import { play } from '../ui/sound';

/** Mostra il QR di una propria carta, da far inquadrare a un amico. */
export function ShowQrSheet({ animal, onClose }: { animal: Animal; onClose: () => void }) {
  const player = useGame((s) => s.player);
  const text = encodeCard(animal, player.name, player.avatar);
  return (
    <Sheet onClose={onClose}>
      <h2>Mostra la carta a un amico</h2>
      <p className="muted" style={{ margin: '4px 0 14px' }}>
        L'amico apre Zampe in Giro, va in <b>Collezione → Amici → Scansiona</b> e inquadra questo codice.
      </p>
      <div className="qr-box">
        <QrCode text={text} size={250} />
      </div>
      <p className="muted" style={{ fontSize: 13, marginTop: 12, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <IconBubble name="lock" size={30} tone="mint" />
        <span>Il codice contiene solo nome, razza e rarità della carta e il tuo nome da esploratore. Niente foto, niente posizione.</span>
      </p>
    </Sheet>
  );
}

type ScanState = { k: 'starting' } | { k: 'scanning'; hint?: string } | { k: 'error'; msg: string } | { k: 'found'; card: FriendCard };

/** Inquadra il QR di un amico con la fotocamera. Tutto avviene sul telefono. */
export function ScanSheet({ onClose }: { onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<ScanState>({ k: 'starting' });
  const addFriendCard = useGame((s) => s.addFriendCard);
  const toast = useGame((s) => s.toast);
  const scanning = state.k === 'starting' || state.k === 'scanning';

  useEffect(() => {
    if (!scanning) return;
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    const canvas = document.createElement('canvas');
    const g = canvas.getContext('2d', { willReadFrequently: true })!;

    async function start() {
      try {
        const jsQR = (await import('jsqr')).default;
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        if (stopped) return stream.getTracks().forEach((t) => t.stop());
        const v = videoRef.current!;
        v.srcObject = stream;
        await v.play().catch(() => {});
        setState({ k: 'scanning' });
        const tick = () => {
          if (stopped) return;
          if (v.videoWidth) {
            const scale = Math.min(1, 720 / Math.max(v.videoWidth, v.videoHeight));
            canvas.width = Math.round(v.videoWidth * scale);
            canvas.height = Math.round(v.videoHeight * scale);
            g.drawImage(v, 0, 0, canvas.width, canvas.height);
            const img = g.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
            if (code?.data) {
              const card = decodeCard(code.data);
              if (card) {
                play('scan');
                vibrate(40);
                setState({ k: 'found', card });
                return;
              }
              setState({ k: 'scanning', hint: 'Questo codice non è una carta di Zampe in Giro.' });
            }
          }
          timer = setTimeout(tick, 200);
        };
        tick();
      } catch {
        setState({ k: 'error', msg: 'Non riesco ad aprire la fotocamera. Controlla il permesso nelle impostazioni del browser.' });
      }
    }
    void start();
    return () => {
      stopped = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [scanning]);

  function add(card: FriendCard) {
    const r = addFriendCard(card);
    if (r === 'own') toast('alert', 'Questa è una tua carta!');
    else {
      play('reward');
      toast('friends', r === 'new' ? `Nuova carta di ${card.from}: ${card.name}` : `Carta di ${card.name} aggiornata`);
    }
    onClose();
  }

  return (
    <Sheet onClose={onClose}>
      <h2>Scansiona la carta di un amico</h2>
      {state.k === 'found' ? (
        <>
          <p className="muted" style={{ margin: '4px 0 12px' }}>
            Ecco la carta di <b>{state.card.from}</b>:
          </p>
          <div className="friend-preview">
            <FriendCardBig card={state.card} />
          </div>
          <button className="btn btn-primary btn-block" style={{ marginTop: 14 }} onClick={() => add(state.card)}>
            Aggiungi agli amici
          </button>
          <button className="btn btn-ghost btn-block" style={{ marginTop: 8 }} onClick={() => setState({ k: 'starting' })}>
            Scansiona un'altra
          </button>
        </>
      ) : state.k === 'error' ? (
        <p style={{ marginTop: 12 }}>{state.msg}</p>
      ) : (
        <>
          <p className="muted" style={{ margin: '4px 0 12px' }}>
            Inquadra il codice che l'amico ti mostra dalla sua carta.
          </p>
          <div className="scan-box">
            <video ref={videoRef} playsInline muted />
            <div className="scan-frame" aria-hidden />
          </div>
          {state.k === 'scanning' && state.hint && <p className="muted center" style={{ marginTop: 10 }}>{state.hint}</p>}
        </>
      )}
    </Sheet>
  );
}

/** Dettaglio di una carta amica, con la possibilità di toglierla. */
export function FriendCardSheet({ card, onClose }: { card: FriendCard; onClose: () => void }) {
  const remove = useGame((s) => s.removeFriendCard);
  return (
    <Sheet onClose={onClose}>
      <div className="friend-preview">
        <FriendCardBig card={card} />
      </div>
      <button
        className="btn btn-ghost btn-block"
        style={{ marginTop: 14, color: 'var(--danger)' }}
        onClick={() => {
          remove(card.id);
          onClose();
        }}
      >
        Togli questa carta
      </button>
    </Sheet>
  );
}
