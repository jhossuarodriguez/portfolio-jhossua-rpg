# AGENTS.md

Guía para agentes de código (y personas) que trabajen en este repo. Léela entera antes del primer cambio.

## Qué es

El portafolio de **Jhossua Roa Rodriguez** (Software Engineer, Santo Domingo) presentado como una consola portátil de
dos pantallas con estética de RPG de quinta generación (paleta "Black 2": negro + cian).

- **Pantalla de arriba:** *Ciudad Primada*, un pueblo 2D dibujado con **three.js**. Cada edificio es un proyecto.
- **Pantalla de abajo ("táctil"):** el portafolio completo en HTML (proyectos, sobre mí, habilidades, contacto, mapa,
  opciones). Funciona sin jugar y sin JavaScript.

El juego es una **capa opcional**. Toda la información vive en HTML; el canvas nunca es la única fuente de nada.

## Stack (versiones fijadas en `package.json`)

| Pieza | Versión | Notas |
| --- | --- | --- |
| Node | ≥ 24.8 | Lo exige `e2e`. Node ejecuta `.ts` directo (scripts). |
| pnpm | 12.11 | `packageManager` en `package.json`. Workspace con `tools/*`. |
| Astro | 7.3 | Sitio estático (`output: 'static'`). |
| three.js | 0.186 | Solo en `src/game/render/`. Se carga en un chunk aparte. |
| Tailwind CSS | 4.3 | Vía `@tailwindcss/vite`. Tokens en `@theme` de `src/styles/global.css`. |
| TypeScript | **7.0** (`tsc` nativo) | Tipado de todo el `.ts`. Estricto al máximo. |
| TypeScript 6 | 6.0 | **Solo** en `tools/astro-check` para `astro check` (los `.astro`). |
| Vitest | 5.0 | Proyectos `unit`, `components`, `functional`. |
| TesterArmy `e2e` | 0.20 | E2E en `tests/e2e/*.e2e.ts`. Motor web: `@e2e-dev/web`. |
| Biome | 2.5 | Lint + formato. |

## Comandos

| Comando | Qué hace |
| --- | --- |
| `pnpm dev` | Servidor de desarrollo. |
| `pnpm build` / `pnpm preview` | Build estático en `dist/` y su vista previa. |
| `pnpm typecheck` | `tsc --noEmit` con TypeScript 7 (src, tests, scripts, configs). |
| `pnpm typecheck:astro` | `astro check` (TypeScript 6) sobre los `.astro`. |
| `pnpm lint` / `pnpm format` | Biome: revisar / arreglar. |
| `pnpm check` | `typecheck` + `typecheck:astro` + `lint`. |
| `pnpm test` | Todos los tests de Vitest. `test:unit`, `test:components`, `test:functional` por separado. |
| `pnpm test:coverage` | Cobertura v8 con umbrales (85/85/75/85). |
| `pnpm test:e2e` | E2E deterministas (sin modelo). Construye y sirve el sitio solo. |
| `pnpm test:e2e:agent` | E2E con agente (`--tag agent`). Necesita `AI_GATEWAY_API_KEY`. |
| `pnpm og` | Regenera `public/og.png` con el arte del juego. |
| `pnpm ci` | Lo mismo que la integración continua. |

**Antes de dar una tarea por terminada:** `pnpm check && pnpm test` deben pasar. Si tocaste algo visible, corre también
`pnpm test:e2e`.

## Arquitectura

```
src/
├─ data/                 Contenido: proyectos y perfil. Fuente única de verdad.
├─ pages/index.astro     La única página.
├─ layouts/              <head>, SEO, JSON-LD, fuentes.
├─ components/           Astro: consola, pantallas, controles, fichas. Sin lógica de juego.
├─ styles/global.css     Tailwind + componentes con unidades de "píxel de consola" (--dpx).
├─ scripts/main.ts       Entrada del navegador: pantalla táctil primero, juego después (import dinámico).
└─ game/
   ├─ core/              Lógica pura: tipos, input, actores, diálogos, A*, simulación, cámara, layout, estaciones.
   ├─ art/               Pixel art procedural puro: paletas, tiles, objetos, edificios, personajes, horneado.
   ├─ world/             El pueblo: tipos, TownMap (colisiones e interactivos), primada.ts (el mapa), story.ts.
   ├─ render/            three.js: atlas, mallas por lotes, WorldRenderer.
   ├─ ui/                Puentes con el DOM: diálogo, pantalla táctil, controles, minimapa, sonido, opciones.
   └─ engine.ts          Orquestador del navegador: bucle a paso fijo + render + UI.
tests/
├─ unit/                 Node. Lógica y arte puros.
├─ components/           Node + Container API de Astro.
├─ functional/           happy-dom con transform SSR: controladores de UI y partidas completas sin gráficos.
├─ e2e/                  TesterArmy e2e (deterministas y con agente).
└─ support/              Ayudantes: render de componentes, arnés de partida, entorno happy-dom-ssr.
tools/astro-check/       Paquete aparte con TypeScript 6 para `astro check`.
scripts/                 Utilidades de Node (imagen OG, PNG).
```

Flujo: `InputState` (teclado, cruceta, mando) → `GameSimulation.tick()` a 60 Hz fijos → eventos (`dialog:open`,
`action`, `visit`, `zone`…) → `Engine` los traduce a UI (pantalla táctil, anuncios, sonido) → `WorldRenderer` dibuja
el estado una vez por frame.

## Reglas de oro

1. **`src/game/core` y `src/game/art` son puros.** Nada de DOM, `window`, three.js, `Math.random` ni `Date.now`.
   Usa `createRng(semilla)` y recibe el tiempo como parámetro. Así todo corre en Node y en los tests.
2. **three.js solo en `src/game/render/`.** `engine.ts` es lo único que lo importa y `main.ts` lo carga con
   `import()` dinámico. No importes `engine.ts` desde tests ni desde componentes.
3. **El contenido vive en `src/data/`.** Para cambiar un texto del portafolio, edita los datos, no los componentes.
   Los diálogos del pueblo que hablan de proyectos se generan desde esos datos.
4. **Pixel perfect.** 1 tile = 16 px; pantalla lógica 256×192. Coordenadas enteras, `NearestFilter`, sin mipmaps ni
   antialias, cámara redondeada a píxel entero. La escala CSS es entera siempre que quepa (`computeLayout`).
5. **Arte original y generado por código.** No añadas sprites, tilesets, logos, música ni fuentes de franquicias
   (nada de criaturas, marcas ni logotipos de videojuegos existentes). La inspiración es el estilo, no los assets.
6. **TypeScript estricto de verdad.** Sin `any`, sin `!`, sin `@ts-ignore`/`@ts-expect-error`, sin `as` para tapar
   errores (solo en tests para tipos de librerías). Activos: `strict`, `noUncheckedIndexedAccess`,
   `exactOptionalPropertyTypes`, `noPropertyAccessFromIndexSignature` (usa `dataset['x']`), `erasableSyntaxOnly`
   (sin `enum`, `namespace` ni propiedades de parámetro en constructores).
7. **Imports con extensión `.ts`** dentro de `src/game` y `src/data` (Node los ejecuta tal cual).
8. **Accesibilidad no negociable.** Todo control con nombre accesible. Los diálogos se anuncian en una región
   `aria-live`. Se respeta `prefers-reduced-motion` (texto instantáneo, sin zoom ni paseo de cámara). El teclado del
   juego ignora las teclas si el foco está en un botón, enlace o campo, salvo los marcados `[data-game-control]`.
9. **Contrato con los e2e.** `[data-top-screen]` publica el estado en `data-scene`, `data-dialog-state`,
   `data-player-x`, `data-player-y`, `data-facing`, `data-zone`, `data-season`, `data-time` y `data-ready`.
   Si renombras algo, actualiza `tests/e2e/`.
10. **Mejora progresiva.** Sin JS, la pantalla táctil muestra todas las vistas en columna (clase `no-js`). Con JS,
    solo la vista con `data-active`.

## Recetas

### Agregar un proyecto

1. Añádelo a `PROJECTS` en `src/data/projects.ts` (el `id` en formato slug).
2. En `src/game/world/primada.ts`, crea su edificio con `projectBuilding(id, x, y, estilo)` en un hueco libre
   (ancho impar, puerta abajo al centro) y su cartel con `projectSign(id, x, y)` junto a la puerta.
3. Corre `pnpm test`. El test de Ciudad Primada falla si hay solapes, si una puerta no es alcanzable o si al
   proyecto le falta edificio o cartel.
4. Para ver el mapa en texto: `new TownMap(PRIMADA).toAscii()` (`D` puerta, `?` cartel, `#` sólido).

### Cambiar el mapa

Todo está en tiles: capas de suelo (`ground`, en orden), edificios, objetos (`PROP_SHAPES` define su huella), NPC
(con radio de paseo) y zonas (la última que coincide gana). `TownMap` valida solapes y límites al construirse.

### Nuevo arte

Dibuja en `src/game/art/` con las primitivas de `pixel.ts` (`fromRows`, `mirrorRows`, `fillRect`, `outline`…) y la
paleta de la estación (`WorldPalette`); así cambia solo con primavera/verano/otoño/invierno. Añade un test en
`tests/unit/art.test.ts` que compruebe tamaño y contenido.

## Testing

- **unit:** funciones puras. Nombres de test en español describiendo el comportamiento.
- **components:** renderiza con `renderComponent()` (Container API) y consulta con Testing Library (`within`, roles).
- **functional:** usa `createHarness()` (`tests/support/game.ts`) para jugar partidas sin gráficos (`tap`, `hold`,
  `runUntil`, `closeDialog`) y monta el HTML real de los componentes para probar los controladores de UI.
- **e2e (TesterArmy):** deterministas con `screen`/`expect` (sin modelo). Los de agente (`agent.act`/`agent.assert`)
  llevan la etiqueta `agent`; tras pasar, sus acciones se repiten desde la caché `.e2e/cache` sin llamar al modelo.
  - `E2E_CHROME_PATH=/ruta/a/chrome` usa un Chrome instalado (útil sin acceso a la CDN de Playwright).
  - `APP_URL=https://…` prueba contra un despliegue.
  - En CI: `pnpm exec e2e-web install chromium --with-deps` antes de `pnpm test:e2e`.
- No hagas tests que dependan del reloj real: inyecta fechas/horas (ver `season.ts`).

## Estilo

- Biome manda (2 espacios, comillas simples, 120 columnas). `pnpm format` antes de commitear.
- Código en inglés; comentarios, textos de UI, diálogos y tests en español.
- Commits con Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`, `refactor:`…) y SemVer en los releases.

## No hacer

- No metas información solo en el canvas ni en atributos `aria-hidden`.
- No añadas dependencias pesadas para algo que ya resuelve el motor (no hace falta un motor de juegos ni React).
- No cambies `TILE`, `SCREEN_WIDTH` o `SCREEN_HEIGHT` sin revisar arte, cámara, CSS (`--dpx`) y tests.
- No subas `.e2e/`, `dist/`, `coverage/` ni claves (`.env`).
