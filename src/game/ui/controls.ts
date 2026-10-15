import { BUTTONS, type Button, buttonForKey, type InputState } from '@/game/core/input.ts';
import { all, isInteractiveTarget } from '@/game/ui/dom.ts';

function isButton(value: string | undefined): value is Button {
  return (BUTTONS as readonly string[]).includes(value ?? '');
}

/**
 * Teclado → botones. Ignora las teclas cuando el foco está en un botón, enlace o campo
 * (para no secuestrar la navegación con Tab/Enter), salvo en los controles del propio juego.
 */
export function bindKeyboard(target: Window, input: InputState, isActive: () => boolean): () => void {
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (!isActive() || isInteractiveTarget(event.target)) return;
    const button = buttonForKey(event.code);
    if (!button) return;
    event.preventDefault();
    if (!event.repeat) input.setButton(button, true, `key:${event.code}`);
  };
  const onKeyUp = (event: KeyboardEvent): void => {
    const button = buttonForKey(event.code);
    if (button) input.setButton(button, false, `key:${event.code}`);
  };
  const onBlur = (): void => input.releaseAll();
  target.addEventListener('keydown', onKeyDown);
  target.addEventListener('keyup', onKeyUp);
  target.addEventListener('blur', onBlur);
  return () => {
    target.removeEventListener('keydown', onKeyDown);
    target.removeEventListener('keyup', onKeyUp);
    target.removeEventListener('blur', onBlur);
  };
}

/**
 * Cruceta y botones en pantalla. Pointer Events: funciona con dedo, ratón y lápiz;
 * cada dedo es una "fuente" distinta, así se puede caminar y correr a la vez.
 */
export function bindVirtualPad(root: ParentNode, input: InputState): () => void {
  const cleanups: Array<() => void> = [];
  for (const element of all<HTMLElement>(root, '[data-button]')) {
    const button = element.dataset['button'];
    if (!isButton(button)) continue;
    const press = (event: PointerEvent): void => {
      event.preventDefault();
      element.setPointerCapture?.(event.pointerId);
      element.dataset['pressed'] = 'true';
      input.setButton(button, true, `pointer:${event.pointerId}`);
    };
    const release = (event: PointerEvent): void => {
      element.dataset['pressed'] = 'false';
      input.setButton(button, false, `pointer:${event.pointerId}`);
    };
    // Teclado sobre el propio botón en pantalla (Enter/Espacio): pulsación corta.
    const click = (event: MouseEvent): void => {
      if (event.detail !== 0) return;
      input.setButton(button, true, 'click');
      queueMicrotask(() => input.setButton(button, false, 'click'));
    };
    element.addEventListener('pointerdown', press);
    element.addEventListener('pointerup', release);
    element.addEventListener('pointercancel', release);
    element.addEventListener('lostpointercapture', release);
    element.addEventListener('click', click);
    element.addEventListener('contextmenu', (event) => event.preventDefault());
    cleanups.push(() => {
      element.removeEventListener('pointerdown', press);
      element.removeEventListener('pointerup', release);
      element.removeEventListener('pointercancel', release);
      element.removeEventListener('lostpointercapture', release);
      element.removeEventListener('click', click);
    });
  }
  return () => {
    for (const cleanup of cleanups) cleanup();
  };
}

/** Mapeo estándar de mandos (cruceta 12-15, A=0, B=1, Select=8, Start=9). */
const GAMEPAD_MAP: ReadonlyArray<readonly [number, Button]> = [
  [12, 'up'],
  [13, 'down'],
  [14, 'left'],
  [15, 'right'],
  [0, 'a'],
  [1, 'b'],
  [8, 'select'],
  [9, 'start'],
];

/** Lee los mandos conectados; llamar una vez por frame. */
export function pollGamepads(input: InputState): void {
  const pads = globalThis.navigator?.getGamepads?.() ?? [];
  for (const pad of pads) {
    if (!pad) continue;
    for (const [index, button] of GAMEPAD_MAP) {
      input.setButton(button, pad.buttons[index]?.pressed ?? false, `pad:${pad.index}`);
    }
    const [axisX = 0, axisY = 0] = pad.axes;
    input.setButton('left', axisX < -0.5, `stick:${pad.index}`);
    input.setButton('right', axisX > 0.5, `stick:${pad.index}`);
    input.setButton('up', axisY < -0.5, `stick:${pad.index}`);
    input.setButton('down', axisY > 0.5, `stick:${pad.index}`);
  }
}
