import { describe, expect, it } from 'vitest';
import {
  blit,
  countOpaque,
  createBuffer,
  crop,
  fillRect,
  flipX,
  fromRows,
  getPixel,
  hex,
  mirrorRows,
  mix,
  outline,
  pixelNoise,
  recolor,
  setPixel,
  shade,
  toHex,
} from '../../src/game/art/pixel.ts';

const RED = hex('#ff0000');
const BLUE = hex('#0000ff');

describe('colores', () => {
  it('lee #rgb, #rrggbb y #rrggbbaa', () => {
    expect(hex('#f00')).toEqual([255, 0, 0, 255]);
    expect(hex('#1c2333')).toEqual([28, 35, 51, 255]);
    expect(hex('#10182a55')).toEqual([16, 24, 42, 85]);
  });

  it('rechaza colores mal escritos', () => {
    expect(() => hex('rojo')).toThrow('Color hex inválido');
    expect(() => hex('#12345')).toThrow();
  });

  it('ida y vuelta con toHex', () => {
    expect(toHex(hex('#39c6f4'))).toBe('#39c6f4');
    expect(toHex(hex('#10182a55'))).toBe('#10182a55');
  });

  it('shade oscurece/aclara sin salirse de 0..255', () => {
    expect(shade([100, 200, 250, 255], 0.5)).toEqual([50, 100, 125, 255]);
    expect(shade([100, 200, 250, 255], 2)).toEqual([200, 255, 255, 255]);
  });

  it('mix interpola por canal', () => {
    expect(mix([0, 0, 0, 255], [200, 100, 50, 255], 0.5)).toEqual([100, 50, 25, 255]);
  });
});

describe('buffers', () => {
  it('no acepta tamaños inválidos', () => {
    expect(() => createBuffer(0, 4)).toThrow();
    expect(() => createBuffer(2.5, 4)).toThrow();
  });

  it('setPixel ignora coordenadas fuera del buffer y alfa 0', () => {
    const buffer = createBuffer(2, 2);
    setPixel(buffer, -1, 0, RED);
    setPixel(buffer, 0, 5, RED);
    setPixel(buffer, 0, 0, [255, 0, 0, 0]);
    expect(countOpaque(buffer)).toBe(0);
  });

  it('mezcla píxeles semitransparentes con lo de abajo', () => {
    const buffer = createBuffer(1, 1);
    setPixel(buffer, 0, 0, [0, 0, 0, 255]);
    setPixel(buffer, 0, 0, [255, 255, 255, 128]);
    const [r, , , a] = getPixel(buffer, 0, 0);
    expect(r).toBeGreaterThan(120);
    expect(r).toBeLessThan(135);
    expect(a).toBe(255);
  });

  it('fillRect recorta al borde', () => {
    const buffer = createBuffer(4, 4);
    fillRect(buffer, 2, 2, 10, 10, RED);
    expect(countOpaque(buffer)).toBe(4);
  });
});

describe('fromRows y mirrorRows', () => {
  it('convierte filas de texto en píxeles', () => {
    const buffer = fromRows(['r.', '.b'], { r: RED, b: BLUE });
    expect(buffer.width).toBe(2);
    expect(buffer.height).toBe(2);
    expect(getPixel(buffer, 0, 0)).toEqual(RED);
    expect(getPixel(buffer, 1, 0)[3]).toBe(0);
    expect(getPixel(buffer, 1, 1)).toEqual(BLUE);
  });

  it('avisa del símbolo sin color y de las filas desiguales', () => {
    expect(() => fromRows(['x'], {})).toThrow('Símbolo "x"');
    expect(() => fromRows(['rr', 'r'], { r: RED })).toThrow('Fila 1');
    expect(() => fromRows([], {})).toThrow('vacío');
  });

  it('refleja la mitad izquierda', () => {
    expect(mirrorRows(['ab.', '..c'])).toEqual(['ab..ba', '..cc..']);
  });
});

describe('transformaciones', () => {
  it('flipX espeja horizontalmente', () => {
    const buffer = fromRows(['r.'], { r: RED });
    const flipped = flipX(buffer);
    expect(getPixel(flipped, 1, 0)).toEqual(RED);
    expect(getPixel(flipped, 0, 0)[3]).toBe(0);
  });

  it('blit respeta la transparencia y recorta', () => {
    const target = fromRows(['bbb', 'bbb'], { b: BLUE });
    blit(target, fromRows(['r.'], { r: RED }), 2, 1);
    expect(getPixel(target, 2, 1)).toEqual(RED);
    expect(getPixel(target, 0, 0)).toEqual(BLUE);
    expect(countOpaque(target)).toBe(6);
  });

  it('outline rodea la silueta pero no las sombras semitransparentes', () => {
    const buffer = createBuffer(5, 5);
    setPixel(buffer, 2, 2, RED);
    setPixel(buffer, 0, 4, [0, 0, 0, 60]);
    const result = outline(buffer, BLUE);
    expect(getPixel(result, 2, 1)).toEqual(BLUE);
    expect(getPixel(result, 1, 2)).toEqual(BLUE);
    expect(getPixel(result, 1, 1)[3]).toBe(0);
    // La sombra no genera contorno a su alrededor.
    expect(getPixel(result, 1, 4)[3]).toBe(0);
  });

  it('recolor cambia colores exactos', () => {
    const swapped = recolor(fromRows(['rb'], { r: RED, b: BLUE }), [[RED, BLUE]]);
    expect(getPixel(swapped, 0, 0)).toEqual(BLUE);
    expect(getPixel(swapped, 1, 0)).toEqual(BLUE);
  });

  it('crop recorta un rectángulo', () => {
    const sheet = fromRows(['rrbb', 'rrbb'], { r: RED, b: BLUE });
    const right = crop(sheet, 2, 0, 2, 2);
    expect(countOpaque(right)).toBe(4);
    expect(getPixel(right, 0, 0)).toEqual(BLUE);
  });
});

describe('pixelNoise', () => {
  it('es determinista y está en [0, 1)', () => {
    const values = Array.from({ length: 200 }, (_, index) => pixelNoise(index, index * 3, 9));
    expect(values).toEqual(Array.from({ length: 200 }, (_, index) => pixelNoise(index, index * 3, 9)));
    for (const value of values) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
    expect(new Set(values.map((value) => value.toFixed(3))).size).toBeGreaterThan(150);
  });
});
