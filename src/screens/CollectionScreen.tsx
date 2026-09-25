import { useMemo, useState } from 'react';
import { rarityIndex, type Species } from '../data/types';
import { pawPoints } from '../game/progress';
import { useGame } from '../game/store';
import { go } from '../router';
import { MiniCard } from '../ui/AnimalCard';
import { FriendMini } from '../ui/FriendCard';
import { GameIcon, IconBubble, SpeciesIcon } from '../ui/icons';
import type { FriendCard } from '../game/friends';
import { FriendCardSheet, ScanSheet } from './FriendSheets';

type Filter = 'all' | Species;
type Sort = 'recent' | 'rarity' | 'pz' | 'name';

const SORTS: { id: Sort; label: string }[] = [
  { id: 'recent', label: 'Recenti' },
  { id: 'rarity', label: 'Rarità' },
  { id: 'pz', label: 'Punti Zampa' },
  { id: 'name', label: 'Nome' },
];

export function CollectionScreen() {
  const animals = useGame((s) => s.animals);
  const friends = useGame((s) => s.player.friends);
  const [tab, setTab] = useState<'mine' | 'friends'>('mine');
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('recent');
  const cats = animals.filter((a) => a.species === 'cat').length;

  const list = useMemo(() => {
    const l = animals.filter((a) => filter === 'all' || a.species === filter);
    const last = (a: (typeof l)[number]) => a.encounters[a.encounters.length - 1].at;
    switch (sort) {
      case 'recent':
        return [...l].sort((a, b) => last(b) - last(a));
      case 'rarity':
        return [...l].sort((a, b) => rarityIndex(b.rarity) - rarityIndex(a.rarity) || pawPoints(b) - pawPoints(a));
      case 'pz':
        return [...l].sort((a, b) => pawPoints(b) - pawPoints(a));
      case 'name':
        return [...l].sort((a, b) => a.name.localeCompare(b.name, 'it'));
    }
  }, [animals, filter, sort]);

  return (
    <div className="screen">
      <div className="screen-head">
        <div className="grow">
          <h1>Collezione</h1>
          <div className="sub">
            {animals.length} {animals.length === 1 ? 'animale' : 'animali'} · <SpeciesIcon species="dog" size={15} /> {animals.length - cats} · <SpeciesIcon species="cat" size={15} /> {cats}
          </div>
        </div>
      </div>

      <div className="segmented" style={{ marginBottom: 14 }}>
        <button className={tab === 'mine' ? 'active' : ''} onClick={() => setTab('mine')}>
          I miei
        </button>
        <button className={tab === 'friends' ? 'active' : ''} onClick={() => setTab('friends')}>
          Amici {friends.length > 0 && `(${friends.length})`}
        </button>
      </div>

      {tab === 'friends' ? (
        <FriendsTab friends={friends} />
      ) : animals.length === 0 ? (
        <div className="empty">
          <div className="e">
            <GameIcon name="paw" size={56} />
          </div>
          <h2>Ancora nessun animale</h2>
          <p>Esci a fare un giro: il primo cane o gatto che incontri può diventare la tua prima carta!</p>
          <button className="btn btn-primary" onClick={() => go('cattura')}>
            <GameIcon name="camera" /> Cattura il primo
          </button>
        </div>
      ) : (
        <>
          <div className="chips">
            {(['all', 'dog', 'cat'] as Filter[]).map((f) => (
              <button key={f} className={`chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                {f === 'all' ? (
                  'Tutti'
                ) : (
                  <>
                    <SpeciesIcon species={f} size={16} /> {f === 'dog' ? 'Cani' : 'Gatti'}
                  </>
                )}
              </button>
            ))}
            <span style={{ width: 8, flex: 'none' }} />
            {SORTS.map((s) => (
              <button key={s.id} className={`chip ${sort === s.id ? 'active' : ''}`} onClick={() => setSort(s.id)}>
                {s.label}
              </button>
            ))}
          </div>
          <div className="grid" style={{ marginTop: 10 }}>
            {list.map((a) => (
              <MiniCard key={a.id} animal={a} onClick={() => go(`animale/${a.id}`)} />
            ))}
          </div>
          {list.length === 0 && <p className="muted center" style={{ marginTop: 30 }}>Nessun animale con questo filtro.</p>}
        </>
      )}
    </div>
  );
}

function FriendsTab({ friends }: { friends: FriendCard[] }) {
  const [scan, setScan] = useState(false);
  const [open, setOpen] = useState<FriendCard | null>(null);
  return (
    <>
      <button className="switch-row" style={{ marginTop: 0 }} onClick={() => setScan(true)}>
        <IconBubble name="scan" size={44} tone="mint" />
        <span className="grow">
          <b>Scansiona la carta di un amico</b>
          <div className="muted" style={{ fontSize: 13 }}>
            Di persona, con il QR della sua carta. Per mostrare le tue: apri una carta e tocca "Mostra a un amico".
          </div>
        </span>
      </button>
      {friends.length === 0 ? (
        <p className="muted center" style={{ marginTop: 30 }}>
          Ancora nessuna carta degli amici.
        </p>
      ) : (
        <div className="grid" style={{ marginTop: 14 }}>
          {friends.map((f) => (
            <FriendMini key={f.id} card={f} onClick={() => setOpen(f)} />
          ))}
        </div>
      )}
      {scan && <ScanSheet onClose={() => setScan(false)} />}
      {open && <FriendCardSheet card={open} onClose={() => setOpen(null)} />}
    </>
  );
}
