// Solo per l'anteprima su GitHub Pages, dove ogni sito vive in una sottocartella
// (es. https://utente.github.io/siti-ali-freudlab/freudlab/): aggiunge la
// sottocartella a tutti i percorsi assoluti delle pagine già generate.
//
// Uso: node scripts/prefissa-base.mjs dist/freudlab /siti-ali-freudlab/freudlab

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';

const dist = resolve(process.argv[2] || 'dist');
const base = (process.argv[3] || '').replace(/\/$/, '');
if (!base) {
  console.log('Nessuna sottocartella indicata: niente da fare.');
  process.exit(0);
}

async function* file(dir) {
  for (const voce of await readdir(dir, { withFileTypes: true })) {
    const percorso = join(dir, voce.name);
    if (voce.isDirectory()) yield* file(percorso);
    else yield percorso;
  }
}

const sostituisci = (testo) =>
  testo
    // attributi HTML: href="/…", src="/…", action="/…" (ma non "//dominio")
    .replace(/((?:href|src|action|poster|data-src)=["'])\/(?!\/)/g, `$1${base}/`)
    // CSS: url('/…') e url(/…)
    .replace(/url\((["']?)\/(?!\/)/g, `url($1${base}/`)
    // metadati del pannello
    .replace(/^(logo_url:\s*)\/(?!\/)/m, `$1${base}/`);

let modificati = 0;
for await (const f of file(dist)) {
  if (!['.html', '.css', '.yml', '.js'].includes(extname(f))) continue;
  const prima = await readFile(f, 'utf8');
  const dopo = extname(f) === '.js' ? prima.replaceAll('"/_astro/', `"${base}/_astro/`) : sostituisci(prima);
  if (dopo !== prima) {
    await writeFile(f, dopo);
    modificati++;
  }
}
console.log(`Percorsi aggiornati con "${base}" in ${modificati} file.`);
