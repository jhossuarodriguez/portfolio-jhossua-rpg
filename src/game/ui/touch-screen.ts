import type { TouchView } from '../world/types.ts';
import { all, required } from './dom.ts';
import { parseSettings, type Settings } from './settings.ts';

export type ViewId = TouchView | `project:${string}`;

export interface TouchScreenHandlers {
  /** "Ir al edificio": el personaje camina solo hasta la puerta. */
  onWalkTo(buildingId: string): void;
  onSettingsChange(settings: Settings): void;
  onResetVisited(): void;
  onViewChange?(view: ViewId): void;
}

const TITLES: Readonly<Record<TouchView, string>> = {
  home: 'Menú',
  projects: 'Proyectos',
  about: 'Sobre mí',
  skills: 'Habilidades',
  contact: 'Contacto',
  map: 'Mapa',
  options: 'Opciones',
};

/**
 * Controlador de la pantalla de abajo. Todo el contenido ya viene renderizado por Astro
 * (y se lee completo sin JavaScript); aquí solo se decide qué vista se muestra.
 */
export class TouchScreen {
  readonly #root: HTMLElement;
  readonly #handlers: TouchScreenHandlers;
  readonly #views: HTMLElement[];
  readonly #announcer: HTMLElement | null;
  readonly #history: ViewId[] = [];
  #current: ViewId = 'home';

  constructor(root: HTMLElement, handlers: TouchScreenHandlers, announcer: HTMLElement | null = null) {
    this.#root = root;
    this.#handlers = handlers;
    this.#announcer = announcer;
    this.#views = all(root, '[data-view]');
    root.dataset['enhanced'] = 'true';

    root.addEventListener('click', (event) => this.#onClick(event));
    root.addEventListener('change', (event) => this.#onChange(event));
    this.#activate('home', false);
  }

  get current(): ViewId {
    return this.#current;
  }

  #onClick(event: Event): void {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    const openView = target.closest<HTMLElement>('[data-open-view]');
    const openProject = target.closest<HTMLElement>('[data-open-project]');
    const walkTo = target.closest<HTMLElement>('[data-walk-to]');
    const back = target.closest('[data-nav-back]');
    const reset = target.closest('[data-reset-visited]');
    if (openView?.dataset['openView']) {
      // Sin JS son enlaces de ancla; con JS cambian de vista sin saltar la página.
      event.preventDefault();
      this.show(openView.dataset['openView'] as TouchView);
    } else if (openProject?.dataset['openProject']) {
      event.preventDefault();
      this.show(`project:${openProject.dataset['openProject']}`);
    } else if (walkTo?.dataset['walkTo']) {
      this.#handlers.onWalkTo(walkTo.dataset['walkTo']);
    } else if (back) {
      this.back();
    } else if (reset) {
      this.#handlers.onResetVisited();
    }
  }

  #onChange(event: Event): void {
    const form = event.target instanceof Element ? event.target.closest('form[data-settings]') : null;
    if (!(form instanceof HTMLFormElement)) return;
    this.#handlers.onSettingsChange(this.readSettings());
  }

  /** Lee el formulario de opciones. */
  readSettings(): Settings {
    const form = required<HTMLFormElement>(this.#root, 'form[data-settings]');
    const data = new FormData(form);
    return parseSettings({
      sound: data.get('sound') === 'on',
      textSpeed: data.get('textSpeed'),
      season: data.get('season'),
      time: data.get('time'),
    });
  }

  /** Refleja en el formulario unas opciones (al cargar las guardadas). */
  writeSettings(settings: Settings): void {
    const form = required<HTMLFormElement>(this.#root, 'form[data-settings]');
    const sound = form.elements.namedItem('sound');
    if (sound instanceof HTMLInputElement) sound.checked = settings.sound;
    for (const name of ['textSpeed', 'season', 'time'] as const) {
      const field = form.elements.namedItem(name);
      if (field instanceof HTMLSelectElement) field.value = settings[name];
    }
  }

  show(view: ViewId, options: { focus?: boolean } = {}): void {
    if (view === this.#current) return;
    this.#history.push(this.#current);
    if (this.#history.length > 20) this.#history.shift();
    this.#activate(view, options.focus ?? true);
  }

  back(): void {
    const previous = this.#history.pop() ?? 'home';
    this.#activate(previous, true);
  }

  #findView(view: ViewId): HTMLElement | undefined {
    if (view.startsWith('project:')) {
      const id = view.slice('project:'.length);
      return this.#views.find(
        (element) => element.dataset['view'] === 'project' && element.dataset['projectId'] === id,
      );
    }
    return this.#views.find((element) => element.dataset['view'] === view);
  }

  #activate(view: ViewId, focus: boolean): void {
    const target = this.#findView(view) ?? this.#findView('home');
    if (!target) return;
    for (const element of this.#views) {
      const active = element === target;
      element.toggleAttribute('data-active', active);
      element.setAttribute('aria-hidden', String(!active));
    }
    this.#current = target.dataset['view'] === 'project' ? `project:${target.dataset['projectId'] ?? ''}` : view;
    target.scrollTop = 0;
    this.#root.dataset['view'] = this.#current;
    const backButton = this.#root.querySelector<HTMLButtonElement>('[data-nav-back]');
    if (backButton) backButton.disabled = this.#current === 'home';
    const heading = target.querySelector<HTMLElement>('[data-view-title]');
    if (focus && heading) heading.focus({ preventScroll: true });
    if (this.#announcer) {
      const title = heading?.textContent?.trim() || TITLES[view as TouchView] || '';
      this.#announcer.textContent = `Pantalla táctil: ${title}`;
    }
    this.#handlers.onViewChange?.(this.#current);
  }

  setVisited(ids: readonly string[], total: number): void {
    const visited = new Set(ids);
    for (const mark of all(this.#root, '[data-visited-mark]')) {
      const isVisited = visited.has(mark.dataset['visitedMark'] ?? '');
      mark.dataset['visited'] = String(isVisited);
      mark.setAttribute('aria-label', isVisited ? 'Visitado' : 'Sin visitar');
    }
    for (const counter of all(this.#root, '[data-visited-count]')) counter.textContent = String(visited.size);
    for (const counter of all(this.#root, '[data-visited-total]')) counter.textContent = String(total);
  }

  setStatus(clock: string, season: string): void {
    for (const element of all(this.#root, '[data-clock]')) element.textContent = clock;
    for (const element of all(this.#root, '[data-season-label]')) element.textContent = season;
  }
}
