import { builtinEnvironments, type Environment } from 'vitest/runtime';

/**
 * happy-dom con el transform SSR de Vite. Así los `.astro` se compilan como en el
 * servidor (la Container API los puede renderizar) y, a la vez, los controladores
 * del cliente tienen un DOM completo (window, document, eventos) para los tests funcionales.
 */
const environment: Environment = {
  ...builtinEnvironments['happy-dom'],
  name: 'happy-dom-ssr',
  viteEnvironment: 'ssr',
};

export default environment;
