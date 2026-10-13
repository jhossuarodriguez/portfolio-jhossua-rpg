import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
  // URL pública del sitio: se usa para el canonical, Open Graph y JSON-LD.
  site: 'https://portfolio-jhossua.vercel.app',
  output: 'static',
  devToolbar: { enabled: false },
  build: {
    // Todo el CSS crítico va en línea: el primer render del "título" no espera a la red.
    inlineStylesheets: 'auto',
  },
  vite: {
    plugins: [tailwindcss()],
    build: {
      // El chunk del juego lleva three.js (~150 kB gzip). Se carga aparte, después del menú.
      chunkSizeWarningLimit: 650,
    },
  },
});
