import { renderToHtml } from '@tests/support/dom.ts';
import { Window } from 'happy-dom';
import { describe, expect, it } from 'vitest';
import { PROFILE } from '@/data/profile.ts';
import Index from '@/pages/index.astro';

async function renderPage(): Promise<Document> {
  const html = await renderToHtml(Index);
  const window = new Window({ url: 'https://portfolio-jhossua.vercel.app/' });
  window.document.write(html);
  return window.document as unknown as Document;
}

describe('página principal', () => {
  it('declara idioma, título y descripción', async () => {
    const document = await renderPage();
    expect(document.documentElement.getAttribute('lang')).toBe('es');
    expect(document.title).toContain(PROFILE.name);
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toContain('Ciudad Primada');
    expect(document.querySelector('meta[name="viewport"]')?.getAttribute('content')).toContain('width=device-width');
  });

  it('arranca como "no-js" (el script en línea lo cambia a "js")', async () => {
    const document = await renderPage();
    expect(document.documentElement.classList.contains('no-js')).toBe(true);
    expect(document.head.innerHTML).toContain("classList.replace('no-js', 'js')");
  });

  it('tiene metadatos sociales y un JSON-LD de persona válido', async () => {
    const document = await renderPage();
    expect(document.querySelector('meta[property="og:title"]')).not.toBeNull();
    expect(document.querySelector('link[rel="canonical"]')).not.toBeNull();
    const raw = document.querySelector('script[type="application/ld+json"]')?.textContent ?? '';
    const data = JSON.parse(raw) as { '@type': string; name: string; jobTitle: string; sameAs: string[] };
    expect(data['@type']).toBe('Person');
    expect(data.name).toBe(PROFILE.name);
    expect(data.jobTitle).toBe(PROFILE.role);
    expect(data.sameAs).toContain('https://github.com/jhossuarodriguez');
  });

  it('el enlace para saltar al contenido apunta a la pantalla táctil', async () => {
    const document = await renderPage();
    const skip = [...document.querySelectorAll('a')].find((link) => link.textContent?.includes('Saltar al contenido'));
    expect(skip?.getAttribute('href')).toBe('#pantalla-tactil');
    expect(document.getElementById('pantalla-tactil')).not.toBeNull();
  });

  it('todos los ids son únicos', async () => {
    const document = await renderPage();
    const ids = [...document.querySelectorAll('[id]')].map((element) => element.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('los aria-labelledby apuntan a elementos existentes', async () => {
    const document = await renderPage();
    for (const element of document.querySelectorAll('[aria-labelledby]')) {
      const id = element.getAttribute('aria-labelledby') ?? '';
      expect(document.getElementById(id), id).not.toBeNull();
    }
  });
});
