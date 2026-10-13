import type { BuildingStyle } from '../art/buildings.ts';
import type { NpcLookId } from '../art/characters.ts';
import type { PropKind } from '../art/props.ts';
import type { GroundKind } from '../art/tiles.ts';
import type { Direction, Vec2 } from '../core/types.ts';

/** Vistas de la pantalla táctil a las que el mundo puede mandar al jugador. */
export type TouchView = 'home' | 'projects' | 'about' | 'skills' | 'contact' | 'map' | 'options';

/** Lo que pasa cuando el jugador dice "Sí" (o habla con alguien que lleva a algún sitio). */
export type GameAction =
  | { readonly type: 'openProject'; readonly projectId: string }
  | { readonly type: 'openView'; readonly view: TouchView };

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export type BuildingKind = 'project' | 'home' | 'post' | 'academy';

export interface BuildingDef {
  readonly id: string;
  readonly kind: BuildingKind;
  /** Para edificios de proyecto: el `id` del proyecto en `src/data/projects.ts`. */
  readonly projectId?: string;
  readonly name: string;
  /** Esquina superior izquierda de la huella, en tiles. */
  readonly x: number;
  readonly y: number;
  readonly style: BuildingStyle;
  /** Texto al tocar la puerta. */
  readonly doorLines: readonly string[];
  /** Pregunta al final del texto de la puerta, y qué pasa si dice que sí. */
  readonly doorQuestion?: string;
  readonly action?: GameAction;
}

export interface PropDef {
  readonly kind: PropKind;
  readonly x: number;
  readonly y: number;
  /** Para carteles y buzones: lo que se lee al pulsar A. */
  readonly text?: readonly string[];
  readonly action?: GameAction;
  readonly question?: string;
}

export interface NpcDef {
  readonly id: string;
  readonly name: string;
  readonly look: NpcLookId;
  readonly x: number;
  readonly y: number;
  readonly facing: Direction;
  /** Radio (en tiles) en el que pasea. 0 = se queda quieto. */
  readonly wander: number;
  readonly lines: readonly string[];
  readonly question?: string;
  readonly action?: GameAction;
}

export interface ZoneDef extends Rect {
  readonly id: string;
  readonly name: string;
}

export interface GroundPaint extends Rect {
  readonly kind: GroundKind;
}

export interface TownDef {
  readonly id: string;
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly base: GroundKind;
  /** Capas de suelo en orden: cada una pisa a la anterior. */
  readonly ground: readonly GroundPaint[];
  readonly buildings: readonly BuildingDef[];
  readonly props: readonly PropDef[];
  readonly npcs: readonly NpcDef[];
  readonly zones: readonly ZoneDef[];
  readonly spawn: Vec2;
  readonly spawnFacing: Direction;
}
