import { useEffect } from 'react';
import { create } from 'zustand';
import type { ThemeChoice } from '../game/store';
import { setFeedbackPrefs } from './sound';
import { useGame } from '../game/store';

// Tema chiaro/scuro. In automatico l'app diventa scura la sera (dalle 20 alle 7).

export const useTheme = create<{ dark: boolean }>(() => ({ dark: false }));

export function isNight(now = new Date()): boolean {
  const h = now.getHours();
  return h >= 20 || h < 7;
}

export function resolveTheme(choice: ThemeChoice, now = new Date()): 'light' | 'dark' {
  if (choice === 'auto') return isNight(now) ? 'dark' : 'light';
  return choice;
}

function apply(choice: ThemeChoice) {
  const dark = resolveTheme(choice) === 'dark';
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#1c1730' : '#9f7aea');
  if (useTheme.getState().dark !== dark) useTheme.setState({ dark });
}

/** Applica tema, suoni e vibrazione scelti nelle impostazioni. */
export function useAppearance(): void {
  const settings = useGame((s) => s.player.settings);
  useEffect(() => {
    setFeedbackPrefs(settings);
    apply(settings.theme);
    if (settings.theme !== 'auto') return;
    const t = setInterval(() => apply(settings.theme), 60000);
    return () => clearInterval(t);
  }, [settings]);
}
