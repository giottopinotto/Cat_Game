import { useMemo, useState } from 'react';
import { entriesFor, entryNumber, getEntry, groupName, SPECIES_NAME } from '../data/entries';
import { RARITY_INFO, type Animal, type BreedEntry, type Species } from '../data/types';
import { usePhoto } from '../game/photos';
import { useGame } from '../game/store';
import { back, go } from '../router';
import { MiniCard } from '../ui/AnimalCard';
import { RarityPill, rarityStyle, Sheet, Silhouette, XpBar } from '../ui/common';

type Show = 'all' | 'found' | 'missing';

export function AlbumScreen({ entryId }: { entryId?: string }) {
  const animals = useGame((s) => s.animals);
  const open = entryId ? getEntry(entryId) : undefined;
  const [species, setSpecies] = useState<Species>(open?.species ?? 'dog');
  const [show, setShow] = useState<Show>('all');

  const byEntry = useMemo(() => {
    const m = new Map<string, Animal[]>();
    for (const a of animals) m.set(a.entryId, [...(m.get(a.entryId) ?? []), a]);
    return m;
  }, [animals]);

  const entries = entriesFor(species);
  const found = entries.filter((e) => byEntry.has(e.id)).length;
  const visible = entries.filter((e) => (show === 'all' ? true : show === 'found' ? byEntry.has(e.id) : !byEntry.has(e.id)));

  return (
    <div className="screen">
      <div className="screen-head">
        <div className="grow">
          <h1>Album</h1>
          <div className="sub">Tutte le razze e i mantelli da scoprire</div>
        </div>
      </div>

      <div className="segmented" style={{ marginBottom: 16 }}>
        {(['dog', 'cat'] as Species[]).map((s) => (
          <button key={s} className={species === s ? 'active' : ''} onClick={() => setSpecies(s)}>
            {SPECIES_NAME[s].emoji} {SPECIES_NAME[s].many}
          </button>
        ))}
      </div>

      <div className="progress-big">
        <div className="num">
          {found}
          <small> / {entries.length}</small>
        </div>
        <div className="grow">
          <div className="muted" style={{ fontSize: 14, marginBottom: 6 }}>
            scoperti ({Math.round((found / entries.length) * 100)}%)
          </div>
          <XpBar value={found} max={entries.length} style={{ height: 12 }} />
        </div>
      </div>

      <div className="chips" style={{ marginBottom: 10 }}>
        {(
          [
            ['all', 'Tutti'],
            ['found', 'Scoperti'],
            ['missing', 'Da trovare'],
          ] as [Show, string][]
        ).map(([id, label]) => (
          <button key={id} className={`chip ${show === id ? 'active' : ''}`} onClick={() => setShow(id)}>
            {label}
          </button>
        ))}
      </div>

      <div className="dex-grid">
        {visible.map((e) => (
          <DexTile key={e.id} entry={e} animals={byEntry.get(e.id)} />
        ))}
      </div>

      {open && <EntrySheet entry={open} animals={byEntry.get(open.id) ?? []} />}
    </div>
  );
}

function bestAnimal(list: Animal[] | undefined): Animal | undefined {
  return list?.reduce((best, a) => (a.encounters.length > best.encounters.length ? a : best), list[0]);
}

function DexTile({ entry, animals }: { entry: BreedEntry; animals?: Animal[] }) {
  const best = bestAnimal(animals);
  const url = usePhoto(best?.coverPhotoId, 'thumb');
  return (
    <button className={`dex-tile ${best ? '' : 'unknown'}`} style={rarityStyle(entry.rarity)} onClick={() => go(`album/${entry.id}`)}>
      <div className="pic">{url ? <img src={url} alt="" loading="lazy" /> : <Silhouette species={entry.species} size={46} />}</div>
      <span className="no">#{String(entryNumber(entry)).padStart(3, '0')}</span>
      <div className="nm">{entry.name}</div>
    </button>
  );
}

function EntrySheet({ entry, animals }: { entry: BreedEntry; animals: Animal[] }) {
  const best = bestAnimal(animals);
  const url = usePhoto(best?.coverPhotoId, 'card');
  return (
    <Sheet onClose={() => back('album')}>
      <div className="entry-head" style={rarityStyle(entry.rarity)}>
        <div className="pic">{url ? <img src={url} alt="" /> : <Silhouette species={entry.species} size={52} />}</div>
        <div className="grow">
          <div className="muted" style={{ fontSize: 13, fontWeight: 600 }}>
            #{String(entryNumber(entry)).padStart(3, '0')} · {groupName(entry)}
          </div>
          <h2 style={{ lineHeight: 1.1 }}>{entry.name}</h2>
          <div style={{ marginTop: 6 }}>
            <RarityPill rarity={entry.rarity} />
          </div>
        </div>
      </div>
      <div className="fact">
        <span className="bulb">💡</span>
        <span>{entry.fact}</span>
      </div>
      <div className="section-title" style={{ marginTop: 18 }}>
        {animals.length ? `I tuoi ${entry.name.toLowerCase().startsWith('europeo') ? 'gatti' : 'esemplari'} (${animals.length})` : 'Non ancora scoperto'}
      </div>
      {animals.length ? (
        <div className="grid">
          {animals.map((a) => (
            <MiniCard key={a.id} animal={a} onClick={() => go(`animale/${a.id}`, true)} />
          ))}
        </div>
      ) : (
        <p className="muted">
          Tieni gli occhi aperti durante le tue passeggiate! Catturarne uno vale{' '}
          <b style={{ color: RARITY_INFO[entry.rarity].color }}>{RARITY_INFO[entry.rarity].xp} XP</b> più il bonus per la nuova voce.
        </p>
      )}
    </Sheet>
  );
}
