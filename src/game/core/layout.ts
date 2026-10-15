import { SCREEN_HEIGHT, SCREEN_WIDTH } from '@/game/core/types.ts';

/**
 * - `ds`: pantallas apiladas con la cruceta y los botones a los lados (la consola abierta).
 * - `stacked`: pantallas apiladas y controles debajo (móvil en vertical).
 * - `side`: pantallas lado a lado (pantallas anchas y bajas).
 */
export type LayoutMode = 'ds' | 'stacked' | 'side';

export interface Layout {
  readonly mode: LayoutMode;
  /** Escala de píxel de consola a píxel CSS. */
  readonly scale: number;
  readonly screenWidth: number;
  readonly screenHeight: number;
}

export interface LayoutInput {
  readonly viewportWidth: number;
  readonly viewportHeight: number;
}

/** Medidas de la carcasa en píxeles CSS (deben coincidir con las clases de Console.astro y ControlPad.astro). */
export const CHROME = {
  sidePanel: 132,
  controlsRow: 136,
  hinge: 28,
  compactBreakpoint: 560,
} as const;

/** Escala entera si cabe (pixel art nítido); si no, la mayor que quepa con dos decimales. */
export function pickScale(fit: number): number {
  if (fit >= 2) return Math.floor(fit);
  return Math.max(0.5, Math.floor(fit * 100) / 100);
}

export function computeLayout(input: LayoutInput): Layout {
  const width = input.viewportWidth;
  const height = input.viewportHeight;
  const compact = Math.min(width, height) < CHROME.compactBreakpoint;
  const padding = compact ? 8 : 16;
  const frame = padding * 4;
  const fits: Record<LayoutMode, number> = {
    ds: Math.min(
      (width - frame - 2 * CHROME.sidePanel - 2 * padding) / SCREEN_WIDTH,
      (height - frame - CHROME.hinge) / (SCREEN_HEIGHT * 2),
    ),
    stacked: Math.min(
      (width - frame) / SCREEN_WIDTH,
      (height - frame - CHROME.hinge - CHROME.controlsRow) / (SCREEN_HEIGHT * 2),
    ),
    side: Math.min(
      (width - frame - 2 * CHROME.sidePanel - 3 * padding) / (SCREEN_WIDTH * 2),
      (height - frame) / SCREEN_HEIGHT,
    ),
  };
  // La consola abierta es la identidad del sitio: solo se cambia si otra opción da pantallas claramente mayores.
  let mode: LayoutMode = width >= 720 ? 'ds' : 'stacked';
  if (fits.stacked > fits[mode] * 1.1) mode = 'stacked';
  if (width > height && fits.side > fits[mode] * 1.1) mode = 'side';
  const scale = pickScale(fits[mode]);
  return {
    mode,
    scale,
    screenWidth: Math.round(SCREEN_WIDTH * scale),
    screenHeight: Math.round(SCREEN_HEIGHT * scale),
  };
}
