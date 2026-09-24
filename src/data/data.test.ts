import { describe, expect, it } from 'vitest';
import { CAT_LABELS, DOG_LABELS } from '../vision/labels';
import { COATS, euCoatEntryId } from './cats';
import { ALL_ENTRIES, getEntry, LABEL_TO_ENTRY } from './entries';

describe('dati dell\'album', () => {
  it('ha id univoci', () => {
    const ids = ALL_ENTRIES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('ogni razza canina riconosciuta dalla AI ha una voce nell\'album', () => {
    for (const l of DOG_LABELS) expect(LABEL_TO_ENTRY.get(l)?.species, l).toBe('dog');
  });

  it('persiano e siamese hanno una voce; gli altri gatti ImageNet sono europei', () => {
    expect(LABEL_TO_ENTRY.get('Persian cat')?.id).toBe('cat-persiano');
    expect(LABEL_TO_ENTRY.get('Siamese cat')?.id).toBe('cat-siamese');
    for (const l of CAT_LABELS.filter((l) => !['Persian cat', 'Siamese cat'].includes(l))) expect(LABEL_TO_ENTRY.has(l)).toBe(false);
  });

  it('ogni mantello ha la sua voce', () => {
    for (const c of COATS) expect(getEntry(euCoatEntryId(c.id))?.coat).toBe(c.id);
  });

  it('ogni voce ha nome e curiosità', () => {
    for (const e of ALL_ENTRIES) {
      expect(e.name.length, e.id).toBeGreaterThan(1);
      expect(e.fact.length, e.id).toBeGreaterThan(20);
    }
  });

  it('esiste il meticcio', () => {
    expect(getEntry('dog-meticcio')?.rarity).toBe('comune');
  });
});
