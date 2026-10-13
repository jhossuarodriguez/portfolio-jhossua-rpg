import { type Browser, test } from '@e2e-dev/web';
import { describe, expect } from 'e2e';

/** Estado del juego que el motor publica en `data-*` de la pantalla de arriba. */
async function world(browser: Browser): Promise<Record<string, string>> {
  return browser.evaluate(() => {
    const element = document.querySelector<HTMLElement>('[data-top-screen]');
    return { ...(element?.dataset ?? {}) } as Record<string, string>;
  });
}

/** Espera a que haya un diálogo y pulsa Enter hasta cerrarlo (la presentación tiene varias páginas). */
async function skipDialog(browser: Browser): Promise<void> {
  await expect(browser.locator('[data-top-screen]')).toHaveAttribute('data-dialog-state', 'open', { timeout: 10_000 });
  await expect
    .poll(
      async () => {
        await browser.keyboard.press('Enter');
        return (await world(browser))['dialogState'];
      },
      { timeout: 20_000, interval: 150, message: 'el diálogo debería cerrarse con Enter' },
    )
    .toBe('closed');
}

describe('el pueblo', { tags: ['juego'] }, () => {
  test('START lleva del título al pueblo y presenta a Jhossua', async ({ app, screen, browser }) => {
    await app.open('/');
    const top = browser.locator('[data-top-screen]');
    await expect(top).toHaveAttribute('data-ready', 'true', { timeout: 20_000 });
    await expect(top).toHaveAttribute('data-scene', 'title');

    await screen.getByRole('button', 'Pulsa START').tap();
    await expect(top).toHaveAttribute('data-scene', 'world');
    await expect(top).toHaveAttribute('data-dialog-state', 'open');
    await expect(browser.locator('[data-dialog-speaker]')).toHaveText('Jhossua');
    await expect(top).toHaveAttribute('data-zone', 'Barrio Norte');
  });

  test('con el teclado se camina por la calle', async ({ app, browser }) => {
    await app.open('/');
    await expect(browser.locator('[data-top-screen]')).toHaveAttribute('data-ready', 'true', { timeout: 20_000 });
    await browser.keyboard.press('Enter');
    await skipDialog(browser);
    const start = await world(browser);

    // Cada toque corto gira o da un paso, como en la consola.
    // Abajo hasta la Calle de las Damas y luego a la derecha por la calle.
    const pressUntil = async (key: string, read: () => Promise<number>, target: number): Promise<void> => {
      await expect
        .poll(
          async () => {
            await browser.keyboard.press(key);
            return read();
          },
          { timeout: 10_000, interval: 300 },
        )
        .toBeGreaterThanOrEqual(target);
    };
    await pressUntil('ArrowDown', async () => Number((await world(browser))['playerY']), Number(start['playerY']) + 1);
    await pressUntil('ArrowRight', async () => Number((await world(browser))['playerX']), Number(start['playerX']) + 2);
    expect((await world(browser))['facing']).toBe('right');
  });

  test('"Ir al edificio" camina solo hasta Tenax y abre su ficha con "Sí"', async ({ app, screen, browser }) => {
    await app.open('/');
    await expect(browser.locator('[data-top-screen]')).toHaveAttribute('data-ready', 'true', { timeout: 20_000 });
    await screen.getByRole('link', /^Proyectos/).tap();
    await screen.getByRole('link', /^Tenax Construction/).tap();
    await screen.getByRole('button', 'Ir al edificio').tap();

    // El piloto automático cruza medio pueblo y toca la puerta.
    await expect(browser.locator('[data-dialog-speaker]')).toHaveText('Tenax Construction', { timeout: 30_000 });
    const atDoor = await world(browser);
    expect(atDoor['facing']).toBe('up');
    expect(`${atDoor['playerX']},${atDoor['playerY']}`).toBe('12,28');

    // Avanza hasta la pregunta y responde "Sí".
    const yes = screen.getByRole('option', 'Sí');
    await expect
      .poll(
        async () => {
          if (await yes.isVisible()) return true;
          await browser.keyboard.press('Enter');
          return false;
        },
        { timeout: 15_000, interval: 200 },
      )
      .toBe(true);
    await browser.keyboard.press('Enter');

    await expect(screen.getByRole('heading', 'Tenax Construction')).toBeVisible();
    await expect(screen.getByText(/^Visitados \d+\/\d+$/)).toContainText('1/11');
  });

  test('el mapa de la pantalla táctil también lleva a los edificios', async ({ app, screen, browser }) => {
    await app.open('/');
    await expect(browser.locator('[data-top-screen]')).toHaveAttribute('data-ready', 'true', { timeout: 20_000 });
    await screen.getByRole('link', /^Mapa/).tap();
    await screen.getByRole('button', 'Ir a Correo').first().tap();
    await expect(browser.locator('[data-dialog-speaker]')).toHaveText('Correo', { timeout: 30_000 });
  });
});
