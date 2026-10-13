import { NPC_LOOKS, PLAYER_LOOK } from './art/characters.ts';
import { paletteFor, SEASON_LABELS, type Season } from './art/palettes.ts';
import type { MeasureText } from './core/dialog.ts';
import { InputState } from './core/input.ts';
import { seasonForDate, TIME_TINTS, type TimeOfDay, timeOfDay } from './core/season.ts';
import { GameSimulation } from './core/simulation.ts';
import { SIM_STEP_MS } from './core/types.ts';
import type { VisitedRegistry } from './core/visited.ts';
import { WorldRenderer } from './render/world-renderer.ts';
import { bindKeyboard, bindVirtualPad, pollGamepads } from './ui/controls.ts';
import { DialogView } from './ui/dialog-view.ts';
import { prefersReducedMotion, required } from './ui/dom.ts';
import { drawMinimap, markerPosition } from './ui/minimap.ts';
import { type Settings, TEXT_SPEED_CPS } from './ui/settings.ts';
import type { Sfx } from './ui/sfx.ts';
import type { TouchScreen } from './ui/touch-screen.ts';
import { PRIMADA } from './world/primada.ts';
import { COMPLETE_SCRIPT, introScript } from './world/story.ts';
import { TownMap } from './world/town-map.ts';

/** Ancho útil del texto del diálogo, en píxeles de consola (cuadro de 248 − márgenes). */
const DIALOG_TEXT_WIDTH = 220;
const DIALOG_FONT = '500 11px "Pixelify Sans"';
/** Máximo de pasos de simulación por frame (evita la "espiral de la muerte" tras una pausa). */
const MAX_STEPS_PER_FRAME = 5;

export interface EngineOptions {
  readonly topScreen: HTMLElement;
  readonly controls: ParentNode;
  readonly touch: TouchScreen;
  readonly minimap: HTMLElement | null;
  readonly announcer: HTMLElement | null;
  readonly visited: VisitedRegistry;
  readonly sfx: Sfx;
  readonly settings: Settings;
  readonly isTouch: boolean;
}

function createMeasure(): MeasureText {
  const context = document.createElement('canvas').getContext('2d');
  if (!context) return (text) => text.length * 6;
  context.font = DIALOG_FONT;
  return (text) => context.measureText(text).width;
}

/**
 * El juego en el navegador: bucle a paso fijo, render con three.js y
 * todo el cableado con la pantalla táctil, los controles y la accesibilidad.
 */
export class Engine {
  readonly map = new TownMap(PRIMADA);
  readonly input = new InputState();
  readonly sim: GameSimulation;
  readonly #renderer: WorldRenderer;
  readonly #options: EngineOptions;
  readonly #dialogView: DialogView;
  readonly #banner: HTMLElement;
  readonly #playerMarker: HTMLElement | null;
  readonly #reducedMotion = prefersReducedMotion();
  readonly #cleanups: Array<() => void> = [];
  #settings: Settings;
  #scene: 'title' | 'world' = 'title';
  #season: Season = 'summer';
  #time: TimeOfDay = 'day';
  #measure: MeasureText;
  #lastFrame = 0;
  #accumulator = 0;
  #rafId = 0;
  #introStart = 0;
  #bannerTimer = 0;
  #pendingComplete = false;
  #visible = true;

  constructor(options: EngineOptions) {
    this.#options = options;
    this.#settings = options.settings;
    const canvas = required<HTMLCanvasElement>(options.topScreen, 'canvas[data-game-canvas]');
    this.#banner = required(options.topScreen, '[data-zone-banner]');
    this.#measure = createMeasure();
    this.sim = new GameSimulation({
      map: this.map,
      measure: this.#measure,
      dialogWidth: DIALOG_TEXT_WIDTH,
      charsPerSecond: this.#charsPerSecond(),
    });
    this.#renderer = new WorldRenderer(canvas, this.map);
    this.#renderer.setCharacters([
      { actor: this.sim.player, look: PLAYER_LOOK },
      ...this.sim.npcs.map((npc) => ({ actor: npc.actor, look: NPC_LOOKS[npc.def.look] })),
    ]);
    this.#dialogView = new DialogView(
      options.topScreen,
      {
        onConfirm: () => this.sim.dialog?.confirm(),
        onChoose: (index) => this.sim.dialog?.choose(index),
      },
      options.announcer,
    );
    this.#playerMarker = options.minimap?.querySelector<HTMLElement>('[data-map-player]') ?? null;
    const minimapCanvas = options.minimap?.querySelector<HTMLCanvasElement>('canvas[data-minimap-canvas]');
    if (minimapCanvas) drawMinimap(minimapCanvas, this.map);

    this.applySettings(options.settings, true);
    this.#wireEvents();
    this.#cleanups.push(
      bindKeyboard(window, this.input, () => this.#visible),
      bindVirtualPad(options.controls, this.input),
    );
    this.#observeVisibility();
    void document.fonts?.load(DIALOG_FONT).then(() => {
      this.#measure = createMeasure();
      this.sim.configureText(this.#measure, DIALOG_TEXT_WIDTH, this.#charsPerSecond());
    });
    this.#syncState();
    options.topScreen.dataset['ready'] = 'true';
    this.#rafId = requestAnimationFrame((time) => this.#frame(time));
  }

  get scene(): 'title' | 'world' {
    return this.#scene;
  }

  /** Hora del día que se está mostrando (según el reloj o las opciones). */
  get timeOfDay(): TimeOfDay {
    return this.#time;
  }

  #charsPerSecond(): number {
    return this.#reducedMotion ? Number.POSITIVE_INFINITY : TEXT_SPEED_CPS[this.#settings.textSpeed];
  }

  /** Aplica opciones: sonido, velocidad de texto, estación y hora. */
  applySettings(settings: Settings, force = false): void {
    const previous = this.#settings;
    this.#settings = settings;
    this.#options.sfx.setEnabled(settings.sound);
    this.sim.configureText(this.#measure, DIALOG_TEXT_WIDTH, this.#charsPerSecond());
    const now = new Date();
    const season = settings.season === 'auto' ? seasonForDate(now) : settings.season;
    const time = settings.time === 'auto' ? timeOfDay(now.getHours()) : settings.time;
    if (force || season !== this.#season || previous.season !== settings.season) {
      this.#season = season;
      this.#renderer.setPalette(paletteFor(season));
    }
    this.#time = time;
    this.#renderer.setTint(TIME_TINTS[time]);
    this.#options.topScreen.dataset['season'] = season;
    this.#options.topScreen.dataset['time'] = time;
    this.#options.touch.setStatus(
      now.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' }),
      SEASON_LABELS[season],
    );
  }

  /** Sale de la pantalla de título y empieza a jugar. */
  start(): void {
    if (this.#scene === 'world') return;
    this.#scene = 'world';
    this.#introStart = performance.now();
    this.#options.sfx.play('start');
    this.#options.topScreen.dataset['scene'] = 'world';
    this.sim.start(introScript(this.#options.isTouch));
    this.#syncState();
  }

  /** "Ir al edificio" desde la pantalla táctil. */
  walkTo(buildingId: string): void {
    if (this.#scene === 'title') this.start();
    if (this.sim.dialog) this.sim.closeDialog();
    const ok = this.sim.walkToBuilding(buildingId);
    if (!ok) this.#announce('No encuentro un camino hasta allí ahora mismo.');
    this.#options.topScreen.focus({ preventScroll: true });
  }

  #wireEvents(): void {
    const { touch, sfx, visited } = this.#options;
    this.sim.on((event) => {
      switch (event.type) {
        case 'dialog:open':
          sfx.play('blip');
          break;
        case 'dialog:close':
          sfx.play(event.result === 'yes' ? 'confirm' : event.result === 'no' ? 'cancel' : 'blip');
          if (this.#pendingComplete && !this.sim.dialog) {
            this.#pendingComplete = false;
            queueMicrotask(() => {
              sfx.play('complete');
              this.sim.openDialog(COMPLETE_SCRIPT, { type: 'openView', view: 'contact' });
            });
          }
          break;
        case 'action':
          if (event.action.type === 'openProject') touch.show(`project:${event.action.projectId}`, { focus: false });
          else touch.show(event.action.view, { focus: false });
          break;
        case 'menu':
          touch.show(event.button === 'start' ? 'home' : 'map', { focus: false });
          sfx.play('blip');
          break;
        case 'zone':
          this.#showBanner(event.zone.name);
          break;
        case 'bump':
          sfx.play('bump');
          break;
        case 'step':
          this.#syncState();
          break;
        case 'visit':
          if (visited.add(event.projectId)) {
            touch.setVisited(visited.list(), visited.total);
            if (visited.isComplete) this.#pendingComplete = true;
          }
          break;
        case 'autowalk:end':
          if (!event.reached) this.#announce('El camino está bloqueado. Prueba otra vez en un momento.');
          break;
      }
      if (event.type === 'dialog:open' || event.type === 'dialog:close') this.#syncState();
    });
  }

  #showBanner(name: string): void {
    this.#banner.textContent = name;
    this.#banner.dataset['visible'] = 'true';
    this.#options.topScreen.dataset['zone'] = name;
    this.#announce(`Llegaste a ${name}.`);
    window.clearTimeout(this.#bannerTimer);
    this.#bannerTimer = window.setTimeout(() => {
      this.#banner.dataset['visible'] = 'false';
    }, 2600);
  }

  #announce(message: string): void {
    if (this.#options.announcer) this.#options.announcer.textContent = message;
  }

  /** Estado visible en atributos `data-*`: útil para CSS, depuración y tests e2e. */
  #syncState(): void {
    const root = this.#options.topScreen;
    const { player } = this.sim;
    root.dataset['scene'] = this.#scene;
    root.dataset['playerX'] = String(player.tile.x);
    root.dataset['playerY'] = String(player.tile.y);
    root.dataset['facing'] = player.facing;
    root.dataset['dialogState'] = this.sim.dialog ? 'open' : 'closed';
    if (this.#playerMarker) {
      const position = markerPosition(player.tile, this.map);
      this.#playerMarker.style.left = position.left;
      this.#playerMarker.style.top = position.top;
    }
  }

  #observeVisibility(): void {
    const onVisibility = (): void => {
      this.#visible = !document.hidden;
      if (this.#visible) this.#lastFrame = performance.now();
      else this.input.releaseAll();
    };
    document.addEventListener('visibilitychange', onVisibility);
    this.#cleanups.push(() => document.removeEventListener('visibilitychange', onVisibility));
  }

  #frame(now: number): void {
    this.#rafId = requestAnimationFrame((time) => this.#frame(time));
    if (!this.#visible) return;
    const delta = this.#lastFrame === 0 ? SIM_STEP_MS : Math.min(250, now - this.#lastFrame);
    this.#lastFrame = now;
    this.#accumulator += delta;
    pollGamepads(this.input);

    if (this.#scene === 'title') {
      if (this.input.consumePress('a') || this.input.consumePress('start')) this.start();
      this.input.endStep();
      this.#accumulator = 0;
    }

    let steps = 0;
    while (this.#accumulator >= SIM_STEP_MS && steps < MAX_STEPS_PER_FRAME) {
      const hadDialog = this.sim.dialog !== null;
      this.sim.tick(this.input);
      this.input.endStep();
      this.#accumulator -= SIM_STEP_MS;
      steps += 1;
      if (hadDialog !== (this.sim.dialog !== null)) this.#syncState();
    }
    if (steps === MAX_STEPS_PER_FRAME) this.#accumulator = 0;

    // Entrada cinematográfica: la cámara se acerca al personaje.
    if (this.#scene === 'world' && !this.#reducedMotion) {
      const t = Math.min(1, (now - this.#introStart) / 900);
      const eased = 1 - (1 - t) ** 3;
      this.#renderer.setZoom(0.72 + 0.28 * eased);
    } else {
      this.#renderer.setZoom(1);
    }
    this.#renderer.render(this.sim, now, this.#scene === 'title' && !this.#reducedMotion ? now : null);
    this.#dialogView.render(this.sim.dialog);
  }

  dispose(): void {
    cancelAnimationFrame(this.#rafId);
    for (const cleanup of this.#cleanups) cleanup();
    this.#renderer.dispose();
  }
}
