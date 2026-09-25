import { describe, expect, it } from 'vitest';
import { coatColors, coatFromColors } from './coat';

/** Immagine finta: ogni riga ha il colore indicato (in proporzione). */
function image(parts: [number, [number, number, number]][], size = 40): Uint8ClampedArray {
  const data = new Uint8ClampedArray(size * size * 4);
  const rows: [number, number, number][] = [];
  for (const [n, c] of parts) for (let i = 0; i < Math.round(n * size); i++) rows.push(c);
  for (let y = 0; y < size; y++) {
    const c = rows[Math.min(y, rows.length - 1)];
    for (let x = 0; x < size; x++) data.set([...c, 255], (y * size + x) * 4);
  }
  return data;
}

const coat = (parts: [number, [number, number, number]][]) => coatFromColors(coatColors(image(parts), 40, 40));

const BLACK: [number, number, number] = [20, 20, 22];
const WHITE: [number, number, number] = [240, 238, 232];
const ORANGE: [number, number, number] = [225, 130, 45];
const GREY: [number, number, number] = [128, 132, 140];
const BROWN: [number, number, number] = [120, 95, 70];

describe('mantello del gatto', () => {
  it('riconosce i colori pieni', () => {
    expect(coat([[1, BLACK]])).toBe('nero');
    expect(coat([[1, WHITE]])).toBe('bianco');
    expect(coat([[1, ORANGE]])).toBe('rosso');
    expect(coat([[1, GREY]])).toBe('grigio');
    expect(coat([[1, BROWN]])).toBe('tigrato');
  });

  it('riconosce i mantelli misti', () => {
    expect(coat([[0.5, BLACK], [0.5, WHITE]])).toBe('bianco_nero');
    expect(coat([[0.35, ORANGE], [0.35, BLACK], [0.3, WHITE]])).toBe('tricolore');
    expect(coat([[0.5, ORANGE], [0.5, BLACK]])).toBe('tartarugato');
    expect(coat([[0.6, ORANGE], [0.4, WHITE]])).toBe('rosso_bianco');
    expect(coat([[0.6, BROWN], [0.4, WHITE]])).toBe('tigrato_bianco');
  });

  it('un gatto grigio con strisce scure è tigrato, non grigio', () => {
    expect(coat([[0.7, GREY], [0.3, BLACK]])).toBe('tigrato');
  });

  it('un soriano (marrone con strisce nere e riflessi rossi) non è tartarugato', () => {
    expect(coat([[0.42, BROWN], [0.36, BLACK], [0.22, ORANGE]])).toBe('tigrato');
  });
});
