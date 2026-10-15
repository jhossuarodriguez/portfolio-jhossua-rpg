import userEvent from '@testing-library/user-event';
import { renderToHtml } from '@tests/support/dom.ts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TopScreen from '@/components/TopScreen.astro';
import { DialogState, paginate } from '@/game/core/dialog.ts';
import { DialogView } from '@/game/ui/dialog-view.ts';

const measure = (text: string): number => text.length * 6;
let html = '';

async function mount(): Promise<{
  root: HTMLElement;
  view: DialogView;
  announcer: HTMLElement;
  onConfirm: ReturnType<typeof vi.fn>;
  onChoose: ReturnType<typeof vi.fn>;
}> {
  html ||= await renderToHtml(TopScreen);
  document.body.innerHTML = html;
  const root = document.querySelector<HTMLElement>('[data-top-screen]');
  if (!root) throw new Error('No se montó la pantalla superior');
  const announcer = document.createElement('p');
  document.body.append(announcer);
  const onConfirm = vi.fn();
  const onChoose = vi.fn();
  return { root, view: new DialogView(root, { onConfirm, onChoose }, announcer), announcer, onConfirm, onChoose };
}

function dialogFor(lines: string[], options: { choice?: boolean; speaker?: string; cps?: number } = {}): DialogState {
  const script = {
    lines,
    ...(options.speaker ? { speaker: options.speaker } : {}),
    ...(options.choice ? { choice: { yes: 'Sí', no: 'No' } } : {}),
  };
  return new DialogState(script, paginate(lines, 220, measure), { charsPerSecond: options.cps ?? 40 });
}

describe('cuadro de diálogo', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('está oculto sin diálogo', async () => {
    const { root, view } = await mount();
    view.render(null);
    expect(root.querySelector<HTMLElement>('[data-dialog]')?.hidden).toBe(true);
    expect(root.querySelector<HTMLElement>('[data-choice]')?.hidden).toBe(true);
  });

  it('muestra el texto letra por letra y la flecha al terminar la página', async () => {
    const { root, view } = await mount();
    const dialog = dialogFor(['Hola, soy Jhossua.'], { speaker: 'Jhossua' });
    dialog.update(100);
    view.render(dialog);
    const box = root.querySelector<HTMLElement>('[data-dialog]');
    const line = root.querySelector('[data-dialog-line]');
    const arrow = root.querySelector<HTMLElement>('[data-dialog-arrow]');
    expect(box?.hidden).toBe(false);
    expect(box?.dataset['phase']).toBe('typing');
    expect(line?.textContent).toBe('Hola');
    expect(arrow?.hidden).toBe(true);
    expect(root.querySelector('[data-dialog-speaker]')?.textContent).toBe('Jhossua');

    dialog.update(5000);
    view.render(dialog);
    expect(line?.textContent).toBe('Hola, soy Jhossua.');
    expect(arrow?.hidden).toBe(false);
  });

  it('anuncia cada página completa una sola vez', async () => {
    const { view, announcer } = await mount();
    const dialog = dialogFor(['Bienvenido a Ciudad Primada.'], { speaker: 'Guía' });
    view.render(dialog);
    expect(announcer.textContent).toBe('');
    dialog.update(5000);
    view.render(dialog);
    expect(announcer.textContent).toBe('Guía: Bienvenido a Ciudad Primada.');
    announcer.textContent = '';
    view.render(dialog);
    expect(announcer.textContent).toBe('');
  });

  it('en la pregunta muestra Sí/No con la selección marcada', async () => {
    const { root, view, announcer } = await mount();
    const dialog = dialogFor(['¿Ver el proyecto?'], { choice: true, cps: Number.POSITIVE_INFINITY });
    view.render(dialog);
    const options = root.querySelectorAll<HTMLElement>('[data-choice-option]');
    expect(root.querySelector<HTMLElement>('[data-choice]')?.hidden).toBe(false);
    expect(options[0]?.getAttribute('aria-selected')).toBe('true');
    expect(announcer.textContent).toContain('Elige Sí o No');
    dialog.moveChoice('down');
    view.render(dialog);
    expect(options[1]?.dataset['selected']).toBe('true');
  });

  it('tocar el cuadro confirma y tocar una opción elige', async () => {
    const user = userEvent.setup();
    const { root, view, onConfirm, onChoose } = await mount();
    view.render(dialogFor(['¿Ver el proyecto?'], { choice: true, cps: Number.POSITIVE_INFINITY }));
    const box = root.querySelector<HTMLElement>('[data-dialog]');
    if (box) await user.click(box);
    expect(onConfirm).toHaveBeenCalledOnce();
    const no = root.querySelectorAll<HTMLElement>('[data-choice-option]')[1];
    if (no) await user.click(no);
    expect(onChoose).toHaveBeenCalledWith(1);
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('al cerrarse vuelve a ocultarse', async () => {
    const { root, view } = await mount();
    view.render(dialogFor(['Hola']));
    view.render(null);
    expect(root.querySelector<HTMLElement>('[data-dialog]')?.hidden).toBe(true);
    expect(root.querySelector<HTMLElement>('[data-dialog]')?.dataset['phase']).toBeUndefined();
  });
});
