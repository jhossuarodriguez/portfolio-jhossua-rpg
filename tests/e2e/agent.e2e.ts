import { test } from '@e2e-dev/web';
import { describe, expect } from 'e2e';

/**
 * Tests con agente: describen la intención en lenguaje natural y el agente de
 * TesterArmy decide los clics. Necesitan un modelo (ver `e2e.config.ts`), así que
 * llevan la etiqueta `agent` y se corren aparte: `pnpm test:e2e:agent`.
 * Tras la primera pasada verificada, `agent.act` se repite desde la caché sin llamar al modelo.
 */
describe('recorridos con agente', { tags: ['agent'] }, () => {
  test('un reclutador encuentra cómo contactar a Jhossua', async ({ app, agent, screen }) => {
    await app.open('/');
    await agent.act('open the contact section of the portfolio using the touch screen menu');
    await agent.assert('the screen shows a way to email Jhossua and links to GitHub and LinkedIn');
    await expect(screen.getByRole('link', /Escribir a/)).toHaveAttribute('href', 'mailto:jhossuarodriguezz@gmail.com');
  });

  test('un visitante juega hasta el edificio de MiMes', async ({ app, agent, screen }) => {
    await app.open('/');
    await agent.act('start the game, then use the touch screen map to walk to the MiMes building');
    await agent.act('answer yes when the game asks to see the project');
    await agent.assert('the touch screen shows the MiMes project: an iPhone personal finance app');
    await expect(screen.getByRole('heading', 'MiMes')).toBeVisible();
  });

  test('la ficha de cada proyecto explica qué es y con qué está hecho', async ({ app, agent }) => {
    await app.open('/');
    await agent.act('open the projects list and then the Administrador de Licencias project');
    await agent.assert('the project details mention license management and list Next.js among its technologies');
  });
});
