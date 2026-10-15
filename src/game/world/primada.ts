import { PROFILE } from '@/data/profile.ts';
import { CATEGORY_LABELS, type ProjectId, requireProject } from '@/data/projects.ts';
import type { BuildingStyle } from '@/game/art/buildings.ts';
import type { BuildingDef, NpcDef, PropDef, TownDef, ZoneDef } from '@/game/world/types.ts';

/**
 * Ciudad Primada: el pueblo del portafolio. Calles con nombres de la Zona Colonial
 * de Santo Domingo, un edificio por proyecto y el Caribe al sur.
 *
 * Mapa de 48×40 tiles. Coordenadas en tiles; (0,0) es la esquina superior izquierda.
 *   - Filas 0-3: bosque.            - Filas 11-12: Calle de las Damas.
 *   - Filas 13-21: plaza y barrios.  - Filas 22-23: Calle Arzobispo Meriño.
 *   - Filas 24-27: edificios del sur - Fila 28: acera.  - Filas 29-30: El Malecón.
 *   - Filas 31-33: playa.           - Filas 34-39: mar.
 *   - Columnas 22-24: Calle El Conde, de norte a sur.
 */

const WIDTH = 48;
const HEIGHT = 40;

function projectBuilding(projectId: ProjectId, x: number, y: number, style: BuildingStyle): BuildingDef {
  const project = requireProject(projectId);
  const inProgress = project.status === 'in-progress';
  return {
    id: projectId,
    kind: 'project',
    projectId,
    name: project.name,
    x,
    y,
    style,
    doorLines: inProgress
      ? [`${project.name}.`, 'Todavía está en obra, pero ya puedes ver de qué va.']
      : [`${project.name}.`, project.tagline],
    doorQuestion: '¿Ver el proyecto en la pantalla táctil?',
    action: { type: 'openProject', projectId },
  };
}

function projectSign(projectId: ProjectId, x: number, y: number): PropDef {
  const project = requireProject(projectId);
  const stack = project.stack.slice(0, 3).join(' · ');
  return {
    kind: 'sign',
    x,
    y,
    text:
      project.status === 'in-progress'
        ? [`${project.name}: en construcción.`, '¡Vuelve pronto!']
        : [`${project.name}.`, `${CATEGORY_LABELS[project.category]} hecho con ${stack}.`],
    question: '¿Ver el proyecto?',
    action: { type: 'openProject', projectId },
  };
}

const BUILDINGS: readonly BuildingDef[] = [
  {
    id: 'home',
    kind: 'home',
    name: 'Casa de Jhossua',
    x: 5,
    y: 6,
    style: {
      width: 5,
      height: 4,
      wall: '#f3d9b1',
      roof: '#c8643c',
      roofStyle: 'tile',
      windows: 'arched',
      emblem: 'house',
    },
    doorLines: ['Casa de Jhossua.', `${PROFILE.role} de Santo Domingo. ${PROFILE.motto}`],
    doorQuestion: '¿Leer "Sobre mí"?',
    action: { type: 'openView', view: 'about' },
  },
  {
    id: 'academy',
    kind: 'academy',
    name: 'Academia ITLA',
    x: 12,
    y: 5,
    style: {
      width: 7,
      height: 5,
      wall: '#e4e9f0',
      roof: '#2f6fb0',
      roofStyle: 'gable',
      windows: 'square',
      emblem: 'book',
      floors: 2,
      doorStyle: 'double',
    },
    doorLines: [
      'Academia ITLA.',
      'Aquí Jhossua estudió Desarrollo de Software. Dentro guarda su lista de habilidades.',
    ],
    doorQuestion: '¿Ver habilidades?',
    action: { type: 'openView', view: 'skills' },
  },
  {
    id: 'post-office',
    kind: 'post',
    name: 'Correo',
    x: 30,
    y: 6,
    style: {
      width: 5,
      height: 4,
      wall: '#d8ecff',
      roof: '#d0453c',
      roofStyle: 'tile',
      windows: 'square',
      emblem: 'mail',
      awning: '#2f6fd8',
    },
    doorLines: ['Correo de Ciudad Primada.', '¿Tienes un proyecto o una vacante? Jhossua responde rápido.'],
    doorQuestion: '¿Ver formas de contacto?',
    action: { type: 'openView', view: 'contact' },
  },
  projectBuilding('administrador-de-licencias', 37, 4, {
    width: 5,
    height: 6,
    wall: '#c9d6e6',
    roof: '#3a4a66',
    roofStyle: 'flat',
    windows: 'square',
    emblem: 'badge',
    floors: 3,
    doorStyle: 'glass',
  }),
  projectBuilding('managero-rd', 3, 14, {
    width: 7,
    height: 5,
    wall: '#f6dcc0',
    roof: '#e07a2a',
    roofStyle: 'tile',
    windows: 'wide',
    emblem: 'pen',
    awning: '#e07a2a',
    floors: 2,
  }),
  projectBuilding('maps-for-mom', 11, 15, {
    width: 5,
    height: 4,
    wall: '#e6f4ff',
    roof: '#2a9d8f',
    roofStyle: 'gable',
    windows: 'arched',
    emblem: 'globe',
    awning: '#2a9d8f',
  }),
  projectBuilding('sistema-gestor-pacientes', 32, 15, {
    width: 5,
    height: 4,
    wall: '#f4f7fb',
    roof: '#2fa58f',
    roofStyle: 'gable',
    windows: 'square',
    emblem: 'plus',
    doorStyle: 'double',
  }),
  projectBuilding('social-network', 38, 14, {
    width: 7,
    height: 5,
    wall: '#ece6ff',
    roof: '#6a5acd',
    roofStyle: 'tile',
    windows: 'wide',
    emblem: 'chat',
    floors: 2,
  }),
  projectBuilding('postesados-jhp', 3, 24, {
    width: 5,
    height: 4,
    wall: '#d9d4cc',
    roof: '#5a6270',
    roofStyle: 'flat',
    windows: 'wide',
    emblem: 'beam',
    doorStyle: 'glass',
  }),
  projectBuilding('tenax-construction', 9, 24, {
    width: 7,
    height: 4,
    wall: '#f2e6c8',
    roof: '#a8443a',
    roofStyle: 'tile',
    windows: 'square',
    emblem: 'helmet',
    doorStyle: 'double',
  }),
  projectBuilding('mariela-managero', 17, 24, {
    width: 5,
    height: 4,
    wall: '#fbe3ec',
    roof: '#d0507a',
    roofStyle: 'tile',
    windows: 'arched',
    emblem: 'code',
  }),
  projectBuilding('authentication-web-app', 26, 25, {
    width: 3,
    height: 3,
    wall: '#e8e0f8',
    roof: '#5a4a9a',
    roofStyle: 'tile',
    windows: 'square',
    emblem: 'shield',
  }),
  projectBuilding('oficina-virtual', 31, 24, {
    width: 5,
    height: 4,
    wall: '#b8c4d0',
    roof: '#7a8494',
    roofStyle: 'scaffold',
    windows: 'square',
    emblem: 'code',
  }),
  projectBuilding('mimes', 39, 24, {
    width: 5,
    height: 4,
    wall: '#e0f4ea',
    roof: '#2f9e6a',
    roofStyle: 'gable',
    windows: 'wide',
    emblem: 'phone',
    awning: '#2f9e6a',
    doorStyle: 'glass',
  }),
];

function borderTrees(): PropDef[] {
  const trees: PropDef[] = [];
  for (let x = 0; x < WIDTH; x += 2) {
    trees.push({ kind: 'tree', x, y: 0 }, { kind: 'tree', x, y: 2 });
  }
  for (let y = 4; y < 28; y += 2) {
    trees.push({ kind: 'tree', x: 0, y }, { kind: 'tree', x: WIDTH - 2, y });
  }
  return trees;
}

const PROPS: readonly PropDef[] = [
  ...borderTrees(),
  // Barrio Norte
  { kind: 'tree', x: 10, y: 4 },
  { kind: 'tree', x: 19, y: 6 },
  { kind: 'tree', x: 26, y: 5 },
  { kind: 'tree', x: 26, y: 8 },
  { kind: 'tree', x: 42, y: 5 },
  { kind: 'tree', x: 44, y: 7 },
  { kind: 'planter', x: 4, y: 9 },
  { kind: 'planter', x: 10, y: 9 },
  { kind: 'lamp', x: 21, y: 9 },
  { kind: 'lamp', x: 25, y: 9 },
  {
    kind: 'sign',
    x: 9,
    y: 10,
    text: ['Casa de Jhossua.', 'Toca la puerta para conocerlo.'],
    question: '¿Leer "Sobre mí"?',
    action: { type: 'openView', view: 'about' },
  },
  { kind: 'sign', x: 17, y: 10, text: ['Academia ITLA.', 'Formación y habilidades de Jhossua.'] },
  { kind: 'sign', x: 34, y: 10, text: ['Correo de Ciudad Primada.', 'Cartas, correos y DMs: todo llega.'] },
  projectSign('administrador-de-licencias', 41, 10),
  {
    kind: 'mailbox',
    x: 35,
    y: 9,
    text: [
      'Es el buzón de Jhossua.',
      `Su correo es ${PROFILE.links.find((link) => link.id === 'email')?.handle ?? ''}.`,
    ],
    question: '¿Abrir los contactos?',
    action: { type: 'openView', view: 'contact' },
  },
  {
    kind: 'sign',
    x: 25,
    y: 10,
    text: ['← Calle de las Damas →', '↓ Calle El Conde: Plaza Mayor y el Malecón.'],
  },
  // Plaza Mayor
  { kind: 'fountain', x: 22, y: 16 },
  { kind: 'bench', x: 18, y: 15 },
  { kind: 'bench', x: 27, y: 15 },
  { kind: 'bench', x: 18, y: 19 },
  { kind: 'bench', x: 27, y: 19 },
  { kind: 'lamp', x: 20, y: 14 },
  { kind: 'lamp', x: 26, y: 14 },
  { kind: 'lamp', x: 20, y: 20 },
  { kind: 'lamp', x: 26, y: 20 },
  {
    kind: 'sign',
    x: 21,
    y: 13,
    text: [
      'Plaza Mayor de Ciudad Primada.',
      'Cada edificio del pueblo es un proyecto. Usa el mapa de la pantalla táctil para ir directo.',
    ],
    question: '¿Abrir el mapa?',
    action: { type: 'openView', view: 'map' },
  },
  { kind: 'bush', x: 16, y: 15 },
  { kind: 'bush', x: 16, y: 16 },
  { kind: 'bush', x: 16, y: 17 },
  { kind: 'tree', x: 30, y: 13 },
  { kind: 'bush', x: 30, y: 17 },
  { kind: 'bush', x: 30, y: 18 },
  { kind: 'bush', x: 37, y: 16 },
  { kind: 'bush', x: 37, y: 17 },
  // Carteles de los barrios
  projectSign('managero-rd', 8, 19),
  projectSign('maps-for-mom', 15, 19),
  projectSign('sistema-gestor-pacientes', 36, 19),
  projectSign('social-network', 43, 19),
  projectSign('postesados-jhp', 7, 28),
  projectSign('tenax-construction', 16, 28),
  projectSign('mariela-managero', 21, 28),
  projectSign('authentication-web-app', 29, 28),
  projectSign('oficina-virtual', 36, 28),
  projectSign('mimes', 43, 28),
  { kind: 'sign', x: 25, y: 28, text: ['El Malecón.', 'Al sur, el mar Caribe. ¡Cuidado, que el agua no se pisa!'] },
  // Obra de la Oficina Virtual
  { kind: 'cone', x: 30, y: 27 },
  { kind: 'barrier', x: 36, y: 27 },
  { kind: 'cone', x: 37, y: 27 },
  { kind: 'crate', x: 36, y: 25 },
  // Playa
  { kind: 'palm', x: 2, y: 31 },
  { kind: 'palm', x: 8, y: 32 },
  { kind: 'palm', x: 15, y: 31 },
  { kind: 'palm', x: 28, y: 32 },
  { kind: 'palm', x: 44, y: 31 },
  { kind: 'umbrella', x: 11, y: 32 },
  { kind: 'umbrella', x: 31, y: 32 },
  { kind: 'rock', x: 0, y: 33 },
  { kind: 'rock', x: 20, y: 33 },
  { kind: 'rock', x: 47, y: 32 },
  { kind: 'boat', x: 39, y: 36 },
];

const NPCS: readonly NpcDef[] = [
  {
    id: 'guia',
    name: 'Guía',
    look: 'dev',
    x: 25,
    y: 17,
    facing: 'down',
    wander: 0,
    lines: [
      '¡Bienvenido a Ciudad Primada!',
      'Cada edificio es un proyecto de Jhossua. Párate frente a una puerta o un cartel y pulsa A.',
      'Mantén B para correr. En la pantalla de abajo tienes el mapa y la lista de proyectos.',
    ],
  },
  {
    id: 'abuela',
    name: 'Doña Altagracia',
    look: 'elder',
    x: 19,
    y: 16,
    facing: 'down',
    wander: 0,
    lines: [
      'A Santo Domingo le dicen la Ciudad Primada de América.',
      'Este pueblito le debe el nombre. Y a ese muchacho, Jhossua, le debe cada ladrillo.',
    ],
  },
  {
    id: 'reclutadora',
    name: 'Reclutadora',
    look: 'recruiter',
    x: 37,
    y: 10,
    facing: 'down',
    wander: 0,
    lines: [
      'Vine buscando talento frontend y mira lo que encontré: un portafolio con mapa y todo.',
      'Jhossua está abierto a nuevas oportunidades.',
    ],
    question: '¿Ver cómo contactarlo?',
    action: { type: 'openView', view: 'contact' },
  },
  {
    id: 'estudiante',
    name: 'Estudiante',
    look: 'student',
    x: 13,
    y: 10,
    facing: 'right',
    wander: 1,
    lines: [
      'Yo también estudio en el ITLA.',
      'Dicen que Jhossua aprende construyendo proyectos, no solo leyendo teoría.',
    ],
  },
  {
    id: 'disenadora',
    name: 'Diseñadora',
    look: 'designer',
    x: 10,
    y: 20,
    facing: 'down',
    wander: 1,
    lines: [
      'Este es el Distrito Astro: casi todos estos sitios están hechos con Astro y Tailwind.',
      'Jhossua también trabaja como freelance con la agencia Managero RD.',
    ],
  },
  {
    id: 'nino',
    name: 'Niño',
    look: 'kid',
    x: 14,
    y: 22,
    facing: 'left',
    wander: 3,
    lines: ['¡Mantén B para correr!', 'Llegas el doble de rápido. Yo nunca camino.'],
  },
  {
    id: 'obrero',
    name: 'Obrero',
    look: 'worker',
    x: 31,
    y: 28,
    facing: 'up',
    wander: 0,
    lines: [
      'Aquí estamos levantando la Oficina Virtual.',
      'Flujos de autenticación complejos y arquitectura escalable. Esto va pa’lante.',
    ],
  },
  {
    id: 'marinero',
    name: 'Marinero',
    look: 'sailor',
    x: 36,
    y: 37,
    facing: 'down',
    wander: 0,
    lines: [
      'Desde este muelle se ve todo el Caribe.',
      'Jhossua también hace apps de iPhone. MiMes, la del edificio verde, ayuda a cuidar los pesos.',
    ],
  },
  {
    id: 'veterano',
    name: 'Dev veterano',
    look: 'dev',
    x: 24,
    y: 32,
    facing: 'down',
    wander: 1,
    lines: [
      'Antes este portafolio corría con Phaser.',
      'Ahora es Astro, three.js y TypeScript estricto. Hasta tiene tests e2e.',
    ],
  },
];

const ZONES: readonly ZoneDef[] = [
  { id: 'norte', name: 'Barrio Norte', x: 0, y: 0, width: WIDTH, height: 13 },
  { id: 'astro', name: 'Distrito Astro', x: 0, y: 13, width: 22, height: 16 },
  { id: 'dotnet', name: 'Barrio .NET', x: 25, y: 13, width: 23, height: 9 },
  { id: 'dotnet-sur', name: 'Barrio .NET', x: 25, y: 22, width: 5, height: 7 },
  { id: 'muelle', name: 'Muelle Swift', x: 30, y: 22, width: 18, height: 7 },
  { id: 'conde', name: 'Calle El Conde', x: 22, y: 22, width: 3, height: 7 },
  { id: 'plaza', name: 'Plaza Mayor', x: 16, y: 13, width: 15, height: 9 },
  { id: 'malecon', name: 'El Malecón', x: 0, y: 29, width: WIDTH, height: 11 },
];

export const PRIMADA: TownDef = {
  id: 'primada',
  name: 'Ciudad Primada',
  width: WIDTH,
  height: HEIGHT,
  base: 'grass',
  ground: [
    { kind: 'tallGrass', x: 2, y: 19, width: 3, height: 2 },
    { kind: 'tallGrass', x: 44, y: 20, width: 2, height: 2 },
    { kind: 'flowers', x: 17, y: 13, width: 4, height: 1 },
    { kind: 'flowers', x: 26, y: 13, width: 4, height: 1 },
    { kind: 'flowers', x: 2, y: 4, width: 2, height: 2 },
    // Calles
    { kind: 'path', x: 2, y: 11, width: 44, height: 2 },
    { kind: 'path', x: 2, y: 22, width: 44, height: 2 },
    { kind: 'path', x: 2, y: 28, width: 44, height: 1 },
    { kind: 'path', x: 0, y: 29, width: WIDTH, height: 2 },
    { kind: 'path', x: 22, y: 4, width: 3, height: 27 },
    // Accesos a las puertas
    { kind: 'path', x: 7, y: 10, width: 1, height: 1 },
    { kind: 'path', x: 15, y: 10, width: 1, height: 1 },
    { kind: 'path', x: 32, y: 10, width: 1, height: 1 },
    { kind: 'path', x: 39, y: 10, width: 1, height: 1 },
    { kind: 'path', x: 6, y: 19, width: 1, height: 3 },
    { kind: 'path', x: 13, y: 19, width: 1, height: 3 },
    { kind: 'path', x: 34, y: 19, width: 1, height: 3 },
    { kind: 'path', x: 41, y: 19, width: 1, height: 3 },
    // Plaza, playa y mar
    { kind: 'plaza', x: 17, y: 14, width: 13, height: 7 },
    { kind: 'sand', x: 0, y: 31, width: WIDTH, height: 3 },
    { kind: 'shore', x: 0, y: 34, width: WIDTH, height: 1 },
    { kind: 'water', x: 0, y: 35, width: WIDTH, height: 5 },
    { kind: 'dock', x: 36, y: 34, width: 2, height: 4 },
  ],
  buildings: BUILDINGS,
  props: PROPS,
  npcs: NPCS,
  zones: ZONES,
  spawn: { x: 7, y: 10 },
  spawnFacing: 'down',
};
