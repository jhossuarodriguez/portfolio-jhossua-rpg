/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

/**
 * Tres proyectos de Vitest:
 *  - unit:        lógica pura (motor, arte, datos) en Node.
 *  - components:  componentes .astro renderizados con la Container API de Astro.
 *  - functional:  flujos completos (UI + simulación del juego) sobre un DOM de happy-dom.
 * Los e2e (tests/e2e/*.e2e.ts) los corre TesterArmy e2e, no Vitest.
 */
export default getViteConfig({
  test: {
    projects: [
      {
        extends: true,
        test: { name: 'unit', include: ['tests/unit/**/*.test.ts'], environment: 'node' },
      },
      {
        extends: true,
        test: { name: 'components', include: ['tests/components/**/*.test.ts'], environment: 'node' },
      },
      {
        extends: true,
        test: {
          name: 'functional',
          include: ['tests/functional/**/*.test.ts'],
          environment: './tests/support/happy-dom-ssr.ts',
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // three.js necesita WebGL real: su capa se cubre en los e2e.
      exclude: ['src/game/render/world-renderer.ts', 'src/game/engine.ts', 'src/scripts/main.ts'],
      reporter: ['text', 'html'],
      thresholds: { lines: 85, functions: 85, branches: 75, statements: 85 },
    },
  },
});
