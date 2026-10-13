import { type ChildProcess, spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { BrowserProvider } from '@e2e-dev/web';

/**
 * Proveedor de navegador que usa un Chrome/Chromium ya instalado en la máquina,
 * en vez de descargar el de Playwright. Útil en contenedores sin acceso a la CDN
 * de navegadores o para probar con tu Chrome de siempre:
 *
 *   E2E_CHROME_PATH=/usr/bin/google-chrome pnpm test:e2e
 *
 * Arranca un Chrome headless por worker (con su propio perfil temporal; cada test
 * usa un contexto nuevo dentro de él),
 * le pide el endpoint de DevTools y lo cierra al terminar.
 */

const running = new Map<string, { process: ChildProcess; profile: string }>();

function waitForEndpoint(child: ChildProcess, signal: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    let output = '';
    const timer = setTimeout(() => reject(new Error(`Chrome no abrió DevTools a tiempo:\n${output}`)), 30_000);
    const onData = (chunk: Buffer): void => {
      output += chunk.toString();
      const match = /DevTools listening on (ws:\/\/\S+)/.exec(output);
      if (match?.[1]) {
        clearTimeout(timer);
        child.stderr?.off('data', onData);
        resolve(match[1]);
      }
    };
    child.stderr?.on('data', onData);
    child.once('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`Chrome se cerró al arrancar (código ${code ?? '?'}):\n${output}`));
    });
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      child.kill('SIGKILL');
      reject(new Error('Arranque de Chrome cancelado'));
    });
  });
}

export function localChrome(executablePath: string): BrowserProvider {
  return {
    name: 'local-chrome',
    scope: 'worker',
    async acquire(request) {
      const profile = mkdtempSync(join(tmpdir(), 'e2e-chrome-'));
      const isRoot = typeof process.getuid === 'function' && process.getuid() === 0;
      const child = spawn(
        executablePath,
        [
          '--headless=new',
          '--remote-debugging-port=0',
          `--user-data-dir=${profile}`,
          '--no-first-run',
          '--no-default-browser-check',
          '--disable-background-timer-throttling',
          // WebGL por software: el pueblo se dibuja aunque la máquina no tenga GPU.
          '--use-gl=angle',
          '--use-angle=swiftshader',
          '--enable-unsafe-swiftshader',
          '--ignore-gpu-blocklist',
          ...(isRoot ? ['--no-sandbox'] : []),
          'about:blank',
        ],
        { stdio: ['ignore', 'ignore', 'pipe'] },
      );
      const cdpEndpoint = await waitForEndpoint(child, request.signal);
      const id = String(child.pid ?? Date.now());
      running.set(id, { process: child, profile });
      return { id, cdpEndpoint };
    },
    async release(lease) {
      const entry = running.get(lease.id);
      running.delete(lease.id);
      if (entry) {
        entry.process.kill('SIGTERM');
        rmSync(entry.profile, { recursive: true, force: true });
      } else {
        try {
          process.kill(Number(lease.id), 'SIGTERM');
        } catch {
          // Ya estaba cerrado.
        }
      }
    },
  };
}
