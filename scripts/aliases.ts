/**
 * Enseña a Node los alias de `tsconfig.json` (`@/` → `src/`) para los scripts que corre
 * directamente. Se carga antes del script con `node --import ./scripts/aliases.ts`.
 */
import { registerHooks } from 'node:module';

const SRC = new URL('../src/', import.meta.url);

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) return nextResolve(new URL(specifier.slice(2), SRC).href, context);
    return nextResolve(specifier, context);
  },
});
