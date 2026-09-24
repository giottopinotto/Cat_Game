import { describe, expect, it } from 'vitest';
import { applyCaptureToMission, applyWalkToMission, generateDailyMissions, missionDone, missionText, type Mission } from './missions';

describe('sfide giornaliere', () => {
  it('sono 3, uguali per lo stesso giorno e diverse tra i giorni', () => {
    const a = generateDailyMissions('2026-09-24', 5);
    expect(a).toHaveLength(3);
    expect(generateDailyMissions('2026-09-24', 5)).toEqual(a);
    const days = Array.from({ length: 10 }, (_, i) => JSON.stringify(generateDailyMissions(`2026-10-${i + 10}`, 5).map((m) => m.type)));
    expect(new Set(days).size).toBeGreaterThan(1);
  });

  it('hanno sempre un testo', () => {
    for (let d = 1; d <= 28; d++) for (const m of generateDailyMissions(`2026-02-${d}`, 10)) expect(missionText(m)).not.toBe('');
  });

  it('i rincontri non contano come nuove catture', () => {
    const m: Mission = { id: 'x', type: 'catch_any', target: 2, progress: 0, reward: 100 };
    const ev = { species: 'dog' as const, rarity: 'comune' as const, reencounter: true, newEntry: false, inPark: false };
    expect(applyCaptureToMission(m, ev).progress).toBe(0);
    expect(applyCaptureToMission(m, { ...ev, reencounter: false }).progress).toBe(1);
  });

  it('la camminata avanza a metri e si ferma al traguardo', () => {
    let m: Mission = { id: 'w', type: 'walk', target: 1000, progress: 0, reward: 100 };
    m = applyWalkToMission(m, 700);
    expect(missionDone(m)).toBe(false);
    m = applyWalkToMission(m, 700);
    expect(m.progress).toBe(1000);
    expect(missionDone(m)).toBe(true);
  });

  it('la sfida del mantello vale solo per quel mantello', () => {
    const m: Mission = { id: 'c', type: 'catch_coat', target: 1, progress: 0, reward: 100, coat: 'nero' };
    const ev = { species: 'cat' as const, rarity: 'non_comune' as const, reencounter: false, newEntry: false, inPark: false };
    expect(applyCaptureToMission(m, { ...ev, coat: 'rosso' }).progress).toBe(0);
    expect(applyCaptureToMission(m, { ...ev, coat: 'nero' }).progress).toBe(1);
  });
});
