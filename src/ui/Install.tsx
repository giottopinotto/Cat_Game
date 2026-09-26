import { isIOS, isStandalone, promptInstall, useInstall } from '../pwa';
import { Sheet } from './common';
import { IconBubble } from './icons';

// Installazione sulla schermata Home: se il browser lo permette si usa il suo pulsante,
// altrimenti si spiega passo passo cosa toccare (ogni browser ha il suo menu).

type Browser = 'ios' | 'samsung' | 'firefox' | 'brave' | 'edge' | 'chrome' | 'other';

function browser(): Browser {
  const ua = navigator.userAgent;
  if (isIOS()) return 'ios';
  if (/SamsungBrowser/i.test(ua)) return 'samsung';
  if (/Firefox/i.test(ua)) return 'firefox';
  if ((navigator as { brave?: unknown }).brave) return 'brave';
  if (/EdgA?\//i.test(ua)) return 'edge';
  if (/Chrome/i.test(ua)) return 'chrome';
  return 'other';
}

const STEPS: Record<Browser, { name: string; steps: string[] }> = {
  ios: {
    name: 'iPhone',
    steps: ['Tocca il pulsante **Condividi** (il quadrato con la freccia in su)', 'Scorri e scegli **Aggiungi alla schermata Home**', 'Tocca **Aggiungi**'],
  },
  samsung: { name: 'Samsung Internet', steps: ['Tocca il menu **≡** in basso', 'Scegli **Aggiungi pagina a**', 'Scegli **Schermata Home**'] },
  firefox: { name: 'Firefox', steps: ['Tocca il menu **⋮**', 'Scegli **Installa** (o **Aggiungi alla schermata Home**)'] },
  brave: { name: 'Brave', steps: ['Tocca il menu **⋮**', 'Scegli **Installa app** (o **Aggiungi alla schermata Home**)', 'Conferma con **Installa**'] },
  edge: { name: 'Edge', steps: ['Tocca il menu **…** in basso', 'Scegli **Aggiungi al telefono** (o **Installa app**)'] },
  chrome: { name: 'Chrome', steps: ['Tocca il menu **⋮** in alto a destra', 'Scegli **Installa app** (o **Aggiungi a schermata Home**)', 'Conferma con **Installa**'] },
  other: { name: 'il tuo browser', steps: ['Apri il menu del browser', 'Cerca **Installa app** o **Aggiungi alla schermata Home**'] },
};

/** Testo con **grassetto** (solo testi fissi dell'app). */
function Bold({ text }: { text: string }) {
  return (
    <>
      {text.split('**').map((part, i) => (i % 2 ? <b key={i}>{part}</b> : <span key={i}>{part}</span>))}
    </>
  );
}

/** Installa subito se il browser lo permette; altrimenti restituisce false (servono le istruzioni). */
export async function tryInstall(): Promise<boolean> {
  if (!useInstall.getState().prompt) return false;
  await promptInstall();
  return true;
}

export function InstallSheet({ onClose }: { onClose: () => void }) {
  const b = browser();
  const info = STEPS[b];
  return (
    <Sheet onClose={onClose}>
      <div className="row" style={{ gap: 12, marginBottom: 8 }}>
        <IconBubble name="home" tone="mint" />
        <h2>Installa Zampe in Giro</h2>
      </div>
      {isStandalone() ? (
        <p className="muted" style={{ lineHeight: 1.5 }}>
          L'app è già installata: la stai usando adesso dalla schermata Home.
        </p>
      ) : (
        <>
          <p className="muted" style={{ marginBottom: 10 }}>
            Con {info.name}:
          </p>
          <ol className="install-steps">
            {info.steps.map((s) => (
              <li key={s}>
                <Bold text={s} />
              </li>
            ))}
          </ol>
          {b === 'ios' && (
            <p className="muted" style={{ fontSize: 13, marginTop: 10 }}>
              Se non trovi la voce, apri questa pagina con Safari.
            </p>
          )}
          <p className="muted" style={{ fontSize: 13, marginTop: 10, lineHeight: 1.45 }}>
            Se l'avevi appena tolta dalla Home e non compare "Installa app", chiudi del tutto il browser e riaprilo: a volte ci
            mette qualche minuto a riproporla.
          </p>
        </>
      )}
      <p className="muted" style={{ marginTop: 12, fontSize: 14 }}>
        Installata si apre a schermo intero, più veloce, e tenendo premuta l'icona trovi la scorciatoia <b>Cattura</b>.
      </p>
      <button className="btn btn-primary btn-block" style={{ marginTop: 14 }} onClick={onClose}>
        Ho capito
      </button>
    </Sheet>
  );
}
