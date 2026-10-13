import { describe, expect, it } from 'vitest';
import { VISITED_STORAGE_KEY, VisitedRegistry } from '../../src/game/core/visited.ts';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  parseSettings,
  SETTINGS_STORAGE_KEY,
  saveSettings,
} from '../../src/game/ui/settings.ts';
import { memoryStore } from '../support/dom.ts';

describe('VisitedRegistry', () => {
  const ids = ['a', 'b', 'c'];

  it('cuenta y persiste los proyectos visitados', () => {
    const store = memoryStore();
    const registry = new VisitedRegistry(ids, store);
    expect(registry.add('a')).toBe(true);
    expect(registry.add('a')).toBe(false);
    expect(registry.has('a')).toBe(true);
    expect(registry.count).toBe(1);
    expect(registry.total).toBe(3);
    expect(JSON.parse(store.data.get(VISITED_STORAGE_KEY) ?? '[]')).toEqual(['a']);
    expect(new VisitedRegistry(ids, store).list()).toEqual(['a']);
  });

  it('ignora ids desconocidos y detecta cuando está completo', () => {
    const registry = new VisitedRegistry(ids, null);
    expect(registry.add('z')).toBe(false);
    for (const id of ids) registry.add(id);
    expect(registry.isComplete).toBe(true);
  });

  it('sobrevive a datos corruptos y a un almacenamiento bloqueado', () => {
    const corrupt = memoryStore();
    corrupt.setItem(VISITED_STORAGE_KEY, '{no es json');
    expect(new VisitedRegistry(ids, corrupt).count).toBe(0);

    const tampered = memoryStore();
    tampered.setItem(VISITED_STORAGE_KEY, JSON.stringify(['a', 'hack', 42]));
    expect(new VisitedRegistry(ids, tampered).list()).toEqual(['a']);

    const blocked = new VisitedRegistry(ids, memoryStore(true));
    expect(blocked.add('b')).toBe(true);
    expect(blocked.count).toBe(1);
  });
});

describe('opciones', () => {
  it('valida y completa con los valores de fábrica', () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings({ sound: 'sí', textSpeed: 'turbo', season: 'monzón', time: 13 })).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings({ sound: true, textSpeed: 'fast', season: 'winter', time: 'night' })).toEqual({
      sound: true,
      textSpeed: 'fast',
      season: 'winter',
      time: 'night',
    });
  });

  it('guarda y carga del almacenamiento', () => {
    const store = memoryStore();
    saveSettings(store, { ...DEFAULT_SETTINGS, sound: true });
    expect(store.data.has(SETTINGS_STORAGE_KEY)).toBe(true);
    expect(loadSettings(store).sound).toBe(true);
  });

  it('sin almacenamiento usa los valores de fábrica', () => {
    expect(loadSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(loadSettings(memoryStore(true))).toEqual(DEFAULT_SETTINGS);
    expect(() => saveSettings(memoryStore(true), DEFAULT_SETTINGS)).not.toThrow();
    const broken = memoryStore();
    broken.setItem(SETTINGS_STORAGE_KEY, 'x');
    expect(loadSettings(broken)).toEqual(DEFAULT_SETTINGS);
  });
});
