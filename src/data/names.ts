import type { Species } from './types';

const CAT_NAMES = [
  'Micio', 'Luna', 'Pallina', 'Briciola', 'Tigre', 'Romeo', 'Nuvola', 'Fuffi', 'Oliver', 'Milo',
  'Birba', 'Minou', 'Zenzero', 'Pepe', 'Mirtillo', 'Ombra', 'Leone', 'Cannella', 'Biscotto', 'Mochi',
  'Nutella', 'Arturo', 'Gino', 'Tobia', 'Kira', 'Nala', 'Simba', 'Stella', 'Tofu', 'Merlino',
  'Camilla', 'Fiocco', 'Sushi', 'Polenta', 'Gnocco', 'Pistacchio', 'Mimì', 'Batuffolo', 'Salem', 'Artù',
];

const DOG_NAMES = [
  'Fido', 'Rex', 'Argo', 'Luna', 'Bobby', 'Lucky', 'Rocky', 'Maya', 'Kira', 'Zeus',
  'Chicco', 'Pongo', 'Otto', 'Buddy', 'Sole', 'Nina', 'Toby', 'Ugo', 'Brio', 'Polpetta',
  'Ciuffo', 'Diesel', 'Leo', 'Molly', 'Charlie', 'Dante', 'Frida', 'Olivia', 'Bruno', 'Trilli',
  'Pippo', 'Birillo', 'Tartufo', 'Lilli', 'Scooby', 'Balto', 'Laika', 'Ercole', 'Mela', 'Cookie',
];

export function randomName(species: Species, avoid?: string): string {
  const list = species === 'cat' ? CAT_NAMES : DOG_NAMES;
  let name = avoid;
  while (name === avoid) name = list[Math.floor(Math.random() * list.length)];
  return name!;
}
