import { create } from 'zustand';

// Installazione dell'app sulla schermata Home.

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const useInstall = create<{ prompt: BeforeInstallPromptEvent | null }>(() => ({ prompt: null }));

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  useInstall.setState({ prompt: e as BeforeInstallPromptEvent });
});
window.addEventListener('appinstalled', () => useInstall.setState({ prompt: null }));

export function isStandalone(): boolean {
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
}

export function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export async function promptInstall(): Promise<boolean> {
  const p = useInstall.getState().prompt;
  if (!p) return false;
  await p.prompt();
  const choice = await p.userChoice;
  useInstall.setState({ prompt: null });
  return choice.outcome === 'accepted';
}
