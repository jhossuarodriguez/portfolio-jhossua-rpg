import { within } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { renderToHtml } from '@tests/support/dom.ts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BottomScreen from '@/components/BottomScreen.astro';
import { PROJECTS } from '@/data/projects.ts';
import { DEFAULT_SETTINGS } from '@/game/ui/settings.ts';
import { TouchScreen, type TouchScreenHandlers } from '@/game/ui/touch-screen.ts';

let html = '';

async function mount(): Promise<{
  root: HTMLElement;
  touch: TouchScreen;
  handlers: { [K in keyof TouchScreenHandlers]-?: ReturnType<typeof vi.fn> };
  announcer: HTMLElement;
}> {
  html ||= await renderToHtml(BottomScreen);
  document.documentElement.className = 'js';
  document.body.innerHTML = html;
  const root = document.querySelector<HTMLElement>('[data-touch-screen]');
  if (!root) throw new Error('No se montó la pantalla táctil');
  const announcer = document.createElement('p');
  document.body.append(announcer);
  const handlers = {
    onWalkTo: vi.fn(),
    onSettingsChange: vi.fn(),
    onResetVisited: vi.fn(),
    onViewChange: vi.fn(),
  };
  const touch = new TouchScreen(root, handlers, announcer);
  return { root, touch, handlers, announcer };
}

function activeView(root: HTMLElement): string {
  const active = root.querySelector<HTMLElement>('[data-view][data-active]');
  return active?.dataset['view'] === 'project'
    ? `project:${active.dataset['projectId']}`
    : (active?.dataset['view'] ?? '');
}

describe('pantalla táctil', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('empieza en el menú, con "Atrás" desactivado', async () => {
    const { root, touch } = await mount();
    expect(touch.current).toBe('home');
    expect(activeView(root)).toBe('home');
    expect(within(root).getByRole('button', { name: 'Atrás' })).toHaveProperty('disabled', true);
    expect(root.querySelectorAll('[data-view][data-active]')).toHaveLength(1);
  });

  it('navega del menú a la lista, a un proyecto y vuelve atrás', async () => {
    const user = userEvent.setup();
    const { root, touch, handlers, announcer } = await mount();
    await user.click(within(root).getByRole('link', { name: /Proyectos/ }));
    expect(activeView(root)).toBe('projects');
    expect(announcer.textContent).toBe('Pantalla táctil: Proyectos');

    await user.click(within(root).getByRole('link', { name: /Maps For Mom/ }));
    expect(touch.current).toBe('project:maps-for-mom');
    expect(handlers.onViewChange).toHaveBeenLastCalledWith('project:maps-for-mom');
    expect(document.activeElement?.textContent).toBe('Maps For Mom');

    await user.click(within(root).getByRole('button', { name: 'Atrás' }));
    expect(activeView(root)).toBe('projects');
    await user.click(within(root).getByRole('button', { name: 'Menú' }));
    expect(activeView(root)).toBe('home');
  });

  it('los enlaces del menú no saltan de ancla cuando hay JavaScript', async () => {
    const { root } = await mount();
    const link = within(root).getByRole('link', { name: /Contacto/ });
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    link.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(activeView(root)).toBe('contact');
  });

  it('"Ir al edificio" y los marcadores del mapa piden caminar', async () => {
    const user = userEvent.setup();
    const { root, touch, handlers } = await mount();
    touch.show('project:tenax-construction');
    await user.click(within(root).getByRole('button', { name: 'Ir al edificio' }));
    expect(handlers.onWalkTo).toHaveBeenCalledWith('tenax-construction');

    touch.show('map');
    await user.click(within(root).getByRole('button', { name: 'Ir a Correo' }));
    expect(handlers.onWalkTo).toHaveBeenLastCalledWith('post-office');
  });

  it('una vista desconocida vuelve al menú', async () => {
    const { root, touch } = await mount();
    touch.show('project:no-existe');
    expect(activeView(root)).toBe('home');
  });

  it('marca los proyectos visitados y actualiza el contador', async () => {
    const { root, touch } = await mount();
    touch.setVisited(['mimes', 'maps-for-mom'], PROJECTS.length);
    expect(root.querySelector('[data-visited-count]')?.textContent).toBe('2');
    const marks = root.querySelectorAll<HTMLElement>('[data-visited-mark="mimes"]');
    expect(marks.length).toBeGreaterThan(0);
    for (const mark of marks) {
      expect(mark.dataset['visited']).toBe('true');
      expect(mark.getAttribute('aria-label')).toBe('Visitado');
    }
    expect(root.querySelector<HTMLElement>('[data-visited-mark="tenax-construction"]')?.dataset['visited']).toBe(
      'false',
    );
  });

  it('las opciones se leen, se escriben y avisan al cambiar', async () => {
    const user = userEvent.setup();
    const { root, touch, handlers } = await mount();
    touch.writeSettings({ ...DEFAULT_SETTINGS, sound: true, season: 'winter' });
    expect(touch.readSettings()).toEqual({ ...DEFAULT_SETTINGS, sound: true, season: 'winter' });

    touch.show('options');
    await user.selectOptions(within(root).getByLabelText('Velocidad del texto'), 'fast');
    expect(handlers.onSettingsChange).toHaveBeenLastCalledWith({
      ...DEFAULT_SETTINGS,
      sound: true,
      season: 'winter',
      textSpeed: 'fast',
    });
    await user.click(within(root).getByLabelText('Sonido'));
    expect(handlers.onSettingsChange).toHaveBeenLastCalledWith(expect.objectContaining({ sound: false }));
  });

  it('borrar visitados pide confirmación al controlador', async () => {
    const user = userEvent.setup();
    const { root, touch, handlers } = await mount();
    touch.show('options');
    await user.click(within(root).getByRole('button', { name: 'Borrar proyectos visitados' }));
    expect(handlers.onResetVisited).toHaveBeenCalledOnce();
  });

  it('la barra de estado muestra hora y estación', async () => {
    const { root, touch } = await mount();
    touch.setStatus('09:30', 'Otoño');
    expect(root.querySelector('[data-clock]')?.textContent).toBe('09:30');
    expect(root.querySelector('[data-season-label]')?.textContent).toBe('Otoño');
  });
});
