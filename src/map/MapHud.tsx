import { LocateFixed, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { distanceM } from '../game/geo';
import { retryLocation, useLocation } from '../game/location';
import { missionDone } from '../game/missions';
import { usePhoto } from '../game/photos';
import { dayKey, levelInfo } from '../game/progress';
import { useGame } from '../game/store';
import { go } from '../router';
import { XpBar } from '../ui/common';
import { AvatarArt } from '../ui/icons';
import { MissionsSheet } from './MissionsSheet';
import { recenter, useFollow } from './MapView';

const NEAR_M = 60;

export function MapHud() {
  const player = useGame((s) => s.player);
  const animals = useGame((s) => s.animals);
  const { status, fix, error } = useLocation();
  const follow = useFollow((s) => s.on);
  const [showMissions, setShowMissions] = useState(false);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const lvl = levelInfo(player.xp);
  const done = player.missions.list.filter(missionDone).length;

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
          <div className="avatar">
            <AvatarArt id={player.avatar} />
            <span className="lvl">{lvl.level}</span>
          </div>
          <div className="grow" style={{ textAlign: 'left' }}>
            <div className="name">{player.name || 'Esploratore'}</div>
            <XpBar value={lvl.into} max={lvl.needed} />
          </div>
        </button>
        <button className={`missions-pill ${done === 3 ? 'done' : ''}`} onClick={() => setShowMissions(true)}>
          🎯 Sfide <span className="count">{done}/3</span>
        </button>
      </div>

      {status !== 'ok' && (
        <div className="gps-banner">
          <span className="emoji">{status === 'denied' ? '📍' : '🛰️'}</span>
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

      {nearby && <NearbyHint {...nearby} onClose={() => setDismissed((d) => [...d, nearby.id])} />}

      <div className="hud-side">
        <button
          className={`icon-btn ${follow ? 'follow-on' : ''}`}
          aria-label="Centra sulla mia posizione"
          onClick={() => recenter(fix)}
        >
          <LocateFixed size={24} />
        </button>
      </div>

      {showMissions && <MissionsSheet onClose={() => setShowMissions(false)} />}
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
          Se lo vedi, fotografalo di nuovo per aumentare la vostra amicizia 💞
        </div>
      </button>
      <button aria-label="Chiudi" onClick={onClose} className="muted">
        <X size={20} />
      </button>
    </div>
  );
}
