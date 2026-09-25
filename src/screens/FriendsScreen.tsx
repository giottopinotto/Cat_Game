import { ChevronLeft, Link2, QrCode as QrIcon, ScanLine, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getEntry } from '../data/entries';
import { RARITIES, RARITY_INFO } from '../data/types';
import { BADGES } from '../game/badges';
import { makeToken, QR_MAX, readToken, tokenFromLink, type Friend, type MyProfileInput } from '../game/friends';
import { levelInfo, levelTitle } from '../game/progress';
import { useGame, type FriendResult } from '../game/store';
import { back, go } from '../router';
import { formatDate, formatNumber, RarityPill, rarityStyle, Sheet, Switch, vibrate } from '../ui/common';
import { AvatarArt, GameIcon, Hearts, IconBubble, Medal, Silhouette, SpeciesIcon } from '../ui/icons';
import { QrCode } from '../ui/QrCode';
import { play } from '../ui/sound';

const RESULT_TEXT: Record<FriendResult, string> = {
  new: 'Amico aggiunto!',
  updated: 'Profilo aggiornato',
  old: 'Questo aggiornamento è più vecchio di quello che hai già',
  unknown: 'Prima aggiungete gli amici di persona, con il QR',
  self: 'Questo è il tuo profilo!',
  full: 'Hai raggiunto il numero massimo di amici',
  invalid: 'Codice non valido',
};

function useMyProfile(): () => MyProfileInput {
  return () => {
    const { player, animals } = useGame.getState();
    return {
      name: player.name,
      avatar: player.avatar,
      xp: player.xp,
      walkedM: player.walkedM,
      badgeTiers: player.badgeTiers,
      animals,
      prefs: { shareKm: player.settings.shareKm, shareNames: player.settings.shareNames },
    };
  };
}

// ---- Lista e classifica -----------------------------------------------------

export function FriendsScreen({ id }: { id?: string }) {
  const friends = useGame((s) => s.player.friends);
  const player = useGame((s) => s.player);
  const animals = useGame((s) => s.animals);
  const updateSettings = useGame((s) => s.updateSettings);
  const toast = useGame((s) => s.toast);
  const [sheet, setSheet] = useState<null | 'qr' | 'scan' | 'paste'>(null);
  const profile = useMyProfile();
  const open = id ? friends.find((f) => f.id === id) : undefined;

  const ranking = useMemo(
    () =>
      [
        ...friends.map((f) => ({ id: f.id, name: f.name, avatar: f.avatar, xp: f.xp, total: f.total, me: false })),
        { id: '', name: player.name || 'Tu', avatar: player.avatar, xp: player.xp, total: animals.length, me: true },
      ].sort((a, b) => b.xp - a.xp),
    [friends, player, animals.length],
  );

  async function sendUpdate() {
    try {
      const token = await makeToken(profile(), false);
      const url = `${location.origin}${location.pathname}#/amico/${token}`;
      const text = `Il mio profilo di Zampe in Giro (${player.name}). Aprilo per aggiornarmi tra i tuoi amici:`;
      if (navigator.share) {
        try {
          await navigator.share({ title: 'Zampe in Giro', text, url });
          return;
        } catch (e) {
          if ((e as DOMException).name === 'AbortError') return;
        }
      }
      await navigator.clipboard.writeText(url);
      toast('check', 'Link copiato: incollalo nella chat con i tuoi amici');
    } catch {
      toast('alert', 'Non riesco a creare il link');
    }
  }

  if (open) return <FriendDetail friend={open} />;

  return (
    <div className="screen">
      <div className="screen-head">
        <button className="icon-btn" aria-label="Indietro" onClick={() => back('profilo')}>
          <ChevronLeft size={26} />
        </button>
        <div className="grow">
          <h1>Amici</h1>
          <div className="sub">Senza account e senza server: vi aggiungete di persona</div>
        </div>
      </div>

      <div className="friend-actions">
        <button className="btn btn-primary" onClick={() => setSheet('qr')}>
          <QrIcon size={20} /> Il mio QR
        </button>
        <button className="btn btn-teal" onClick={() => setSheet('scan')}>
          <ScanLine size={20} /> Aggiungi amico
        </button>
      </div>
      <button className="switch-row" onClick={sendUpdate}>
        <IconBubble name="link" size={40} tone="mint" />
        <span className="grow">
          <b>Invia un aggiornamento</b>
          <div className="muted" style={{ fontSize: 13 }}>
            Un link da mandare in chat agli amici che ti hanno già aggiunto, con la tua collezione completa
          </div>
        </span>
        <Link2 size={20} />
      </button>
      <button className="link" style={{ margin: '10px 4px 0', fontSize: 14 }} onClick={() => setSheet('paste')}>
        Hai ricevuto un link ma si è aperto nel browser? Incollalo qui
      </button>

      <div className="section-title">
        <GameIcon name="award" /> Classifica
      </div>
      {friends.length === 0 ? (
        <div className="panel">
          <p className="muted" style={{ lineHeight: 1.5 }}>
            Quando incontri un amico che gioca: tu tocchi <b>Il mio QR</b>, lui tocca <b>Aggiungi amico</b> e lo inquadra.
            Poi fate lo scambio al contrario. Da quel momento potete mandarvi gli aggiornamenti anche a distanza.
          </p>
        </div>
      ) : (
        <div className="ranking">
          {ranking.map((r, i) => (
            <button key={r.id || 'me'} className={`rank-row ${r.me ? 'me' : ''}`} onClick={() => (r.me ? go('profilo', true) : go(`amici/${r.id}`))}>
              <span className="pos">{i + 1}</span>
              <AvatarArt id={r.avatar} size={40} />
              <span className="grow">
                <b>{r.me ? `${r.name} (tu)` : r.name}</b>
                <div className="muted" style={{ fontSize: 13 }}>
                  Livello {levelInfo(r.xp).level} · {r.total} {r.total === 1 ? 'animale' : 'animali'}
                </div>
              </span>
              <span className="xp">{formatNumber(r.xp)} XP</span>
            </button>
          ))}
        </div>
      )}

      <div className="section-title">
        <GameIcon name="lock" /> Cosa vedono gli amici
      </div>
      <div className="menu">
        <div className="menu-block muted" style={{ fontSize: 14, lineHeight: 1.45 }}>
          Nome, avatar, livello, medaglie e la collezione (razza e rarità). <b>Mai</b> posizioni, foto, date od orari. Gli
          aggiornamenti sono firmati dal tuo telefono: nessun altro può spacciarsi per te.
        </div>
        <button onClick={() => updateSettings({ shareNames: !player.settings.shareNames })}>
          <span className="grow">Mostra i nomi dei miei animali</span>
          <Switch on={player.settings.shareNames} />
        </button>
        <button onClick={() => updateSettings({ shareKm: !player.settings.shareKm })}>
          <span className="grow">Mostra i km a piedi</span>
          <Switch on={player.settings.shareKm} />
        </button>
      </div>

      {sheet === 'qr' && <MyQrSheet onClose={() => setSheet(null)} profile={profile} />}
      {sheet === 'scan' && <ScanSheet onClose={() => setSheet(null)} />}
      {sheet === 'paste' && <PasteSheet onClose={() => setSheet(null)} />}
    </div>
  );
}

// ---- Il mio QR --------------------------------------------------------------

function MyQrSheet({ onClose, profile }: { onClose: () => void; profile: () => MyProfileInput }) {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    makeToken(profile(), true).then(setToken, () => setError(true));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Sheet onClose={onClose}>
      <h2>Il mio QR</h2>
      <p className="muted" style={{ margin: '4px 0 14px' }}>
        Fallo inquadrare all'amico da <b>Amici → Aggiungi amico</b>. Mostralo solo di persona.
      </p>
      <div className="qr-box">
        {token ? <QrCode text={token} size={290} ecc="L" /> : <p className="muted">{error ? 'Non riesco a creare il codice.' : 'Preparo il codice…'}</p>}
      </div>
      {token && token.length >= QR_MAX - 50 && (
        <p className="muted" style={{ fontSize: 13, marginTop: 10 }}>
          Nel QR ci sono solo le tue carte migliori: la collezione completa arriva con "Invia un aggiornamento".
        </p>
      )}
    </Sheet>
  );
}

// ---- Scansione --------------------------------------------------------------

type ScanState = { k: 'scanning'; hint?: string } | { k: 'error'; msg: string } | { k: 'done'; friend: Friend; result: FriendResult };

type Detector = { detect(src: CanvasImageSource): Promise<{ rawValue: string }[]> };

function ScanSheet({ onClose }: { onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<ScanState>({ k: 'scanning' });
  const saveFriend = useGame((s) => s.saveFriend);

  useEffect(() => {
    if (state.k !== 'scanning') return;
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    const canvas = document.createElement('canvas');
    const g = canvas.getContext('2d', { willReadFrequently: true })!;

    async function start() {
      try {
        // Il lettore del telefono se c'è (Android), altrimenti jsQR.
        const BD = (globalThis as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }).BarcodeDetector;
        const detector = BD ? new BD({ formats: ['qr_code'] }) : null;
        const jsQR = detector ? null : (await import('jsqr')).default;
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } }, audio: false });
        if (stopped) return stream.getTracks().forEach((t) => t.stop());
        const v = videoRef.current!;
        v.srcObject = stream;
        await v.play().catch(() => {});
        const tick = async () => {
          if (stopped) return;
          let text: string | null = null;
          if (v.videoWidth) {
            try {
              if (detector) text = (await detector.detect(v))[0]?.rawValue ?? null;
              else {
                const scale = Math.min(1, 1080 / Math.max(v.videoWidth, v.videoHeight));
                canvas.width = Math.round(v.videoWidth * scale);
                canvas.height = Math.round(v.videoHeight * scale);
                g.drawImage(v, 0, 0, canvas.width, canvas.height);
                const img = g.getImageData(0, 0, canvas.width, canvas.height);
                text = jsQR!(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' })?.data ?? null;
              }
            } catch {
              text = null;
            }
          }
          if (stopped) return;
          if (text) {
            const friend = await readToken(text);
            if (friend) {
              const result = await saveFriend(friend, true);
              play(result === 'new' || result === 'updated' ? 'reward' : 'error');
              vibrate(40);
              setState({ k: 'done', friend, result });
              return;
            }
            setState({ k: 'scanning', hint: 'Questo QR non è un profilo di Zampe in Giro.' });
          }
          timer = setTimeout(tick, 200);
        };
        void tick();
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
  }, [state.k]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Sheet onClose={onClose}>
      <h2>Aggiungi un amico</h2>
      {state.k === 'done' ? (
        <div className="center" style={{ marginTop: 12 }}>
          <AvatarArt id={state.friend.avatar} size={84} />
          <h2 style={{ marginTop: 8 }}>{state.friend.name}</h2>
          <p className="muted">{RESULT_TEXT[state.result]}</p>
          {state.result === 'new' && (
            <p className="muted" style={{ fontSize: 14, marginTop: 8 }}>
              Ora mostragli il tuo QR, così anche lui può aggiungere te.
            </p>
          )}
          <button className="btn btn-primary btn-block" style={{ marginTop: 16 }} onClick={() => (onClose(), go(`amici/${state.friend.id}`))}>
            Vedi il profilo
          </button>
        </div>
      ) : state.k === 'error' ? (
        <p style={{ marginTop: 12 }}>{state.msg}</p>
      ) : (
        <>
          <p className="muted" style={{ margin: '4px 0 12px' }}>
            Inquadra il QR che l'amico ti mostra da <b>Amici → Il mio QR</b>.
          </p>
          <div className="scan-box">
            <video ref={videoRef} playsInline muted />
            <div className="scan-frame" aria-hidden />
          </div>
          {state.hint && <p className="muted center" style={{ marginTop: 10 }}>{state.hint}</p>}
        </>
      )}
    </Sheet>
  );
}

// ---- Link incollato a mano ---------------------------------------------------------
// Su iPhone l'app installata e Safari hanno memorie separate: se il link si apre nel
// browser, lo si copia e lo si incolla qui dentro l'app.

function PasteSheet({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const saveFriend = useGame((s) => s.saveFriend);
  async function submit() {
    const friend = await readToken(tokenFromLink(text) ?? text.trim());
    const result: FriendResult = friend ? await saveFriend(friend, false) : 'invalid';
    if (friend && (result === 'updated' || result === 'old')) {
      onClose();
      go(`amici/${friend.id}`);
    } else setMsg(RESULT_TEXT[result]);
  }
  return (
    <Sheet onClose={onClose}>
      <h2>Incolla un link di aggiornamento</h2>
      <textarea
        className="input"
        style={{ minHeight: 110, padding: 12, fontSize: 14, marginTop: 12 }}
        value={text}
        placeholder="https://…#/amico/…"
        onChange={(e) => (setText(e.target.value.slice(0, 50000)), setMsg(null))}
      />
      {msg && <p style={{ marginTop: 8, color: 'var(--danger)' }}>{msg}</p>}
      <button className="btn btn-primary btn-block" style={{ marginTop: 12 }} disabled={!text.trim()} onClick={() => void submit()}>
        Aggiorna
      </button>
    </Sheet>
  );
}

// ---- Link ricevuto in chat -----------------------------------------------------

/** Apre un link di aggiornamento (#/amico/…): verifica, salva e toglie i dati dall'indirizzo. */
export function FriendLink({ token }: { token: string }) {
  const saveFriend = useGame((s) => s.saveFriend);
  const toast = useGame((s) => s.toast);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const friend = await readToken(token);
      const result: FriendResult = friend ? await saveFriend(friend, false) : 'invalid';
      if (cancelled) return;
      if (friend && (result === 'updated' || result === 'old')) {
        if (result === 'updated') toast('friends', `${friend.name}: profilo aggiornato`);
        go(`amici/${friend.id}`, true);
      } else setMsg(RESULT_TEXT[result]);
    })();
    return () => {
      cancelled = true;
    };
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="screen no-nav">
      <div className="empty">
        <div className="e">
          <GameIcon name="friends" size={56} />
        </div>
        <h2>{msg ?? 'Controllo il link…'}</h2>
        {msg && (
          <>
            <p>I link di aggiornamento funzionano solo per gli amici che hai già aggiunto di persona.</p>
            <button className="btn btn-primary" onClick={() => go('amici', true)}>
              Vai agli amici
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ---- Profilo di un amico ----------------------------------------------------------

function FriendDetail({ friend }: { friend: Friend }) {
  const animals = useGame((s) => s.animals);
  const removeFriend = useGame((s) => s.removeFriend);
  const [confirm, setConfirm] = useState(false);
  const lvl = levelInfo(friend.xp);
  const mine = useMemo(() => new Set(animals.map((a) => a.entryId)), [animals]);
  const theirs = new Set(friend.found);
  const onlyThem = friend.found.filter((id) => !mine.has(id));
  const onlyMe = [...mine].filter((id) => !theirs.has(id));
  const medals = BADGES.filter((b) => (friend.badges[b.id] ?? 0) > 0);

  return (
    <div className="screen">
      <div className="screen-head">
        <button className="icon-btn" aria-label="Indietro" onClick={() => back('amici')}>
          <ChevronLeft size={26} />
        </button>
        <div className="grow" />
      </div>
      <div className="profile-head">
        <div className="avatar">
          <AvatarArt id={friend.avatar} />
          <span className="lvl">{lvl.level}</span>
        </div>
        <h1>{friend.name}</h1>
        <p className="muted">
          {levelTitle(lvl.level)} · aggiornato il {formatDate(friend.receivedAt)}
        </p>
      </div>

      <div className="stats-grid">
        <div className="stat-tile">
          <div className="v">{formatNumber(friend.total)}</div>
          <div className="l">animali</div>
        </div>
        <div className="stat-tile">
          <div className="v">{friend.found.length}</div>
          <div className="l">voci dell'album</div>
        </div>
        <div className="stat-tile">
          <div className="v">{formatNumber(friend.xp)}</div>
          <div className="l">XP</div>
        </div>
        <div className="stat-tile">
          <div className="v">{friend.km === null ? '—' : `${String(friend.km).replace('.', ',')} km`}</div>
          <div className="l">a piedi</div>
        </div>
      </div>

      <div className="rarity-bars">
        {RARITIES.map((r, i) => (
          <div key={r} style={rarityStyle(r)}>
            <b>{friend.rarityCounts[i]}</b>
            <span>{RARITY_INFO[r].label}</span>
          </div>
        ))}
      </div>

      {medals.length > 0 && (
        <>
          <div className="section-title">
            <GameIcon name="medal" /> Medaglie
          </div>
          <div className="medal-row">
            {medals.map((b) => (
              <div key={b.id} className="center">
                <Medal badgeId={b.id} tier={friend.badges[b.id]} size={50} />
                <div style={{ fontSize: 12, marginTop: 4 }}>{b.name}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="section-title">
        <GameIcon name="book" /> Album a confronto
      </div>
      <div className="panel">
        <p style={{ marginBottom: 8 }}>
          <b>{onlyThem.length}</b> {onlyThem.length === 1 ? 'voce' : 'voci'} che ha {friend.name} e a te {onlyThem.length === 1 ? 'manca' : 'mancano'} ·{' '}
          <b>{onlyMe.length}</b> che hai solo tu
        </p>
        <div className="chips wrap">
          {onlyThem.slice(0, 30).map((id) => (
            <span key={id} className="chip">
              {getEntry(id)?.name}
            </span>
          ))}
        </div>
      </div>

      <div className="section-title">
        <GameIcon name="paw" /> Collezione
      </div>
      {friend.partial && (
        <p className="muted" style={{ fontSize: 14, marginBottom: 10 }}>
          Qui ci sono solo le carte migliori: chiedi a {friend.name} di mandarti un aggiornamento per vederle tutte.
        </p>
      )}
      <div className="grid">
        {friend.cards.map((c, i) => (
          <div key={i} className="mini friend-mini" style={rarityStyle(c.rarity)}>
            <div className="mini-inner">
              <div className="mini-photo">
                <Silhouette species={c.species} size={64} />
              </div>
              <div className="mini-body">
                <div className="mini-name">
                  <SpeciesIcon species={c.species} size={15} /> {c.name}
                </div>
                <div className="mini-breed">{getEntry(c.entryId)?.name}</div>
                <div className="row" style={{ justifyContent: 'space-between', marginTop: 4 }}>
                  <RarityPill rarity={c.rarity} />
                </div>
                <Hearts level={c.friendship} size={12} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button className="btn btn-ghost btn-block" style={{ marginTop: 24, color: 'var(--danger)' }} onClick={() => setConfirm(true)}>
        <Trash2 size={18} /> Togli dagli amici
      </button>
      {confirm && (
        <Sheet onClose={() => setConfirm(false)}>
          <h2>Togliere {friend.name}?</h2>
          <p className="muted" style={{ margin: '6px 0 18px' }}>
            Per riaggiungerlo servirà di nuovo il QR, di persona.
          </p>
          <button
            className="btn btn-danger btn-block"
            onClick={() => {
              removeFriend(friend.id);
              go('amici', true);
            }}
          >
            Sì, togli
          </button>
        </Sheet>
      )}
    </div>
  );
}
