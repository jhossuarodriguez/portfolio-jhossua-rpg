import { afterEach, describe, expect, it, vi } from 'vitest';
import { InputState } from '@/game/core/input.ts';
import { bindKeyboard, bindVirtualPad, pollGamepads } from '@/game/ui/controls.ts';
import { isInteractiveTarget } from '@/game/ui/dom.ts';

const cleanups: Array<() => void> = [];

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

function key(type: 'keydown' | 'keyup', code: string, target: EventTarget = window): KeyboardEvent {
  const event = new KeyboardEvent(type, { code, bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
}

describe('teclado', () => {
  it('flechas y botones llegan al juego y no hacen scroll', () => {
    const input = new InputState();
    cleanups.push(bindKeyboard(window, input, () => true));
    const event = key('keydown', 'ArrowDown');
    expect(event.defaultPrevented).toBe(true);
    expect(input.direction()).toBe('down');
    key('keydown', 'KeyZ');
    expect(input.consumePress('a')).toBe(true);
    key('keyup', 'ArrowDown');
    input.endStep();
    expect(input.direction()).toBeNull();
  });

  it('ignora teclas sin función, modificadores y juego inactivo', () => {
    const input = new InputState();
    let active = true;
    cleanups.push(bindKeyboard(window, input, () => active));
    expect(key('keydown', 'KeyQ').defaultPrevented).toBe(false);
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyZ', ctrlKey: true, cancelable: true }));
    expect(input.isHeld('a')).toBe(false);
    active = false;
    key('keydown', 'ArrowUp');
    expect(input.direction()).toBeNull();
  });

  it('no secuestra el teclado de botones, enlaces y campos', () => {
    const input = new InputState();
    cleanups.push(bindKeyboard(window, input, () => true));
    document.body.innerHTML =
      '<button id="b">Proyectos</button><input id="i" /><div id="d" data-game-control><button id="g">A</button></div>';
    for (const id of ['b', 'i']) {
      const element = document.getElementById(id);
      if (!element) throw new Error(id);
      expect(key('keydown', 'Enter', element).defaultPrevented).toBe(false);
    }
    expect(input.isHeld('a')).toBe(false);
    const gameButton = document.getElementById('g');
    if (!gameButton) throw new Error('g');
    expect(isInteractiveTarget(gameButton)).toBe(false);
    key('keydown', 'Enter', gameButton);
    expect(input.isHeld('a')).toBe(true);
  });

  it('al perder el foco suelta todo', () => {
    const input = new InputState();
    cleanups.push(bindKeyboard(window, input, () => true));
    key('keydown', 'ArrowLeft');
    window.dispatchEvent(new Event('blur'));
    expect(input.direction()).toBeNull();
    expect(input.isHeld('left')).toBe(false);
  });
});

describe('cruceta y botones en pantalla', () => {
  function mountPad(): { input: InputState; button: (name: string) => HTMLElement } {
    document.body.innerHTML = `
      <div data-game-control>
        <button data-button="up">▲</button>
        <button data-button="a">A</button>
        <button data-button="nada">?</button>
      </div>`;
    const input = new InputState();
    cleanups.push(bindVirtualPad(document, input));
    const button = (name: string): HTMLElement => {
      const element = document.querySelector<HTMLElement>(`[data-button="${name}"]`);
      if (!element) throw new Error(name);
      return element;
    };
    return { input, button };
  }

  it('apretar y soltar con el dedo', () => {
    const { input, button } = mountPad();
    button('up').dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, bubbles: true, cancelable: true }));
    expect(input.direction()).toBe('up');
    expect(button('up').dataset['pressed']).toBe('true');
    button('up').dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, bubbles: true }));
    expect(input.isHeld('up')).toBe(false);
    input.endStep();
    expect(input.direction()).toBeNull();
    expect(button('up').dataset['pressed']).toBe('false');
  });

  it('dos dedos son fuentes distintas', () => {
    const { input, button } = mountPad();
    button('a').dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, bubbles: true }));
    button('a').dispatchEvent(new PointerEvent('pointerdown', { pointerId: 2, bubbles: true }));
    button('a').dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, bubbles: true }));
    expect(input.isHeld('a')).toBe(true);
    button('a').dispatchEvent(new PointerEvent('pointercancel', { pointerId: 2, bubbles: true }));
    expect(input.isHeld('a')).toBe(false);
  });

  it('activar con teclado (Enter sobre el botón) es una pulsación corta', async () => {
    const { input, button } = mountPad();
    button('a').dispatchEvent(new MouseEvent('click', { detail: 0, bubbles: true }));
    expect(input.consumePress('a')).toBe(true);
    await Promise.resolve();
    expect(input.isHeld('a')).toBe(false);
  });
});

describe('mandos', () => {
  it('lee la cruceta, el stick y los botones del mapeo estándar', () => {
    const pressed = (on: boolean): { pressed: boolean } => ({ pressed: on });
    const buttons = Array.from({ length: 16 }, () => pressed(false));
    buttons[0] = pressed(true);
    buttons[13] = pressed(true);
    vi.stubGlobal('navigator', { getGamepads: () => [null, { index: 1, buttons, axes: [0.9, 0] }] });
    const input = new InputState();
    pollGamepads(input);
    expect(input.isHeld('a')).toBe(true);
    expect(input.isHeld('down')).toBe(true);
    expect(input.isHeld('right')).toBe(true);
    expect(input.isHeld('left')).toBe(false);
  });

  it('sin API de mandos no pasa nada', () => {
    vi.stubGlobal('navigator', {});
    expect(() => pollGamepads(new InputState())).not.toThrow();
  });
});
