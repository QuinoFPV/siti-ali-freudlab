// Importa pubblicazioni, eventi e pagine da un sito WordPress (API REST pubblica)
// e li salva come file Markdown nelle raccolte di Astro, scaricando le immagini.
//
// Uso: node scripts/importa-da-wordpress.mjs [https://ali-milano.it] [sigla-sito]
// Esempio per Freudlab: node scripts/importa-da-wordpress.mjs https://freudlab.it freudlab

import { mkdir, writeFile, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import TurndownService from 'turndown';

const SITO = (process.argv[2] || 'https://ali-milano.it').replace(/\/$/, '');
const SIGLA = process.argv[3] || 'ali-milano';
const RADICE = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENUTI = join(RADICE, 'src/content');
const UPLOADS = join(RADICE, 'public');

const td = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-', emDelimiter: '*' });
td.remove(['script', 'style', 'form', 'noscript', 'iframe']);

async function json(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (importazione ALI demo)' } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

async function tutte(endpoint) {
  const out = [];
  for (let pagina = 1; ; pagina++) {
    const sep = endpoint.includes('?') ? '&' : '?';
    try {
      const lotto = await json(`${SITO}/wp-json/wp/v2/${endpoint}${sep}per_page=100&page=${pagina}`);
      out.push(...lotto);
      if (lotto.length < 100) return out;
    } catch {
      return out;
    }
  }
}

const ENTITA = { amp: '&', quot: '"', lt: '<', gt: '>', nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', hellip: '…', ndash: '–', mdash: '—' };
function decodifica(s = '') {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITA[n.toLowerCase()] ?? m);
}

function testo(html = '') {
  return decodifica(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function slug(s) {
  return testo(s)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    .slice(0, 70).replace(/-$/, '') || 'senza-titolo';
}

// Scarica i file caricati su WordPress e restituisce il nuovo percorso pubblico
const scaricati = new Map();
async function scarica(url) {
  if (!url) return '';
  const pulito = url.split('?')[0].replace(/^http:/, 'https:');
  const m = pulito.match(/\/wp-content\/uploads\/(.+)$/);
  if (!m) return url;
  const pubblico = `/uploads/${decodeURIComponent(m[1])}`;
  if (scaricati.has(pulito)) return scaricati.get(pulito);
  scaricati.set(pulito, pubblico);
  const destinazione = join(UPLOADS, pubblico);
  try {
    await access(destinazione);
    return pubblico;
  } catch {}
  try {
    const r = await fetch(pulito, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!r.ok) throw new Error(r.status);
    await mkdir(dirname(destinazione), { recursive: true });
    await writeFile(destinazione, Buffer.from(await r.arrayBuffer()));
  } catch (e) {
    console.warn(`  ! non scaricato ${pulito} (${e.message})`);
    scaricati.set(pulito, url);
    return url;
  }
  return pubblico;
}

// Ripulisce l'HTML prodotto da Divi e lo converte in Markdown
async function markdown(html = '') {
  let h = html
    .replace(/\[\/?et_pb_[^\]]*\]/g, '')
    .replace(/<span[^>]*class="[^"]*et-pb-icon[^"]*"[^>]*>.*?<\/span>/gs, '')
    .replace(/<div[^>]*class="[^"]*et_pb_(?:contact_form|main_blurb_image|divider)[^"]*".*?<\/div>/gs, '');
  // Nei post Divi aggiunge in fondo la lista "Ultimi articoli": la togliamo
  h = h.split(/<h[1-6][^>]*>\s*Ultimi articoli\s*<\/h[1-6]>/i)[0];
  const urls = new Set([...h.matchAll(/(?:src|href)="([^"]*\/wp-content\/uploads\/[^"]+)"/g)].map((m) => m[1]));
  for (const u of urls) h = h.split(u).join(await scarica(u));
  h = h.replace(/(?:srcset|sizes)="[^"]*"/g, '');
  return td.turndown(h).replace(/\n{3,}/g, '\n\n').replace(/\\\[|\\\]/g, (m) => m[1]).trim();
}

function frontmatter(dati) {
  const righe = Object.entries(dati)
    .filter(([, v]) => v !== undefined && v !== '' && !(Array.isArray(v) && !v.length))
    .map(([k, v]) => (Array.isArray(v) ? `${k}:\n${v.map((x) => `  - ${JSON.stringify(x)}`).join('\n')}` : `${k}: ${typeof v === 'string' ? JSON.stringify(v) : v}`));
  return `---\n${righe.join('\n')}\n---\n`;
}

async function salva(cartella, nome, dati, corpo) {
  // Il titolo è già nei metadati: se il testo ricomincia con lo stesso titolo lo togliamo
  if (dati.titolo && slug(corpo.match(/^#{1,2} (.*)/)?.[1] || '') === slug(dati.titolo)) {
    corpo = corpo.replace(/^#{1,2} .*\n*/, '');
  }
  const dir = join(CONTENUTI, cartella);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, `${nome}.md`), `${frontmatter(dati)}\n${corpo}\n`);
}

async function importaPubblicazioni() {
  const categorie = Object.fromEntries((await tutte('categories')).map((c) => [c.id, c.slug]));
  const post = await tutte('posts?_embed=wp:featuredmedia');
  const usati = new Set();
  for (const p of post) {
    let nome = slug(p.title.rendered);
    while (usati.has(nome)) nome += '-bis';
    usati.add(nome);
    const cat = p.categories.map((id) => categorie[id]).find((c) => ['libri', 'articoli', 'seminari', 'dossier'].includes(c)) || 'articoli';
    const immagine = p._embedded?.['wp:featuredmedia']?.[0]?.source_url;
    await salva('pubblicazioni', nome, {
      titolo: testo(p.title.rendered),
      data: p.date.slice(0, 10),
      categoria: cat,
      immagine: await scarica(immagine),
      riassunto: testo(p.excerpt.rendered).replace(/\s*\[…\]$/, '').slice(0, 300),
      vecchio_url: p.link,
    }, await markdown(p.content.rendered));
  }
  console.log(`Pubblicazioni: ${post.length}`);
}

async function importaEventi() {
  const eventi = [];
  for (let pagina = 1; ; pagina++) {
    const d = await json(`${SITO}/wp-json/tribe/events/v1/events?per_page=50&page=${pagina}&start_date=2000-01-01&end_date=2035-12-31`).catch(() => ({ events: [] }));
    eventi.push(...d.events);
    if (!d.next_rest_url) break;
  }
  const usati = new Set();
  for (const e of eventi) {
    let nome = `${e.start_date.slice(0, 10)}-${slug(e.title)}`;
    while (usati.has(nome)) nome += '-bis';
    usati.add(nome);
    const luogo = e.venue && !Array.isArray(e.venue) ? e.venue : null;
    await salva('eventi', nome, {
      titolo: testo(e.title),
      inizio: e.start_date.slice(0, 16).replace(' ', 'T'),
      fine: e.end_date.slice(0, 16).replace(' ', 'T'),
      tutto_il_giorno: e.all_day ? true : undefined,
      luogo: luogo ? testo(luogo.venue) : '',
      indirizzo: luogo ? [luogo.address, luogo.city].filter(Boolean).map(testo).join(', ') : '',
      locandina: await scarica(e.image?.url),
      siti: [SIGLA],
      vecchio_url: e.url,
    }, await markdown(e.description));
  }
  console.log(`Eventi: ${eventi.length}`);
}

async function importaPagine() {
  const pagine = await tutte('pages');
  for (const p of pagine) {
    await salva('pagine-importate', slug(p.slug.replace(/^associazione_|^freudlab_/, '')), {
      titolo: testo(p.title.rendered),
      vecchio_url: p.link,
    }, await markdown(p.content.rendered));
  }
  console.log(`Pagine: ${pagine.length} (in src/content/pagine-importate, da rivedere a mano)`);
}

console.log(`Importazione da ${SITO}…`);
await importaPubblicazioni();
await importaEventi();
await importaPagine();
console.log(`File scaricati: ${scaricati.size}`);
