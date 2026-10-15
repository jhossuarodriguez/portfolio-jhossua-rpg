import { PROP_SHAPES } from '@/game/art/props.ts';
import { type GroundKind, isGroundWalkable } from '@/game/art/tiles.ts';
import { tileKey, type Vec2 } from '@/game/core/types.ts';
import type { BuildingDef, PropDef, Rect, TownDef, ZoneDef } from '@/game/world/types.ts';

/** Lo que hay "para hacer" en un tile al pulsar A delante de él. */
export type Interactable =
  | { readonly type: 'door'; readonly building: BuildingDef }
  | { readonly type: 'prop'; readonly prop: PropDef };

export function buildingRect(building: BuildingDef): Rect {
  return { x: building.x, y: building.y, width: building.style.width, height: building.style.height };
}

export function propRect(prop: PropDef): Rect {
  const shape = PROP_SHAPES[prop.kind];
  return { x: prop.x, y: prop.y, width: shape.width, height: shape.height };
}

/** La puerta está en la fila de abajo, en el tile central. */
export function doorTile(building: BuildingDef): Vec2 {
  return { x: building.x + Math.floor(building.style.width / 2), y: building.y + building.style.height - 1 };
}

/** Tile delante de la puerta: donde hay que pararse (mirando arriba) para entrar. */
export function doorFrontTile(building: BuildingDef): Vec2 {
  const door = doorTile(building);
  return { x: door.x, y: door.y + 1 };
}

function* tilesOf(rect: Rect): Generator<Vec2> {
  for (let y = rect.y; y < rect.y + rect.height; y += 1) {
    for (let x = rect.x; x < rect.x + rect.width; x += 1) yield { x, y };
  }
}

/** El pueblo ya "construido": suelo, colisiones e interactivos listos para consultar. */
export class TownMap {
  readonly def: TownDef;
  readonly width: number;
  readonly height: number;
  readonly #ground: GroundKind[];
  readonly #solid: Uint8Array;
  readonly #interactables = new Map<string, Interactable>();
  readonly #owners = new Map<string, string>();

  constructor(def: TownDef) {
    this.def = def;
    this.width = def.width;
    this.height = def.height;
    this.#ground = Array.from({ length: def.width * def.height }, () => def.base);
    this.#solid = new Uint8Array(def.width * def.height);

    for (const paint of def.ground) {
      for (const tile of tilesOf(paint)) {
        if (this.inBounds(tile)) this.#ground[this.#index(tile)] = paint.kind;
      }
    }
    for (const building of def.buildings) {
      this.#claim(buildingRect(building), `edificio "${building.id}"`);
      this.#interactables.set(tileKey(doorTile(building)), { type: 'door', building });
    }
    for (const prop of def.props) {
      this.#claim(propRect(prop), `objeto ${prop.kind} en ${prop.x},${prop.y}`);
      if (prop.text) {
        for (const tile of tilesOf(propRect(prop))) {
          this.#interactables.set(tileKey(tile), { type: 'prop', prop });
        }
      }
    }
    for (const npc of def.npcs) {
      if (!this.isWalkable(npc)) throw new Error(`El NPC "${npc.id}" empieza en un tile bloqueado (${npc.x},${npc.y})`);
    }
    if (!this.isWalkable(def.spawn)) throw new Error('El punto de inicio está bloqueado');
  }

  #index(tile: Vec2): number {
    return tile.y * this.width + tile.x;
  }

  #claim(rect: Rect, owner: string): void {
    for (const tile of tilesOf(rect)) {
      if (!this.inBounds(tile)) throw new Error(`${owner} se sale del mapa en ${tile.x},${tile.y}`);
      const key = tileKey(tile);
      const previous = this.#owners.get(key);
      if (previous) throw new Error(`${owner} se superpone con ${previous} en ${key}`);
      this.#owners.set(key, owner);
      this.#solid[this.#index(tile)] = 1;
    }
  }

  inBounds(tile: Vec2): boolean {
    return tile.x >= 0 && tile.y >= 0 && tile.x < this.width && tile.y < this.height;
  }

  groundAt(tile: Vec2): GroundKind {
    if (!this.inBounds(tile)) return this.def.base;
    return this.#ground[this.#index(tile)] ?? this.def.base;
  }

  /** Bloqueado por edificios u objetos (no cuenta personajes). */
  isSolid(tile: Vec2): boolean {
    if (!this.inBounds(tile)) return true;
    return this.#solid[this.#index(tile)] === 1 || !isGroundWalkable(this.groundAt(tile));
  }

  isWalkable(tile: Vec2): boolean {
    return this.inBounds(tile) && !this.isSolid(tile);
  }

  interactableAt(tile: Vec2): Interactable | null {
    return this.#interactables.get(tileKey(tile)) ?? null;
  }

  building(id: string): BuildingDef | undefined {
    return this.def.buildings.find((building) => building.id === id);
  }

  buildingForProject(projectId: string): BuildingDef | undefined {
    return this.def.buildings.find((building) => building.projectId === projectId);
  }

  /** Zona del tile. Si varias coinciden, gana la última declarada (la más específica). */
  zoneAt(tile: Vec2): ZoneDef | null {
    let found: ZoneDef | null = null;
    for (const zone of this.def.zones) {
      if (tile.x >= zone.x && tile.y >= zone.y && tile.x < zone.x + zone.width && tile.y < zone.y + zone.height) {
        found = zone;
      }
    }
    return found;
  }

  /** Mapa en texto (para depurar y para tests legibles). */
  toAscii(): string {
    const symbols: Readonly<Record<GroundKind, string>> = {
      grass: '.',
      tallGrass: '"',
      flowers: '*',
      path: '=',
      plaza: '+',
      sand: ':',
      water: '~',
      shore: '-',
      dock: 'H',
    };
    const rows: string[] = [];
    for (let y = 0; y < this.height; y += 1) {
      let row = '';
      for (let x = 0; x < this.width; x += 1) {
        const tile = { x, y };
        const interactable = this.interactableAt(tile);
        if (interactable?.type === 'door') row += 'D';
        else if (interactable?.type === 'prop') row += '?';
        else if (this.#solid[this.#index(tile)] === 1) row += '#';
        else row += symbols[this.groundAt(tile)];
      }
      rows.push(row);
    }
    return rows.join('\n');
  }
}
