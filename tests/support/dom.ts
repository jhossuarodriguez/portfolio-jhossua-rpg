import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';

type AstroComponent = Parameters<AstroContainer['renderToString']>[0];

/** Renderiza un componente .astro a HTML con la Container API. */
export async function renderToHtml(component: AstroComponent, props: Record<string, unknown> = {}): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(component, { props });
}

/**
 * Renderiza un componente y lo monta en un documento de happy-dom aislado
 * (para los tests de componentes, que corren en entorno Node).
 */
export async function renderComponent(
  component: AstroComponent,
  props: Record<string, unknown> = {},
): Promise<{ html: string; root: HTMLElement; document: Document }> {
  const html = await renderToHtml(component, props);
  const window = new Window({ url: 'https://portfolio.test/' });
  const document = window.document as unknown as Document;
  document.body.innerHTML = html;
  return { html, root: document.body, document };
}

/** Un `localStorage` en memoria; `failing` simula modo privado o cuota llena. */
export function memoryStore(failing = false): Storage & { readonly data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    key: (index: number) => [...data.keys()][index] ?? null,
    getItem: (key: string) => {
      if (failing) throw new Error('Almacenamiento bloqueado');
      return data.get(key) ?? null;
    },
    setItem: (key: string, value: string) => {
      if (failing) throw new Error('Almacenamiento bloqueado');
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
  };
}
