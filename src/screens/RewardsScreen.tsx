import { Check, ChevronLeft, Lock } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { RARITY_INFO, RARITIES } from '../data/types';
import { levelInfo, levelTitle } from '../game/progress';
import { XP_FIRST_TODAY, XP_NEW_ENTRY, XP_REENCOUNTER, XP_ZONE, useGame } from '../game/store';
import { ALL_DONE_BONUS } from '../game/missions';
import { TIER_XP } from '../game/badges';
import { back } from '../router';
import { formatNumber, XpBar } from '../ui/common';
import { KIND_NAMES, LEVEL_REWARDS } from '../ui/cosmetics';
import { GameIcon } from '../ui/icons';
import { RewardPreview } from '../ui/RewardPreview';

/** Percorso dei premi: un premio per ogni livello, dal 2 al 50. */
export function RewardsScreen() {
  const xp = useGame((s) => s.player.xp);
  const gpsOnlyPhoto = useGame((s) => s.player.settings.gpsOnlyPhoto);
  const lvl = levelInfo(xp);
  const nextRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    nextRef.current?.scrollIntoView({ block: 'center' });
  }, []);

  const ways: [string, string, string][] = [
    ['camera', 'Cattura un animale', `${RARITY_INFO.comune.xp}–${RARITY_INFO.leggendario.xp} XP secondo la rarità`],
    ['book', "Nuova voce dell'album", `+${XP_NEW_ENTRY} XP`],
    ['sun', 'Prima cattura del giorno', `+${XP_FIRST_TODAY} XP`],
    ['heart', 'Rivedi un animale in un altro giorno', `+${XP_REENCOUNTER} XP, e di più salendo di amicizia`],
    ['target', 'Sfide del giorno', `+150/200 XP l'una, +${ALL_DONE_BONUS} XP se le fai tutte e 3`],
    ['medal', 'Medaglie', `+${TIER_XP.join(' / ')} XP (bronzo, argento, oro)`],
    ['calendar', 'Eventi', 'XP doppi o tripli per le catture a tema'],
    ...(gpsOnlyPhoto ? [] : ([['compass', 'Nuova zona esplorata', `+${XP_ZONE} XP`]] as [string, string, string][])),
  ];

  return (
    <div className="screen">
      <div className="screen-head">
        <button className="icon-btn" aria-label="Indietro" onClick={() => back('profilo')}>
          <ChevronLeft size={26} />
        </button>
        <div className="grow">
          <h1>Premi</h1>
          <div className="sub">Un premio nuovo a ogni livello</div>
        </div>
      </div>

      <div className="panel">
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
          <b>
            Livello {lvl.level} · {levelTitle(lvl.level)}
          </b>
          <span className="muted" style={{ fontSize: 13 }}>
            {lvl.level >= 50 ? 'Livello massimo!' : `mancano ${formatNumber(lvl.needed - lvl.into)} XP`}
          </span>
        </div>
        <XpBar value={lvl.into} max={lvl.needed} style={{ height: 12 }} />
      </div>

      <div className="section-title">
        <GameIcon name="sparkles" /> Percorso dei premi
      </div>
      <div className="reward-track">
        {LEVEL_REWARDS.map((r) => {
          const got = r.level <= lvl.level;
          const next = r.level === lvl.level + 1;
          return (
            <div key={r.level} ref={next ? nextRef : undefined} className={`reward-step ${got ? 'got' : ''} ${next ? 'next' : ''}`}>
              <span className="lv">{r.level}</span>
              <span className="prev">
                <RewardPreview reward={r} size={46} />
              </span>
              <span className="grow">
                <b>{r.name}</b>
                <div className="muted" style={{ fontSize: 13 }}>
                  {KIND_NAMES[r.kind]}
                </div>
                {next && <XpBar value={lvl.into} max={lvl.needed} style={{ marginTop: 6 }} />}
              </span>
              <span className="state">{got ? <Check size={20} strokeWidth={3} /> : <Lock size={17} />}</span>
            </div>
          );
        })}
      </div>

      <div className="section-title">
        <GameIcon name="lightbulb" /> Come si guadagnano i punti
      </div>
      <div className="menu">
        {ways.map(([icon, what, how]) => (
          <div key={what} className="menu-block row" style={{ gap: 12 }}>
            <span className="ico">
              <GameIcon name={icon} size={19} />
            </span>
            <span className="grow">
              {what}
              <div className="muted" style={{ fontSize: 13 }}>
                {how}
              </div>
            </span>
          </div>
        ))}
      </div>
      <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
        Rarità: {RARITIES.map((r) => `${RARITY_INFO[r].label} ${RARITY_INFO[r].xp}`).join(' · ')} XP.
      </p>
    </div>
  );
}
