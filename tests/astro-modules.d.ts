/**
 * `tsc` (TypeScript 7) no sabe leer archivos `.astro`: de eso se encarga `astro check`.
 * Para que los tests que importan componentes compilen con `tsc`, se declaran como
 * componentes de Astro genéricos (que es lo que recibe la Container API).
 */
declare module '*.astro' {
  import type { AstroComponentFactory } from 'astro/runtime/server/index.js';

  const component: AstroComponentFactory;
  export default component;
}
