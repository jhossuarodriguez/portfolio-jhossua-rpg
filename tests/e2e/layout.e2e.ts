import { test } from '@e2e-dev/web';
import { expect } from 'e2e';

/** La consola elige su forma según la pantalla y escala el pixel art sin desbordar. */
test('la consola cabe en la ventana y usa la forma adecuada', { tags: ['layout'] }, async ({ app, browser }) => {
  await app.open('/');
  const width = await browser.evaluate(() => window.innerWidth);
  const console = browser.locator('[data-console]');
  if (width < 720) await expect(console).toHaveAttribute('data-layout', 'stacked');
  else await expect(console).toHaveAttribute('data-layout', /^(ds|side)$/);

  const fits = await browser.evaluate(() => {
    const top = document.querySelector('[data-top-screen]')?.getBoundingClientRect();
    const bottom = document.querySelector('[data-touch-screen]')?.getBoundingClientRect();
    if (!top || !bottom) return false;
    const ratio = top.width / top.height;
    return (
      top.right <= window.innerWidth + 1 &&
      bottom.right <= window.innerWidth + 1 &&
      Math.abs(ratio - 4 / 3) < 0.02 &&
      document.documentElement.scrollWidth <= window.innerWidth
    );
  });
  expect(fits).toBe(true);
});

test('los controles en pantalla mueven al personaje', { tags: ['layout', 'juego'] }, async ({
  app,
  screen,
  browser,
}) => {
  await app.open('/');
  const top = browser.locator('[data-top-screen]');
  await expect(top).toHaveAttribute('data-ready', 'true', { timeout: 20_000 });
  await screen.getByRole('button', 'Start: abrir el menú').tap();
  await expect(top).toHaveAttribute('data-scene', 'world');
  await expect(top).toHaveAttribute('data-dialog-state', 'open');
  // A cierra la presentación página a página.
  await expect
    .poll(
      async () => {
        await screen.getByRole('button', 'A: hablar o confirmar').tap();
        return top.getAttribute('data-dialog-state');
      },
      { timeout: 20_000, interval: 150 },
    )
    .toBe('closed');
  await screen.getByRole('button', 'Abajo').longPress({ duration: 900 });
  await expect
    .poll(async () => Number(await top.getAttribute('data-player-y')), { timeout: 5_000 })
    .toBeGreaterThan(10);
});
