import { describe, expect, it } from 'vitest';
import { PROJECTS } from '../../src/data/projects.ts';
import { findPath } from '../../src/game/core/pathfinding.ts';
import { sameTile, type Vec2 } from '../../src/game/core/types.ts';
import { PRIMADA } from '../../src/game/world/primada.ts';
import { doorFrontTile, doorTile, TownMap } from '../../src/game/world/town-map.ts';
import type { TownDef } from '../../src/game/world/types.ts';

function gridFromAscii(rows: readonly string[]): (tile: Vec2) => boolean {
  return (tile) => rows[tile.y]?.[tile.x] === '.';
}

describe('findPath (A*)', () => {
  it('va en línea recta cuando no hay obstáculos', () => {
    const passable = gridFromAscii(['.....']);
    expect(findPath({ x: 0, y: 0 }, { x: 4, y: 0 }, passable)).toEqual([
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
      { x: 4, y: 0 },
    ]);
  });

  it('rodea los obstáculos por el camino más corto', () => {
    const passable = gridFromAscii(['.#...', '.#.#.', '...#.']);
    const path = findPath({ x: 0, y: 0 }, { x: 4, y: 0 }, passable);
    expect(path).not.toBeNull();
    // (0,1) (0,2) (1,2) (2,2) (2,1) (2,0) (3,0) (4,0)
    expect(path).toHaveLength(8);
    expect(path?.at(-1)).toEqual({ x: 4, y: 0 });
    for (const tile of path ?? []) expect(passable(tile)).toBe(true);
  });

  it('devuelve null si no hay camino o el destino está bloqueado', () => {
    expect(findPath({ x: 0, y: 0 }, { x: 2, y: 0 }, gridFromAscii(['.#.']))).toBeNull();
    expect(findPath({ x: 0, y: 0 }, { x: 1, y: 0 }, gridFromAscii(['.#.']))).toBeNull();
  });

  it('llegar adonde ya estás es un camino vacío', () => {
    expect(findPath({ x: 1, y: 1 }, { x: 1, y: 1 }, () => false)).toEqual([]);
  });

  it('se rinde en mapas enormes sin solución en vez de colgarse', () => {
    const passable = (tile: Vec2): boolean => tile.x >= 0 && tile.y >= 0 && !(tile.x === 50 && tile.y === 50);
    expect(findPath({ x: 0, y: 0 }, { x: 999, y: 999 }, passable, 300)).toBeNull();
  });
});

describe('TownMap', () => {
  const tiny: TownDef = {
    id: 'tiny',
    name: 'Tiny',
    width: 8,
    height: 6,
    base: 'grass',
    ground: [{ kind: 'water', x: 0, y: 5, width: 8, height: 1 }],
    buildings: [],
    props: [{ kind: 'sign', x: 2, y: 2, text: ['Hola'] }],
    npcs: [],
    zones: [
      { id: 'a', name: 'Zona A', x: 0, y: 0, width: 8, height: 6 },
      { id: 'b', name: 'Zona B', x: 4, y: 0, width: 4, height: 6 },
    ],
    spawn: { x: 1, y: 1 },
    spawnFacing: 'down',
  };

  it('el agua y los objetos bloquean; el césped no', () => {
    const map = new TownMap(tiny);
    expect(map.isWalkable({ x: 1, y: 1 })).toBe(true);
    expect(map.isWalkable({ x: 2, y: 2 })).toBe(false);
    expect(map.isWalkable({ x: 3, y: 5 })).toBe(false);
    expect(map.isWalkable({ x: -1, y: 0 })).toBe(false);
    expect(map.groundAt({ x: 99, y: 99 })).toBe('grass');
  });

  it('los carteles son interactivos', () => {
    const map = new TownMap(tiny);
    expect(map.interactableAt({ x: 2, y: 2 })?.type).toBe('prop');
    expect(map.interactableAt({ x: 3, y: 2 })).toBeNull();
  });

  it('gana la zona declarada al final', () => {
    const map = new TownMap(tiny);
    expect(map.zoneAt({ x: 1, y: 1 })?.name).toBe('Zona A');
    expect(map.zoneAt({ x: 5, y: 1 })?.name).toBe('Zona B');
  });

  it('detecta objetos superpuestos, fuera del mapa y NPC atrapados', () => {
    expect(() => new TownMap({ ...tiny, props: [...tiny.props, { kind: 'bush', x: 2, y: 2 }] })).toThrow(
      'se superpone',
    );
    expect(() => new TownMap({ ...tiny, props: [{ kind: 'tree', x: 7, y: 0 }] })).toThrow('se sale del mapa');
    expect(
      () =>
        new TownMap({
          ...tiny,
          npcs: [{ id: 'x', name: 'X', look: 'dev', x: 2, y: 2, facing: 'down', wander: 0, lines: [] }],
        }),
    ).toThrow('bloqueado');
    expect(() => new TownMap({ ...tiny, spawn: { x: 0, y: 5 } })).toThrow('inicio');
  });

  it('dibuja el mapa en texto', () => {
    const ascii = new TownMap(tiny).toAscii().split('\n');
    expect(ascii).toHaveLength(6);
    expect(ascii[2]?.[2]).toBe('?');
    expect(ascii[5]).toBe('~~~~~~~~');
  });
});

describe('Ciudad Primada', () => {
  const map = new TownMap(PRIMADA);

  it('cada proyecto tiene exactamente un edificio', () => {
    for (const project of PROJECTS) {
      const buildings = PRIMADA.buildings.filter((building) => building.projectId === project.id);
      expect(buildings, project.id).toHaveLength(1);
    }
  });

  it('todas las puertas son alcanzables desde el inicio', () => {
    for (const building of PRIMADA.buildings) {
      const front = doorFrontTile(building);
      expect(map.isWalkable(front), `frente de ${building.id}`).toBe(true);
      const path = findPath(PRIMADA.spawn, front, (tile) => map.isWalkable(tile));
      expect(path, `camino a ${building.id}`).not.toBeNull();
      expect(map.interactableAt(doorTile(building))?.type).toBe('door');
    }
  });

  it('la puerta está en la fila de abajo y al centro', () => {
    const home = map.building('home');
    expect(home).toBeDefined();
    if (!home) return;
    expect(doorTile(home)).toEqual({ x: home.x + 2, y: home.y + home.style.height - 1 });
    expect(sameTile(doorFrontTile(home), PRIMADA.spawn)).toBe(true);
  });

  it('cada proyecto tiene un cartel que lleva a él', () => {
    for (const project of PROJECTS) {
      const sign = PRIMADA.props.find(
        (prop) => prop.kind === 'sign' && prop.action?.type === 'openProject' && prop.action.projectId === project.id,
      );
      expect(sign, project.id).toBeDefined();
    }
  });

  it('todo el pueblo tiene zona y los NPC tienen diálogo', () => {
    for (let y = 0; y < map.height; y += 1) {
      for (let x = 0; x < map.width; x += 1) expect(map.zoneAt({ x, y })).not.toBeNull();
    }
    for (const npc of PRIMADA.npcs) expect(npc.lines.length).toBeGreaterThan(0);
    expect(map.buildingForProject('mimes')?.id).toBe('mimes');
  });
});
