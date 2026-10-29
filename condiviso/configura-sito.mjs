// Configurazione Astro comune ai due siti: cartelle condivise e scorciatoie di import
import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';

const radice = fileURLToPath(new URL('../', import.meta.url));

export function configuraSito({ sigla, dominio, cartellaSito }) {
  return defineConfig({
    site: `https://${dominio}`,
    publicDir: `${radice}pubblico`,
    outDir: `${radice}dist/${sigla}`,
    trailingSlash: 'ignore',
    build: { format: 'directory' },
    vite: {
      resolve: {
        alias: {
          '@condiviso': `${radice}condiviso`,
          '@impostazioni': `${radice}contenuti/${sigla}/impostazioni`,
          '@sito': fileURLToPath(new URL('src/sito.ts', cartellaSito)),
        },
      },
      server: { fs: { allow: [radice] } },
    },
  });
}
