import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import type { PixelBuffer } from '@/game/art/pixel.ts';

/** Codificador PNG mínimo (RGBA, sin dependencias) para exportar arte del juego. */

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const byte of bytes) c = (CRC_TABLE[(c ^ byte) & 0xff] ?? 0) ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), Buffer.from(data)]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

/** Escribe el buffer escalado `scale` veces con vecino más cercano (pixel art nítido). */
export function writePng(path: string, image: PixelBuffer, scale = 1): void {
  const width = image.width * scale;
  const height = image.height * scale;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * (width * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < width; x += 1) {
      const source = (Math.floor(y / scale) * image.width + Math.floor(x / scale)) * 4;
      const target = row + 1 + x * 4;
      for (let channel = 0; channel < 4; channel += 1) raw[target + channel] = image.data[source + channel] ?? 0;
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bits por canal
  header[9] = 6; // RGBA
  writeFileSync(
    path,
    Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk('IHDR', header),
      chunk('IDAT', deflateSync(raw)),
      chunk('IEND', new Uint8Array()),
    ]),
  );
}
