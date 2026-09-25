import { useEffect } from 'react';
import { create } from 'zustand';
import type { ThemeChoice } from '../game/store';
import { accentColor, DEFAULT_ACCENT, getAccent, hsl } from './accents';
import { setFeedbackPrefs } from './sound';
import { useGame } from '../game/store';

// Tema chiaro/scuro. In automatico l'app diventa scura la sera (dalle 20 alle 7).

export const useTheme = create<{ dark: boolean; accent: string }>(() => ({ dark: false, accent: DEFAULT_ACCENT }));

export function isNight(now = new Date()): boolean {
  const h = now.getHours();
  return h >= 20 || h < 7;
}

export function resolveTheme(choice: ThemeChoice, now = new Date()): 'light' | 'dark' {
  if (choice === 'auto') return isNight(now) ? 'dark' : 'light';
  return choice;
}

function apply(choice: ThemeChoice, accentId: string) {
  const dark = resolveTheme(choice) === 'dark';
  const root = document.documentElement;
  root.dataset.theme = dark ? 'dark' : 'light';
  const a = getAccent(accentId);
  if (a.id === DEFAULT_ACCENT) {
    delete root.dataset.accent;
  } else {
    root.dataset.accent = a.id;
    root.style.setProperty('--h', String(a.h));
    root.style.setProperty('--ps', `${a.s}%`);
    root.style.setProperty('--pl', `${a.l}%`);
  }
  const bar = dark ? (a.id === DEFAULT_ACCENT ? '#1c1730' : hsl(a.h, 38, 12)) : accentColor(a.id);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bar);
  const st = useTheme.getState();
  if (st.dark !== dark || st.accent !== a.id) useTheme.setState({ dark, accent: a.id });
  applyIcons(a.id);
  // Per la prossima apertura (vedi public/boot.js): solo il colore e il tema, niente di personale.
  try {
    localStorage.setItem('zig-look', JSON.stringify({ accent: a.id, h: a.h, s: a.s, l: a.l, theme: choice }));
  } catch {
    /* memoria del browser non disponibile: pazienza */
  }
}

/** Icona della scheda, icona per la schermata Home e "manifest" nel colore scelto. */
function applyIcons(accentId: string) {
  const lilac = accentId === DEFAULT_ACCENT;
  const set = (selector: string, href: string) => {
    const el = document.querySelector<HTMLLinkElement>(selector);
    if (el && el.getAttribute('href') !== href) el.setAttribute('href', href);
  };
  set('link[rel="icon"]', lilac ? 'favicon.svg' : `icons/${accentId}/favicon.svg`);
  set('link[rel="apple-touch-icon"]', lilac ? 'icons/apple-touch-icon.png' : `icons/${accentId}/apple-touch-icon.png`);
  set('link[rel="manifest"]', lilac ? 'manifest.webmanifest' : `manifest-${accentId}.webmanifest`);
}

/** Applica tema, suoni e vibrazione scelti nelle impostazioni. */
export function useAppearance(): void {
  const settings = useGame((s) => s.player.settings);
  useEffect(() => {
    setFeedbackPrefs(settings);
    apply(settings.theme, settings.accent);
    document.documentElement.classList.toggle('no-fx', !settings.fx);
    if (settings.theme !== 'auto') return;
    const t = setInterval(() => apply(settings.theme, settings.accent), 60000);
    return () => clearInterval(t);
  }, [settings]);
}
