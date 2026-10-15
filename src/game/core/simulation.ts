import {
  type Actor,
  advanceMove,
  BUMP_STEPS,
  createActor,
  occupiedTiles,
  RUN_SPEED,
  startMove,
  TURN_STEPS,
  WALK_SPEED,
} from '@/game/core/actor.ts';
import { type DialogResult, type DialogScript, DialogState, type MeasureText, paginate } from '@/game/core/dialog.ts';
import type { InputState } from '@/game/core/input.ts';
import { findPath } from '@/game/core/pathfinding.ts';
import { createRng, type Rng } from '@/game/core/rng.ts';
import {
  DIRECTIONS,
  type Direction,
  directionBetween,
  manhattan,
  OPPOSITE,
  SIM_STEP_MS,
  sameTile,
  step,
  type Vec2,
} from '@/game/core/types.ts';
import { doorFrontTile, type TownMap } from '@/game/world/town-map.ts';
import type { GameAction, NpcDef, ZoneDef } from '@/game/world/types.ts';

export interface NpcActor {
  readonly def: NpcDef;
  readonly actor: Actor;
  readonly home: Vec2;
  timer: number;
}

export type GameEvent =
  | { readonly type: 'dialog:open'; readonly dialog: DialogState }
  | { readonly type: 'dialog:close'; readonly result: DialogResult }
  | { readonly type: 'action'; readonly action: GameAction }
  | { readonly type: 'menu'; readonly button: 'start' | 'select' }
  | { readonly type: 'zone'; readonly zone: ZoneDef }
  | { readonly type: 'bump' }
  | { readonly type: 'step'; readonly tile: Vec2 }
  | { readonly type: 'visit'; readonly projectId: string }
  | { readonly type: 'autowalk:end'; readonly reached: boolean };

export type GameListener = (event: GameEvent) => void;

export interface SimulationOptions {
  readonly map: TownMap;
  readonly measure: MeasureText;
  /** Ancho útil del cuadro de diálogo, en las mismas unidades que `measure`. */
  readonly dialogWidth: number;
  readonly charsPerSecond: number;
  readonly seed?: number;
}

interface AutoWalk {
  readonly goal: Vec2;
  readonly face: Direction | null;
  readonly interact: boolean;
  path: Vec2[];
  waited: number;
}

/** Pasos que se espera a que un NPC se aparte antes de recalcular la ruta. */
const AUTOWALK_PATIENCE = 40;

/**
 * El juego en sí, sin gráficos: el jugador, los NPC, los diálogos y las reglas.
 * Avanza a paso fijo con `tick()`. El renderer y la UI solo leen su estado y escuchan eventos.
 */
export class GameSimulation {
  readonly map: TownMap;
  readonly player: Actor;
  readonly npcs: NpcActor[];
  #dialog: DialogState | null = null;
  #pendingAction: GameAction | null = null;
  #running = false;
  #zone: ZoneDef | null = null;
  #autoWalk: AutoWalk | null = null;
  #steps = 0;
  readonly #listeners = new Set<GameListener>();
  readonly #rng: Rng;
  #measure: MeasureText;
  #dialogWidth: number;
  #charsPerSecond: number;

  constructor(options: SimulationOptions) {
    this.map = options.map;
    this.#measure = options.measure;
    this.#dialogWidth = options.dialogWidth;
    this.#charsPerSecond = options.charsPerSecond;
    this.#rng = createRng(options.seed ?? 20_261_013);
    const def = this.map.def;
    this.player = createActor('player', def.spawn, def.spawnFacing);
    this.npcs = def.npcs.map((npc) => ({
      def: npc,
      actor: createActor(npc.id, { x: npc.x, y: npc.y }, npc.facing),
      home: { x: npc.x, y: npc.y },
      timer: 60 + this.#rng.int(0, 120),
    }));
  }

  // ── Consulta ────────────────────────────────────────────────────────────
  get dialog(): DialogState | null {
    return this.#dialog;
  }

  get running(): boolean {
    return this.#running;
  }

  get zone(): ZoneDef | null {
    return this.#zone;
  }

  get isAutoWalking(): boolean {
    return this.#autoWalk !== null;
  }

  /** Pasos de simulación transcurridos (reloj del juego). */
  get steps(): number {
    return this.#steps;
  }

  facingTile(actor: Actor = this.player): Vec2 {
    return step(actor.tile, actor.facing);
  }

  npcAt(tile: Vec2): NpcActor | null {
    return this.npcs.find((npc) => occupiedTiles(npc.actor).some((occupied) => sameTile(occupied, tile))) ?? null;
  }

  /** Bloqueado por el mapa o por cualquier personaje (salvo `ignore`). */
  isBlocked(tile: Vec2, ignore?: Actor): boolean {
    if (!this.map.isWalkable(tile)) return true;
    const actors = [this.player, ...this.npcs.map((npc) => npc.actor)];
    return actors.some(
      (actor) => actor !== ignore && occupiedTiles(actor).some((occupied) => sameTile(occupied, tile)),
    );
  }

  // ── Eventos ─────────────────────────────────────────────────────────────
  on(listener: GameListener): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  #emit(event: GameEvent): void {
    for (const listener of this.#listeners) listener(event);
  }

  // ── Control ─────────────────────────────────────────────────────────────
  /** Arranca el mundo (después de la pantalla de título). */
  start(intro?: DialogScript): void {
    if (this.#running) return;
    this.#running = true;
    this.#updateZone();
    if (intro) this.openDialog(intro);
  }

  /** Cambia la medición de texto (cuando carga la fuente o cambian las opciones). */
  configureText(measure: MeasureText, dialogWidth: number, charsPerSecond: number): void {
    this.#measure = measure;
    this.#dialogWidth = dialogWidth;
    this.#charsPerSecond = charsPerSecond;
  }

  openDialog(script: DialogScript, action: GameAction | null = null): DialogState {
    const lines = script.lines;
    const pages = paginate(lines, this.#dialogWidth, this.#measure);
    const dialog = new DialogState(script, pages, { charsPerSecond: this.#charsPerSecond });
    this.#dialog = dialog;
    this.#pendingAction = action;
    this.#emit({ type: 'dialog:open', dialog });
    return dialog;
  }

  /** Cierra el diálogo actual (por ejemplo, al tocar fuera). Cuenta como "No". */
  closeDialog(): void {
    if (!this.#dialog) return;
    this.#finishDialog(this.#dialog.result ?? 'closed');
  }

  /** Camina solo hasta un tile; opcionalmente mira hacia un lado e interactúa al llegar. */
  walkTo(goal: Vec2, face: Direction | null = null, interact = false): boolean {
    if (!this.#running) return false;
    const path = findPath(this.player.tile, goal, (tile) => !this.isBlocked(tile, this.player));
    if (!path) {
      this.#emit({ type: 'autowalk:end', reached: false });
      return false;
    }
    if (this.#dialog) this.closeDialog();
    this.#autoWalk = { goal, face, interact, path, waited: 0 };
    return true;
  }

  /** Camina hasta la puerta de un edificio y la "toca". */
  walkToBuilding(buildingId: string): boolean {
    const building = this.map.building(buildingId);
    if (!building) return false;
    return this.walkTo(doorFrontTile(building), 'up', true);
  }

  cancelAutoWalk(): void {
    this.#autoWalk = null;
  }

  // ── Paso de simulación ─────────────────────────────────────────────────
  tick(input: InputState): void {
    this.#steps += 1;
    if (this.#dialog) {
      this.#tickDialog(input);
      return;
    }
    if (!this.#running) return;
    this.#tickPlayer(input);
    for (const npc of this.npcs) this.#tickNpc(npc);
  }

  #tickDialog(input: InputState): void {
    const dialog = this.#dialog;
    if (!dialog) return;
    dialog.update(SIM_STEP_MS);
    if (dialog.phase === 'choosing') {
      if (input.consumePress('up')) dialog.moveChoice('up');
      if (input.consumePress('down')) dialog.moveChoice('down');
    }
    if (input.consumePress('a')) dialog.confirm();
    else if (input.consumePress('b')) dialog.cancel();
    if (dialog.phase === 'done') this.#finishDialog(dialog.result ?? 'closed');
  }

  #finishDialog(result: DialogResult): void {
    const action = this.#pendingAction;
    this.#dialog = null;
    this.#pendingAction = null;
    this.#emit({ type: 'dialog:close', result });
    if (action && result === 'yes') this.#emit({ type: 'action', action });
  }

  #tickPlayer(input: InputState): void {
    const player = this.player;
    if (player.move) {
      const leftover = advanceMove(player);
      if (leftover === null) return;
      this.#arrived(player.tile);
      // Encadenar el siguiente paso sin frenar (caminar fluido manteniendo la flecha).
      const manual = input.direction();
      if (manual) {
        this.#autoWalk = null;
        if (this.#tryMove(manual, input.isHeld('b') ? RUN_SPEED : WALK_SPEED)) {
          if (player.move) player.move.progress = leftover;
        }
      } else if (this.#autoWalk) {
        this.#followPath();
      }
      return;
    }

    if (input.consumePress('start')) {
      this.#emit({ type: 'menu', button: 'start' });
      return;
    }
    if (input.consumePress('select')) {
      this.#emit({ type: 'menu', button: 'select' });
      return;
    }
    if (input.consumePress('a')) {
      this.#autoWalk = null;
      this.interact();
      return;
    }

    if (player.turnTimer > 0) player.turnTimer -= 1;
    if (player.bumpTimer > 0) player.bumpTimer -= 1;

    const direction = input.direction();
    if (direction) {
      this.#autoWalk = null;
      if (direction !== player.facing && player.turnTimer === 0 && player.bumpTimer === 0) {
        // Toque corto = girar en el sitio; mantener = caminar.
        player.facing = direction;
        player.turnTimer = TURN_STEPS;
        return;
      }
      if (player.turnTimer > 0) return;
      this.#tryMove(direction, input.isHeld('b') ? RUN_SPEED : WALK_SPEED);
      return;
    }
    if (this.#autoWalk) this.#followPath();
  }

  /** Intenta dar un paso. Caminar hacia una puerta la "toca". Devuelve si empezó a moverse. */
  #tryMove(direction: Direction, speed: number): boolean {
    const player = this.player;
    player.facing = direction;
    const target = step(player.tile, direction);
    const interactable = this.map.interactableAt(target);
    if (interactable?.type === 'door' && direction === 'up') {
      this.#interactDoor(interactable.building.id);
      return false;
    }
    if (this.isBlocked(target, player)) {
      if (player.bumpTimer === 0) {
        player.bumpTimer = BUMP_STEPS;
        this.#emit({ type: 'bump' });
      }
      return false;
    }
    startMove(player, direction, speed);
    return true;
  }

  #followPath(): void {
    const walk = this.#autoWalk;
    if (!walk) return;
    const player = this.player;
    const next = walk.path[0];
    if (!next) {
      this.#autoWalk = null;
      if (walk.face) player.facing = walk.face;
      this.#emit({ type: 'autowalk:end', reached: true });
      if (walk.interact) this.interact();
      return;
    }
    const direction = directionBetween(player.tile, next);
    if (!direction) {
      this.#autoWalk = null;
      this.#emit({ type: 'autowalk:end', reached: false });
      return;
    }
    if (this.isBlocked(next, player)) {
      player.facing = direction;
      walk.waited += 1;
      if (walk.waited > AUTOWALK_PATIENCE) {
        const path = findPath(player.tile, walk.goal, (tile) => !this.isBlocked(tile, player));
        if (!path) {
          this.#autoWalk = null;
          this.#emit({ type: 'autowalk:end', reached: false });
          return;
        }
        walk.path = path;
        walk.waited = 0;
      }
      return;
    }
    walk.waited = 0;
    walk.path.shift();
    startMove(player, direction, RUN_SPEED);
  }

  #arrived(tile: Vec2): void {
    this.#emit({ type: 'step', tile });
    this.#updateZone();
  }

  #updateZone(): void {
    const zone = this.map.zoneAt(this.player.tile);
    if (zone && zone.name !== this.#zone?.name) {
      this.#zone = zone;
      this.#emit({ type: 'zone', zone });
    } else if (zone) {
      this.#zone = zone;
    }
  }

  /** Botón A: hablar con quien esté enfrente o leer/tocar lo que haya. */
  interact(): void {
    const target = this.facingTile();
    const npc = this.npcAt(target);
    if (npc) {
      if (!npc.actor.move) npc.actor.facing = OPPOSITE[this.player.facing];
      const { def } = npc;
      const lines = def.question ? [...def.lines, def.question] : def.lines;
      this.openDialog(
        def.question ? { speaker: def.name, lines, choice: { yes: 'Sí', no: 'No' } } : { speaker: def.name, lines },
        def.action ?? null,
      );
      return;
    }
    const interactable = this.map.interactableAt(target);
    if (!interactable) return;
    if (interactable.type === 'door') {
      this.#interactDoor(interactable.building.id);
      return;
    }
    const { prop } = interactable;
    const text = prop.text ?? [];
    if (prop.action?.type === 'openProject') this.#emit({ type: 'visit', projectId: prop.action.projectId });
    const ask = prop.action && prop.question;
    this.openDialog(
      ask ? { lines: [...text, prop.question ?? ''], choice: { yes: 'Sí', no: 'No' } } : { lines: text },
      prop.action ?? null,
    );
  }

  #interactDoor(buildingId: string): void {
    const building = this.map.building(buildingId);
    if (!building) return;
    this.player.facing = 'up';
    if (building.projectId) this.#emit({ type: 'visit', projectId: building.projectId });
    const ask = building.action && building.doorQuestion;
    this.openDialog(
      ask
        ? {
            speaker: building.name,
            lines: [...building.doorLines, building.doorQuestion ?? ''],
            choice: { yes: 'Sí', no: 'No' },
          }
        : { speaker: building.name, lines: building.doorLines },
      building.action ?? null,
    );
  }

  #tickNpc(npc: NpcActor): void {
    const { actor, def } = npc;
    if (actor.move) {
      advanceMove(actor);
      return;
    }
    if (def.wander === 0) return;
    npc.timer -= 1;
    if (npc.timer > 0) return;
    npc.timer = this.#rng.int(90, 240);
    const direction = this.#rng.pick(DIRECTIONS);
    actor.facing = direction;
    if (this.#rng.chance(0.35)) return;
    const target = step(actor.tile, direction);
    if (manhattan(target, npc.home) > def.wander) return;
    if (this.isBlocked(target, actor)) return;
    startMove(actor, direction, WALK_SPEED);
  }
}
