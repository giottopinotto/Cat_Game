import { LocateFixed, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { distanceM } from '../game/geo';
import { retryLocation, useLocation } from '../game/location';
import { missionDone } from '../game/missions';
import { usePhoto } from '../game/photos';
import { dayKey, levelInfo } from '../game/progress';
import { useGame } from '../game/store';
import { go } from '../router';
import { activeEvents } from '../game/events';
import { backupDue, saveBackup } from '../ui/backupActions';
import { Sheet, XpBar } from '../ui/common';
import { AvatarArt, GameIcon, IconBubble } from '../ui/icons';
import { MissionsSheet } from './MissionsSheet';
import { recenter, useFollow } from './MapView';

const NEAR_M = 60;

export function MapHud() {
  const player = useGame((s) => s.player);
  const animals = useGame((s) => s.animals);
  const { status, fix, error } = useLocation();
  const gpsOnlyPhoto = useGame((s) => s.player.settings.gpsOnlyPhoto);
  const updateSettings = useGame((s) => s.updateSettings);
  const [gpsInfo, setGpsInfo] = useState(false);
  const follow = useFollow((s) => s.on);
  const [showMissions, setShowMissions] = useState(false);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const lvl = levelInfo(player.xp);
  const done = player.missions.list.filter(missionDone).length;
  const events = activeEvents();
  const snoozeBackup = useGame((s) => s.snoozeBackup);
  const lastCaptureAt = animals.reduce((m, a) => Math.max(m, a.encounters[a.encounters.length - 1].at), 0);
  const showBackup = backupDue(player, lastCaptureAt, animals.length);

  // Un animale già conosciuto qui vicino, non ancora salutato oggi.
  const nearby = useMemo(() => {
    if (!fix) return null;
    const today = dayKey(Date.now());
    let best: { id: string; name: string; photo: string; d: number } | null = null;
    for (const a of animals) {
      if (dismissed.includes(a.id)) continue;
      if (a.encounters.some((e) => dayKey(e.at) === today)) continue;
      for (const e of a.encounters) {
        const d = distanceM(fix, e);
        if (d <= NEAR_M && (!best || d < best.d)) best = { id: a.id, name: a.name, photo: a.coverPhotoId, d };
      }
    }
    return best;
  }, [fix, animals, dismissed]);

  return (
    <>
      <div className="hud-top">
        <button className="player-chip" onClick={() => go('profilo')}>
          <div className={`avatar frame-${player.frame}`}>
            <AvatarArt id={player.avatar} />
            <span className="lvl">{lvl.level}</span>
          </div>
          <div className="grow" style={{ textAlign: 'left' }}>
            <div className="name">{player.name || 'Esploratore'}</div>
            <XpBar value={lvl.into} max={lvl.needed} />
          </div>
        </button>
        <button className={`missions-pill ${done === 3 ? 'done' : ''}`} onClick={() => setShowMissions(true)}>
          <GameIcon name="target" /> Sfide <span className="count">{done}/3</span>
        </button>
      </div>

      {status !== 'ok' && !gpsOnlyPhoto && (
        <div className="gps-banner">
          <IconBubble name={status === 'denied' ? 'pin' : 'satellite'} size={42} />
          <div className="grow">
            {status === 'denied' ? (
              <>
                <b>Serve la posizione per giocare.</b>
                <div className="muted" style={{ fontSize: 13 }}>
                  Attivala nelle impostazioni del browser per questo sito, poi riprova.
                </div>
              </>
            ) : status === 'unavailable' ? (
              <b>{error}</b>
            ) : (
              <>
                <b>Cerco il segnale GPS…</b>
                {error && <div className="muted" style={{ fontSize: 13 }}>{error}</div>}
              </>
            )}
          </div>
          {status === 'denied' && (
            <button className="btn btn-sm btn-teal" onClick={retryLocation}>
              Riprova
            </button>
          )}
        </div>
      )}

      {events.length > 0 && (status === 'ok' || gpsOnlyPhoto) && (
        <button className="event-chip" onClick={() => setShowMissions(true)}>
          <GameIcon name={events[0].icon} size={18} />
          <span>
            <b>{events[0].name}</b> · {events[0].desc}
          </span>
        </button>
      )}

      {showBackup && !nearby && (
        <div className="nearby-hint backup-hint">
          <IconBubble name="shield" size={40} tone="mint" />
          <button className="grow" style={{ textAlign: 'left' }} onClick={() => void saveBackup()}>
            <b>Salva un backup</b>
            <div className="muted" style={{ fontSize: 13 }}>
              Hai nuove catture: salvale in un file, così non le perdi se cambi telefono
            </div>
          </button>
          <button aria-label="Più tardi" onClick={snoozeBackup} className="muted">
            <X size={20} />
          </button>
        </div>
      )}

      {nearby && <NearbyHint {...nearby} onClose={() => setDismissed((d) => [...d, nearby.id])} />}

      {gpsOnlyPhoto && !showBackup && (
        <button className="gps-off-chip" onClick={() => setGpsInfo(true)}>
          <GameIcon name="lock" size={15} /> GPS spento: animali e zone nascosti
        </button>
      )}

      {!gpsOnlyPhoto && <div className="hud-side">
        <button
          className={`icon-btn ${follow ? 'follow-on' : ''}`}
          aria-label="Centra sulla mia posizione"
          onClick={() => recenter(fix)}
        >
          <LocateFixed size={24} />
        </button>
      </div>}

      {showMissions && <MissionsSheet onClose={() => setShowMissions(false)} />}
      {gpsInfo && (
        <Sheet onClose={() => setGpsInfo(false)}>
          <div className="row" style={{ gap: 12, marginBottom: 8 }}>
            <IconBubble name="lock" tone="mint" />
            <h2>Posizione solo per le foto</h2>
          </div>
          <p className="muted" style={{ lineHeight: 1.45, marginBottom: 16 }}>
            Il GPS si accende solo quando fotografi e la mappa non mostra niente di tuo: né gli animali trovati né le zone
            esplorate. Se attivi il GPS li vedi sulla mappa e contano anche i km e le zone.
          </p>
          <button
            className="btn btn-primary btn-block"
            onClick={() => {
              updateSettings({ gpsOnlyPhoto: false });
              setGpsInfo(false);
            }}
          >
            Attiva il GPS
          </button>
          <button className="btn btn-ghost btn-block" style={{ marginTop: 8 }} onClick={() => setGpsInfo(false)}>
            Lascialo spento
          </button>
        </Sheet>
      )}
    </>
  );
}

function NearbyHint({ id, name, photo, onClose }: { id: string; name: string; photo: string; onClose: () => void }) {
  const url = usePhoto(photo, 'thumb');
  return (
    <div className="nearby-hint">
      {url && <img src={url} alt="" />}
      <button className="grow" style={{ textAlign: 'left' }} onClick={() => go(`animale/${id}`)}>
        <b>{name} vive qui vicino!</b>
        <div className="muted" style={{ fontSize: 13 }}>
          Se lo vedi, fotografalo di nuovo per aumentare la vostra amicizia
        </div>
      </button>
      <button aria-label="Chiudi" onClick={onClose} className="muted">
        <X size={20} />
      </button>
    </div>
  );
}
