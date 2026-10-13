import { describe, expect, it } from 'vitest';
import { PROJECTS } from '../../src/data/projects.ts';
import { TURN_STEPS } from '../../src/game/core/actor.ts';
import { VisitedRegistry } from '../../src/game/core/visited.ts';
import { markerPosition } from '../../src/game/ui/minimap.ts';
import { PRIMADA } from '../../src/game/world/primada.ts';
import { introScript } from '../../src/game/world/story.ts';
import { doorFrontTile, TownMap } from '../../src/game/world/town-map.ts';
import { createHarness } from '../support/game.ts';

/**
 * Partidas completas sin gráficos: la simulación recibe botones paso a paso,
 * como lo haría con el teclado o la cruceta.
 */
describe('una partida en Ciudad Primada', () => {
  it('antes de START el mundo está quieto', () => {
    const game = createHarness();
    game.hold('down', 30);
    expect(game.sim.player.tile).toEqual(PRIMADA.spawn);
    expect(game.sim.running).toBe(false);
  });

  it('START abre la presentación y anuncia el barrio; con A se cierra', () => {
    const game = createHarness();
    game.sim.start(introScript(false));
    expect(game.eventsOf('zone')[0]?.zone.name).toBe('Barrio Norte');
    expect(game.sim.dialog?.script.speaker).toBe('Jhossua');
    expect(game.sim.dialog?.pages.length).toBeGreaterThanOrEqual(4);
    game.closeDialog();
    expect(game.sim.dialog).toBeNull();
    expect(game.eventsOf('dialog:close')).toHaveLength(1);
  });

  it('mientras hay un diálogo, el personaje no se mueve', () => {
    const game = createHarness();
    game.sim.start(introScript(true));
    game.hold('down', 40);
    expect(game.sim.player.tile).toEqual(PRIMADA.spawn);
  });

  it('un toque corto gira en el sitio; mantener camina', () => {
    const game = createHarness();
    game.sim.start();
    game.hold('left', 2);
    game.tick(TURN_STEPS + 2);
    expect(game.sim.player.facing).toBe('left');
    expect(game.sim.player.tile).toEqual(PRIMADA.spawn);

    game.hold('down', 40);
    game.runUntil(() => !game.sim.player.move);
    expect(game.sim.player.tile.y).toBeGreaterThan(PRIMADA.spawn.y);
    expect(game.eventsOf('step').length).toBeGreaterThan(0);
  });

  it('con B se corre el doble de rápido', () => {
    // En la Calle de las Damas (fila 11) no hay nada en el camino hacia la derecha.
    const street = { x: 7, y: 11 };
    const walk = createHarness();
    walk.sim.start();
    walk.sim.player.tile = street;
    walk.sim.player.facing = 'right';
    walk.hold('right', 65);
    const run = createHarness();
    run.sim.start();
    run.sim.player.tile = street;
    run.sim.player.facing = 'right';
    run.input.setButton('b', true, 'test');
    run.hold('right', 65);
    expect(walk.sim.player.tile.x - street.x).toBe(4);
    expect(run.sim.player.tile.x - street.x).toBe(8);
  });

  it('caminar contra un obstáculo suena a choque y no atraviesa', () => {
    const game = createHarness();
    game.sim.start();
    // Desde la puerta de casa (7,10) hacia la izquierda: césped hasta x=2; en x=0-1, el bosque.
    game.sim.player.facing = 'left';
    game.hold('left', 200);
    expect(game.eventsOf('bump').length).toBeGreaterThan(0);
    expect(game.sim.player.tile).toEqual({ x: 2, y: 10 });
  });

  it('caminar hacia una puerta la toca: pregunta y, con "Sí", abre la sección', () => {
    const game = createHarness();
    game.sim.start();
    game.sim.player.facing = 'up';
    game.hold('up', 3);
    expect(game.sim.dialog?.script.speaker).toBe('Casa de Jhossua');
    game.closeDialog('yes');
    expect(game.eventsOf('action')).toEqual([{ type: 'action', action: { type: 'openView', view: 'about' } }]);
  });

  it('responder "No" no dispara ninguna acción', () => {
    const game = createHarness();
    game.sim.start();
    game.sim.player.facing = 'up';
    game.tap('a');
    expect(game.sim.dialog).not.toBeNull();
    game.closeDialog('no');
    expect(game.eventsOf('action')).toHaveLength(0);
    expect(game.eventsOf('dialog:close').at(-1)?.result).toBe('no');
  });

  it('hablar con un NPC lo hace mirarte', () => {
    const game = createHarness();
    game.sim.start();
    const guide = game.sim.npcs.find((npc) => npc.def.id === 'guia');
    if (!guide) throw new Error('Falta la guía');
    // Se acerca por la derecha: la guía (que mira hacia abajo) debe girar hacia la derecha.
    expect(game.sim.walkTo({ x: guide.home.x + 1, y: guide.home.y }, 'left')).toBe(true);
    game.runUntil(() => !game.sim.isAutoWalking && !game.sim.player.move, 3000);
    game.tap('a');
    expect(game.sim.dialog?.script.speaker).toBe('Guía');
    expect(guide.actor.facing).toBe('right');
  });

  it('la reclutadora ofrece abrir los contactos', () => {
    const game = createHarness();
    game.sim.start();
    const recruiter = game.sim.npcs.find((npc) => npc.def.id === 'reclutadora');
    if (!recruiter) throw new Error('Falta la reclutadora');
    game.sim.walkTo({ x: recruiter.home.x, y: recruiter.home.y + 1 }, 'up');
    game.runUntil(() => !game.sim.isAutoWalking && !game.sim.player.move, 3000);
    game.tap('a');
    game.closeDialog('yes');
    expect(game.eventsOf('action').at(-1)?.action).toEqual({ type: 'openView', view: 'contact' });
  });

  it('leer un cartel de proyecto cuenta como visita', () => {
    const game = createHarness();
    game.sim.start();
    // El cartel de Administrador de Licencias está en (41,10): se lee desde (41,11) mirando arriba.
    game.sim.walkTo({ x: 41, y: 11 }, 'up', true);
    game.runUntil(() => game.sim.dialog !== null, 3000);
    expect(game.eventsOf('visit').map((event) => event.projectId)).toContain('administrador-de-licencias');
  });

  it('START y SELECT piden abrir el menú y el mapa', () => {
    const game = createHarness();
    game.sim.start();
    game.tap('start');
    game.tap('select');
    expect(game.eventsOf('menu').map((event) => event.button)).toEqual(['start', 'select']);
  });

  it('cruzar a la plaza anuncia la nueva zona', () => {
    const game = createHarness();
    game.sim.start();
    game.sim.walkTo({ x: 21, y: 15 });
    game.runUntil(() => !game.sim.isAutoWalking && !game.sim.player.move, 4000);
    expect(game.eventsOf('zone').map((event) => event.zone.name)).toContain('Plaza Mayor');
  });

  it('el piloto automático llega a cada edificio y toca la puerta', () => {
    const game = createHarness();
    game.sim.start();
    const registry = new VisitedRegistry(
      PROJECTS.map((project) => project.id),
      null,
    );
    for (const building of PRIMADA.buildings) {
      expect(game.sim.walkToBuilding(building.id), building.id).toBe(true);
      game.runUntil(() => game.sim.dialog !== null, 6000);
      expect(game.sim.player.tile).toEqual(doorFrontTile(building));
      expect(game.sim.player.facing).toBe('up');
      expect(game.sim.dialog?.script.speaker).toBe(building.name);
      game.closeDialog();
    }
    for (const event of game.eventsOf('visit')) registry.add(event.projectId);
    expect(registry.isComplete).toBe(true);
    expect(game.eventsOf('autowalk:end').every((event) => event.reached)).toBe(true);
  });

  it('una entrada manual cancela el piloto automático', () => {
    const game = createHarness();
    game.sim.start();
    game.sim.walkToBuilding('mimes');
    game.tick(20);
    expect(game.sim.isAutoWalking).toBe(true);
    // Corriendo se llega a un tile cada 8 pasos: ahí manda la flecha.
    game.hold('left', 10);
    expect(game.sim.isAutoWalking).toBe(false);
  });

  it('no hay piloto automático hacia lo imposible ni antes de empezar', () => {
    const game = createHarness();
    expect(game.sim.walkToBuilding('home')).toBe(false);
    game.sim.start();
    expect(game.sim.walkToBuilding('no-existe')).toBe(false);
    expect(game.sim.walkTo({ x: 10, y: 37 })).toBe(false);
    expect(game.eventsOf('autowalk:end').at(-1)?.reached).toBe(false);
  });

  it('los NPC pasean sin salirse de su radio ni pisar a nadie', () => {
    const game = createHarness();
    game.sim.start();
    game.tick(60 * 30);
    for (const npc of game.sim.npcs) {
      const distance = Math.abs(npc.actor.tile.x - npc.home.x) + Math.abs(npc.actor.tile.y - npc.home.y);
      expect(distance, npc.def.id).toBeLessThanOrEqual(npc.def.wander);
      expect(new TownMap(PRIMADA).isWalkable(npc.actor.tile)).toBe(true);
    }
    const tiles = [game.sim.player, ...game.sim.npcs.map((npc) => npc.actor)].map(
      (actor) => `${actor.tile.x},${actor.tile.y}`,
    );
    expect(new Set(tiles).size).toBe(tiles.length);
  });

  it('closeDialog cierra desde fuera (por ejemplo, al tocar "Ir al edificio")', () => {
    const game = createHarness();
    game.sim.start(introScript(false));
    game.sim.closeDialog();
    expect(game.sim.dialog).toBeNull();
    expect(game.eventsOf('dialog:close').at(-1)?.result).toBe('closed');
  });
});

describe('minimapa', () => {
  it('ubica al jugador en porcentaje del mapa', () => {
    const map = new TownMap(PRIMADA);
    expect(markerPosition({ x: 0, y: 0 }, map)).toEqual({
      left: `${(0.5 / map.width) * 100}%`,
      top: `${(0.5 / map.height) * 100}%`,
    });
  });
});
