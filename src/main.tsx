import '@fontsource/fredoka/400.css';
import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/fredoka/700.css';
import './styles.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import './pwa';

// Il gioco non si apre dentro pagine di altri siti (protezione dai "clic ingannevoli"):
// GitHub Pages non permette di impostarlo con le intestazioni del server.
const framed = (() => {
  try {
    return window.top !== window.self;
  } catch {
    return true;
  }
})();

if (framed) {
  document.getElementById('root')!.textContent = 'Zampe in Giro si apre solo dal suo indirizzo.';
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

// Service worker: l'app funziona anche offline e si aggiorna da sola.
if (import.meta.env.PROD && !framed) registerSW({ immediate: true });
