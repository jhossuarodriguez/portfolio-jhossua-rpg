/**
 * Cuadros de diálogo estilo portátil: el texto se parte en páginas de 2 líneas
 * y aparece letra por letra. La medición del texto se inyecta (canvas en el
 * navegador, una función simple en los tests).
 */

export type MeasureText = (text: string) => number;

export interface DialogChoice {
  readonly yes: string;
  readonly no: string;
}

export interface DialogScript {
  /** Nombre que se muestra arriba del cuadro (opcional). */
  readonly speaker?: string;
  /** Párrafos. Cada uno empieza en página nueva. */
  readonly lines: readonly string[];
  /** Si existe, la última página termina en una pregunta Sí/No. */
  readonly choice?: DialogChoice;
}

export type DialogResult = 'closed' | 'yes' | 'no';

/** Ajuste de línea por palabras según el ancho medido. Las palabras larguísimas se cortan. */
export function wrapText(text: string, maxWidth: number, measure: MeasureText): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  const pushWord = (word: string): void => {
    const candidate = current ? `${current} ${word}` : word;
    if (measure(candidate) <= maxWidth) {
      current = candidate;
      return;
    }
    if (current) lines.push(current);
    if (measure(word) <= maxWidth) {
      current = word;
      return;
    }
    // Palabra más ancha que la línea (una URL, por ejemplo): se parte a mano.
    let chunk = '';
    for (const character of word) {
      if (measure(chunk + character) > maxWidth && chunk) {
        lines.push(chunk);
        chunk = character;
      } else {
        chunk += character;
      }
    }
    current = chunk;
  };
  for (const word of words) pushWord(word);
  if (current) lines.push(current);
  return lines;
}

/** Agrupa cada párrafo en páginas de `linesPerPage` líneas. */
export function paginate(
  paragraphs: readonly string[],
  maxWidth: number,
  measure: MeasureText,
  linesPerPage = 2,
): string[][] {
  const pages: string[][] = [];
  for (const paragraph of paragraphs) {
    const lines = wrapText(paragraph, maxWidth, measure);
    for (let index = 0; index < lines.length; index += linesPerPage) {
      pages.push(lines.slice(index, index + linesPerPage));
    }
  }
  return pages.length > 0 ? pages : [['…']];
}

export type DialogPhase = 'typing' | 'waiting' | 'choosing' | 'done';

export interface DialogOptions {
  /** Letras por segundo. `Infinity` muestra cada página entera (movimiento reducido). */
  readonly charsPerSecond: number;
}

/** Máquina de estados del diálogo abierto. Pura: la UI solo la dibuja. */
export class DialogState {
  readonly script: DialogScript;
  readonly pages: readonly (readonly string[])[];
  #pageIndex = 0;
  #revealed = 0;
  #phase: DialogPhase = 'typing';
  #choiceIndex: 0 | 1 = 0;
  #result: DialogResult | null = null;
  readonly #charsPerSecond: number;

  constructor(script: DialogScript, pages: readonly (readonly string[])[], options: DialogOptions) {
    if (pages.length === 0) throw new Error('Un diálogo necesita al menos una página');
    this.script = script;
    this.pages = pages;
    this.#charsPerSecond = options.charsPerSecond;
    if (!Number.isFinite(this.#charsPerSecond)) this.#revealPage();
  }

  get phase(): DialogPhase {
    return this.#phase;
  }

  get pageIndex(): number {
    return this.#pageIndex;
  }

  get isLastPage(): boolean {
    return this.#pageIndex === this.pages.length - 1;
  }

  /** 0 = Sí, 1 = No. */
  get choiceIndex(): 0 | 1 {
    return this.#choiceIndex;
  }

  get result(): DialogResult | null {
    return this.#result;
  }

  get currentPage(): readonly string[] {
    return this.pages[this.#pageIndex] ?? [];
  }

  /** Líneas visibles ahora mismo (cortadas por el efecto máquina de escribir). */
  visibleLines(): string[] {
    let budget = Math.floor(this.#revealed);
    return this.currentPage.map((line) => {
      const visible = line.slice(0, Math.max(0, budget));
      budget -= line.length;
      return visible;
    });
  }

  #pageLength(): number {
    return this.currentPage.reduce((total, line) => total + line.length, 0);
  }

  #revealPage(): void {
    this.#revealed = this.#pageLength();
    this.#phase = this.isLastPage && this.script.choice ? 'choosing' : 'waiting';
  }

  update(deltaMs: number): void {
    if (this.#phase !== 'typing') return;
    this.#revealed += (this.#charsPerSecond * deltaMs) / 1000;
    if (this.#revealed >= this.#pageLength()) this.#revealPage();
  }

  /** Botón A: completa la página, pasa a la siguiente, confirma la elección o cierra. */
  confirm(): void {
    switch (this.#phase) {
      case 'typing':
        this.#revealPage();
        return;
      case 'waiting':
        if (this.isLastPage) {
          this.#finish('closed');
          return;
        }
        this.#pageIndex += 1;
        this.#revealed = 0;
        this.#phase = 'typing';
        if (!Number.isFinite(this.#charsPerSecond)) this.#revealPage();
        return;
      case 'choosing':
        this.#finish(this.#choiceIndex === 0 ? 'yes' : 'no');
        return;
      case 'done':
        return;
    }
  }

  /** Botón B: igual que A, salvo en la pregunta, donde significa "No". */
  cancel(): void {
    if (this.#phase === 'choosing') {
      this.#finish('no');
      return;
    }
    this.confirm();
  }

  /** Arriba/abajo durante la pregunta. */
  moveChoice(direction: 'up' | 'down'): void {
    if (this.#phase !== 'choosing') return;
    this.#choiceIndex = direction === 'up' ? 0 : 1;
  }

  /** Elegir directamente (clic o toque sobre "Sí"/"No"). */
  choose(index: 0 | 1): void {
    if (this.#phase !== 'choosing') return;
    this.#choiceIndex = index;
    this.confirm();
  }

  #finish(result: DialogResult): void {
    this.#phase = 'done';
    this.#result = result;
  }
}
