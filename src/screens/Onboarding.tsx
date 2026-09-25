import { useState } from 'react';
import { startLocation } from '../game/location';
import { useGame } from '../game/store';
import { Logo } from '../ui/common';
import { AvatarArt, GameIcon, IconBubble } from '../ui/icons';
import { AVATARS, Rules } from '../ui/Rules';

const HOW = [
  { e: 'map', t: 'Esplora il mondo vero', d: 'Cammina per la tua città: ogni zona nuova ti dà punti.' },
  { e: 'camera', t: 'Fotografa cani e gatti', d: 'Quando ne incontri uno, inquadralo e scatta.' },
  { e: 'sparkles', t: "L'AI lo riconosce", d: 'Capisce se è un cane o un gatto e ti propone la razza o il mantello.' },
  { e: 'layers', t: 'Colleziona le carte', d: "Ogni animale diventa una carta: completa l'album delle razze!" },
  { e: 'heart', t: 'Fatti degli amici', d: 'Rivedi lo stesso animale in giorni diversi per aumentare la vostra amicizia.' },
];

export function Onboarding() {
  const finish = useGame((s) => s.finishOnboarding);
  const [step, setStep] = useState(0);
  const [promise, setPromise] = useState(false);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0]);

  function start() {
    finish(name.trim() || 'Esploratore', avatar);
    // Con la posizione solo per le foto il permesso si chiede alla prima cattura.
    if (!useGame.getState().player.settings.gpsOnlyPhoto) startLocation();
  }

  return (
    <div className="onboarding">
      {step === 0 && (
        <div className="step" key={0}>
          <Logo />
          <h1>Zampe in Giro</h1>
          <p className="lead">Cattura con la fotocamera i veri cani e gatti che incontri per strada!</p>
        </div>
      )}
      {step === 1 && (
        <div className="step" key={1}>
          <h1>Come si gioca</h1>
          <div className="how">
            {HOW.map((h) => (
              <div key={h.t}>
                <IconBubble name={h.e} size={46} />
                <span>
                  <b>{h.t}</b>
                  <span>{h.d}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      {step === 2 && (
        <div className="step" key={2}>
          <h1>Regole d'oro</h1>
          <p className="lead" style={{ marginBottom: 16 }}>
            Gli animali veri vanno rispettati.
          </p>
          <Rules />
          <button className="switch-row" onClick={() => setPromise((p) => !p)}>
            <IconBubble name="hand" size={40} tone="mint" />
            <b className="grow">Prometto di rispettare le regole</b>
            <span className={`switch ${promise ? 'on' : ''}`} />
          </button>
        </div>
      )}
      {step === 3 && (
        <div className="step" key={3}>
          <h1>Chi sei?</h1>
          <p className="lead">Scegli il tuo nome da esploratore e un avatar.</p>
          <label className="field">
            <span>Nome</span>
            <input className="input" value={name} maxLength={20} placeholder="Es. Giovanni" onChange={(e) => setName(e.target.value)} />
          </label>
          <div className="field">
            <span>Avatar</span>
            <div className="avatars">
              {AVATARS.map((a) => (
                <button key={a} className={avatar === a ? 'active' : ''} onClick={() => setAvatar(a)}>
                  <AvatarArt id={a} />
                </button>
              ))}
            </div>
          </div>
          <p className="muted" style={{ fontSize: 14, marginTop: 16 }}>
            Quando fai la prima foto il telefono ti chiederà il permesso di usare la posizione: serve solo per segnare dove trovi gli
            animali (resta sul tuo telefono). Mentre cammini il GPS resta spento.
          </p>
        </div>
      )}

      <div className="dots">
        {[0, 1, 2, 3].map((i) => (
          <i key={i} className={i === step ? 'on' : ''} />
        ))}
      </div>
      <div className="onboarding-actions">
        {step < 3 ? (
          <button className="btn btn-primary btn-block" disabled={step === 2 && !promise} onClick={() => setStep((s) => s + 1)}>
            {step === 0 ? 'Iniziamo!' : 'Avanti'}
          </button>
        ) : (
          <button className="btn btn-primary btn-block" disabled={!name.trim()} onClick={start}>
            <GameIcon name="paw" /> Inizia a giocare
          </button>
        )}
        {step > 0 && (
          <button className="btn btn-ghost btn-block" onClick={() => setStep((s) => s - 1)}>
            Indietro
          </button>
        )}
      </div>
    </div>
  );
}
