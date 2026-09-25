import { useGame } from '../game/store';
import { TIER_NAMES, tierText } from '../game/badges';
import { levelTitle } from '../game/progress';
import { useEffect } from 'react';
import { GameIcon, IconBubble, Medal } from './icons';
import { play } from './sound';
import { KIND_NAMES, LEVEL_REWARDS } from './cosmetics';
import { RewardPreview } from './RewardPreview';
import { go } from '../router';
import { Fireworks } from './Fireworks';

export function Toasts() {
  const toasts = useGame((s) => s.toasts);
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div className="toast" key={t.id}>
          <GameIcon name={t.icon} size={18} />
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  );
}

/** Festeggiamenti per livelli e medaglie, uno alla volta. */
export function Celebrations() {
  const c = useGame((s) => s.celebrations[0]);
  const dismiss = useGame((s) => s.dismissCelebration);
  useEffect(() => {
    if (c) play('level');
  }, [c]);
  if (!c) return null;
  return (
    <div className="overlay" onClick={dismiss}>
      <Fireworks bursts={c.kind === 'level' ? 6 : 3} key={c.kind === 'level' ? `l${c.level}` : `b${c.badge.id}${c.tier}`} />
      <div className="celebration" onClick={(e) => e.stopPropagation()}>
        <div className="rays" />
        {c.kind === 'level' ? (
          <>
            <div className="big" style={{ display: 'flex', justifyContent: 'center' }}>
              <IconBubble name="party" size={96} tone="gold" />
            </div>
            <h2>Livello {c.level}!</h2>
            {levelTitle(c.level) !== levelTitle(c.level - 1) ? (
              <p>
                Nuovo titolo sbloccato: <b>{levelTitle(c.level)}</b>!
              </p>
            ) : (
              <p>Continua a esplorare e a catturare: ogni livello è una nuova sfida!</p>
            )}
            <div className="unlock-list">
              {LEVEL_REWARDS.filter((r) => r.level > (c.from ?? c.level - 1) && r.level <= c.level).map((r, i) => (
                <button
                  key={r.level}
                  className="unlock-box"
                  style={{ animationDelay: `${0.4 + i * 0.15}s` }}
                  onClick={() => {
                    dismiss();
                    go('premi');
                  }}
                >
                  <RewardPreview reward={r} size={50} />
                  <span className="grow" style={{ textAlign: 'left' }}>
                    <span className="muted" style={{ fontSize: 13 }}>
                      <GameIcon name="sparkles" size={13} /> Livello {r.level} · {KIND_NAMES[r.kind]}
                    </span>
                    <b style={{ display: 'block', fontSize: 17 }}>{r.name}</b>
                  </span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="big medal-spin" style={{ display: 'flex', justifyContent: 'center' }}>
              <Medal badgeId={c.badge.id} tier={c.tier} size={96} />
            </div>
            <h2>Medaglia {TIER_NAMES[c.tier - 1].toLowerCase()}!</h2>
            <p>
              <b>{c.badge.name}</b>: {tierText(c.badge, c.tier - 1)}.
            </p>
          </>
        )}
        <button className="btn btn-primary btn-block" onClick={dismiss}>
          Evviva!
        </button>
      </div>
    </div>
  );
}
