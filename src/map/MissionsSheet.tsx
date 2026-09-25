import { useEffect, useState } from 'react';
import { ALL_DONE_BONUS, missionDone, missionIcon, missionText, type Mission } from '../game/missions';
import { useGame } from '../game/store';
import { formatDistance } from '../game/geo';
import { Sheet, XpBar } from '../ui/common';
import { GameIcon } from '../ui/icons';

function progressText(m: Mission): string {
  if (m.type === 'walk') return `${formatDistance(m.progress)} / ${formatDistance(m.target)}`;
  return `${m.progress} / ${m.target}`;
}

function untilMidnight(): string {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const mins = Math.max(1, Math.round((end.getTime() - now.getTime()) / 60000));
  const h = Math.floor(mins / 60);
  return h > 0 ? `${h} h ${mins % 60} min` : `${mins} min`;
}

export function MissionsSheet({ onClose }: { onClose: () => void }) {
  const missions = useGame((s) => s.player.missions);
  const ensureToday = useGame((s) => s.ensureToday);
  const [, tick] = useState(0);
  useEffect(() => {
    ensureToday();
    const t = setInterval(() => tick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, [ensureToday]);

  return (
    <Sheet onClose={onClose}>
      <h2 className="row">
        <GameIcon name="target" size={24} /> Sfide di oggi
      </h2>
      <p className="muted" style={{ marginBottom: 14 }}>
        Nuove sfide tra {untilMidnight()}
      </p>
      {missions.list.map((m) => {
        const done = missionDone(m);
        return (
          <div key={m.id} className={`mission ${done ? 'done' : ''}`}>
            <div className="mi">
              <GameIcon name={done ? 'check' : missionIcon(m.type)} size={24} />
            </div>
            <div className="grow">
              <div className="mt">{missionText(m)}</div>
              <XpBar value={m.progress} max={m.target} />
              <div className="mp">
                <span>{done ? 'Completata!' : progressText(m)}</span>
              </div>
            </div>
            <div className="rw">+{m.reward} XP</div>
          </div>
        );
      })}
      <div className={`mission ${missions.bonusClaimed ? 'done' : ''}`} style={{ background: '#fff8d9' }}>
        <div className="mi">
          <GameIcon name={missions.bonusClaimed ? 'check' : 'gift'} size={24} />
        </div>
        <div className="grow">
          <div className="mt">Bonus: completa tutte e 3 le sfide</div>
        </div>
        <div className="rw">+{ALL_DONE_BONUS} XP</div>
      </div>
      <button className="btn btn-block" style={{ marginTop: 6 }} onClick={onClose}>
        Chiudi
      </button>
    </Sheet>
  );
}
