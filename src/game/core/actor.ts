import { type Direction, step, TILE, type Vec2 } from './types.ts';

/** Píxeles por paso de simulación (60 Hz): caminar = 1 tile cada 16 pasos; correr, el doble. */
export const WALK_SPEED = 1;
export const RUN_SPEED = 2;
/** Pasos que dura un giro en el sitio antes de empezar a caminar. */
export const TURN_STEPS = 6;
/** Pasos de "caminar contra la pared". */
export const BUMP_STEPS = 16;

export interface ActorMove {
  readonly from: Vec2;
  readonly to: Vec2;
  /** Píxeles recorridos, de 0 a TILE. */
  progress: number;
  speed: number;
}

/** Algo que camina por la grilla: el jugador o un NPC. Estado mutable a propósito (es el estado del juego). */
export interface Actor {
  readonly id: string;
  tile: Vec2;
  facing: Direction;
  move: ActorMove | null;
  /** Alterna el pie que avanza en cada tile. */
  stepParity: boolean;
  turnTimer: number;
  bumpTimer: number;
}

export function createActor(id: string, tile: Vec2, facing: Direction = 'down'): Actor {
  return { id, tile, facing, move: null, stepParity: false, turnTimer: 0, bumpTimer: 0 };
}

export function isMoving(actor: Actor): boolean {
  return actor.move !== null;
}

/** Empieza a caminar hacia el tile vecino. Quien llama ya comprobó que se puede pisar. */
export function startMove(actor: Actor, direction: Direction, speed: number): void {
  actor.facing = direction;
  actor.bumpTimer = 0;
  actor.move = { from: actor.tile, to: step(actor.tile, direction), progress: 0, speed };
}

/**
 * Avanza un paso de simulación. Devuelve los píxeles sobrantes si llegó al tile
 * (para encadenar el siguiente paso sin tirones) o `null` si sigue a medio camino.
 */
export function advanceMove(actor: Actor): number | null {
  const move = actor.move;
  if (!move) return null;
  move.progress += move.speed;
  if (move.progress < TILE) return null;
  const leftover = move.progress - TILE;
  actor.tile = move.to;
  actor.move = null;
  actor.stepParity = !actor.stepParity;
  return leftover;
}

/** Posición en píxeles (esquina superior izquierda del tile, interpolada al moverse). */
export function pixelPosition(actor: Actor): Vec2 {
  const move = actor.move;
  if (!move) return { x: actor.tile.x * TILE, y: actor.tile.y * TILE };
  const t = Math.min(1, move.progress / TILE);
  return {
    x: Math.round((move.from.x + (move.to.x - move.from.x) * t) * TILE),
    y: Math.round((move.from.y + (move.to.y - move.from.y) * t) * TILE),
  };
}

/** Frame de la hoja: 0 quieto, 1/2 pasos. Patrón paso → quieto → otro paso → quieto. */
export function animationFrame(actor: Actor): 0 | 1 | 2 {
  const stepFrame: 1 | 2 = actor.stepParity ? 2 : 1;
  if (actor.move) return actor.move.progress < TILE / 2 ? stepFrame : 0;
  if (actor.bumpTimer > 0) return actor.bumpTimer > BUMP_STEPS / 2 ? stepFrame : 0;
  return 0;
}

/** Tiles que el actor ocupa ahora (origen y destino mientras camina). */
export function occupiedTiles(actor: Actor): Vec2[] {
  return actor.move ? [actor.move.from, actor.move.to] : [actor.tile];
}
