import { describe, expect, it } from 'vitest';
import {
  advanceMove,
  animationFrame,
  BUMP_STEPS,
  createActor,
  occupiedTiles,
  pixelPosition,
  RUN_SPEED,
  startMove,
  WALK_SPEED,
} from '@/game/core/actor.ts';
import { cameraFor, depthFor } from '@/game/core/camera.ts';
import { buttonForKey, InputState } from '@/game/core/input.ts';
import { computeLayout, pickScale } from '@/game/core/layout.ts';
import { createRng, hashString } from '@/game/core/rng.ts';
import { seasonForDate, seasonForMonth, TIME_TINTS, timeOfDay } from '@/game/core/season.ts';
import {
  assertNever,
  clamp,
  DIRECTIONS,
  directionBetween,
  manhattan,
  OPPOSITE,
  SCREEN_HEIGHT,
  SCREEN_WIDTH,
  step,
  TILE,
  tileKey,
} from '@/game/core/types.ts';

describe('utilidades de grilla', () => {
  it('step, directionBetween y OPPOSITE son coherentes', () => {
    for (const direction of DIRECTIONS) {
      const next = step({ x: 5, y: 5 }, direction);
      expect(manhattan({ x: 5, y: 5 }, next)).toBe(1);
      expect(directionBetween({ x: 5, y: 5 }, next)).toBe(direction);
      expect(directionBetween(next, { x: 5, y: 5 })).toBe(OPPOSITE[direction]);
    }
    expect(directionBetween({ x: 0, y: 0 }, { x: 1, y: 1 })).toBeNull();
  });

  it('tileKey, clamp y assertNever', () => {
    expect(tileKey({ x: 3, y: 9 })).toBe('3,9');
    expect(clamp(12, 0, 10)).toBe(10);
    expect(clamp(-2, 0, 10)).toBe(0);
    expect(() => assertNever('x' as never)).toThrow('Valor inesperado: x');
  });
});

describe('rng', () => {
  it('misma semilla, misma secuencia', () => {
    const a = createRng(42);
    const b = createRng(42);
    expect(Array.from({ length: 10 }, () => a.next())).toEqual(Array.from({ length: 10 }, () => b.next()));
  });

  it('int respeta el rango y pick elige de la lista', () => {
    const rng = createRng(1);
    for (let index = 0; index < 500; index += 1) {
      const value = rng.int(2, 5);
      expect(value).toBeGreaterThanOrEqual(2);
      expect(value).toBeLessThanOrEqual(5);
    }
    expect(['a', 'b']).toContain(rng.pick(['a', 'b']));
    expect(() => rng.pick([])).toThrow();
    expect(typeof rng.chance(0.5)).toBe('boolean');
  });

  it('hashString es estable', () => {
    expect(hashString('primada')).toBe(hashString('primada'));
    expect(hashString('primada')).not.toBe(hashString('primado'));
  });
});

describe('InputState', () => {
  it('manda la última dirección apretada y vuelve a la anterior al soltarla', () => {
    const input = new InputState();
    input.setButton('up', true);
    input.setButton('left', true);
    expect(input.direction()).toBe('left');
    input.setButton('left', false);
    expect(input.direction()).toBe('up');
    input.setButton('up', false);
    input.endStep();
    expect(input.direction()).toBeNull();
  });

  it('un toque más corto que un paso cuenta para ese paso y luego caduca', () => {
    const input = new InputState();
    input.setButton('right', true);
    input.setButton('right', false);
    expect(input.direction()).toBe('right');
    input.endStep();
    expect(input.direction()).toBeNull();
  });

  it('una pulsación se consume una sola vez y caduca al final del paso', () => {
    const input = new InputState();
    input.setButton('a', true);
    expect(input.consumePress('a')).toBe(true);
    expect(input.consumePress('a')).toBe(false);
    input.setButton('a', false);
    input.setButton('a', true);
    input.endStep();
    expect(input.consumePress('a')).toBe(false);
  });

  it('varias fuentes pueden mantener el mismo botón', () => {
    const input = new InputState();
    input.setButton('b', true, 'teclado');
    input.setButton('b', true, 'dedo');
    input.setButton('b', false, 'teclado');
    expect(input.isHeld('b')).toBe(true);
    input.setButton('b', false, 'dedo');
    expect(input.isHeld('b')).toBe(false);
  });

  it('releaseAll suelta todo', () => {
    const input = new InputState();
    input.setButton('right', true);
    input.setButton('a', true);
    input.releaseAll();
    expect(input.direction()).toBeNull();
    expect(input.isHeld('a')).toBe(false);
    expect(input.consumePress('a')).toBe(false);
  });

  it('mapea el teclado', () => {
    expect(buttonForKey('ArrowUp')).toBe('up');
    expect(buttonForKey('KeyD')).toBe('right');
    expect(buttonForKey('Enter')).toBe('a');
    expect(buttonForKey('ShiftLeft')).toBe('b');
    expect(buttonForKey('KeyP')).toBe('start');
    expect(buttonForKey('KeyQ')).toBeNull();
  });
});

describe('actores', () => {
  it('caminar un tile toma 16 pasos; correr, 8', () => {
    for (const [speed, steps] of [
      [WALK_SPEED, 16],
      [RUN_SPEED, 8],
    ] as const) {
      const actor = createActor('a', { x: 2, y: 2 });
      startMove(actor, 'right', speed);
      let taken = 0;
      while (actor.move) {
        advanceMove(actor);
        taken += 1;
      }
      expect(taken).toBe(steps);
      expect(actor.tile).toEqual({ x: 3, y: 2 });
      expect(actor.facing).toBe('right');
    }
  });

  it('devuelve el sobrante al llegar y alterna el pie', () => {
    const actor = createActor('a', { x: 0, y: 0 });
    startMove(actor, 'down', 3);
    let leftover: number | null = null;
    while (leftover === null) leftover = advanceMove(actor);
    expect(leftover).toBe(2);
    expect(actor.stepParity).toBe(true);
  });

  it('interpola la posición en píxeles', () => {
    const actor = createActor('a', { x: 1, y: 1 });
    expect(pixelPosition(actor)).toEqual({ x: TILE, y: TILE });
    startMove(actor, 'right', 4);
    advanceMove(actor);
    advanceMove(actor);
    expect(pixelPosition(actor)).toEqual({ x: TILE + 8, y: TILE });
    expect(occupiedTiles(actor)).toEqual([
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ]);
  });

  it('anima paso → quieto y caminar contra la pared', () => {
    const actor = createActor('a', { x: 0, y: 0 });
    expect(animationFrame(actor)).toBe(0);
    startMove(actor, 'down', 1);
    advanceMove(actor);
    expect(animationFrame(actor)).toBe(1);
    while (actor.move) advanceMove(actor);
    expect(animationFrame(actor)).toBe(0);
    actor.bumpTimer = BUMP_STEPS;
    expect(animationFrame(actor)).toBe(2);
    actor.bumpTimer = 2;
    expect(animationFrame(actor)).toBe(0);
  });
});

describe('cámara', () => {
  it('centra al personaje lejos de los bordes', () => {
    const camera = cameraFor({ x: 400, y: 300 }, 48, 40);
    expect(camera).toEqual({ x: 400 + 8 - SCREEN_WIDTH / 2, y: 300 + 8 - SCREEN_HEIGHT / 2 });
  });

  it('no muestra nada fuera del mapa', () => {
    expect(cameraFor({ x: 0, y: 0 }, 48, 40)).toEqual({ x: 0, y: 0 });
    expect(cameraFor({ x: 9999, y: 9999 }, 48, 40)).toEqual({
      x: 48 * TILE - SCREEN_WIDTH,
      y: 40 * TILE - SCREEN_HEIGHT,
    });
  });

  it('con zoom alejado sigue sin salirse del mapa', () => {
    const zoom = 0.75;
    const camera = cameraFor({ x: 0, y: 0 }, 48, 40, zoom);
    const left = camera.x + SCREEN_WIDTH / 2 - SCREEN_WIDTH / zoom / 2;
    expect(left).toBeGreaterThanOrEqual(-0.5);
  });

  it('centra mapas más pequeños que la pantalla', () => {
    const camera = cameraFor({ x: 0, y: 0 }, 4, 4);
    expect(camera.x).toBe(Math.round((4 * TILE) / 2 - SCREEN_WIDTH / 2));
  });

  it('la profundidad crece hacia abajo y está entre 0 y 1', () => {
    const top = depthFor(0, 0, 40);
    const bottom = depthFor(40 * TILE, 0, 40);
    expect(bottom).toBeGreaterThan(top);
    expect(top).toBeGreaterThan(0);
    expect(bottom).toBeLessThan(1);
  });
});

describe('estaciones y hora', () => {
  it('rotan cada mes como en la consola', () => {
    expect(seasonForMonth(0)).toBe('spring');
    expect(seasonForMonth(1)).toBe('summer');
    expect(seasonForMonth(2)).toBe('autumn');
    expect(seasonForMonth(3)).toBe('winter');
    expect(seasonForMonth(9)).toBe('summer');
    expect(seasonForDate(new Date(2026, 9, 13))).toBe('summer');
    expect(() => seasonForMonth(12)).toThrow(RangeError);
  });

  it('divide el día en cuatro momentos', () => {
    expect(timeOfDay(6)).toBe('morning');
    expect(timeOfDay(12)).toBe('day');
    expect(timeOfDay(18)).toBe('evening');
    expect(timeOfDay(23)).toBe('night');
    expect(timeOfDay(3)).toBe('night');
    expect(TIME_TINTS.day.opacity).toBe(0);
    expect(TIME_TINTS.night.opacity).toBeGreaterThan(TIME_TINTS.evening.opacity);
  });
});

describe('layout', () => {
  it('escala entera cuando cabe ≥ 2; fraccionaria si no', () => {
    expect(pickScale(3.7)).toBe(3);
    expect(pickScale(1.456)).toBe(1.45);
    expect(pickScale(0.1)).toBe(0.5);
  });

  it('un móvil en vertical apila las pantallas con los controles debajo', () => {
    const layout = computeLayout({ viewportWidth: 390, viewportHeight: 844 });
    expect(layout.mode).toBe('stacked');
    expect(layout.screenWidth).toBeLessThanOrEqual(390);
    expect(layout.screenHeight).toBe(Math.round(layout.screenWidth * 0.75));
  });

  it('un escritorio usa la consola abierta o pantallas lado a lado, a escala entera', () => {
    const layout = computeLayout({ viewportWidth: 1440, viewportHeight: 900 });
    expect(['ds', 'side']).toContain(layout.mode);
    expect(Number.isInteger(layout.scale)).toBe(true);
    expect(layout.scale).toBeGreaterThanOrEqual(2);
  });

  it('una pantalla ancha y baja pone las pantallas lado a lado', () => {
    expect(computeLayout({ viewportWidth: 1920, viewportHeight: 700 }).mode).toBe('side');
  });
});
