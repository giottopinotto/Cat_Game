import { getEntry, SPECIES_NAME } from '../data/entries';
import { RARITY_INFO, rarityIndex, STAT_LABELS, type Animal } from '../data/types';
import { usePhoto } from '../game/photos';
import { friendshipLevel, pawPoints } from '../game/progress';
import { formatDate, Hearts, RarityPill, rarityStyle } from './common';

export function AnimalCard({ animal, photoUrl }: { animal: Animal; photoUrl?: string }) {
  const entry = getEntry(animal.entryId);
  const stored = usePhoto(photoUrl ? undefined : animal.coverPhotoId, 'card');
  const url = photoUrl ?? stored;
  const first = animal.encounters[0];
  const place = [...animal.encounters].reverse().find((e) => e.place)?.place;
  return (
    <div className={`card ${rarityIndex(animal.rarity) >= 3 ? 'holo' : ''}`} style={rarityStyle(animal.rarity)}>
      <div className="card-inner">
        <div className="card-photo">
          {url && <img src={url} alt={animal.name} />}
          <div className="pz">
            <small>PZ</small>
            {pawPoints(animal)}
          </div>
          <div className="species" title={SPECIES_NAME[animal.species].one}>
            {SPECIES_NAME[animal.species].emoji}
          </div>
          {animal.heterochromia && <div className="het">✨ Occhi di due colori</div>}
        </div>
        <div className="card-body">
          <div className="row">
            <div className="card-name grow">{animal.name}</div>
            <Hearts level={friendshipLevel(animal)} />
          </div>
          <div className="card-breed row" style={{ flexWrap: 'wrap', gap: 6 }}>
            <span>{entry?.name ?? SPECIES_NAME[animal.species].one}</span>
            <RarityPill rarity={animal.rarity} />
          </div>
          {STAT_LABELS.map((label, i) => (
            <div className="stat" key={label}>
              <span>{label}</span>
              <div className="bar">
                <div style={{ width: `${animal.stats[i]}%` }} />
              </div>
              <b>{animal.stats[i]}</b>
            </div>
          ))}
          <div className="card-foot">
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📍 {place ?? 'Luogo segreto'}</span>
            <span style={{ whiteSpace: 'nowrap' }}>{first ? formatDate(first.at) : ''}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MiniCard({ animal, onClick }: { animal: Animal; onClick: () => void }) {
  const url = usePhoto(animal.coverPhotoId, 'thumb');
  const entry = getEntry(animal.entryId);
  return (
    <button className="mini" style={rarityStyle(animal.rarity)} onClick={onClick}>
      <div className="mini-inner">
        <div className="mini-photo">
          {url && <img src={url} alt="" loading="lazy" />}
          <span className="pz">{pawPoints(animal)} PZ</span>
        </div>
        <div className="mini-body">
          <div className="mini-name">
            {SPECIES_NAME[animal.species].emoji} {animal.name}
          </div>
          <div className="mini-breed">{entry?.name}</div>
          <div className="mini-breed" style={{ color: RARITY_INFO[animal.rarity].color, fontWeight: 600 }}>
            {RARITY_INFO[animal.rarity].label}
          </div>
        </div>
      </div>
    </button>
  );
}
