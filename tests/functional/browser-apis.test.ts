import { afterEach, describe, expect, it, vi } from 'vitest';
import { drawMinimap, MINIMAP_SCALE } from '@/game/ui/minimap.ts';
import { browserStore } from '@/game/ui/settings.ts';
import { Sfx } from '@/game/ui/sfx.ts';
import { PRIMADA } from '@/game/world/primada.ts';
import { TownMap } from '@/game/world/town-map.ts';

afterEach(() => {
  vi.unstubAllGlobals();
});

/** AudioContext de mentira: cuenta osciladores en vez de sonar. */
function fakeAudio(): { oscillators: number; resumed: number; Context: new () => unknown } {
  const stats = { oscillators: 0, resumed: 0 };
  const param = { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() };
  class FakeAudioContext {
    state = 'suspended';
    currentTime = 0;
    destination = {};
    resume(): Promise<void> {
      stats.resumed += 1;
      return Promise.resolve();
    }
    createOscillator(): unknown {
      stats.oscillators += 1;
      const gainNode = { gain: param, connect: () => this.destination };
      return { type: 'square', frequency: param, connect: () => gainNode, start: vi.fn(), stop: vi.fn() };
    }
    createGain(): unknown {
      return { gain: param, connect: () => this.destination };
    }
  }
  return {
    get oscillators() {
      return stats.oscillators;
    },
    get resumed() {
      return stats.resumed;
    },
    Context: FakeAudioContext,
  };
}

describe('efectos de sonido', () => {
  it('apagado por defecto: no crea contexto de audio', () => {
    const audio = fakeAudio();
    vi.stubGlobal('AudioContext', audio.Context);
    const sfx = new Sfx(false);
    sfx.play('confirm');
    expect(audio.oscillators).toBe(0);
    expect(sfx.enabled).toBe(false);
  });

  it('encendido: una nota por oscilador y reanuda el contexto', () => {
    const audio = fakeAudio();
    vi.stubGlobal('AudioContext', audio.Context);
    const sfx = new Sfx(false);
    sfx.setEnabled(true);
    sfx.play('start');
    expect(audio.oscillators).toBe(3);
    expect(audio.resumed).toBe(1);
  });

  it('sin Web Audio sigue en silencio sin romper nada', () => {
    vi.stubGlobal('AudioContext', undefined);
    expect(() => new Sfx(true).play('bump')).not.toThrow();
  });
});

describe('almacenamiento del navegador', () => {
  it('usa localStorage cuando funciona', () => {
    expect(browserStore()).toBe(globalThis.localStorage);
  });

  it('devuelve null si el navegador lo bloquea', () => {
    vi.stubGlobal('localStorage', {
      setItem: () => {
        throw new Error('SecurityError');
      },
    });
    expect(browserStore()).toBeNull();
  });
});

describe('minimapa', () => {
  it('pinta un rectángulo por tile, objeto y edificio', () => {
    const map = new TownMap(PRIMADA);
    const fillRect = vi.fn();
    const canvas = { width: 0, height: 0, getContext: () => ({ fillStyle: '', fillRect }) };
    drawMinimap(canvas as unknown as HTMLCanvasElement, map);
    expect(canvas.width).toBe(map.width * MINIMAP_SCALE);
    expect(canvas.height).toBe(map.height * MINIMAP_SCALE);
    expect(fillRect).toHaveBeenCalledTimes(map.width * map.height + PRIMADA.props.length + PRIMADA.buildings.length);
  });

  it('sin contexto 2D no hace nada', () => {
    const canvas = { width: 0, height: 0, getContext: () => null };
    expect(() => drawMinimap(canvas as unknown as HTMLCanvasElement, new TownMap(PRIMADA))).not.toThrow();
  });
});
