import { PROFILE } from '@/data/profile.ts';
import type { DialogScript } from '@/game/core/dialog.ts';

/** Presentación al pulsar START. Las instrucciones cambian según haya pantalla táctil o teclado. */
export function introScript(isTouch: boolean): DialogScript {
  return {
    speaker: PROFILE.shortName,
    lines: [
      `¡Hola! Soy ${PROFILE.shortName}, ${PROFILE.role} de Santo Domingo.`,
      'Bienvenido a Ciudad Primada: cada edificio del pueblo es uno de mis proyectos.',
      isTouch
        ? 'Muévete con la cruceta, toca A para hablar o leer carteles y mantén B para correr.'
        : 'Muévete con las flechas o WASD, pulsa Z o Enter para hablar y mantén X o Shift para correr.',
      'En la pantalla de abajo tienes el mapa, mis proyectos y cómo contactarme. ¡A explorar!',
    ],
  };
}

/** Premio por visitar todos los proyectos. */
export const COMPLETE_SCRIPT: DialogScript = {
  speaker: PROFILE.shortName,
  lines: [
    '¡Visitaste todos los proyectos de Ciudad Primada!',
    'Gracias por explorar. Si te gustó lo que viste, hablemos.',
    '¿Abrir mis contactos?',
  ],
  choice: { yes: 'Sí', no: 'No' },
};
