import { CAT_ENTRIES, CAT_GROUPS } from './cats';
import { DOG_ENTRIES, DOG_GROUPS } from './dogs';
import type { BreedEntry, Species, Stats } from './types';

export const ALL_ENTRIES: BreedEntry[] = [...CAT_ENTRIES, ...DOG_ENTRIES];

const BY_ID = new Map(ALL_ENTRIES.map((e) => [e.id, e]));

export function getEntry(id: string): BreedEntry | undefined {
  return BY_ID.get(id);
}

export function entriesFor(species: Species): BreedEntry[] {
  return species === 'cat' ? CAT_ENTRIES : DOG_ENTRIES;
}

/** Numero dell'album (1-based) all'interno della specie. */
export function entryNumber(entry: BreedEntry): number {
  return entriesFor(entry.species).indexOf(entry) + 1;
}

export function groupName(entry: BreedEntry): string {
  const groups = entry.species === 'cat' ? CAT_GROUPS : DOG_GROUPS;
  return groups[entry.group]?.name ?? '';
}

export function baseStats(entry: BreedEntry): Stats {
  if (entry.base) return entry.base;
  const groups = entry.species === 'cat' ? CAT_GROUPS : DOG_GROUPS;
  return groups[entry.group]?.base ?? [60, 60, 60];
}

/** Mappa etichetta del classificatore AI → voce dell'album (solo razze canine e feline "di razza"). */
export const LABEL_TO_ENTRY = new Map<string, BreedEntry>();
for (const e of ALL_ENTRIES) for (const l of e.labels ?? []) LABEL_TO_ENTRY.set(l, e);

export const SPECIES_NAME: Record<Species, { one: string; many: string }> = {
  cat: { one: 'Gatto', many: 'Gatti' },
  dog: { one: 'Cane', many: 'Cani' },
};
