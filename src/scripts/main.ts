import { PROJECTS } from '@/data/projects.ts';
import { SEASON_LABELS } from '@/game/art/palettes.ts';
import { computeLayout } from '@/game/core/layout.ts';
import { seasonForDate } from '@/game/core/season.ts';
import { VISITED_STORAGE_KEY, VisitedRegistry } from '@/game/core/visited.ts';
import type { Engine } from '@/game/engine.ts';
import { required } from '@/game/ui/dom.ts';
import { browserStore, loadSettings, type Settings, saveSettings } from '@/game/ui/settings.ts';
import { Sfx } from '@/game/ui/sfx.ts';
import { TouchScreen } from '@/game/ui/touch-screen.ts';

/**
 * Punto de entrada del navegador. Primero deja usable la pantalla táctil (es HTML
 * normal y no depende de WebGL); después carga el juego (three.js) en un chunk aparte.
 */

const consoleRoot = required(document, '[data-console]');
const topScreen = required(document, '[data-top-screen]');
const touchRoot = required(document, '[data-touch-screen]');
const announcer = document.createElement('p');
announcer.className = 'sr-only';
announcer.setAttribute('aria-live', 'polite');
announcer.dataset['announcer'] = '';
document.body.append(announcer);

const store = browserStore();
let settings: Settings = loadSettings(store);
const visited = new VisitedRegistry(
  PROJECTS.map((project) => project.id),
  store,
);
const sfx = new Sfx(settings.sound);
let engine: Engine | null = null;
let pendingWalk: string | null = null;

const touch = new TouchScreen(
  touchRoot,
  {
    onWalkTo: (buildingId) => {
      if (engine) engine.walkTo(buildingId);
      else pendingWalk = buildingId;
    },
    onSettingsChange: (next) => {
      settings = next;
      saveSettings(store, next);
      engine?.applySettings(next);
      sfx.play('blip');
    },
    onResetVisited: () => {
      try {
        store?.setItem(VISITED_STORAGE_KEY, '[]');
      } catch {
        // Sin almacenamiento: se recarga igual.
      }
      window.location.reload();
    },
  },
  announcer,
);
touch.writeSettings(settings);
touch.setVisited(visited.list(), visited.total);
touch.setStatus(
  new Date().toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' }),
  SEASON_LABELS[settings.season === 'auto' ? seasonForDate(new Date()) : settings.season],
);

// ── Tamaño de las pantallas: escala entera de píxel siempre que se pueda ──
function fitConsole(): void {
  const layout = computeLayout({ viewportWidth: window.innerWidth, viewportHeight: window.innerHeight });
  consoleRoot.dataset['layout'] = layout.mode;
  consoleRoot.style.setProperty('--screen-w', `${layout.screenWidth}px`);
  consoleRoot.style.setProperty('--screen-h', `${layout.screenHeight}px`);
  consoleRoot.style.setProperty('--pixel-scale', String(layout.scale));
}

fitConsole();
let resizeFrame = 0;
window.addEventListener('resize', () => {
  cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(fitConsole);
});

// ── El juego ────────────────────────────────────────────────────────────
function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

function showScreenMessage(text: string): void {
  const message = topScreen.querySelector<HTMLElement>('[data-screen-message]');
  if (!message) return;
  message.textContent = text;
  message.hidden = false;
}

async function bootGame(): Promise<void> {
  if (!supportsWebGL()) {
    topScreen.dataset['scene'] = 'unsupported';
    showScreenMessage(
      'Tu navegador no puede dibujar el pueblo (WebGL). Todo el portafolio está en la pantalla de abajo.',
    );
    return;
  }
  try {
    const { Engine } = await import('@/game/engine.ts');
    engine = new Engine({
      topScreen,
      controls: consoleRoot,
      touch,
      minimap: touchRoot.querySelector<HTMLElement>('div[data-minimap]'),
      announcer,
      visited,
      sfx,
      settings,
      isTouch: window.matchMedia('(pointer: coarse)').matches,
    });
    required(topScreen, '[data-start]').addEventListener('click', () => engine?.start());
    if (pendingWalk) {
      engine.walkTo(pendingWalk);
      pendingWalk = null;
    }
    // El reloj de la barra de estado (y el día/noche) se actualiza cada minuto.
    window.setInterval(() => engine?.applySettings(settings), 60_000);
  } catch (error) {
    console.error(error);
    topScreen.dataset['scene'] = 'unsupported';
    showScreenMessage('El pueblo no pudo arrancar. Todo el portafolio está en la pantalla de abajo.');
  }
}

void bootGame();
