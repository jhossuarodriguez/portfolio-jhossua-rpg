import { PROP_SHAPES } from '@/game/art/props.ts';
import type { GroundKind } from '@/game/art/tiles.ts';
import type { Vec2 } from '@/game/core/types.ts';
import type { TownMap } from '@/game/world/town-map.ts';

const GROUND_COLORS: Readonly<Record<GroundKind, string>> = {
  grass: '#4f9a52',
  tallGrass: '#3a7a42',
  flowers: '#5aa85a',
  path: '#c8b89c',
  plaza: '#e0d8c8',
  sand: '#e8d29a',
  water: '#2f6fc8',
  shore: '#5a96dc',
  dock: '#9a6a40',
};

/** Píxeles por tile en el minimapa (luego CSS lo escala nítido). */
export const MINIMAP_SCALE = 2;

/** Pinta el pueblo visto desde arriba en un canvas pequeño. */
export function drawMinimap(canvas: HTMLCanvasElement, map: TownMap): void {
  canvas.width = map.width * MINIMAP_SCALE;
  canvas.height = map.height * MINIMAP_SCALE;
  const context = canvas.getContext('2d');
  if (!context) return;
  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      context.fillStyle = GROUND_COLORS[map.groundAt({ x, y })];
      context.fillRect(x * MINIMAP_SCALE, y * MINIMAP_SCALE, MINIMAP_SCALE, MINIMAP_SCALE);
    }
  }
  for (const prop of map.def.props) {
    const shape = PROP_SHAPES[prop.kind];
    context.fillStyle = prop.kind === 'tree' || prop.kind === 'bush' || prop.kind === 'palm' ? '#24563a' : '#8a7a66';
    context.fillRect(
      prop.x * MINIMAP_SCALE,
      prop.y * MINIMAP_SCALE,
      shape.width * MINIMAP_SCALE,
      shape.height * MINIMAP_SCALE,
    );
  }
  for (const building of map.def.buildings) {
    context.fillStyle = building.style.roof;
    context.fillRect(
      building.x * MINIMAP_SCALE,
      building.y * MINIMAP_SCALE,
      building.style.width * MINIMAP_SCALE,
      building.style.height * MINIMAP_SCALE,
    );
  }
}

/** Posición del marcador del jugador, en porcentaje del mapa. */
export function markerPosition(tile: Vec2, map: TownMap): { left: string; top: string } {
  return {
    left: `${((tile.x + 0.5) / map.width) * 100}%`,
    top: `${((tile.y + 0.5) / map.height) * 100}%`,
  };
}
