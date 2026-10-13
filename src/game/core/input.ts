import type { Direction } from './types.ts';

/** Botones lógicos de la "consola". Teclado, controles táctiles y gamepad escriben aquí. */
export type Button = Direction | 'a' | 'b' | 'start' | 'select';

export const BUTTONS: readonly Button[] = ['up', 'down', 'left', 'right', 'a', 'b', 'start', 'select'];

const DIRECTION_BUTTONS: readonly Direction[] = ['up', 'down', 'left', 'right'];

/** Mapa de teclado por defecto (KeyboardEvent.code → botón). */
export const KEY_BINDINGS: Readonly<Record<string, Button>> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  KeyW: 'up',
  KeyS: 'down',
  KeyA: 'left',
  KeyD: 'right',
  KeyZ: 'a',
  KeyJ: 'a',
  Space: 'a',
  Enter: 'a',
  NumpadEnter: 'a',
  KeyX: 'b',
  KeyK: 'b',
  Backspace: 'b',
  Escape: 'b',
  ShiftLeft: 'b',
  ShiftRight: 'b',
  KeyP: 'start',
  KeyM: 'select',
};

export function buttonForKey(code: string): Button | null {
  return KEY_BINDINGS[code] ?? null;
}

/**
 * Estado de los botones. Recuerda el orden en que se pulsaron las direcciones
 * para que, al soltar una, mande la última que sigue apretada (como en las consolas).
 */
export class InputState {
  readonly #held = new Set<Button>();
  readonly #pressedThisStep = new Set<Button>();
  readonly #directionStack: Direction[] = [];
  /** Contador de fuentes que mantienen apretado cada botón (teclado + táctil a la vez). */
  readonly #holders = new Map<Button, Set<string>>();
  /** Última dirección pulsada en este paso, aunque ya se haya soltado (un toque rapidísimo). */
  #tappedDirection: Direction | null = null;

  setButton(button: Button, down: boolean, source = 'default'): void {
    const holders = this.#holders.get(button) ?? new Set<string>();
    if (down) holders.add(source);
    else holders.delete(source);
    this.#holders.set(button, holders);
    const isHeld = holders.size > 0;
    const wasHeld = this.#held.has(button);
    if (isHeld && !wasHeld) {
      this.#held.add(button);
      this.#pressedThisStep.add(button);
      if (this.#isDirection(button)) {
        this.#removeDirection(button);
        this.#directionStack.push(button);
        this.#tappedDirection = button;
      }
    } else if (!isHeld && wasHeld) {
      this.#held.delete(button);
      if (this.#isDirection(button)) this.#removeDirection(button);
    }
  }

  isHeld(button: Button): boolean {
    return this.#held.has(button);
  }

  /**
   * La dirección vigente: la última apretada que sigue apretada. Si se soltó
   * antes de que corriera el paso (un toque muy corto), cuenta igual para ese paso:
   * así un toque gira o da un paso, como en las consolas.
   */
  direction(): Direction | null {
    return this.#directionStack.at(-1) ?? this.#tappedDirection;
  }

  /** `true` una sola vez por pulsación (se consume al leerla). */
  consumePress(button: Button): boolean {
    const pressed = this.#pressedThisStep.has(button);
    this.#pressedThisStep.delete(button);
    return pressed;
  }

  /** Llamar al final de cada paso de simulación: las pulsaciones no leídas caducan. */
  endStep(): void {
    this.#pressedThisStep.clear();
    this.#tappedDirection = null;
  }

  /** Suelta todo (al perder el foco la ventana, por ejemplo). */
  releaseAll(): void {
    this.#held.clear();
    this.#holders.clear();
    this.#pressedThisStep.clear();
    this.#directionStack.length = 0;
    this.#tappedDirection = null;
  }

  #isDirection(button: Button): button is Direction {
    return (DIRECTION_BUTTONS as readonly Button[]).includes(button);
  }

  #removeDirection(direction: Direction): void {
    const index = this.#directionStack.indexOf(direction);
    if (index >= 0) this.#directionStack.splice(index, 1);
  }
}
