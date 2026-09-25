import { activeEvents } from '../game/events';

// Atmosfera della mappa: stagione, momento della giornata ed eventi decidono
// il colore del cielo e le "particelle" che volano sopra la mappa.

export type Phase = 'dawn' | 'day' | 'sunset' | 'night';
export type Particle = 'leaf' | 'snow' | 'petal' | 'seed' | 'firefly' | 'paw' | 'bat' | 'star';

export function dayPhase(d = new Date()): Phase {
  const h = d.getHours() + d.getMinutes() / 60;
  if (h >= 6 && h < 8.5) return 'dawn';
  if (h >= 8.5 && h < 18) return 'day';
  if (h >= 18 && h < 20.5) return 'sunset';
  return 'night';
}

export function season(d = new Date()): 'spring' | 'summer' | 'autumn' | 'winter' {
  const md = (d.getMonth() + 1) * 100 + d.getDate();
  if (md >= 1201 || md < 301) return 'winter';
  if (md < 601) return 'spring';
  if (md < 923) return 'summer';
  return 'autumn';
}

/** Le particelle del momento: gli eventi hanno la precedenza sulla stagione. */
export function particlesFor(d = new Date()): Particle[] {
  const night = dayPhase(d) === 'night';
  const ids = activeEvents(d).map((e) => e.id);
  const dusk = night || dayPhase(d) === 'sunset';
  if (ids.includes('halloween') || ids.includes('gatto-nero')) return dusk ? ['bat', 'leaf'] : ['leaf'];
  if (ids.includes('natale')) return ['snow', 'star'];
  if (ids.some((id) => ['animali', 'gatto', 'cane'].includes(id))) return ['paw'];
  switch (season(d)) {
    case 'winter':
      return ['snow'];
    case 'spring':
      return night ? ['firefly'] : ['petal'];
    case 'summer':
      return night ? ['firefly'] : ['seed'];
    case 'autumn':
      return ['leaf'];
  }
}

export interface SkyColors {
  top: string;
  horizon: string;
  fog: string;
}

/** Colori del cielo (tonalità h del colore scelto per le ore "neutre"). */
export function skyColors(phase: Phase, h: number): SkyColors {
  switch (phase) {
    case 'dawn':
      return { top: 'hsl(330, 85%, 88%)', horizon: 'hsl(40, 100%, 88%)', fog: 'hsl(20, 90%, 94%)' };
    case 'day':
      return { top: 'hsl(205, 85%, 84%)', horizon: `hsl(${h}, 80%, 94%)`, fog: `hsl(${h}, 60%, 96%)` };
    case 'sunset':
      return { top: 'hsl(345, 70%, 72%)', horizon: 'hsl(28, 100%, 76%)', fog: 'hsl(15, 85%, 88%)' };
    case 'night':
      return { top: `hsl(${h}, 50%, 9%)`, horizon: `hsl(${h}, 40%, 24%)`, fog: `hsl(${h}, 33%, 15%)` };
  }
}
