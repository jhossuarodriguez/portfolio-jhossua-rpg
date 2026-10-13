/**
 * Utilidades de pixel art puras: sin canvas ni DOM, solo arreglos RGBA.
 * Así todo el arte se genera igual en el navegador, en Node y en los tests.
 */

export type RGBA = readonly [r: number, g: number, b: number, a: number];

export interface PixelBuffer {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}

export const TRANSPARENT: RGBA = [0, 0, 0, 0];

export function createBuffer(width: number, height: number): PixelBuffer {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new Error(`Tamaño de buffer inválido: ${width}x${height}`);
  }
  return { width, height, data: new Uint8ClampedArray(width * height * 4) };
}

/** Convierte `#rgb`, `#rrggbb` o `#rrggbbaa` a RGBA. */
export function hex(color: string): RGBA {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(color);
  if (!match?.[1]) throw new Error(`Color hex inválido: ${color}`);
  let digits = match[1];
  if (digits.length === 3) {
    digits = [...digits].map((digit) => digit + digit).join('');
  }
  const value = (offset: number): number => Number.parseInt(digits.slice(offset, offset + 2), 16);
  return [value(0), value(2), value(4), digits.length === 8 ? value(6) : 255];
}

export function toHex(color: RGBA): string {
  const part = (value: number): string => value.toString(16).padStart(2, '0');
  const alpha = color[3] === 255 ? '' : part(color[3]);
  return `#${part(color[0])}${part(color[1])}${part(color[2])}${alpha}`;
}

/** Multiplica el brillo de un color (factor < 1 oscurece, > 1 aclara). */
export function shade(color: RGBA, factor: number): RGBA {
  const channel = (value: number): number => Math.max(0, Math.min(255, Math.round(value * factor)));
  return [channel(color[0]), channel(color[1]), channel(color[2]), color[3]];
}

/** Mezcla lineal entre dos colores (t = 0 → a, t = 1 → b). */
export function mix(a: RGBA, b: RGBA, t: number): RGBA {
  const lerp = (from: number, to: number): number => Math.round(from + (to - from) * t);
  return [lerp(a[0], b[0]), lerp(a[1], b[1]), lerp(a[2], b[2]), lerp(a[3], b[3])];
}

function offsetOf(buffer: PixelBuffer, x: number, y: number): number {
  return (y * buffer.width + x) * 4;
}

export function inBounds(buffer: PixelBuffer, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < buffer.width && y < buffer.height;
}

export function getPixel(buffer: PixelBuffer, x: number, y: number): RGBA {
  if (!inBounds(buffer, x, y)) return TRANSPARENT;
  const offset = offsetOf(buffer, x, y);
  const { data } = buffer;
  return [data[offset] ?? 0, data[offset + 1] ?? 0, data[offset + 2] ?? 0, data[offset + 3] ?? 0];
}

/** Pinta un píxel. Alfa 0 no hace nada; alfa parcial se mezcla con lo que haya debajo. */
export function setPixel(buffer: PixelBuffer, x: number, y: number, color: RGBA): void {
  if (!inBounds(buffer, x, y) || color[3] === 0) return;
  const offset = offsetOf(buffer, x, y);
  const { data } = buffer;
  if (color[3] === 255) {
    data[offset] = color[0];
    data[offset + 1] = color[1];
    data[offset + 2] = color[2];
    data[offset + 3] = 255;
    return;
  }
  const below = getPixel(buffer, x, y);
  const alpha = color[3] / 255;
  const outAlpha = alpha + (below[3] / 255) * (1 - alpha);
  const blend = (top: number, bottom: number): number =>
    outAlpha === 0 ? 0 : (top * alpha + bottom * (below[3] / 255) * (1 - alpha)) / outAlpha;
  data[offset] = blend(color[0], below[0]);
  data[offset + 1] = blend(color[1], below[1]);
  data[offset + 2] = blend(color[2], below[2]);
  data[offset + 3] = Math.round(outAlpha * 255);
}

export function isOpaque(buffer: PixelBuffer, x: number, y: number): boolean {
  return getPixel(buffer, x, y)[3] > 0;
}

export function fillRect(buffer: PixelBuffer, x: number, y: number, width: number, height: number, color: RGBA): void {
  const left = Math.max(0, Math.round(x));
  const top = Math.max(0, Math.round(y));
  const right = Math.min(buffer.width, Math.round(x + width));
  const bottom = Math.min(buffer.height, Math.round(y + height));
  for (let row = top; row < bottom; row += 1) {
    for (let column = left; column < right; column += 1) {
      setPixel(buffer, column, row, color);
    }
  }
}

/** Ruido determinista y barato por coordenada, en [0, 1). */
export function pixelNoise(x: number, y: number, seed: number): number {
  let hash = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 2246822519);
  hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
  hash ^= hash >>> 16;
  return (hash >>> 0) / 4294967296;
}

export function hLine(buffer: PixelBuffer, x: number, y: number, length: number, color: RGBA): void {
  fillRect(buffer, x, y, length, 1, color);
}

export function vLine(buffer: PixelBuffer, x: number, y: number, length: number, color: RGBA): void {
  fillRect(buffer, x, y, 1, length, color);
}

/** Elipse rellena, en coordenadas de píxel (centro + radios). */
export function fillEllipse(
  buffer: PixelBuffer,
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number,
  color: RGBA,
): void {
  for (let y = Math.floor(centerY - radiusY); y <= Math.ceil(centerY + radiusY); y += 1) {
    for (let x = Math.floor(centerX - radiusX); x <= Math.ceil(centerX + radiusX); x += 1) {
      const nx = (x + 0.5 - centerX) / radiusX;
      const ny = (y + 0.5 - centerY) / radiusY;
      if (nx * nx + ny * ny <= 1) setPixel(buffer, x, y, color);
    }
  }
}

export type Palette = Readonly<Record<string, RGBA>>;

/**
 * Convierte filas de texto en píxeles. `.` (y espacio) es transparente;
 * cualquier otro carácter debe existir en la paleta.
 */
export function fromRows(rows: readonly string[], palette: Palette): PixelBuffer {
  const height = rows.length;
  const width = rows[0]?.length ?? 0;
  if (height === 0 || width === 0) throw new Error('El dibujo está vacío');
  const buffer = createBuffer(width, height);
  rows.forEach((row, y) => {
    if (row.length !== width) {
      throw new Error(`Fila ${y} mide ${row.length} y debería medir ${width}: "${row}"`);
    }
    [...row].forEach((symbol, x) => {
      if (symbol === '.' || symbol === ' ') return;
      const color = palette[symbol];
      if (!color) throw new Error(`Símbolo "${symbol}" sin color en la paleta (fila ${y}, columna ${x})`);
      setPixel(buffer, x, y, color);
    });
  });
  return buffer;
}

/** Completa dibujos simétricos: cada fila es la mitad izquierda y se refleja a la derecha. */
export function mirrorRows(halfRows: readonly string[]): string[] {
  return halfRows.map((half) => half + [...half].reverse().join(''));
}

export function cloneBuffer(source: PixelBuffer): PixelBuffer {
  return { width: source.width, height: source.height, data: new Uint8ClampedArray(source.data) };
}

export function flipX(source: PixelBuffer): PixelBuffer {
  const result = createBuffer(source.width, source.height);
  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      setPixel(result, source.width - 1 - x, y, getPixel(source, x, y));
    }
  }
  return result;
}

/**
 * Copia `source` sobre `target` respetando la transparencia.
 * Camino rápido para píxeles opacos (copia directa de 4 bytes): se usa al hornear
 * miles de tiles al cargar, así que importa en móviles.
 */
export function blit(target: PixelBuffer, source: PixelBuffer, dx: number, dy: number): void {
  const src = source.data;
  const dst = target.data;
  const startY = Math.max(0, -dy);
  const endY = Math.min(source.height, target.height - dy);
  const startX = Math.max(0, -dx);
  const endX = Math.min(source.width, target.width - dx);
  for (let y = startY; y < endY; y += 1) {
    let s = (y * source.width + startX) * 4;
    let d = ((y + dy) * target.width + startX + dx) * 4;
    for (let x = startX; x < endX; x += 1, s += 4, d += 4) {
      const alpha = src[s + 3] ?? 0;
      if (alpha === 255) {
        dst[d] = src[s] ?? 0;
        dst[d + 1] = src[s + 1] ?? 0;
        dst[d + 2] = src[s + 2] ?? 0;
        dst[d + 3] = 255;
      } else if (alpha > 0) {
        setPixel(target, x + dx, y + dy, [src[s] ?? 0, src[s + 1] ?? 0, src[s + 2] ?? 0, alpha]);
      }
    }
  }
}

/** Sólido = alfa >= 128. Las sombras semitransparentes no cuentan como "cuerpo". */
function isSolid(buffer: PixelBuffer, x: number, y: number): boolean {
  return getPixel(buffer, x, y)[3] >= 128;
}

/**
 * Contorno de 1 px: pinta los huecos no sólidos que tocan (en cruz) un píxel sólido.
 * Da el borde oscuro y nítido típico de los sprites portátiles. Las sombras
 * semitransparentes no generan contorno, pero sí pueden quedar debajo de él.
 */
export function outline(source: PixelBuffer, color: RGBA): PixelBuffer {
  const result = cloneBuffer(source);
  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      if (isSolid(source, x, y)) continue;
      const touches =
        isSolid(source, x - 1, y) ||
        isSolid(source, x + 1, y) ||
        isSolid(source, x, y - 1) ||
        isSolid(source, x, y + 1);
      if (touches) {
        const offset = (y * source.width + x) * 4;
        result.data[offset] = color[0];
        result.data[offset + 1] = color[1];
        result.data[offset + 2] = color[2];
        result.data[offset + 3] = color[3];
      }
    }
  }
  return result;
}

/** Recolorea: cada color exacto de `from` pasa a su pareja en `to` (para paletas de NPC y estaciones). */
export function recolor(source: PixelBuffer, swaps: ReadonlyArray<readonly [RGBA, RGBA]>): PixelBuffer {
  const result = cloneBuffer(source);
  const { data } = result;
  for (let offset = 0; offset < data.length; offset += 4) {
    for (const [from, to] of swaps) {
      if (
        data[offset] === from[0] &&
        data[offset + 1] === from[1] &&
        data[offset + 2] === from[2] &&
        data[offset + 3] === from[3]
      ) {
        data[offset] = to[0];
        data[offset + 1] = to[1];
        data[offset + 2] = to[2];
        data[offset + 3] = to[3];
        break;
      }
    }
  }
  return result;
}

/** Recorta un rectángulo del buffer (útil para sacar frames de una hoja). */
export function crop(source: PixelBuffer, x: number, y: number, width: number, height: number): PixelBuffer {
  const result = createBuffer(width, height);
  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width; column += 1) {
      setPixel(result, column, row, getPixel(source, x + column, y + row));
    }
  }
  return result;
}

/** Cuenta píxeles opacos (los tests lo usan para comprobar que algo "se dibujó"). */
export function countOpaque(buffer: PixelBuffer): number {
  let total = 0;
  for (let offset = 3; offset < buffer.data.length; offset += 4) {
    if ((buffer.data[offset] ?? 0) > 0) total += 1;
  }
  return total;
}
