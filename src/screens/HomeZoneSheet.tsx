import { useState } from 'react';
import { useLocation } from '../game/location';
import { HOME_RADII } from '../game/privacy';
import { useGame } from '../game/store';
import { Sheet } from '../ui/common';
import { IconBubble } from '../ui/icons';

export function HomeZoneSheet({ onClose }: { onClose: () => void }) {
  const home = useGame((s) => s.player.home);
  const setHome = useGame((s) => s.setHome);
  const clearHome = useGame((s) => s.clearHome);
  const toast = useGame((s) => s.toast);
  const fix = useLocation((s) => s.fix);
  const [radius, setRadius] = useState<number>(HOME_RADII[1]);
  const [busy, setBusy] = useState(false);
  const fixOk = !!fix && fix.accuracy <= 100;

  async function save() {
    if (!fix || !fixOk) return;
    setBusy(true);
    const n = await setHome(fix, radius);
    setBusy(false);
    toast('home', n ? `Zona privata attiva: ${n} ${n === 1 ? 'animale nascosto' : 'animali nascosti'}` : 'Zona privata attiva');
    onClose();
  }

  return (
    <Sheet onClose={onClose}>
      <div className="row" style={{ gap: 12, marginBottom: 8 }}>
        <IconBubble name="home" tone="pink" />
        <h2>Zona privata di casa</h2>
      </div>
      <p className="muted" style={{ marginBottom: 14, lineHeight: 1.45 }}>
        Dentro questo cerchio le catture non salvano il punto preciso: sulla mappa, nelle carte e nei backup compare solo
        la zona, con il centro spostato a caso. Così nessuno può risalire a dove abiti.
      </p>
      {home ? (
        <>
          <div className="switch-row" style={{ marginTop: 0 }}>
            <IconBubble name="lock" size={40} tone="mint" />
            <span className="grow">
              <b>Attiva</b>
              <div className="muted" style={{ fontSize: 13 }}>
                Raggio di circa {home.r} m attorno a casa
              </div>
            </span>
          </div>
          <p className="muted" style={{ fontSize: 13, margin: '12px 0' }}>
            Se la togli, le catture fatte finora restano nascoste: le posizioni precise non sono mai state salvate.
          </p>
          <button
            className="btn btn-block"
            onClick={() => {
              clearHome();
              onClose();
            }}
          >
            Togli la zona privata
          </button>
        </>
      ) : (
        <>
          <div className="field">
            <span>Grandezza del cerchio</span>
            <div className="segmented">
              {HOME_RADII.map((r) => (
                <button key={r} className={radius === r ? 'active' : ''} onClick={() => setRadius(r)}>
                  {r} m
                </button>
              ))}
            </div>
          </div>
          <p className="muted" style={{ fontSize: 13, margin: '12px 0' }}>
            Mettiti a casa e premi il pulsante: si usa la posizione di adesso. Anche le catture e le zone esplorate già
            fatte qui vengono nascoste.
          </p>
          <button className="btn btn-primary btn-block" disabled={!fixOk || busy} onClick={save}>
            {fixOk ? 'Sono a casa: crea la zona qui' : 'Aspetto il segnale GPS…'}
          </button>
        </>
      )}
    </Sheet>
  );
}
