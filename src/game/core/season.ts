import type { Season } from '@/game/art/palettes.ts';

/**
 * Estaciones como en la quinta generación de los RPG portátiles: rotan cada mes
 * (enero primavera, febrero verano, marzo otoño, abril invierno, y vuelta a empezar).
 */
const ROTATION: readonly Season[] = ['spring', 'summer', 'autumn', 'winter'];

export function seasonForMonth(monthIndex: number): Season {
  if (!Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    throw new RangeError(`Mes fuera de rango: ${monthIndex}`);
  }
  return ROTATION[monthIndex % 4] ?? 'spring';
}

export function seasonForDate(date: Date): Season {
  return seasonForMonth(date.getMonth());
}

export type TimeOfDay = 'morning' | 'day' | 'evening' | 'night';

export const TIME_LABELS: Readonly<Record<TimeOfDay, string>> = {
  morning: 'Mañana',
  day: 'Día',
  evening: 'Atardecer',
  night: 'Noche',
};

export function timeOfDay(hour: number): TimeOfDay {
  if (hour >= 5 && hour < 10) return 'morning';
  if (hour >= 10 && hour < 17) return 'day';
  if (hour >= 17 && hour < 20) return 'evening';
  return 'night';
}

export interface Tint {
  /** Color del filtro en hex. */
  readonly color: string;
  /** Opacidad del filtro, 0 = sin filtro. */
  readonly opacity: number;
}

/** Filtro de color de toda la pantalla según la hora (como el día/noche de la consola). */
export const TIME_TINTS: Readonly<Record<TimeOfDay, Tint>> = {
  morning: { color: '#ffd8a8', opacity: 0.08 },
  day: { color: '#ffffff', opacity: 0 },
  evening: { color: '#ff8a4a', opacity: 0.16 },
  night: { color: '#1a2a6a', opacity: 0.32 },
};
