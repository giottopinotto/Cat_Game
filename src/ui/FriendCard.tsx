import { getEntry, SPECIES_NAME } from '../data/entries';
import { RARITY_INFO, rarityIndex, STAT_LABELS } from '../data/types';
import type { FriendCard } from '../game/friends';
import { pawPointsFor } from '../game/progress';
import { RarityPill, rarityStyle } from './common';
import { AvatarArt, GameIcon, Hearts, Silhouette, SpeciesIcon } from './icons';
import { useTilt } from './useTilt';

// Le carte degli amici non hanno foto: al loro posto c'è la sagoma disegnata.

export function FriendCardBig({ card }: { card: FriendCard }) {
  const tiltRef = useTilt<HTMLDivElement>();
  const entry = getEntry(card.entryId);
  return (
    <div ref={tiltRef} className={`card friend-card r-${card.rarity} ${rarityIndex(card.rarity) >= 2 ? 'holo' : ''}`} style={rarityStyle(card.rarity)}>
      <div className="card-inner">
        <div className="card-shine" aria-hidden />
        <div className="card-photo friend-photo">
          <Silhouette species={card.species} size={150} />
          <div className="pz">
            <small>PZ</small>
            {pawPointsFor(card.rarity, card.stats, card.friendship)}
          </div>
          <div className="species" title={SPECIES_NAME[card.species].one}>
            <SpeciesIcon species={card.species} size={20} />
          </div>
          {card.heterochromia && (
            <div className="het">
              <GameIcon name="sparkles" size={13} /> Occhi di due colori
            </div>
          )}
        </div>
        <div className="card-body">
          <div className="row">
            <div className="card-name grow">{card.name}</div>
            <Hearts level={card.friendship} />
          </div>
          <div className="card-breed row" style={{ flexWrap: 'wrap', gap: 6 }}>
            <span>{entry?.name}</span>
            <RarityPill rarity={card.rarity} />
          </div>
          {STAT_LABELS.map((label, i) => (
            <div className="stat" key={label}>
              <span>{label}</span>
              <div className="bar">
                <div style={{ width: `${card.stats[i]}%` }} />
              </div>
              <b>{card.stats[i]}</b>
            </div>
          ))}
          <div className="card-foot">
            <span className="row" style={{ gap: 6 }}>
              <AvatarArt id={card.avatar} size={20} /> Carta di {card.from}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FriendMini({ card, onClick }: { card: FriendCard; onClick: () => void }) {
  const entry = getEntry(card.entryId);
  return (
    <button className="mini friend-mini" style={rarityStyle(card.rarity)} onClick={onClick}>
      <div className="mini-inner">
        <div className="mini-photo">
          <Silhouette species={card.species} size={70} />
          <span className="pz">{pawPointsFor(card.rarity, card.stats, card.friendship)} PZ</span>
        </div>
        <div className="mini-body">
          <div className="mini-name">
            <SpeciesIcon species={card.species} size={15} /> {card.name}
          </div>
          <div className="mini-breed">{entry?.name}</div>
          <div className="mini-breed row" style={{ gap: 4 }}>
            <AvatarArt id={card.avatar} size={16} /> <span style={{ color: RARITY_INFO[card.rarity].color, fontWeight: 600 }}>di {card.from}</span>
          </div>
        </div>
      </div>
    </button>
  );
}
