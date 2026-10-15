import { test } from '@e2e-dev/web';
import { describe, expect } from 'e2e';

/**
 * La pantalla táctil es el portafolio "de toda la vida": tiene que funcionar
 * sin jugar, con ratón, dedo o teclado.
 */
describe('pantalla táctil', { tags: ['portafolio'] }, () => {
  test('abre con el nombre, el rol y el menú', async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Jhossua Roa Rodriguez')).toBeVisible();
    await expect(screen.getByRole('navigation', 'Secciones del portafolio')).toBeVisible();
    await expect(screen.getByText(/^Visitados \d+\/\d+$/)).toContainText('0/11');
  });

  test('de la lista de proyectos a la ficha de Maps For Mom, y de vuelta', async ({ app, screen }) => {
    await app.open('/');
    await screen.getByRole('link', /^Proyectos/).tap();
    await expect(screen.getByRole('heading', 'Proyectos')).toBeVisible();

    await screen.getByRole('link', /^Maps For Mom/).tap();
    await expect(screen.getByRole('heading', 'Maps For Mom')).toBeVisible();
    await expect(screen.getByRole('link', /Ver sitio/)).toHaveAttribute('href', 'https://mapsformom.com');
    await expect(screen.getByRole('link', /Ver código/)).toHaveAttribute(
      'href',
      'https://github.com/jhossuarodriguez/maps-for-mom',
    );

    await screen.getByRole('button', 'Atrás').tap();
    await expect(screen.getByRole('heading', 'Proyectos')).toBeVisible();
    await screen.getByRole('button', 'Menú').tap();
    await expect(screen.getByRole('heading', 'Jhossua Roa Rodriguez')).toBeVisible();
  });

  test('contacto con correo y redes', async ({ app, screen }) => {
    await app.open('/');
    await screen.getByRole('link', /^Contacto/).tap();
    await expect(screen.getByRole('link', /Escribir a/)).toHaveAttribute('href', 'mailto:jhossuarodriguezz@gmail.com');
    await expect(screen.getByRole('link', /GitHub/)).toHaveAttribute('href', 'https://github.com/jhossuarodriguez');
    await expect(screen.getByRole('link', /LinkedIn/)).toHaveAttribute('target', '_blank');
  });

  test('las opciones se recuerdan al recargar', async ({ app, screen, browser }) => {
    await app.open('/');
    await screen.getByRole('link', /^Opciones/).tap();
    await screen.getByLabel('Estación').selectOption({ value: 'winter' });
    await expect(browser.locator('[data-top-screen]')).toHaveAttribute('data-season', 'winter');
    await browser.reload();
    await screen.getByRole('link', /^Opciones/).tap();
    await expect(screen.getByLabel('Estación')).toHaveValue('winter');
  });

  test('el enlace "Saltar al contenido" lleva el foco a la pantalla táctil', async ({ app, browser }) => {
    await app.open('/');
    await browser.keyboard.press('Tab');
    await expect(browser.locator('a[href="#pantalla-tactil"]')).toBeFocused();
    await browser.keyboard.press('Enter');
    await browser.waitForURL(/#pantalla-tactil$/);
  });
});
