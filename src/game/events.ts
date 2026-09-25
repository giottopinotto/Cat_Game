import type { CaptureEvent } from './missions';

// Eventi a tempo: già scritti nell'app, non si scarica niente. Durante un evento
// le catture che rientrano nel tema valgono più punti esperienza.

export interface GameEvent {
  id: string;
  name: string;
  desc: string;
  /** Nome dell'icona (vedi ui/icons.tsx). */
  icon: string;
  /** Moltiplicatore degli XP della cattura (es. 2 = doppi). */
  mult: number;
  applies(ev: CaptureEvent): boolean;
}

interface Dated extends GameEvent {
  /** Giorno di inizio e fine, formato MM-DD (inclusi). Se `to` < `from` l'evento scavalca il capodanno. */
  from: string;
  to: string;
}

const all = () => true;

export const EVENTS: Dated[] = [
  { id: 'gatto', name: 'Festa del gatto', desc: 'Gatti a XP doppi', icon: 'cat', mult: 2, from: '02-17', to: '02-17', applies: (e) => e.species === 'cat' },
  { id: 'primavera', name: 'Settimana di primavera', desc: 'Catture nei parchi a XP doppi', icon: 'trees', mult: 2, from: '03-21', to: '03-27', applies: (e) => e.inPark },
  { id: 'ferragosto', name: 'Ferragosto a zampe', desc: 'Tutte le catture +50% XP', icon: 'sun', mult: 1.5, from: '08-10', to: '08-16', applies: all },
  { id: 'cane', name: 'Giornata del cane', desc: 'Cani a XP doppi', icon: 'dog', mult: 2, from: '08-26', to: '08-26', applies: (e) => e.species === 'dog' },
  { id: 'animali', name: 'Giornata degli animali', desc: 'Tutte le catture a XP doppi', icon: 'paw', mult: 2, from: '10-04', to: '10-04', applies: all },
  { id: 'halloween', name: 'Halloween', desc: 'Gatti neri a XP tripli', icon: 'moon', mult: 3, from: '10-29', to: '10-31', applies: (e) => e.coat === 'nero' },
  { id: 'gatto-nero', name: 'Giornata del gatto nero', desc: 'Gatti neri a XP tripli', icon: 'moon', mult: 3, from: '11-17', to: '11-17', applies: (e) => e.coat === 'nero' },
  { id: 'natale', name: 'Zampe di Natale', desc: 'Tutte le catture +50% XP', icon: 'gift', mult: 1.5, from: '12-20', to: '01-06', applies: all },
];

/** Ogni domenica: passeggiata al parco. */
export const SUNDAY: GameEvent = {
  id: 'domenica',
  name: 'Domenica al parco',
  desc: 'Catture nei parchi +50% XP',
  icon: 'trees',
  mult: 1.5,
  applies: (e) => e.inPark,
};

const mmdd = (d: Date) => `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function inRange(day: string, from: string, to: string): boolean {
  return from <= to ? day >= from && day <= to : day >= from || day <= to;
}

export function activeEvents(now = new Date()): GameEvent[] {
  const day = mmdd(now);
  const list: GameEvent[] = EVENTS.filter((e) => inRange(day, e.from, e.to));
  if (now.getDay() === 0) list.push(SUNDAY);
  return list;
}

/** Il prossimo inizio di un evento a data fissa (per la lista "in arrivo"). */
export function upcomingEvents(now = new Date(), count = 3): { event: GameEvent; start: Date }[] {
  const out: { event: GameEvent; start: Date }[] = [];
  for (const e of EVENTS) {
    const [m, d] = e.from.split('-').map(Number);
    let start = new Date(now.getFullYear(), m - 1, d);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (start <= today) start = new Date(now.getFullYear() + 1, m - 1, d);
    if (inRange(mmdd(now), e.from, e.to)) continue;
    out.push({ event: e, start });
  }
  return out.sort((a, b) => a.start.getTime() - b.start.getTime()).slice(0, count);
}

/** XP extra degli eventi attivi per una cattura che vale `baseXp`. Si usa il bonus più alto. */
export function eventBonus(ev: CaptureEvent, baseXp: number, now = new Date()): { event: GameEvent; xp: number } | null {
  let best: { event: GameEvent; xp: number } | null = null;
  for (const e of activeEvents(now)) {
    if (!e.applies(ev)) continue;
    const xp = Math.round(baseXp * (e.mult - 1));
    if (xp > 0 && (!best || xp > best.xp)) best = { event: e, xp };
  }
  return best;
}
