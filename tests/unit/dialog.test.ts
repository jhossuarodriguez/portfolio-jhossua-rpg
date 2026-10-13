import { describe, expect, it } from 'vitest';
import { DialogState, paginate, wrapText } from '../../src/game/core/dialog.ts';

const measure = (text: string): number => text.length;

describe('wrapText', () => {
  it('parte por palabras sin pasarse del ancho', () => {
    const lines = wrapText('Cada edificio es un proyecto de Jhossua', 12, measure);
    expect(lines).toEqual(['Cada', 'edificio es', 'un proyecto', 'de Jhossua']);
    for (const line of lines) expect(line.length).toBeLessThanOrEqual(12);
  });

  it('corta las palabras más largas que la línea', () => {
    expect(wrapText('https://github.com/jhossuarodriguez', 10, measure)).toEqual([
      'https://gi',
      'thub.com/j',
      'hossuarodr',
      'iguez',
    ]);
  });

  it('normaliza espacios', () => {
    expect(wrapText('  hola   mundo  ', 20, measure)).toEqual(['hola mundo']);
  });
});

describe('paginate', () => {
  it('agrupa de a 2 líneas y cada párrafo empieza página', () => {
    const pages = paginate(['uno dos tres cuatro cinco', 'seis'], 9, measure);
    expect(pages).toEqual([['uno dos', 'tres'], ['cuatro', 'cinco'], ['seis']]);
  });

  it('nunca devuelve cero páginas', () => {
    expect(paginate([], 10, measure)).toEqual([['…']]);
  });
});

describe('DialogState', () => {
  const script = { lines: ['Hola', 'Adiós'] };
  const pages = paginate(script.lines, 20, measure);

  it('escribe letra por letra, espera y pasa de página', () => {
    const dialog = new DialogState(script, pages, { charsPerSecond: 10 });
    expect(dialog.phase).toBe('typing');
    expect(dialog.visibleLines()).toEqual(['']);
    dialog.update(200);
    expect(dialog.visibleLines()).toEqual(['Ho']);
    dialog.update(1000);
    expect(dialog.phase).toBe('waiting');
    expect(dialog.visibleLines()).toEqual(['Hola']);
    dialog.confirm();
    expect(dialog.pageIndex).toBe(1);
    expect(dialog.phase).toBe('typing');
  });

  it('A durante la escritura completa la página; en la última, cierra', () => {
    const dialog = new DialogState(script, pages, { charsPerSecond: 10 });
    dialog.confirm();
    expect(dialog.phase).toBe('waiting');
    dialog.confirm();
    dialog.confirm();
    dialog.confirm();
    expect(dialog.phase).toBe('done');
    expect(dialog.result).toBe('closed');
    expect(dialog.isLastPage).toBe(true);
  });

  it('con movimiento reducido muestra cada página entera', () => {
    const dialog = new DialogState(script, pages, { charsPerSecond: Number.POSITIVE_INFINITY });
    expect(dialog.phase).toBe('waiting');
    dialog.confirm();
    expect(dialog.phase).toBe('waiting');
    expect(dialog.visibleLines()).toEqual(['Adiós']);
  });

  it('la pregunta final se responde con arriba/abajo y A, o con B (= No)', () => {
    const question = { lines: ['¿Ver el proyecto?'], choice: { yes: 'Sí', no: 'No' } };
    const make = (): DialogState =>
      new DialogState(question, paginate(question.lines, 40, measure), { charsPerSecond: Number.POSITIVE_INFINITY });

    const yes = make();
    expect(yes.phase).toBe('choosing');
    yes.confirm();
    expect(yes.result).toBe('yes');

    const no = make();
    no.moveChoice('down');
    expect(no.choiceIndex).toBe(1);
    no.confirm();
    expect(no.result).toBe('no');

    const cancelled = make();
    cancelled.cancel();
    expect(cancelled.result).toBe('no');

    const clicked = make();
    clicked.choose(1);
    expect(clicked.result).toBe('no');
  });

  it('moveChoice y choose no hacen nada fuera de la pregunta', () => {
    const dialog = new DialogState(script, pages, { charsPerSecond: 10 });
    dialog.moveChoice('down');
    dialog.choose(1);
    expect(dialog.choiceIndex).toBe(0);
    expect(dialog.result).toBeNull();
    dialog.cancel();
    expect(dialog.phase).toBe('waiting');
  });

  it('exige al menos una página', () => {
    expect(() => new DialogState(script, [], { charsPerSecond: 10 })).toThrow();
  });
});
