import { Dices, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { COATS, euCoatEntryId } from '../data/cats';
import { entriesFor, getEntry, SPECIES_NAME } from '../data/entries';
import { randomName } from '../data/names';
import { RARITY_INFO, type Animal, type CoatId, type Species } from '../data/types';
import { distanceM, formatDistance } from '../game/geo';
import { usePhoto } from '../game/photos';
import { rarityFor, useGame, type CaptureOutcome } from '../game/store';
import { RarityPill, rarityStyle, Sheet, Switch } from '../ui/common';
import type { Shot } from './CaptureScreen';

const KNOWN_RADIUS_M = 250;
const DOG_DEFAULT = 'dog-meticcio';

function Swatch({ colors }: { colors: string[] }) {
  const bg =
    colors.length === 1
      ? colors[0]
      : `conic-gradient(${colors.map((c, i) => `${c} ${(i / colors.length) * 360}deg ${((i + 1) / colors.length) * 360}deg`).join(', ')})`;
  return <span className="colors" style={{ background: bg }} />;
}

export function ConfirmPanel({ shot, onRetake, onDone }: { shot: Shot; onRetake: () => void; onDone: (o: CaptureOutcome) => void }) {
  const { analysis } = shot;
  const animals = useGame((s) => s.animals);
  const captureNew = useGame((s) => s.captureNew);
  const reencounter = useGame((s) => s.reencounter);

  const [species, setSpecies] = useState<Species>(analysis.species);
  const [dogEntry, setDogEntry] = useState(analysis.species === 'dog' ? analysis.suggested : DOG_DEFAULT);
  const aiCatBreed = analysis.species === 'cat' && !analysis.suggested.startsWith('cat-eu-') ? analysis.suggested : null;
  const [catBreed, setCatBreed] = useState<string | null>(aiCatBreed);
  const [coat, setCoat] = useState<CoatId>(analysis.coat ?? 'tigrato');
  const [heterochromia, setHeterochromia] = useState(false);
  const [name, setName] = useState(() => randomName(analysis.species));
  const [knownId, setKnownId] = useState<string | null>(null);
  const [picker, setPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const entryId = species === 'dog' ? dogEntry : (catBreed ?? euCoatEntryId(coat));
  const entry = getEntry(entryId);
  const known = knownId ? animals.find((a) => a.id === knownId) : undefined;
  const rarity = known ? known.rarity : rarityFor(entryId, heterochromia);

  // Animali della stessa specie già incontrati qui vicino: potrebbe essere lo stesso!
  const nearby = useMemo(() => {
    const out: { a: Animal; d: number }[] = [];
    for (const a of animals) {
      if (a.species !== species) continue;
      const d = Math.min(...a.encounters.map((e) => distanceM(shot.fix, e)));
      if (d <= KNOWN_RADIUS_M) out.push({ a, d: d - (a.entryId === entryId ? 1000 : 0) });
    }
    return out
      .sort((x, y) => x.d - y.d)
      .slice(0, 8)
      .map(({ a }) => ({ a, d: Math.min(...a.encounters.map((e) => distanceM(shot.fix, e))) }));
  }, [animals, species, shot.fix, entryId]);

  const dogChips = useMemo(() => {
    const ids = species === analysis.species && species === 'dog' ? analysis.suggestions.map((s) => s.entryId) : [DOG_DEFAULT];
    if (!ids.includes(dogEntry)) ids.unshift(dogEntry);
    return ids;
  }, [species, analysis, dogEntry]);

  const catChips = useMemo(() => {
    const ids = analysis.species === 'cat' ? analysis.suggestions.map((s) => s.entryId).filter((id) => !id.startsWith('cat-eu-')) : [];
    if (catBreed && !ids.includes(catBreed)) ids.unshift(catBreed);
    return ids;
  }, [analysis, catBreed]);

  function switchSpecies(s: Species) {
    if (s === species) return;
    setSpecies(s);
    setKnownId(null);
    setName(randomName(s));
  }

  function pick(id: string) {
    if (species === 'dog') setDogEntry(id);
    else setCatBreed(id.startsWith('cat-eu-') ? null : id);
    setPicker(false);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const draft = {
        species,
        entryId,
        name: name.trim() || entry?.name || SPECIES_NAME[species].one,
        heterochromia,
        card: shot.card,
        thumb: shot.thumb,
        lat: shot.fix.lat,
        lng: shot.fix.lng,
        park: shot.park,
      };
      onDone(known ? await reencounter(known.id, draft) : await captureNew(draft));
    } catch (e) {
      console.error(e);
      setError('Non sono riuscito a salvare. Riprova tra un attimo.');
      setSaving(false);
    }
  }

  const aiEntry = getEntry(analysis.suggested);
  const topScore = analysis.suggestions.find((s) => s.entryId === analysis.suggested)?.score ?? 0;
  const sure = topScore >= 0.7 ? 'abbastanza sicuro' : topScore >= 0.4 ? 'non del tutto sicuro' : 'poco sicuro';

  return (
    <div className="confirm">
      <div className="confirm-photo" style={rarityStyle(rarity)}>
        <img src={shot.cardUrl} alt="Foto scattata" />
      </div>
      <div className="center" style={{ marginBottom: 14 }}>
        <RarityPill rarity={rarity} />
      </div>

      <div className="ai-says">
        <span className="robot">🤖</span>
        <div>
          Mi sembra un <b>{SPECIES_NAME[analysis.species].one.toLowerCase()}</b>
          {aiEntry && (
            <>
              : <b>{aiEntry.name}</b> <span className="muted">({sure})</span>
            </>
          )}
          . Correggimi se sbaglio!
        </div>
      </div>

      {shot.blurry && (
        <p className="panel" style={{ marginTop: 10, fontSize: 14 }}>
          📷 La foto sembra un po' mossa: se l'AI sbaglia, prova a <b>rifarla</b> tenendo fermo il telefono.
        </p>
      )}

      {nearby.length > 0 && (
        <>
          <div className="section-title">💞 È un animale che conosci già?</div>
          <div className="known">
            <button className={knownId === null ? 'active' : ''} onClick={() => setKnownId(null)}>
              <div style={{ width: 80, height: 80, display: 'grid', placeItems: 'center', fontSize: 36, margin: '0 auto 4px' }}>✨</div>
              <div>No, è nuovo</div>
            </button>
            {nearby.map(({ a, d }) => (
              <KnownButton key={a.id} animal={a} dist={d} active={knownId === a.id} onClick={() => setKnownId(a.id)} />
            ))}
          </div>
        </>
      )}

      {known ? (
        <div className="panel" style={{ marginTop: 16 }}>
          Aggiungerai questa foto agli incontri con <b>{known.name}</b>. Rivedere un amico in giorni diversi fa crescere la vostra amicizia!
        </div>
      ) : (
        <>
          <div className="section-title">Che animale è?</div>
          <div className="segmented">
            {(['dog', 'cat'] as Species[]).map((s) => (
              <button key={s} className={species === s ? 'active' : ''} onClick={() => switchSpecies(s)}>
                {SPECIES_NAME[s].emoji} {SPECIES_NAME[s].one}
              </button>
            ))}
          </div>

          {species === 'dog' ? (
            <>
              <div className="section-title">Razza</div>
              <div className="chips" style={{ flexWrap: 'wrap' }}>
                {dogChips.map((id) => {
                  const e = getEntry(id)!;
                  return (
                    <button key={id} className={`chip ${dogEntry === id ? 'active' : ''}`} style={rarityStyle(e.rarity)} onClick={() => setDogEntry(id)}>
                      <span className="dot" />
                      {e.name}
                    </button>
                  );
                })}
                <button className="chip" onClick={() => setPicker(true)}>
                  <Search size={16} /> Altra razza…
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="section-title">Razza</div>
              <div className="chips" style={{ flexWrap: 'wrap' }}>
                <button className={`chip ${catBreed === null ? 'active' : ''}`} onClick={() => setCatBreed(null)}>
                  Europeo (il più comune)
                </button>
                {catChips.map((id) => {
                  const e = getEntry(id)!;
                  return (
                    <button key={id} className={`chip ${catBreed === id ? 'active' : ''}`} style={rarityStyle(e.rarity)} onClick={() => setCatBreed(id)}>
                      <span className="dot" />
                      {e.name}
                    </button>
                  );
                })}
                <button className="chip" onClick={() => setPicker(true)}>
                  <Search size={16} /> Altra razza…
                </button>
              </div>
              {catBreed === null && (
                <>
                  <div className="section-title">Mantello</div>
                  <div className="swatches">
                    {COATS.map((c) => (
                      <button key={c.id} className={`swatch ${coat === c.id ? 'active' : ''}`} onClick={() => setCoat(c.id)}>
                        <Swatch colors={c.swatch} />
                        {c.name}
                        <span style={{ color: RARITY_INFO[c.rarity].color, fontWeight: 600 }}>{RARITY_INFO[c.rarity].label}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          <button className="switch-row" onClick={() => setHeterochromia((h) => !h)}>
            <span style={{ fontSize: 26 }}>✨</span>
            <span className="grow">
              <b>Ha gli occhi di due colori?</b>
              <div className="muted" style={{ fontSize: 13 }}>
                Una rarità speciale: la carta sale di 2 livelli di rarità. Sii onesto!
              </div>
            </span>
            <Switch on={heterochromia} />
          </button>

          <label className="field">
            <span>Dagli un nome</span>
            <div className="row">
              <input className="input grow" value={name} maxLength={24} onChange={(e) => setName(e.target.value)} />
              <button className="icon-btn" aria-label="Nome a caso" onClick={() => setName((n) => randomName(species, n))}>
                <Dices size={22} />
              </button>
            </div>
          </label>
          {shot.park && <p className="muted" style={{ marginTop: 12 }}>🌳 Sei in un parco!</p>}
        </>
      )}

      {error && (
        <p style={{ color: 'var(--danger)', marginTop: 14 }} role="alert">
          {error}
        </p>
      )}

      <div className="confirm-actions">
        <button className="btn" onClick={onRetake} disabled={saving}>
          Rifai
        </button>
        <button className={`btn ${known ? 'btn-teal' : 'btn-primary'} grow`} onClick={save} disabled={saving}>
          {saving ? 'Salvo…' : known ? '💞 Salva incontro' : '📸 Cattura!'}
        </button>
      </div>

      {picker && <BreedPicker species={species} onPick={pick} onClose={() => setPicker(false)} />}
    </div>
  );
}

function KnownButton({ animal, dist, active, onClick }: { animal: Animal; dist: number; active: boolean; onClick: () => void }) {
  const url = usePhoto(animal.coverPhotoId, 'thumb');
  return (
    <button className={active ? 'active' : ''} onClick={onClick}>
      {url ? <img src={url} alt="" /> : <div style={{ width: 80, height: 80 }} />}
      <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{animal.name}</div>
      <div className="d">a {formatDistance(dist)}</div>
    </button>
  );
}

function BreedPicker({ species, onPick, onClose }: { species: Species; onPick: (id: string) => void; onClose: () => void }) {
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const nq = norm(q.trim());
    return entriesFor(species)
      .filter((e) => (species === 'cat' ? !e.coat : true))
      .filter((e) => !nq || norm(e.name).includes(nq))
      .sort((a, b) => a.name.localeCompare(b.name, 'it'));
  }, [species, q]);
  return (
    <Sheet onClose={onClose}>
      <h2>Scegli la razza</h2>
      <input className="input" placeholder="Cerca…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
      <div className="search-list">
        {species === 'cat' && (
          <button onClick={() => onPick('cat-eu-tigrato')}>
            <span className="dot" style={rarityStyle('comune')} />
            <span className="grow">Europeo (gatto comune)</span>
          </button>
        )}
        {list.map((e) => (
          <button key={e.id} onClick={() => onPick(e.id)} style={rarityStyle(e.rarity)}>
            <span className="dot" />
            <span className="grow">{e.name}</span>
            <small style={{ color: RARITY_INFO[e.rarity].color, fontWeight: 600 }}>{RARITY_INFO[e.rarity].label}</small>
          </button>
        ))}
        {list.length === 0 && <p className="muted center">Nessuna razza trovata.</p>}
      </div>
    </Sheet>
  );
}
