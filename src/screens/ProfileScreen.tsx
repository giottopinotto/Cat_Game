import { CalendarDays, Download, House, Check, Info, Lock, MapPinOff, Moon, Palette, Sparkles, Pencil, ShieldCheck, Smartphone, Trash2, Upload, Users, Vibrate, Volume2 } from 'lucide-react';
import { useMemo, useRef, useState, type CSSProperties } from 'react';
import { ACCENTS, accentColor, getAccent } from '../ui/accents';
import { AVATAR_LIST, BANNERS, FRAMES, nextReward, PACKS } from '../ui/cosmetics';
import { RewardPreview } from '../ui/RewardPreview';
import { BADGES, badgeTier, TIER_NAMES, tierText, type BadgeSummary } from '../game/badges';
import { importBackup } from '../game/backup';
import { wipeAll } from '../game/db';
import { formatDistance } from '../game/geo';
import { levelInfo, levelTitle } from '../game/progress';
import { today, useGame, type ThemeChoice } from '../game/store';
import { go } from '../router';
import { saveBackup } from '../ui/backupActions';
import { HomeZoneSheet } from './HomeZoneSheet';
import { badgeSummary, streaks } from '../game/summary';
import { isIOS, isStandalone, promptInstall, useInstall } from '../pwa';
import { formatNumber, Sheet, Switch, XpBar } from '../ui/common';
import { AvatarArt, GameIcon, Medal } from '../ui/icons';
import { Rules } from '../ui/Rules';

type Open = null | 'edit' | 'rules' | 'about' | 'wipe' | 'install' | 'home' | { badge: string };

const THEMES: { id: ThemeChoice; label: string }[] = [
  { id: 'auto', label: 'Automatico' },
  { id: 'light', label: 'Chiaro' },
  { id: 'dark', label: 'Scuro' },
];

export function ProfileScreen() {
  const player = useGame((s) => s.player);
  const animals = useGame((s) => s.animals);
  const toast = useGame((s) => s.toast);
  const installPrompt = useInstall((s) => s.prompt);
  const [open, setOpen] = useState<Open>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const lvl = levelInfo(player.xp);
  const next = nextReward(lvl.level);
  const day = today();
  const summary = useMemo(
    () => badgeSummary(animals, player.zones.length, player.walkedM, player.activeDays, day),
    [animals, player, day],
  );
  const streak = streaks(player.activeDays, day);
  const cats = animals.filter((a) => a.species === 'cat').length;

  const updateSettings = useGame((s) => s.updateSettings);
  const settings = player.settings;

  async function doImport(f: File | undefined) {
    if (!f) return;
    try {
      const n = await importBackup(f);
      toast('check', `Backup ripristinato: ${n} animali`);
      setTimeout(() => location.reload(), 900);
    } catch (e) {
      toast('alert', (e as Error).message);
    }
  }

  const stats: [string, string][] = [
    [formatNumber(animals.length), animals.length === 1 ? 'animale' : 'animali'],
    [`${animals.length - cats} · ${cats}`, 'cani · gatti'],
    [formatNumber(summary.entries), summary.entries === 1 ? "voce dell'album" : "voci dell'album"],
    [formatDistance(player.walkedM), 'a piedi'],
    [formatNumber(player.zones.length), player.zones.length === 1 ? 'zona esplorata' : 'zone esplorate'],
    [formatNumber(player.missionsDone), player.missionsDone === 1 ? 'sfida completata' : 'sfide completate'],
    [String(streak.current), 'giorni di fila'],
    [String(streak.best), 'record di giorni'],
  ];

  return (
    <div className="screen">
      <div className={`profile-head banner-${player.banner}`}>
        <button className={`avatar frame-${player.frame}`} onClick={() => setOpen('edit')} aria-label="Modifica profilo">
          <AvatarArt id={player.avatar} />
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
        <button className="next-reward" onClick={() => go('premi')}>
          {next ? (
            <>
              <RewardPreview reward={next} size={38} />
              <span className="grow" style={{ textAlign: 'left' }}>
                <span style={{ fontSize: 12, opacity: 0.8 }}>Prossimo premio · livello {next.level}</span>
                <b style={{ display: 'block' }}>{next.name}</b>
              </span>
            </>
          ) : (
            <span className="grow">Hai sbloccato tutti i premi!</span>
          )}
          <span className="see">Premi ›</span>
        </button>
      </div>

      <div className="section-title">
        <GameIcon name="chart" /> Statistiche
      </div>
      <div className="stats-grid">
        {stats.map(([v, l]) => (
          <div className="stat-tile" key={l}>
            <div className="v">{v}</div>
            <div className="l">{l}</div>
          </div>
        ))}
      </div>

      <div className="section-title">
        <GameIcon name="award" /> Medaglie
      </div>
      <div className="badges">
        {BADGES.map((b) => {
          const tier = badgeTier(b, summary);
          const next = b.tiers[Math.min(tier, 2)];
          const v = b.metric(summary);
          return (
            <button key={b.id} className={`badge t${tier}`} onClick={() => setOpen({ badge: b.id })}>
              <Medal badgeId={b.id} tier={tier} />
              <div className="bn">{b.name}</div>
              <div className="bp">{tier === 3 ? 'Oro!' : b.goal ? b.goal(next) : `${Math.max(0, Math.floor(v))} / ${next}`}</div>
              {tier < 3 && !b.goal && <XpBar value={v} max={next} />}
            </button>
          );
        })}
      </div>

      <div className="section-title">
        <GameIcon name="settings" /> Impostazioni
      </div>
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
        <button onClick={() => go('amici')}>
          <span className="ico">
            <Users size={19} />
          </span>
          <span className="grow">
            Amici
            <div className="muted" style={{ fontSize: 13 }}>
              {player.friends.length ? `${player.friends.length} ${player.friends.length === 1 ? 'amico' : 'amici'} · classifica` : 'Aggiungi i tuoi amici con il QR'}
            </div>
          </span>
        </button>
        <button onClick={() => go('diario')}>
          <span className="ico">
            <CalendarDays size={19} />
          </span>
          Diario delle uscite
        </button>
        <button onClick={() => setOpen('home')}>
          <span className="ico">
            <House size={19} />
          </span>
          <span className="grow">
            Zona privata di casa
            <div className="muted" style={{ fontSize: 13 }}>
              {player.home ? 'Attiva: le catture vicino a casa non salvano la posizione precisa' : 'Nasconde la posizione delle catture vicino a casa'}
            </div>
          </span>
        </button>
        <button onClick={() => updateSettings({ gpsOnlyPhoto: !settings.gpsOnlyPhoto })}>
          <span className="ico">
            <MapPinOff size={19} />
          </span>
          <span className="grow">
            Posizione solo per le foto
            <div className="muted" style={{ fontSize: 13 }}>
              {settings.gpsOnlyPhoto
                ? 'Il GPS si accende solo quando fotografi. Km, zone esplorate e sfide di cammino sono in pausa'
                : 'Il GPS resta acceso mentre giochi: conta km e zone esplorate'}
            </div>
          </span>
          <Switch on={settings.gpsOnlyPhoto} />
        </button>
        <button onClick={() => updateSettings({ sound: !settings.sound })}>
          <span className="ico">
            <Volume2 size={19} />
          </span>
          <span className="grow">Suoni</span>
          <Switch on={settings.sound} />
        </button>
        <button onClick={() => updateSettings({ vibration: !settings.vibration })}>
          <span className="ico">
            <Vibrate size={19} />
          </span>
          <span className="grow">Vibrazione</span>
          <Switch on={settings.vibration} />
        </button>
        <div className="menu-block">
          <div className="row" style={{ gap: 12, marginBottom: 10 }}>
            <span className="ico">
              <Moon size={19} />
            </span>
            <span className="grow">
              Tema
              <div className="muted" style={{ fontSize: 13 }}>
                In automatico diventa scuro la sera (dalle 20 alle 7)
              </div>
            </span>
          </div>
          <div className="segmented">
            {THEMES.map((t) => (
              <button key={t.id} className={settings.theme === t.id ? 'active' : ''} onClick={() => updateSettings({ theme: t.id })}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="menu-block">
          <div className="row" style={{ gap: 12, marginBottom: 10 }}>
            <span className="ico">
              <Palette size={19} />
            </span>
            <span className="grow">
              Colore dell'app
              <div className="muted" style={{ fontSize: 13 }}>
                {getAccent(settings.accent).name}
              </div>
            </span>
          </div>
          <div className="accent-swatches" role="radiogroup" aria-label="Colore dell'app">
            {ACCENTS.map((a) => (
              <button
                key={a.id}
                role="radio"
                aria-checked={settings.accent === a.id}
                aria-label={a.name}
                className={settings.accent === a.id ? 'active' : ''}
                style={{ '--c': accentColor(a.id) } as CSSProperties}
                onClick={() => updateSettings({ accent: a.id })}
              >
                {settings.accent === a.id && <Check size={18} strokeWidth={3} />}
              </button>
            ))}
          </div>
        </div>
        <button onClick={() => updateSettings({ fx: !settings.fx })}>
          <span className="ico">
            <Sparkles size={19} />
          </span>
          <span className="grow">
            Effetti speciali
            <div className="muted" style={{ fontSize: 13 }}>
              Stagioni sulla mappa, brillantini e fuochi d'artificio. Spegnili per risparmiare batteria
            </div>
          </span>
          <Switch on={settings.fx} />
        </button>
        <button onClick={() => void saveBackup()}>
          <span className="ico">
            <Download size={19} />
          </span>
          <span className="grow">
            Salva un backup
            <div className="muted" style={{ fontSize: 13 }}>
              I dati sono solo su questo telefono: fai un backup ogni tanto! Contiene foto e luoghi delle catture: tienilo per te.
              {player.lastBackupAt > 0 && ` Ultimo: ${new Date(player.lastBackupAt).toLocaleDateString('it-IT')}.`}
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
      {open === 'home' && <HomeZoneSheet onClose={() => setOpen(null)} />}
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
            Mappa: © OpenStreetMap contributors, stile OpenFreeMap (di riserva: tile di OpenStreetMap).
            <br />
            Riconoscimento: MediaPipe (EfficientDet-Lite0, EfficientNet-Lite0, DeepLab v3), licenza Apache 2.0.
            <br />
            Carattere: Fredoka (SIL Open Font License). Icone: Lucide (ISC).
            <br />
            QR code: uqr (MIT) e jsQR (Apache 2.0).
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
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
          <Medal badgeId={b.id} tier={tier} size={88} />
        </div>
        <h2>{b.name}</h2>
        <p className="muted">{tier ? `Medaglia ${TIER_NAMES[tier - 1].toLowerCase()}` : 'Non ancora ottenuta'}</p>
      </div>
      <div style={{ marginTop: 14 }}>
        {b.tiers.map((_, i) => (
          <div key={i} className={`mission ${tier > i ? 'done' : ''}`}>
            <div className="mi">
              {tier > i ? <GameIcon name="check" size={24} /> : <Medal badgeId={b.id} tier={i + 1} size={34} />}
            </div>
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
  const [frame, setFrame] = useState(player.frame);
  const [banner, setBanner] = useState(player.banner);
  const [pack, setPack] = useState(player.pack);
  const level = levelInfo(player.xp).level;
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
          {AVATAR_LIST.map((a) => (
            <button
              key={a.id}
              className={`${avatar === a.id ? 'active' : ''} ${a.level > level ? 'locked' : ''}`}
              disabled={a.level > level}
              onClick={() => setAvatar(a.id)}
              aria-label={a.level > level ? `Si sblocca al livello ${a.level}` : undefined}
            >
              <AvatarArt id={a.id} />
              {a.level > level && (
                <span className="lock-badge">
                  <Lock size={10} /> {a.level}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <span>Cornice</span>
        <div className="cosmetic-grid">
          {FRAMES.map((f) => (
            <button key={f.id} className={frame === f.id ? 'active' : ''} disabled={f.level > level} onClick={() => setFrame(f.id)}>
              {f.level > level && (
                <span className="lock">
                  <Lock size={11} /> Liv. {f.level}
                </span>
              )}
              <span className={`avatar frame-${f.id}`}>
                <AvatarArt id={avatar} />
              </span>
              {f.name}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <span>Sfondo del profilo</span>
        <div className="cosmetic-grid">
          {BANNERS.map((b) => (
            <button key={b.id} className={banner === b.id ? 'active' : ''} disabled={b.level > level} onClick={() => setBanner(b.id)}>
              {b.level > level && (
                <span className="lock">
                  <Lock size={11} /> Liv. {b.level}
                </span>
              )}
              <span className={`profile-head banner-swatch banner-${b.id}`} />
              {b.name}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <span>Pacchetto delle carte</span>
        <div className="cosmetic-grid">
          {PACKS.map((k) => (
            <button key={k.id} className={pack === k.id ? 'active' : ''} disabled={k.level > level} onClick={() => setPack(k.id)}>
              {k.level > level && (
                <span className="lock">
                  <Lock size={11} /> Liv. {k.level}
                </span>
              )}
              <RewardPreview reward={{ kind: 'pacchetto', id: k.id }} size={52} />
              {k.name}
            </button>
          ))}
        </div>
      </div>
      <button
        className="btn btn-primary btn-block"
        style={{ marginTop: 18 }}
        disabled={!name.trim()}
        onClick={() => {
          updateProfile(name.trim(), avatar, frame, banner, pack);
          onClose();
        }}
      >
        Salva
      </button>
    </Sheet>
  );
}
