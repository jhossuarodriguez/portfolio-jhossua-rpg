/** Almacenamiento mínimo (localStorage o un doble en los tests). */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const VISITED_STORAGE_KEY = 'jhossua-rpg:visited:v1';

/**
 * Registro de proyectos visitados (la "bitácora" del jugador).
 * Si el navegador bloquea el almacenamiento, sigue funcionando en memoria.
 */
export class VisitedRegistry {
  readonly #ids = new Set<string>();
  readonly #known: ReadonlySet<string>;
  readonly #store: KeyValueStore | null;

  constructor(knownIds: readonly string[], store: KeyValueStore | null) {
    this.#known = new Set(knownIds);
    this.#store = store;
    try {
      const raw = store?.getItem(VISITED_STORAGE_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) {
        for (const id of parsed) {
          if (typeof id === 'string' && this.#known.has(id)) this.#ids.add(id);
        }
      }
    } catch {
      // Datos corruptos o almacenamiento bloqueado: se empieza de cero.
    }
  }

  get count(): number {
    return this.#ids.size;
  }

  get total(): number {
    return this.#known.size;
  }

  get isComplete(): boolean {
    return this.#ids.size === this.#known.size;
  }

  has(id: string): boolean {
    return this.#ids.has(id);
  }

  /** Marca como visitado. Devuelve `true` si es la primera vez. */
  add(id: string): boolean {
    if (!this.#known.has(id) || this.#ids.has(id)) return false;
    this.#ids.add(id);
    try {
      this.#store?.setItem(VISITED_STORAGE_KEY, JSON.stringify([...this.#ids]));
    } catch {
      // Sin almacenamiento: queda solo en memoria.
    }
    return true;
  }

  list(): string[] {
    return [...this.#ids];
  }
}
