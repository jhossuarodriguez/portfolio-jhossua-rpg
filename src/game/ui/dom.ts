/** Busca un elemento obligatorio; si falta, el error dice exactamente cuál. */
export function required<T extends Element = HTMLElement>(
  root: ParentNode,
  selector: string,
  type?: abstract new () => T,
): T {
  const element = root.querySelector(selector);
  if (!element) throw new Error(`Falta el elemento ${selector}`);
  if (type && !(element instanceof type)) throw new Error(`${selector} no es del tipo esperado`);
  return element as T;
}

export function all<T extends Element = HTMLElement>(root: ParentNode, selector: string): T[] {
  return [...root.querySelectorAll<T>(selector)];
}

/** `true` si la tecla debe ir al elemento con foco (un botón, un enlace, un campo) y no al juego. */
export function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest('[data-game-control]')) return false;
  return Boolean(
    target.closest('a, button, input, select, textarea, summary, [contenteditable=""], [contenteditable="true"]'),
  );
}

export function prefersReducedMotion(): boolean {
  return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}
