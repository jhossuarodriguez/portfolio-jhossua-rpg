import { DIRECTIONS, manhattan, sameTile, step, tileKey, type Vec2 } from '@/game/core/types.ts';

export type Passable = (tile: Vec2) => boolean;

interface Node {
  readonly tile: Vec2;
  readonly g: number;
  readonly f: number;
}

/**
 * A* en grilla de 4 direcciones. Devuelve los tiles a pisar (sin el de partida)
 * o `null` si no hay camino. `goal` debe ser pisable (se valida con `passable`).
 * `maxNodes` evita que una consulta imposible congele el juego.
 */
export function findPath(start: Vec2, goal: Vec2, passable: Passable, maxNodes = 5000): Vec2[] | null {
  if (sameTile(start, goal)) return [];
  if (!passable(goal)) return null;

  const open: Node[] = [{ tile: start, g: 0, f: manhattan(start, goal) }];
  const cameFrom = new Map<string, Vec2>();
  const bestCost = new Map<string, number>([[tileKey(start), 0]]);
  let explored = 0;

  while (open.length > 0) {
    // Lista abierta pequeña: buscar el mínimo lineal es más simple que un heap y alcanza.
    let bestIndex = 0;
    for (let index = 1; index < open.length; index += 1) {
      const candidate = open[index];
      const best = open[bestIndex];
      if (candidate && best && (candidate.f < best.f || (candidate.f === best.f && candidate.g > best.g))) {
        bestIndex = index;
      }
    }
    const [current] = open.splice(bestIndex, 1);
    if (!current) break;
    if (sameTile(current.tile, goal)) return reconstruct(cameFrom, goal, start);
    explored += 1;
    if (explored > maxNodes) return null;

    for (const direction of DIRECTIONS) {
      const next = step(current.tile, direction);
      if (!passable(next)) continue;
      const key = tileKey(next);
      const cost = current.g + 1;
      if (cost >= (bestCost.get(key) ?? Number.POSITIVE_INFINITY)) continue;
      bestCost.set(key, cost);
      cameFrom.set(key, current.tile);
      open.push({ tile: next, g: cost, f: cost + manhattan(next, goal) });
    }
  }
  return null;
}

function reconstruct(cameFrom: ReadonlyMap<string, Vec2>, goal: Vec2, start: Vec2): Vec2[] {
  const path: Vec2[] = [goal];
  let cursor = goal;
  while (!sameTile(cursor, start)) {
    const previous = cameFrom.get(tileKey(cursor));
    if (!previous) break;
    if (!sameTile(previous, start)) path.push(previous);
    cursor = previous;
  }
  return path.reverse();
}
