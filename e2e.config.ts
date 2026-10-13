import { web } from '@e2e-dev/web';
import { gateway } from 'ai';
import type { E2EConfig } from 'e2e';
import { localChrome } from './tests/e2e/support/local-chrome.ts';

/**
 * Tests e2e con TesterArmy e2e (https://e2e.tester.army/docs).
 *
 * - `pnpm test:e2e`        → tests deterministas (locators + expect), sin modelo ni API key.
 * - `pnpm test:e2e:agent`  → tests con agente (`agent.act` / `agent.assert`), etiqueta `agent`.
 *                            Necesitan AI_GATEWAY_API_KEY (o cambia el modelo abajo).
 *
 * Variables útiles:
 * - APP_URL           probar contra un despliegue (por ejemplo, un preview de Vercel) en vez del build local.
 * - E2E_CHROME_PATH   usar un Chrome instalado en vez del Chromium que descarga Playwright.
 * - E2E_MODEL         modelo del agente en Vercel AI Gateway.
 */

const chromePath = process.env['E2E_CHROME_PATH'];
const browser = chromePath ? { browser: localChrome(chromePath) } : {};

// Un solo servidor para los dos tamaños de pantalla: los targets con el mismo `command` lo comparten
// (`astro preview` no admite dos instancias del mismo proyecto a la vez).
const port = process.env['E2E_PORT'] ?? '4329';
const app = process.env['APP_URL']
  ? { url: process.env['APP_URL'] }
  : {
      url: `http://127.0.0.1:${port}`,
      command: {
        executable: 'pnpm',
        args: ['run', 'serve:e2e', '--port', port],
        log: '.e2e/logs/app.log',
        startupTimeout: 120_000,
      },
    };

export default {
  tests: 'tests/e2e/**/*.e2e.ts',
  targets: [
    { name: 'escritorio', engine: web({ viewport: { width: 1440, height: 900 }, locale: 'es-DO', ...browser }), app },
    { name: 'movil', engine: web({ viewport: { width: 390, height: 844 }, locale: 'es-DO', ...browser }), app },
  ],
  agents: {
    default: {
      model: gateway(process.env['E2E_MODEL'] ?? 'openai/gpt-6-luna-fast'),
      context:
        'Es el portafolio de Jhossua: una consola de dos pantallas. Arriba, un pueblo 2D (Ciudad Primada) donde cada ' +
        'edificio es un proyecto; abajo, una "pantalla táctil" con menú, lista de proyectos, mapa y contacto. ' +
        'En el juego: flechas para moverse, Enter para hablar o aceptar, X para cancelar.',
    },
  },
  timeout: 90_000,
  reporters: ['list', 'markdown', 'junit'],
} satisfies E2EConfig;
