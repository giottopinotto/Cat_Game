import { describe, expect, it } from 'vitest';
import { isNight, streaks } from './summary';

describe('serie di giorni', () => {
  it('conta i giorni consecutivi anche a cavallo del mese', () => {
    expect(streaks(['2026-01-30', '2026-01-31', '2026-02-01'], '2026-02-01')).toEqual({ best: 3, current: 3 });
  });

  it('la serie attuale si azzera se salti un giorno', () => {
    expect(streaks(['2026-03-01', '2026-03-02'], '2026-03-05')).toEqual({ best: 2, current: 0 });
    expect(streaks(['2026-03-01', '2026-03-02'], '2026-03-03')).toEqual({ best: 2, current: 2 });
  });

  it('funziona senza giorni', () => {
    expect(streaks([], '2026-03-03')).toEqual({ best: 0, current: 0 });
  });
});

describe('notte', () => {
  it('va dalle 21 alle 5', () => {
    expect(isNight(new Date(2026, 0, 1, 22).getTime())).toBe(true);
    expect(isNight(new Date(2026, 0, 1, 4).getTime())).toBe(true);
    expect(isNight(new Date(2026, 0, 1, 12).getTime())).toBe(false);
  });
});
