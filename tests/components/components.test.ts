import { within } from '@testing-library/dom';
import { describe, expect, it } from 'vitest';
import BottomScreen from '../../src/components/BottomScreen.astro';
import Console from '../../src/components/Console.astro';
import ControlPad from '../../src/components/ControlPad.astro';
import PixelIcon from '../../src/components/PixelIcon.astro';
import ProjectDetail from '../../src/components/ProjectDetail.astro';
import TopScreen from '../../src/components/TopScreen.astro';
import { PROFILE } from '../../src/data/profile.ts';
import { PROJECTS, requireProject } from '../../src/data/projects.ts';
import { PRIMADA } from '../../src/game/world/primada.ts';
import { renderComponent } from '../support/dom.ts';

describe('<PixelIcon>', () => {
  it('es un SVG decorativo de un solo path', async () => {
    const { root } = await renderComponent(PixelIcon, { name: 'mail' });
    const svg = root.querySelector('svg');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(svg?.getAttribute('viewBox')).toBe('0 0 8 8');
    expect(root.querySelectorAll('path')).toHaveLength(1);
    expect(root.querySelector('path')?.getAttribute('d')).toMatch(/^M\d/);
  });
});

describe('<ProjectDetail>', () => {
  it('muestra la ficha completa de un proyecto en producción', async () => {
    const project = requireProject('tenax-construction');
    const { root } = await renderComponent(ProjectDetail, { project });
    const view = within(root);
    expect(view.getByRole('heading', { name: project.name })).toBeTruthy();
    expect(view.getByText('En producción')).toBeTruthy();
    for (const tech of project.stack) expect(view.getByText(tech)).toBeTruthy();
    for (const highlight of project.highlights) expect(view.getByText(highlight)).toBeTruthy();

    const site = view.getByRole('link', { name: /Ver sitio/ });
    expect(site.getAttribute('href')).toBe(project.liveUrl);
    expect(site.getAttribute('target')).toBe('_blank');
    expect(site.getAttribute('rel')).toContain('noopener');
    expect(view.getByRole('link', { name: /Ver código/ }).getAttribute('href')).toBe(project.repoUrl);
    expect(view.getByRole('button', { name: 'Ir al edificio' }).dataset['walkTo']).toBe(project.id);
  });

  it('no inventa enlaces que el proyecto no tiene', async () => {
    const { root } = await renderComponent(ProjectDetail, { project: requireProject('oficina-virtual') });
    const view = within(root);
    expect(view.queryByRole('link', { name: /Ver sitio/ })).toBeNull();
    expect(view.queryByRole('link', { name: /Ver código/ })).toBeNull();
    expect(view.getByText('En desarrollo')).toBeTruthy();
    expect(view.queryByRole('list', { name: 'Tecnologías' })).toBeNull();
  });
});

describe('<BottomScreen>', () => {
  it('el menú lleva a las seis secciones', async () => {
    const { root } = await renderComponent(BottomScreen);
    const nav = within(root).getByRole('navigation', { name: 'Secciones del portafolio' });
    const links = within(nav).getAllByRole('link');
    expect(links.map((link) => link.dataset['openView'])).toEqual([
      'projects',
      'map',
      'about',
      'skills',
      'contact',
      'options',
    ]);
  });

  it('lista todos los proyectos y tiene una ficha para cada uno', async () => {
    const { root } = await renderComponent(BottomScreen);
    expect(root.querySelectorAll('[data-open-project]')).toHaveLength(PROJECTS.length);
    const details = root.querySelectorAll<HTMLElement>('[data-view="project"]');
    expect([...details].map((detail) => detail.dataset['projectId'])).toEqual(PROJECTS.map((project) => project.id));
    expect(root.querySelector('[data-visited-total]')?.textContent).toBe(String(PROJECTS.length));
  });

  it('solo la vista de inicio está activa al cargar', async () => {
    const { root } = await renderComponent(BottomScreen);
    const active = root.querySelectorAll<HTMLElement>('[data-view][data-active]');
    expect(active).toHaveLength(1);
    expect(active[0]?.dataset['view']).toBe('home');
  });

  it('el mapa tiene un marcador por edificio con nombre accesible', async () => {
    const { root } = await renderComponent(BottomScreen);
    const markers = root.querySelectorAll<HTMLButtonElement>('.minimap__marker');
    expect(markers).toHaveLength(PRIMADA.buildings.length);
    for (const marker of markers) {
      expect(marker.getAttribute('aria-label')).toMatch(/^Ir a /);
      expect(marker.getAttribute('style')).toMatch(/left:[\d.]+%;top:[\d.]+%/);
    }
  });

  it('contacto: correo como mailto y redes en pestaña nueva', async () => {
    const { root } = await renderComponent(BottomScreen);
    const contact = within(root.querySelector<HTMLElement>('[data-view="contact"]') ?? root);
    const email = PROFILE.links.find((link) => link.id === 'email');
    expect(contact.getByRole('link', { name: new RegExp(email?.handle ?? '') }).getAttribute('href')).toBe(email?.url);
    const github = contact.getByRole('link', { name: /GitHub/ });
    expect(github.getAttribute('href')).toBe('https://github.com/jhossuarodriguez');
    expect(github.getAttribute('rel')).toContain('me');
  });

  it('el formulario de opciones tiene sus cuatro campos con etiqueta', async () => {
    const { root } = await renderComponent(BottomScreen);
    const form = within(root.querySelector<HTMLElement>('form[data-settings]') ?? root);
    expect(form.getByLabelText('Sonido')).toBeTruthy();
    expect(form.getByLabelText('Velocidad del texto')).toBeTruthy();
    expect(form.getByLabelText('Estación')).toBeTruthy();
    expect(form.getByLabelText('Hora del día')).toBeTruthy();
  });
});

describe('<TopScreen>', () => {
  it('lienzo de 256×192 oculto a lectores, con su descripción', async () => {
    const { root } = await renderComponent(TopScreen);
    const canvas = root.querySelector('canvas');
    expect(canvas?.getAttribute('width')).toBe('256');
    expect(canvas?.getAttribute('height')).toBe('192');
    expect(canvas?.getAttribute('aria-hidden')).toBe('true');
    const screen = root.querySelector<HTMLElement>('[data-top-screen]');
    expect(screen?.getAttribute('aria-describedby')).toBe('mundo-ayuda');
    expect(screen?.dataset['scene']).toBe('title');
  });

  it('pantalla de título con nombre, rol y START', async () => {
    const { root } = await renderComponent(TopScreen);
    const view = within(root);
    expect(view.getByText(PROFILE.shortName)).toBeTruthy();
    expect(view.getByText(PROFILE.role)).toBeTruthy();
    expect(view.getByRole('button', { name: 'Pulsa START' })).toBeTruthy();
  });

  it('el diálogo y la pregunta empiezan ocultos', async () => {
    const { root } = await renderComponent(TopScreen);
    expect(root.querySelector('[data-dialog]')?.hasAttribute('hidden')).toBe(true);
    expect(root.querySelector('[data-choice]')?.hasAttribute('hidden')).toBe(true);
    expect(root.querySelectorAll('[data-choice-option]')).toHaveLength(2);
    expect(root.querySelectorAll('[data-dialog-line]')).toHaveLength(2);
  });
});

describe('<ControlPad>', () => {
  it('la cruceta tiene cuatro direcciones con nombre', async () => {
    const { root } = await renderComponent(ControlPad, { side: 'dpad' });
    const pad = within(root).getByRole('group', { name: 'Cruceta' });
    const buttons = within(pad).getAllByRole('button');
    expect(buttons.map((button) => button.dataset['button'])).toEqual(['up', 'left', 'right', 'down']);
    expect(buttons.map((button) => button.getAttribute('aria-label'))).toEqual([
      'Arriba',
      'Izquierda',
      'Derecha',
      'Abajo',
    ]);
  });

  it('A, B, Select y Start', async () => {
    const { root } = await renderComponent(ControlPad, { side: 'actions' });
    const buttons = [...root.querySelectorAll<HTMLElement>('[data-button]')].map((button) => button.dataset['button']);
    expect(buttons).toEqual(['b', 'a', 'select', 'start']);
    expect(within(root).getByRole('button', { name: /A: hablar/ })).toBeTruthy();
  });
});

describe('<Console>', () => {
  it('reúne las dos pantallas, los controles y un h1 para lectores', async () => {
    const { root } = await renderComponent(Console);
    expect(root.querySelector('[data-top-screen]')).not.toBeNull();
    expect(root.querySelector('[data-touch-screen]')).not.toBeNull();
    expect(root.querySelectorAll('[data-button]')).toHaveLength(8);
    expect(within(root).getByRole('heading', { level: 1 }).textContent).toContain(PROFILE.name);
    expect(root.querySelector('[data-console]')?.getAttribute('data-layout')).toBe('stacked');
  });
});
