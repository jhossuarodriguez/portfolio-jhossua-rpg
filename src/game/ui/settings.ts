import { SEASONS, type Season } from '../art/palettes.ts';
import type { TimeOfDay } from '../core/season.ts';
import type { KeyValueStore } from '../core/visited.ts';

export type TextSpeed = 'slow' | 'normal' | 'fast';

export interface Settings {
  readonly sound: boolean;
  readonly textSpeed: TextSpeed;
  /** `auto` = según el mes, como en la consola. */
  readonly season: 'auto' | Season;
  /** `auto` = según la hora local. */
  readonly time: 'auto' | TimeOfDay;
}

export const DEFAULT_SETTINGS: Settings = {
  sound: false,
  textSpeed: 'normal',
  season: 'auto',
  time: 'auto',
};

export const TEXT_SPEED_CPS: Readonly<Record<TextSpeed, number>> = {
  slow: 24,
  normal: 45,
  fast: 90,
};

export const SETTINGS_STORAGE_KEY = 'jhossua-rpg:settings:v1';

const TIMES: readonly TimeOfDay[] = ['morning', 'day', 'evening', 'night'];

/** Valida lo que venga del almacenamiento: cualquier valor raro vuelve al de fábrica. */
export function parseSettings(raw: unknown): Settings {
  if (typeof raw !== 'object' || raw === null) return DEFAULT_SETTINGS;
  const value = raw as Record<string, unknown>;
  const sound = typeof value['sound'] === 'boolean' ? value['sound'] : DEFAULT_SETTINGS.sound;
  const textSpeed =
    value['textSpeed'] === 'slow' || value['textSpeed'] === 'normal' || value['textSpeed'] === 'fast'
      ? value['textSpeed']
      : DEFAULT_SETTINGS.textSpeed;
  const season =
    value['season'] === 'auto' || (SEASONS as readonly unknown[]).includes(value['season'])
      ? (value['season'] as Settings['season'])
      : DEFAULT_SETTINGS.season;
  const time =
    value['time'] === 'auto' || (TIMES as readonly unknown[]).includes(value['time'])
      ? (value['time'] as Settings['time'])
      : DEFAULT_SETTINGS.time;
  return { sound, textSpeed, season, time };
}

export function loadSettings(store: KeyValueStore | null): Settings {
  try {
    const raw = store?.getItem(SETTINGS_STORAGE_KEY);
    return raw ? parseSettings(JSON.parse(raw)) : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(store: KeyValueStore | null, settings: Settings): void {
  try {
    store?.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Almacenamiento bloqueado: las opciones duran lo que dure la visita.
  }
}

/** localStorage si está disponible (modo privado, iframes y previews pueden bloquearlo). */
export function browserStore(): KeyValueStore | null {
  try {
    const storage = globalThis.localStorage;
    const probe = '__jhossua_probe__';
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}
