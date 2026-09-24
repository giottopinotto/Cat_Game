import { Download, Info, Pencil, ShieldCheck, Smartphone, Trash2, Upload } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { BADGES, badgeTier, TIER_NAMES, tierText, type BadgeSummary } from '../game/badges';
import { exportBackup, importBackup } from '../game/backup';
import { wipeAll } from '../game/db';
import { formatDistance } from '../game/geo';
import { levelInfo, levelTitle } from '../game/progress';
import { today, useGame } from '../game/store';
import { badgeSummary, streaks } from '../game/summary';
import { isIOS, isStandalone, promptInstall, useInstall } from '../pwa';
import { formatNumber, Sheet, XpBar } from '../ui/common';
import { AVATARS, Rules } from '../ui/Rules';
import { downloadBlob } from '../ui/shareCard';

type Open = null | 'edit' | 'rules' | 'about' | 'wipe' | 'install' | { badge: string };

export function ProfileScreen() {
  const player = useGame((s) => s.player);
  const animals = useGame((s) => s.animals);
  const toast = useGame((s) => s.toast);
  const installPrompt = useInstall((s) => s.prompt);
  const [open, setOpen] = useState<Open>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const lvl = levelInfo(player.xp);
  const day = today();
  const summary = useMemo(
    () => badgeSummary(animals, player.zones.length, player.walkedM, player.activeDays, day),
    [animals, player, day],
  );
  const streak = streaks(player.activeDays, day);
  const cats = animals.filter((a) => a.species === 'cat').length;

  async function doExport() {
    try {
      const { blob, filename } = await exportBackup();
      const file = new File([blob], filename, { type: 'application/json' });
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: 'Backup Zampe in Giro' });
          return;
        } catch (e) {
          if ((e as DOMException).name === 'AbortError') return;
        }
      }
      downloadBlob(blob, filename);
    } catch {
      toast('⚠️', 'Backup non riuscito');
    }
  }

  async function doImport(f: File | undefined) {
    if (!f) return;
    try {
      const n = await importBackup(f);
      toast('✅', `Backup ripristinato: ${n} animali`);
      setTimeout(() => location.reload(), 900);
    } catch (e) {
      toast('⚠️', (e as Error).message);
    }
  }

  const stats: [string, string][] = [
    [formatNumber(animals.length), animals.length === 1 ? 'animale' : 'animali'],
    [`${animals.length - cats} · ${cats}`, 'cani · gatti'],
    [formatNumber(summary.entries), summary.entries === 1 ? "voce dell'album" : "voci dell'album"],
    [formatDistance(player.walkedM), 'a piedi'],
    [formatNumber(player.zones.length), player.zones.length === 1 ? 'zona esplorata' : 'zone esplorate'],
    [formatNumber(player.missionsDone), player.missionsDone === 1 ? 'sfida completata' : 'sfide completate'],
    [`${streak.current} 🔥`, 'giorni di fila'],
    [String(streak.best), 'record di giorni'],
  ];

  return (
    <div className="screen">
      <div className="profile-head">
        <button className="avatar" onClick={() => setOpen('edit')} aria-label="Modifica profilo">
          {player.avatar}
          <span className="lvl">{lvl.level}</span>
        </button>
        <h1>{player.name || 'Esploratore'}</h1>
        <p className="muted">{levelTitle(lvl.level)}</p>
        <div style={{ maxWidth: 320, margin: '12px auto 4px' }}>
          <XpBar value={lvl.into} max={lvl.needed} style={{ height: 12 }} />
          <div className="row muted" style={{ justifyContent: 'space-between', fontSize: 13, marginTop: 4 }}>
            <span>Livello {lvl.level}</span>
            <span>
              {formatNumber(lvl.into)} / {formatNumber(lvl.needed)} XP
            </span>
          </div>
        </div>
      </div>

      <div className="section-title">📊 Statistiche</div>
      <div className="stats-grid">
        {stats.map(([v, l]) => (
          <div className="stat-tile" key={l}>
            <div className="v">{v}</div>
            <div className="l">{l}</div>
          </div>
        ))}
      </div>

      <div className="section-title">🏅 Medaglie</div>
      <div className="badges">
        {BADGES.map((b) => {
          const tier = badgeTier(b, summary);
          const next = b.tiers[Math.min(tier, 2)];
          const v = b.metric(summary);
          return (
            <button key={b.id} className={`badge t${tier}`} onClick={() => setOpen({ badge: b.id })}>
              <div className="medal">{b.emoji}</div>
              <div className="bn">{b.name}</div>
              <div className="bp">{tier === 3 ? 'Oro!' : b.goal ? b.goal(next) : `${Math.max(0, Math.floor(v))} / ${next}`}</div>
              {tier < 3 && !b.goal && <XpBar value={v} max={next} />}
            </button>
          );
        })}
      </div>

      <div className="section-title">⚙️ Impostazioni</div>
      <div className="menu">
        <button onClick={() => setOpen('edit')}>
          <span className="ico">
            <Pencil size={19} />
          </span>
          Modifica nome e avatar
        </button>
        {!isStandalone() && (
          <button onClick={() => (installPrompt ? void promptInstall() : setOpen('install'))}>
            <span className="ico">
              <Smartphone size={19} />
            </span>
            Installa l'app sul telefono
          </button>
        )}
        <button onClick={doExport}>
          <span className="ico">
            <Download size={19} />
          </span>
          <span className="grow">
            Salva un backup
            <div className="muted" style={{ fontSize: 13 }}>
              I dati sono solo su questo telefono: fai un backup ogni tanto!
            </div>
          </span>
        </button>
        <label>
          <span className="ico">
            <Upload size={19} />
          </span>
          Ripristina un backup
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => doImport(e.target.files?.[0])} />
        </label>
        <button onClick={() => setOpen('rules')}>
          <span className="ico">
            <ShieldCheck size={19} />
          </span>
          Regole d'oro
        </button>
        <button onClick={() => setOpen('about')}>
          <span className="ico">
            <Info size={19} />
          </span>
          Informazioni e crediti
        </button>
        <button className="danger" onClick={() => setOpen('wipe')}>
          <span className="ico">
            <Trash2 size={19} />
          </span>
          Cancella tutti i dati
        </button>
      </div>

      {open === 'edit' && <EditProfile onClose={() => setOpen(null)} />}
      {open === 'rules' && (
        <Sheet onClose={() => setOpen(null)}>
          <h2>Regole d'oro</h2>
          <p className="muted" style={{ marginBottom: 14 }}>
            Un buon esploratore rispetta gli animali e le persone.
          </p>
          <Rules />
        </Sheet>
      )}
      {open === 'install' && (
        <Sheet onClose={() => setOpen(null)}>
          <h2>Installa Zampe in Giro</h2>
          {isIOS() ? (
            <ol style={{ paddingLeft: 20, lineHeight: 1.6 }}>
              <li>Apri questa pagina con <b>Safari</b></li>
              <li>
                Tocca il pulsante <b>Condividi</b> (il quadrato con la freccia in su)
              </li>
              <li>
                Scegli <b>Aggiungi alla schermata Home</b>
              </li>
            </ol>
          ) : (
            <ol style={{ paddingLeft: 20, lineHeight: 1.6 }}>
              <li>Apri il menu del browser (i tre puntini ⋮)</li>
              <li>
                Scegli <b>Installa app</b> oppure <b>Aggiungi a schermata Home</b>
              </li>
            </ol>
          )}
          <p className="muted" style={{ marginTop: 10 }}>
            Così l'app si apre a schermo intero come le altre e i tuoi dati sono più al sicuro.
          </p>
        </Sheet>
      )}
      {open === 'about' && (
        <Sheet onClose={() => setOpen(null)}>
          <h2>Zampe in Giro</h2>
          <p style={{ margin: '8px 0 12px' }}>
            Il gioco in cui catturi, con una foto, i veri cani e gatti che incontri in giro. Il riconoscimento avviene
            interamente sul telefono: le foto non vengono mai inviate a nessuno.
          </p>
          <p className="muted" style={{ fontSize: 14, lineHeight: 1.5 }}>
            Mappa: © OpenStreetMap contributors, stile OpenFreeMap.
            <br />
            Riconoscimento: MediaPipe (EfficientDet-Lite0, EfficientNet-Lite0), licenza Apache 2.0.
            <br />
            Carattere: Fredoka (SIL Open Font License).
          </p>
        </Sheet>
      )}
      {typeof open === 'object' && open && 'badge' in open && <BadgeSheet id={open.badge} value={summary} onClose={() => setOpen(null)} />}
      {open === 'wipe' && (
        <Sheet onClose={() => setOpen(null)}>
          <h2>Cancellare tutto?</h2>
          <p className="muted" style={{ margin: '6px 0 18px' }}>
            Perderai per sempre tutti gli animali, le foto, i livelli e le medaglie. Se vuoi tenerli, salva prima un backup.
          </p>
          <button
            className="btn btn-danger btn-block"
            onClick={async () => {
              await wipeAll();
              location.hash = '';
              location.reload();
            }}
          >
            Sì, cancella tutto
          </button>
          <button className="btn btn-ghost btn-block" style={{ marginTop: 8 }} onClick={() => setOpen(null)}>
            Annulla
          </button>
        </Sheet>
      )}
    </div>
  );
}

function BadgeSheet({ id, value, onClose }: { id: string; value: BadgeSummary; onClose: () => void }) {
  const b = BADGES.find((x) => x.id === id)!;
  const tier = badgeTier(b, value);
  return (
    <Sheet onClose={onClose}>
      <div className="center">
        <div className={`badge t${tier}`} style={{ boxShadow: 'none', background: 'none' }}>
          <div className="medal" style={{ width: 84, height: 84, fontSize: 42 }}>
            {b.emoji}
          </div>
        </div>
        <h2>{b.name}</h2>
        <p className="muted">{tier ? `Medaglia ${TIER_NAMES[tier - 1].toLowerCase()}` : 'Non ancora ottenuta'}</p>
      </div>
      <div style={{ marginTop: 14 }}>
        {b.tiers.map((_, i) => (
          <div key={i} className={`mission ${tier > i ? 'done' : ''}`}>
            <div className="mi">{tier > i ? '✅' : ['🥉', '🥈', '🥇'][i]}</div>
            <div className="grow">
              <div className="mt">{TIER_NAMES[i]}</div>
              <div className="muted" style={{ fontSize: 14 }}>
                {tierText(b, i)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Sheet>
  );
}

function EditProfile({ onClose }: { onClose: () => void }) {
  const player = useGame((s) => s.player);
  const updateProfile = useGame((s) => s.updateProfile);
  const [name, setName] = useState(player.name);
  const [avatar, setAvatar] = useState(player.avatar);
  return (
    <Sheet onClose={onClose}>
      <h2>Il tuo profilo</h2>
      <label className="field">
        <span>Nome da esploratore</span>
        <input className="input" value={name} maxLength={20} onChange={(e) => setName(e.target.value)} />
      </label>
      <div className="field">
        <span>Avatar</span>
        <div className="avatars">
          {AVATARS.map((a) => (
            <button key={a} className={avatar === a ? 'active' : ''} onClick={() => setAvatar(a)}>
              {a}
            </button>
          ))}
        </div>
      </div>
      <button
        className="btn btn-primary btn-block"
        style={{ marginTop: 18 }}
        disabled={!name.trim()}
        onClick={() => {
          updateProfile(name.trim(), avatar);
          onClose();
        }}
      >
        Salva
      </button>
    </Sheet>
  );
}
