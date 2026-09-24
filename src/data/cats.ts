import type { BreedEntry, CoatId, Rarity, Stats } from './types';

export const CAT_GROUPS: Record<string, { name: string; base: Stats }> = {
  europeo: { name: 'Gatto europeo', base: [72, 58, 82] },
  razza: { name: 'Gatti di razza', base: [60, 75, 70] },
};

/** Mantelli del gatto europeo, con colori per l'interfaccia (swatch). */
export const COATS: { id: CoatId; name: string; rarity: Rarity; swatch: string[]; fact: string }[] = [
  { id: 'tigrato', name: 'Tigrato', rarity: 'comune', swatch: ['#8a6a4a', '#3e2f22'], fact: 'Il disegno tigrato è il mantello "originale" dei gatti: sulla fronte ha quasi sempre una "M".' },
  { id: 'tigrato_bianco', name: 'Tigrato e bianco', rarity: 'comune', swatch: ['#8a6a4a', '#ffffff'], fact: 'Le macchie bianche sono dovute a un gene che "spegne" il colore in alcune zone del corpo.' },
  { id: 'bianco_nero', name: 'Bianco e nero', rarity: 'comune', swatch: ['#1f1f24', '#ffffff'], fact: 'Quando il bianco forma uno "smoking" sul petto e sulle zampe, in inglese si chiama "tuxedo cat".' },
  { id: 'rosso', name: 'Rosso', rarity: 'non_comune', swatch: ['#f08a2e', '#c85e14'], fact: 'Circa quattro gatti rossi su cinque sono maschi, perché il gene del rosso sta sul cromosoma X.' },
  { id: 'rosso_bianco', name: 'Rosso e bianco', rarity: 'non_comune', swatch: ['#f08a2e', '#ffffff'], fact: 'Anche i rossi e bianchi hanno sempre il disegno tigrato: esistono rossi "tinta unita" solo in apparenza.' },
  { id: 'nero', name: 'Nero', rarity: 'non_comune', swatch: ['#15151a', '#3a3a44'], fact: 'In Italia si dice che porti sfortuna, ma in Gran Bretagna e in Giappone porta fortuna!' },
  { id: 'grigio', name: 'Grigio (blu)', rarity: 'raro', swatch: ['#8e98a8', '#5e6776'], fact: 'Il grigio dei gatti si chiama "blu": è un nero "diluito" da un gene particolare.' },
  { id: 'bianco', name: 'Bianco', rarity: 'raro', swatch: ['#ffffff', '#e9e4dc'], fact: 'I gatti bianchi con gli occhi azzurri sono spesso sordi, per un motivo genetico.' },
  { id: 'tartarugato', name: 'Tartarugato', rarity: 'epico', swatch: ['#1f1a17', '#c8641e'], fact: 'Nero e rosso mescolati: quasi tutti i tartarugati sono femmine.' },
  { id: 'tricolore', name: 'Tricolore (calico)', rarity: 'epico', swatch: ['#ffffff', '#f08a2e', '#1f1a17'], fact: 'Bianco, rosso e nero insieme: un gatto tricolore maschio è rarissimo, circa uno su tremila.' },
];

type Row = [id: string, name: string, rarity: Rarity, base: Stats, fact: string, labels?: string[]];

const BREEDS: Row[] = [
  ['persiano', 'Persiano', 'raro', [35, 82, 48], 'Uno dei gatti di razza più antichi e popolari: il suo pelo lungo va spazzolato ogni giorno.', ['Persian cat']],
  ['siamese', 'Siamese', 'raro', [78, 74, 86], 'I suoi colori "a punta" dipendono dalla temperatura: le zone più fredde del corpo sono più scure.', ['Siamese cat']],
  ['british', 'British shorthair', 'raro', [45, 66, 60], 'Ha ispirato il sorriso del Gatto del Cheshire di Alice nel Paese delle Meraviglie.'],
  ['certosino', 'Certosino', 'epico', [55, 72, 70], 'Secondo la leggenda era allevato dai monaci certosini in Francia; ha gli occhi color rame.'],
  ['maine-coon', 'Maine Coon', 'epico', [62, 78, 72], 'È una delle razze più grandi: alcuni esemplari superano il metro di lunghezza, coda compresa.'],
  ['ragdoll', 'Ragdoll', 'epico', [38, 94, 55], 'Quando lo prendi in braccio si rilassa completamente, come una bambola di pezza.'],
  ['bengala', 'Bengala', 'epico', [92, 60, 84], 'Ha il mantello maculato come un piccolo leopardo e spesso adora l\'acqua.'],
  ['norvegese', 'Norvegese delle foreste', 'epico', [70, 66, 74], 'Nelle leggende nordiche trainava il carro della dea Freyja.'],
  ['siberiano', 'Siberiano', 'epico', [72, 76, 70], 'Ha un triplo mantello che lo protegge dagli inverni siberiani.'],
  ['blu-russia', 'Blu di Russia', 'epico', [60, 70, 78], 'Ha il pelo grigio-argento con punte lucenti e occhi verde smeraldo.'],
  ['birmano', 'Sacro di Birmania', 'epico', [55, 86, 62], 'Ha sempre le "calzine" bianche su tutte e quattro le zampe.'],
  ['scottish-fold', 'Scottish Fold', 'epico', [50, 80, 60], 'Le sue orecchie piegate in avanti lo fanno sembrare un gufetto.'],
  ['exotic', 'Exotic shorthair', 'epico', [40, 84, 52], 'È un persiano "a pelo corto": ha lo stesso musetto schiacciato ma è più facile da pettinare.'],
  ['sphynx', 'Sphynx', 'leggendario', [80, 88, 76], 'Sembra senza pelo, ma ha una leggerissima peluria come una pesca, ed è caldissimo al tatto.'],
  ['abissino', 'Abissino', 'leggendario', [90, 62, 88], 'Ogni suo pelo ha più bande di colore: si chiama mantello "ticked".'],
  ['devon-rex', 'Devon Rex', 'leggendario', [84, 82, 80], 'Con le orecchie enormi e il pelo riccio è chiamato "il gatto folletto".'],
  ['egyptian-mau', 'Egyptian Mau', 'leggendario', [94, 60, 82], 'È il gatto domestico più veloce: può superare i 45 km/h.'],
  ['angora-turco', 'Angora turco', 'leggendario', [78, 70, 80], 'Elegante e setoso, è un tesoro nazionale in Turchia.'],
  ['turco-van', 'Turco Van', 'leggendario', [82, 64, 76], 'È chiamato "il gatto che nuota" perché ama tuffarsi nell\'acqua.'],
];

/** L'id della voce album per un gatto europeo con un certo mantello. */
export function euCoatEntryId(coat: CoatId): string {
  return `cat-eu-${coat}`;
}

export const CAT_ENTRIES: BreedEntry[] = [
  ...COATS.map<BreedEntry>((c) => ({
    id: euCoatEntryId(c.id),
    species: 'cat',
    name: `Europeo ${c.name.toLowerCase()}`,
    group: 'europeo',
    rarity: c.rarity,
    fact: c.fact,
    coat: c.id,
  })),
  ...BREEDS.map<BreedEntry>(([id, name, rarity, base, fact, labels]) => ({
    id: `cat-${id}`,
    species: 'cat',
    name,
    group: 'razza',
    rarity,
    fact,
    labels,
    base,
  })),
];

/** Razze selezionabili nel form di cattura: "Europeo" + razze vere. */
export const CAT_BREED_CHOICES: { id: string; name: string; rarity?: Rarity }[] = [
  { id: 'europeo', name: 'Europeo (comune)' },
  ...BREEDS.map(([id, name, rarity]) => ({ id: `cat-${id}`, name, rarity })),
];

/** Etichette dell'AI che indicano un gatto "europeo" generico. */
export const EUROPEAN_CAT_LABELS = ['tabby', 'tiger cat', 'Egyptian cat'];
