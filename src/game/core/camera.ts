import { clamp, SCREEN_HEIGHT, SCREEN_WIDTH, TILE, type Vec2 } from './types.ts';

function clampCenter(center: number, view: number, world: number): number {
  if (world <= view) return world / 2;
  return clamp(center, view / 2, world - view / 2);
}

/**
 * Posición de la cámara (esquina superior izquierda de la vista a zoom 1, en píxeles del mundo)
 * para seguir a alguien centrado sin mostrar nada fuera del mapa, también con zoom.
 * Siempre en píxeles enteros: así el pixel art no "tiembla".
 */
export function cameraFor(target: Vec2, mapWidthTiles: number, mapHeightTiles: number, zoom = 1): Vec2 {
  const viewWidth = SCREEN_WIDTH / zoom;
  const viewHeight = SCREEN_HEIGHT / zoom;
  const centerX = clampCenter(target.x + TILE / 2, viewWidth, mapWidthTiles * TILE);
  const centerY = clampCenter(target.y + TILE / 2, viewHeight, mapHeightTiles * TILE);
  return { x: Math.round(centerX - SCREEN_WIDTH / 2), y: Math.round(centerY - SCREEN_HEIGHT / 2) };
}

/** Profundidad (z) para ordenar sprites: más abajo en el mapa = más cerca de la cámara. */
export function depthFor(baseY: number, x: number, mapHeightTiles: number): number {
  const world = mapHeightTiles * TILE;
  return 0.05 + (baseY / (world + TILE * 2)) * 0.9 + x * 1e-7;
}
