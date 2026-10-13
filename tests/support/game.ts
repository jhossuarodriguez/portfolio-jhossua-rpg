import { InputState } from '../../src/game/core/input.ts';
import { type GameEvent, GameSimulation } from '../../src/game/core/simulation.ts';
import { PRIMADA } from '../../src/game/world/primada.ts';
import { TownMap } from '../../src/game/world/town-map.ts';
import type { TownDef } from '../../src/game/world/types.ts';

/** Medición de texto de los tests: 6 px por carácter (aprox. la fuente pixel a 11 px). */
export const measure = (text: string): number => text.length * 6;

export interface Harness {
  readonly sim: GameSimulation;
  readonly input: InputState;
  readonly events: GameEvent[];
  /** Avanza `steps` pasos de simulación (1 paso = 1/60 s). */
  tick(steps?: number): void;
  /** Pulsación corta de un botón (se suelta en el mismo paso). */
  tap(button: Parameters<InputState['setButton']>[0]): void;
  /** Mantiene un botón durante `steps` pasos y lo suelta. */
  hold(button: Parameters<InputState['setButton']>[0], steps: number): void;
  /** Avanza hasta que se cumpla la condición; falla si se pasa de `maxSteps`. */
  runUntil(predicate: () => boolean, maxSteps?: number): number;
  /** Cierra el diálogo abierto pulsando A hasta que desaparezca (y elige "No" si pregunta). */
  closeDialog(answer?: 'yes' | 'no'): void;
  eventsOf<T extends GameEvent['type']>(type: T): Extract<GameEvent, { type: T }>[];
}

export function createHarness(def: TownDef = PRIMADA, charsPerSecond = Number.POSITIVE_INFINITY): Harness {
  const sim = new GameSimulation({ map: new TownMap(def), measure, dialogWidth: 220, charsPerSecond, seed: 7 });
  const input = new InputState();
  const events: GameEvent[] = [];
  sim.on((event) => events.push(event));
  const tick = (steps = 1): void => {
    for (let index = 0; index < steps; index += 1) {
      sim.tick(input);
      input.endStep();
    }
  };
  const harness: Harness = {
    sim,
    input,
    events,
    tick,
    tap: (button) => {
      input.setButton(button, true, 'test');
      input.setButton(button, false, 'test');
      tick();
    },
    hold: (button, steps) => {
      input.setButton(button, true, 'test');
      tick(steps);
      input.setButton(button, false, 'test');
    },
    runUntil: (predicate, maxSteps = 2000) => {
      for (let step = 0; step < maxSteps; step += 1) {
        if (predicate()) return step;
        tick();
      }
      throw new Error(`La condición no se cumplió en ${maxSteps} pasos`);
    },
    closeDialog: (answer = 'no') => {
      for (let guard = 0; guard < 50 && sim.dialog; guard += 1) {
        if (sim.dialog.phase === 'choosing') {
          if (answer === 'no') harness.tap('down');
          else harness.tap('up');
        }
        harness.tap('a');
      }
      if (sim.dialog) throw new Error('El diálogo no se cerró');
    },
    eventsOf: <T extends GameEvent['type']>(type: T) =>
      events.filter((event): event is Extract<GameEvent, { type: T }> => event.type === type),
  };
  return harness;
}
