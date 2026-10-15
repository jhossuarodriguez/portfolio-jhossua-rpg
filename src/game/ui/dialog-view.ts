import type { DialogState } from '@/game/core/dialog.ts';
import { all, required } from '@/game/ui/dom.ts';

export interface DialogHandlers {
  /** Toque/clic en el cuadro: igual que el botón A. */
  onConfirm(): void;
  /** Toque/clic en "Sí" (0) o "No" (1). */
  onChoose(index: 0 | 1): void;
}

/**
 * Dibuja el `DialogState` en el DOM del cuadro de diálogo. Se llama cada frame,
 * pero solo toca el DOM cuando algo cambió.
 */
export class DialogView {
  readonly #box: HTMLElement;
  readonly #speaker: HTMLElement;
  readonly #lines: HTMLElement[];
  readonly #arrow: HTMLElement;
  readonly #choice: HTMLElement;
  readonly #options: HTMLButtonElement[];
  readonly #announcer: HTMLElement | null;
  #lastKey = '';
  #lastPageAnnounced = '';

  constructor(root: ParentNode, handlers: DialogHandlers, announcer: HTMLElement | null = null) {
    this.#box = required(root, '[data-dialog]');
    this.#speaker = required(root, '[data-dialog-speaker]');
    this.#lines = all(root, '[data-dialog-line]');
    this.#arrow = required(root, '[data-dialog-arrow]');
    this.#choice = required(root, '[data-choice]');
    this.#options = all<HTMLButtonElement>(root, '[data-choice-option]');
    this.#announcer = announcer;
    this.#box.addEventListener('click', () => handlers.onConfirm());
    this.#options.forEach((option, index) => {
      option.addEventListener('click', (event) => {
        event.stopPropagation();
        handlers.onChoose(index === 0 ? 0 : 1);
      });
    });
  }

  render(dialog: DialogState | null): void {
    if (!dialog) {
      if (this.#lastKey !== 'closed') {
        this.#box.hidden = true;
        this.#choice.hidden = true;
        this.#box.removeAttribute('data-phase');
        this.#lastKey = 'closed';
        this.#lastPageAnnounced = '';
      }
      return;
    }
    const visible = dialog.visibleLines();
    const key = `${dialog.pageIndex}|${dialog.phase}|${dialog.choiceIndex}|${visible.join('\n')}`;
    if (key === this.#lastKey) return;
    this.#lastKey = key;

    this.#box.hidden = false;
    this.#box.dataset['phase'] = dialog.phase;
    const speaker = dialog.script.speaker ?? '';
    this.#speaker.textContent = speaker;
    this.#speaker.hidden = speaker === '';
    this.#lines.forEach((line, index) => {
      line.textContent = visible[index] ?? '';
    });
    this.#arrow.hidden = dialog.phase !== 'waiting';

    const choosing = dialog.phase === 'choosing';
    this.#choice.hidden = !choosing;
    if (choosing && dialog.script.choice) {
      const labels = [dialog.script.choice.yes, dialog.script.choice.no];
      this.#options.forEach((option, index) => {
        option.textContent = labels[index] ?? '';
        const selected = dialog.choiceIndex === index;
        option.setAttribute('aria-selected', String(selected));
        option.dataset['selected'] = String(selected);
      });
    }

    // Lectores de pantalla: cada página se anuncia entera una sola vez.
    const pageText = dialog.currentPage.join(' ');
    const pageKey = `${dialog.pageIndex}:${pageText}`;
    if (this.#announcer && dialog.phase !== 'typing' && pageKey !== this.#lastPageAnnounced) {
      this.#lastPageAnnounced = pageKey;
      const prefix = speaker ? `${speaker}: ` : '';
      const suffix = choosing ? ' Elige Sí o No.' : '';
      this.#announcer.textContent = `${prefix}${pageText}${suffix}`;
    }
  }
}
