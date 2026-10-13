/** Tamaño de un tile en píxeles de "consola" (no píxeles CSS). */
export const TILE = 16;

/** Resolución lógica de cada pantalla, igual que una consola portátil de doble pantalla. */
export const SCREEN_WIDTH = 256;
export const SCREEN_HEIGHT = 192;

/** Pasos de simulación por segundo. La lógica corre a paso fijo; el render, a lo que dé el navegador. */
export const SIM_HZ = 60;
export const SIM_STEP_MS = 1000 / SIM_HZ;

export type Direction = 'up' | 'down' | 'left' | 'right';

export const DIRECTIONS: readonly Direction[] = ['down', 'up', 'left', 'right'];

export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

export const DIRECTION_VECTORS: Readonly<Record<Direction, Vec2>> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export const OPPOSITE: Readonly<Record<Direction, Direction>> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};

export function step(from: Vec2, direction: Direction): Vec2 {
  const delta = DIRECTION_VECTORS[direction];
  return { x: from.x + delta.x, y: from.y + delta.y };
}

export function sameTile(a: Vec2, b: Vec2): boolean {
  return a.x === b.x && a.y === b.y;
}

export function manhattan(a: Vec2, b: Vec2): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/** Dirección para ir de `from` a un tile vecino `to`; `null` si no son vecinos ortogonales. */
export function directionBetween(from: Vec2, to: Vec2): Direction | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dx === 0 && dy === -1) return 'up';
  if (dx === 0 && dy === 1) return 'down';
  if (dx === -1 && dy === 0) return 'left';
  if (dx === 1 && dy === 0) return 'right';
  return null;
}

export function tileKey(tile: Vec2): string {
  return `${tile.x},${tile.y}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Error para estados que el sistema de tipos no puede descartar pero que nunca deberían ocurrir. */
export function assertNever(value: never, message = 'Valor inesperado'): never {
  throw new Error(`${message}: ${String(value)}`);
}
