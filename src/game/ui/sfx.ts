export type SoundName = 'blip' | 'confirm' | 'cancel' | 'bump' | 'door' | 'start' | 'complete';

interface Note {
  readonly frequency: number;
  readonly duration: number;
  readonly type: OscillatorType;
  readonly delay?: number;
}

/** Efectos de 8 bits sintetizados al vuelo: sin archivos de audio. */
const SOUNDS: Readonly<Record<SoundName, readonly Note[]>> = {
  blip: [{ frequency: 880, duration: 0.04, type: 'square' }],
  confirm: [
    { frequency: 660, duration: 0.05, type: 'square' },
    { frequency: 990, duration: 0.07, type: 'square', delay: 0.05 },
  ],
  cancel: [{ frequency: 330, duration: 0.07, type: 'square' }],
  bump: [{ frequency: 90, duration: 0.08, type: 'triangle' }],
  door: [
    { frequency: 440, duration: 0.06, type: 'triangle' },
    { frequency: 330, duration: 0.09, type: 'triangle', delay: 0.06 },
  ],
  start: [
    { frequency: 523, duration: 0.08, type: 'square' },
    { frequency: 659, duration: 0.08, type: 'square', delay: 0.08 },
    { frequency: 784, duration: 0.14, type: 'square', delay: 0.16 },
  ],
  complete: [
    { frequency: 523, duration: 0.1, type: 'square' },
    { frequency: 659, duration: 0.1, type: 'square', delay: 0.1 },
    { frequency: 784, duration: 0.1, type: 'square', delay: 0.2 },
    { frequency: 1047, duration: 0.25, type: 'square', delay: 0.3 },
  ],
};

/** Sonido opcional y apagado por defecto. El contexto de audio se crea al primer uso. */
export class Sfx {
  #enabled: boolean;
  #context: AudioContext | null = null;

  constructor(enabled: boolean) {
    this.#enabled = enabled;
  }

  get enabled(): boolean {
    return this.#enabled;
  }

  setEnabled(enabled: boolean): void {
    this.#enabled = enabled;
  }

  play(name: SoundName): void {
    if (!this.#enabled) return;
    try {
      this.#context ??= new AudioContext();
      const context = this.#context;
      if (context.state === 'suspended') void context.resume();
      for (const note of SOUNDS[name]) {
        const start = context.currentTime + (note.delay ?? 0);
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = note.type;
        oscillator.frequency.setValueAtTime(note.frequency, start);
        gain.gain.setValueAtTime(0.06, start);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + note.duration);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(start);
        oscillator.stop(start + note.duration + 0.02);
      }
    } catch {
      // Sin Web Audio (o bloqueado): el juego sigue en silencio.
    }
  }
}
