import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { getEntry } from '../data/entries';
import { RARITY_INFO, rarityIndex } from '../data/types';
import { FRIEND_NAMES, levelInfo } from '../game/progress';
import type { CaptureOutcome } from '../game/store';
import { go } from '../router';
import { AnimalCard } from '../ui/AnimalCard';
import { formatNumber, Logo, rarityStyle, vibrate, XpBar } from '../ui/common';
import { GameIcon, Hearts, IconBubble } from '../ui/icons';

const CONFETTI = ['#9f7aea', '#15b3a2', '#ffd24a', '#a855f7', '#3b82f6', '#ff5d8f'];

function Burst({ count }: { count: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2 + Math.random() * 0.4;
        const r = 140 + Math.random() * 180;
        return {
          '--dx': `${Math.cos(a) * r}px`,
          '--dy': `${Math.sin(a) * r + 120}px`,
          '--rot': `${Math.random() * 720 - 360}deg`,
          background: CONFETTI[i % CONFETTI.length],
          animationDelay: `${0.35 + Math.random() * 0.25}s`,
        } as CSSProperties;
      }),
    [count],
  );
  return (
    <div className="burst" aria-hidden>
      {pieces.map((s, i) => (
        <i key={i} style={s} />
      ))}
    </div>
  );
}

export function Reveal({ outcome, cardUrl, onAgain }: { outcome: CaptureOutcome; cardUrl: string; onAgain: () => void }) {
  const { animal, isNew, sameDay } = outcome;
  const entry = getEntry(animal.entryId);
  const r = rarityIndex(animal.rarity);
  const before = levelInfo(outcome.xpBefore);
  const after = levelInfo(outcome.xpAfter);
  const [bar, setBar] = useState(before);
  // Le nuove catture arrivano "incartate": la carta si apre dopo un attimo o con un tocco.
  const [opened, setOpened] = useState(!isNew);
  const total = outcome.rewards.reduce((s, x) => s + x.xp, 0);

  useEffect(() => {
    if (opened) return;
    vibrate(r >= 3 ? [30, 60, 30, 60, 30] : 25);
    const t = setTimeout(() => setOpened(true), 1300 + r * 250);
    return () => clearTimeout(t);
  }, [opened, r]);

  useEffect(() => {
    if (!opened) return;
    vibrate(r >= 3 ? [60, 40, 60, 40, 120] : [50, 30, 80]);
    const t = setTimeout(() => setBar(after), 900 + outcome.rewards.length * 150);
    return () => clearTimeout(t);
  }, [opened]); // eslint-disable-line react-hooks/exhaustive-deps

  const title = isNew ? 'Catturato!' : sameDay ? `Ancora tu, ${animal.name}!` : `Bentornato, ${animal.name}!`;
  const sub = isNew
    ? `${entry?.name ?? ''} · ${RARITY_INFO[animal.rarity].label}`
    : outcome.friendshipAfter > outcome.friendshipBefore
      ? `La vostra amicizia è cresciuta: ora siete ${FRIEND_NAMES[outcome.friendshipAfter - 1].toLowerCase()}!`
      : sameDay
        ? "L'hai già salutato oggi: la foto è stata aggiunta ai vostri ricordi."
        : 'Nuovo incontro aggiunto ai vostri ricordi.';

  if (!opened) {
    return (
      <div className="reveal" style={rarityStyle(animal.rarity)}>
        <div className="pack-stage">
          <div className="pack-rays" aria-hidden />
          <button className={`pack r-${animal.rarity}`} onClick={() => setOpened(true)} aria-label="Apri la carta">
            <Logo size={120} className="logo" />
          </button>
        </div>
        <p className="pack-hint">Tocca per scoprire la carta!</p>
      </div>
    );
  }

  return (
    <div className="reveal" style={rarityStyle(animal.rarity)}>
      <Burst count={isNew ? 24 + r * 12 : 18} />
      <h1 className="reveal-title">{title}</h1>
      <p className="reveal-sub">{sub}</p>

      <AnimalCard animal={animal} photoUrl={isNew ? cardUrl : undefined} />

      {!isNew && (
        <div className="center" style={{ marginTop: 14 }}>
          <Hearts level={outcome.friendshipAfter} /> <b>{FRIEND_NAMES[outcome.friendshipAfter - 1]}</b>
        </div>
      )}

      {outcome.newEntry && <div className="new-entry">
          <GameIcon name="book" /> Nuova voce dell'album sbloccata!
        </div>}

      <div className="rewards">
        {outcome.rewards.map((rw, i) => (
          <div className="reward" key={i} style={{ animationDelay: `${0.9 + i * 0.15}s` }}>
            <IconBubble name={rw.icon} size={34} />
            <span>{rw.label}</span>
            <span className="xp">+{formatNumber(rw.xp)} XP</span>
          </div>
        ))}
        {total > 0 && (
          <div className="level-box" style={{ animation: `slide-in .4s ${0.9 + outcome.rewards.length * 0.15}s both` }}>
            <div className="row">
              <b>{after.level > before.level ? `Livello ${after.level}!` : `Livello ${bar.level}`}</b>
              <span className="muted">
                {formatNumber(bar.into)} / {formatNumber(bar.needed)} XP
              </span>
            </div>
            <XpBar value={bar.into} max={bar.needed} />
          </div>
        )}
      </div>

      <div style={{ maxWidth: 340, margin: '20px auto 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button className="btn btn-primary btn-block" onClick={onAgain}>
          <GameIcon name="camera" /> Cattura un altro
        </button>
        <div className="row">
          <button className="btn grow" onClick={() => go(`animale/${animal.id}`, true)}>
            Vedi carta
          </button>
          <button className="btn grow" onClick={() => go('', true)}>
            <GameIcon name="map" /> Mappa
          </button>
        </div>
      </div>
    </div>
  );
}
