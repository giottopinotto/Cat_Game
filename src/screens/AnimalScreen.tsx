import { ChevronLeft, MapPin, Pencil, Share2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { getEntry, groupName } from '../data/entries';
import type { Animal, Encounter } from '../data/types';
import { usePhoto } from '../game/photos';
import { daysToNextFriendship, distinctDays, friendshipLevel, FRIEND_NAMES, pawPoints } from '../game/progress';
import { useGame } from '../game/store';
import { mapApi } from '../map/MapView';
import { back, go } from '../router';
import { AnimalCard } from '../ui/AnimalCard';
import { formatDate, Hearts, RarityPill, Sheet } from '../ui/common';
import { shareAnimal } from '../ui/shareCard';

export function AnimalScreen({ id }: { id: string }) {
  const animal = useGame((s) => s.animals.find((a) => a.id === id));
  const [rename, setRename] = useState(false);
  const [release, setRelease] = useState(false);
  const [sharing, setSharing] = useState(false);

  if (!animal) {
    return (
      <div className="screen no-nav">
        <div className="empty">
          <div className="e">🐾</div>
          <h2>Animale non trovato</h2>
          <button className="btn btn-primary" onClick={() => go('collezione', true)}>
            Vai alla collezione
          </button>
        </div>
      </div>
    );
  }

  const entry = getEntry(animal.entryId);
  const fl = friendshipLevel(animal);
  const toNext = daysToNextFriendship(animal);
  const last = animal.encounters[animal.encounters.length - 1];

  async function share() {
    setSharing(true);
    try {
      await shareAnimal(animal!);
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className="screen no-nav">
      <div className="screen-head">
        <button className="icon-btn" aria-label="Indietro" onClick={() => back('collezione')}>
          <ChevronLeft size={26} />
        </button>
        <div className="grow" />
        <button className="icon-btn" aria-label="Condividi" onClick={share} disabled={sharing}>
          <Share2 size={22} />
        </button>
        <button className="icon-btn" aria-label="Rinomina" onClick={() => setRename(true)}>
          <Pencil size={21} />
        </button>
      </div>

      <AnimalCard animal={animal} />

      <div className="section-title">💞 Amicizia</div>
      <div className="panel">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <b>{FRIEND_NAMES[fl - 1]}</b>
          <Hearts level={fl} />
        </div>
        <p className="muted" style={{ fontSize: 14, marginTop: 6 }}>
          {toNext === null
            ? `Siete migliori amici! Vi siete visti in ${distinctDays(animal)} giorni diversi.`
            : `Rivedilo in ${toNext === 1 ? 'un altro giorno' : `altri ${toNext} giorni diversi`} per salire di livello. Ogni livello aumenta i suoi Punti Zampa (ora ${pawPoints(animal)}).`}
        </p>
      </div>

      <div className="section-title">📋 Scheda</div>
      <dl className="info-list">
        <div>
          <dt>Razza</dt>
          <dd>
            <button className="link" onClick={() => go(`album/${animal.entryId}`)}>
              {entry?.name}
            </button>
          </dd>
        </div>
        <div>
          <dt>Gruppo</dt>
          <dd>{entry ? groupName(entry) : ''}</dd>
        </div>
        <div>
          <dt>Rarità</dt>
          <dd>
            <RarityPill rarity={animal.rarity} />
          </dd>
        </div>
        <div>
          <dt>Primo incontro</dt>
          <dd>{formatDate(animal.createdAt)}</dd>
        </div>
        <div>
          <dt>Incontri</dt>
          <dd>{animal.encounters.length}</dd>
        </div>
      </dl>

      {entry && (
        <>
          <div className="section-title">💡 Lo sapevi?</div>
          <div className="fact">
            <span className="bulb">💡</span>
            <span>{entry.fact}</span>
          </div>
        </>
      )}

      <div className="section-title">📸 Ricordi</div>
      <p className="muted" style={{ fontSize: 14, marginBottom: 10 }}>
        Tocca una foto per usarla come copertina della carta.
      </p>
      <div className="gallery">
        {[...animal.encounters].reverse().map((e) => (
          <GalleryPhoto key={e.photoId} e={e} cover={e.photoId === animal.coverPhotoId} animal={animal} />
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 24 }}>
        <button
          className="btn btn-block"
          onClick={() => {
            go('', true);
            setTimeout(() => mapApi.flyTo(last.lng, last.lat), 300);
          }}
        >
          <MapPin size={20} /> Mostra sulla mappa
        </button>
        <button className="btn btn-danger btn-block" onClick={() => setRelease(true)}>
          <Trash2 size={20} /> Libera dalla collezione
        </button>
      </div>

      {rename && <RenameSheet animal={animal} onClose={() => setRename(false)} />}
      {release && <ReleaseSheet animal={animal} onClose={() => setRelease(false)} />}
    </div>
  );
}

function GalleryPhoto({ e, cover, animal }: { e: Encounter; cover: boolean; animal: Animal }) {
  const url = usePhoto(e.photoId, 'thumb');
  const setCover = useGame((s) => s.setCover);
  return (
    <button className={cover ? 'cover' : ''} onClick={() => setCover(animal.id, e.photoId)}>
      {url && <img src={url} alt="" loading="lazy" />}
      <span className="when">{formatDate(e.at, false)}</span>
    </button>
  );
}

function RenameSheet({ animal, onClose }: { animal: Animal; onClose: () => void }) {
  const [name, setName] = useState(animal.name);
  const renameAnimal = useGame((s) => s.renameAnimal);
  return (
    <Sheet onClose={onClose}>
      <h2>Cambia nome</h2>
      <input className="input" value={name} maxLength={24} autoFocus onChange={(e) => setName(e.target.value)} />
      <button
        className="btn btn-primary btn-block"
        style={{ marginTop: 16 }}
        disabled={!name.trim()}
        onClick={() => {
          renameAnimal(animal.id, name);
          onClose();
        }}
      >
        Salva
      </button>
    </Sheet>
  );
}

function ReleaseSheet({ animal, onClose }: { animal: Animal; onClose: () => void }) {
  const releaseAnimal = useGame((s) => s.releaseAnimal);
  return (
    <Sheet onClose={onClose}>
      <h2>Liberare {animal.name}?</h2>
      <p className="muted" style={{ margin: '6px 0 18px' }}>
        La carta e tutte le sue foto verranno cancellate per sempre. I punti esperienza già guadagnati restano tuoi.
      </p>
      <button
        className="btn btn-danger btn-block"
        onClick={async () => {
          await releaseAnimal(animal.id);
          onClose();
          go('collezione', true);
        }}
      >
        Sì, libera {animal.name}
      </button>
      <button className="btn btn-ghost btn-block" style={{ marginTop: 8 }} onClick={onClose}>
        Annulla
      </button>
    </Sheet>
  );
}
