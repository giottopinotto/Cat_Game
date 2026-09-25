import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Animal } from '../data/types';
import { formatDistance } from '../game/geo';
import { dayKey } from '../game/progress';
import { useGame } from '../game/store';
import { back, go } from '../router';
import { MiniCard } from '../ui/AnimalCard';
import { GameIcon } from '../ui/icons';

const WEEKDAYS = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];

interface DayInfo {
  seen: Animal[];
  newOnes: number;
  walked: number;
}

/** Diario delle uscite: un calendario con gli animali visti e i km fatti ogni giorno. */
export function DiaryScreen() {
  const animals = useGame((s) => s.animals);
  const dailyWalk = useGame((s) => s.player.dailyWalk);
  const now = new Date();
  const [month, setMonth] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [selected, setSelected] = useState(dayKey(now.getTime()));

  const days = useMemo(() => {
    const m = new Map<string, DayInfo>();
    const get = (k: string) => {
      let d = m.get(k);
      if (!d) m.set(k, (d = { seen: [], newOnes: 0, walked: 0 }));
      return d;
    };
    for (const a of animals) {
      const seenDays = new Set(a.encounters.map((e) => dayKey(e.at)));
      for (const k of seenDays) get(k).seen.push(a);
      get(dayKey(a.createdAt)).newOnes++;
    }
    for (const [k, v] of Object.entries(dailyWalk)) get(k).walked += v;
    return m;
  }, [animals, dailyWalk]);

  const first = (month.getDay() + 6) % 7;
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)];
  const keyOf = (d: number) => dayKey(new Date(month.getFullYear(), month.getMonth(), d).getTime());
  const todayKey = dayKey(now.getTime());
  const isCurrentMonth = month.getFullYear() === now.getFullYear() && month.getMonth() === now.getMonth();

  const monthTotals = useMemo(() => {
    let seen = 0;
    let walked = 0;
    let active = 0;
    for (let d = 1; d <= count; d++) {
      const info = days.get(keyOf(d));
      if (!info) continue;
      seen += info.seen.length;
      walked += info.walked;
      if (info.seen.length || info.walked >= 100) active++;
    }
    return { seen, walked, active };
  }, [days, month]); // eslint-disable-line react-hooks/exhaustive-deps

  const sel = days.get(selected);
  const selDate = new Date(`${selected}T12:00:00`);

  return (
    <div className="screen">
      <div className="screen-head">
        <button className="icon-btn" aria-label="Indietro" onClick={() => back('profilo')}>
          <ChevronLeft size={26} />
        </button>
        <div className="grow">
          <h1>Diario</h1>
          <div className="sub">Le tue uscite giorno per giorno</div>
        </div>
      </div>

      <div className="diary-card">
        <div className="diary-month">
          <button className="icon-btn" aria-label="Mese precedente" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
            <ChevronLeft size={22} />
          </button>
          <b className="grow center">{month.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}</b>
          <button
            className="icon-btn"
            aria-label="Mese successivo"
            disabled={isCurrentMonth}
            onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
          >
            <ChevronRight size={22} />
          </button>
        </div>
        <div className="diary-grid">
          {WEEKDAYS.map((w, i) => (
            <span key={i} className="wd">
              {w}
            </span>
          ))}
          {cells.map((d, i) => {
            if (d === null) return <span key={`e${i}`} />;
            const k = keyOf(d);
            const info = days.get(k);
            const level = !info ? 0 : info.seen.length >= 3 ? 3 : info.seen.length > 0 ? 2 : info.walked >= 100 ? 1 : 0;
            return (
              <button
                key={k}
                className={`day l${level} ${k === selected ? 'sel' : ''} ${k === todayKey ? 'today' : ''}`}
                onClick={() => setSelected(k)}
                disabled={k > todayKey}
              >
                {d}
                {info?.newOnes ? <i className="new-dot" /> : null}
              </button>
            );
          })}
        </div>
        <div className="diary-totals">
          <span>
            <b>{monthTotals.active}</b> uscite
          </span>
          <span>
            <b>{monthTotals.seen}</b> incontri
          </span>
          <span>
            <b>{formatDistance(monthTotals.walked)}</b> a piedi
          </span>
        </div>
      </div>

      <div className="section-title">
        <GameIcon name="calendar" /> {selDate.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
      </div>
      {sel && (sel.seen.length > 0 || sel.walked > 0) ? (
        <>
          <div className="row muted" style={{ gap: 16, marginBottom: 12, fontSize: 15 }}>
            <span className="row" style={{ gap: 5 }}>
              <GameIcon name="footprints" size={18} /> {formatDistance(sel.walked)}
            </span>
            <span className="row" style={{ gap: 5 }}>
              <GameIcon name="paw" size={18} /> {sel.seen.length} {sel.seen.length === 1 ? 'animale' : 'animali'}
            </span>
            {sel.newOnes > 0 && (
              <span className="row" style={{ gap: 5 }}>
                <GameIcon name="sparkles" size={18} /> {sel.newOnes} {sel.newOnes === 1 ? 'nuovo' : 'nuovi'}
              </span>
            )}
          </div>
          <div className="grid">
            {sel.seen.map((a) => (
              <MiniCard key={a.id} animal={a} onClick={() => go(`animale/${a.id}`)} />
            ))}
          </div>
        </>
      ) : (
        <p className="muted">Nessuna uscita registrata in questo giorno.</p>
      )}
    </div>
  );
}
