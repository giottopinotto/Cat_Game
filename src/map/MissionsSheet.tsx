import { useEffect, useState } from 'react';
import { ALL_DONE_BONUS, missionDone, missionIcon, missionText, type Mission } from '../game/missions';
import { useGame } from '../game/store';
import { formatDistance } from '../game/geo';
import { Sheet, XpBar } from '../ui/common';
import { activeEvents, upcomingEvents } from '../game/events';
import { GameIcon, IconBubble } from '../ui/icons';

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
      <div className={`mission bonus ${missions.bonusClaimed ? 'done' : ''}`}>
        <div className="mi">
          <GameIcon name={missions.bonusClaimed ? 'check' : 'gift'} size={24} />
        </div>
        <div className="grow">
          <div className="mt">Bonus: completa tutte e 3 le sfide</div>
        </div>
        <div className="rw">+{ALL_DONE_BONUS} XP</div>
      </div>
      <h3 className="row" style={{ marginTop: 18, marginBottom: 8 }}>
        <GameIcon name="calendar" size={20} /> Eventi
      </h3>
      {activeEvents().map((e) => (
        <div key={e.id} className="mission event-now">
          <div className="mi">
            <IconBubble name={e.icon} size={40} tone="gold" />
          </div>
          <div className="grow">
            <div className="mt">{e.name} · oggi!</div>
            <div className="muted" style={{ fontSize: 14 }}>
              {e.desc}
            </div>
          </div>
        </div>
      ))}
      {upcomingEvents().map(({ event: e, start }) => (
        <div key={e.id} className="mission">
          <div className="mi">
            <IconBubble name={e.icon} size={40} />
          </div>
          <div className="grow">
            <div className="mt">{e.name}</div>
            <div className="muted" style={{ fontSize: 14 }}>
              {start.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })} · {e.desc}
            </div>
          </div>
        </div>
      ))}
      <p className="muted" style={{ fontSize: 13, margin: '4px 0 10px' }}>
        E ogni domenica: catture nei parchi +50% XP.
      </p>
      <button className="btn btn-block" style={{ marginTop: 6 }} onClick={onClose}>
        Chiudi
      </button>
    </Sheet>
  );
}
