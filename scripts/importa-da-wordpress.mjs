// Importa pubblicazioni, eventi e pagine da un sito WordPress (API REST pubblica)
// e li salva come file Markdown in contenuti/, scaricando immagini e PDF.
//
// Eventi e pubblicazioni sono condivisi tra i siti: se un contenuto esiste già
// (stesso titolo e stessa data) non viene duplicato, gli si aggiunge solo il sito.
//
// Uso: node scripts/importa-da-wordpress.mjs <indirizzo> <sigla>
//   node scripts/importa-da-wordpress.mjs https://ali-milano.it ali-milano
//   node scripts/importa-da-wordpress.mjs https://freudlab.it freudlab

import { mkdir, writeFile, readFile, readdir, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import TurndownService from 'turndown';

const SITO = (process.argv[2] || 'https://ali-milano.it').replace(/\/$/, '');
const SIGLA = process.argv[3] || 'ali-milano';
const RADICE = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENUTI = join(RADICE, 'contenuti');
const PUBBLICO = join(RADICE, 'pubblico');
// I file di siti diversi possono avere lo stesso nome: ognuno ha la sua cartella
const CARTELLA_UPLOADS = SIGLA === 'ali-milano' ? '/uploads' : `/uploads/${SIGLA}`;

const td = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-', emDelimiter: '*' });
td.remove(['script', 'style', 'form', 'noscript', 'iframe']);

// Link pubblicitari inseriti di nascosto nei siti WordPress (orologi falsi e simili)
const SPAM = /replic|uhren|montre|orolog|rolex|breitling|omega replica|scae\.it/i;

async function json(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (importazione siti ALI)' } });
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

// Alcuni siti vanno in errore chiedendo tutte le pagine insieme: le chiediamo una alla volta
async function tutteLePagine() {
  const insieme = await tutte('pages');
  if (insieme.length) return insieme;
  const ids = (await tutte('pages?_fields=id')).map((p) => p.id);
  const out = [];
  for (const id of ids) {
    try {
      out.push(await json(`${SITO}/wp-json/wp/v2/pages/${id}`));
    } catch (e) {
      console.warn(`  ! pagina ${id} non letta (${e.message})`);
    }
  }
  return out;
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
  if (!m || !pulito.startsWith(SITO.replace(/^http:/, 'https:'))) return url;
  const pubblico = `${CARTELLA_UPLOADS}/${decodeURIComponent(m[1])}`;
  if (scaricati.has(pulito)) return scaricati.get(pulito);
  scaricati.set(pulito, pubblico);
  const destinazione = join(PUBBLICO, pubblico);
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
    .replace(/\[\/?(?:et_pb|decm)_[^\]]*\]/g, '')
    .replace(/<span[^>]*class="[^"]*et-pb-icon[^"]*"[^>]*>.*?<\/span>/gs, '')
    .replace(/<div[^>]*class="[^"]*et_pb_(?:contact_form|main_blurb_image|divider)[^"]*".*?<\/div>/gs, '')
    // via i link spam e i paragrafi che servono solo a contenerli
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gs, (tutto, href, dentro) => (SPAM.test(href) || SPAM.test(testo(dentro)) ? '' : tutto))
    .replace(/<p[^>]*>(?:(?!<\/p>).)*(?:replique|montres)(?:(?!<\/p>).)*<\/p>/gis, '');
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

// Contenuti già presenti (importati da un altro sito o creati dal pannello)
async function esistenti(cartella) {
  const dir = join(CONTENUTI, cartella);
  const out = [];
  for (const nome of await readdir(dir).catch(() => [])) {
    if (!nome.endsWith('.md')) continue;
    const file = join(dir, nome);
    const testoFile = await readFile(file, 'utf8');
    const campo = (k) => testoFile.match(new RegExp(`^${k}: "?([^"\\n]*)"?$`, 'm'))?.[1] ?? '';
    out.push({ file, nome: nome.slice(0, -3), testoFile, titolo: campo('titolo'), inizio: campo('inizio'), data: campo('data') });
  }
  return out;
}

const parole = (s) => new Set(slug(s).split('-').filter((p) => p.length > 3));
function simili(a, b) {
  if (slug(a) === slug(b)) return true;
  const pa = parole(a), pb = parole(b);
  const comuni = [...pa].filter((p) => pb.has(p)).length;
  return comuni >= 2 && comuni >= Math.min(pa.size, pb.size) * 0.5;
}

// Aggiunge questo sito alla lista "siti" di un contenuto che esiste già
async function aggiungiSito(voce) {
  const blocco = voce.testoFile.match(/^siti:\n((?:  - .*\n)+)/m);
  if (blocco?.[1].includes(SIGLA)) return;
  const nuovo = blocco
    ? voce.testoFile.replace(blocco[0], `${blocco[0]}  - "${SIGLA}"\n`)
    : voce.testoFile.replace(/^---\n/, `---\nsiti:\n  - "ali-milano"\n  - "${SIGLA}"\n`);
  await writeFile(voce.file, nuovo);
}

async function importaPubblicazioni() {
  const categorie = Object.fromEntries((await tutte('categories')).map((c) => [c.id, c.slug]));
  const post = await tutte('posts?_embed=wp:featuredmedia');
  const gia = await esistenti('pubblicazioni');
  const usati = new Set(gia.map((g) => g.nome));
  let nuove = 0, unite = 0;
  for (const p of post) {
    const titolo = testo(p.title.rendered);
    const doppione = gia.find((g) => slug(g.titolo) === slug(titolo));
    if (doppione) {
      await aggiungiSito(doppione);
      unite++;
      continue;
    }
    let nome = slug(titolo);
    while (usati.has(nome)) nome += `-${SIGLA}`;
    usati.add(nome);
    const cat = p.categories.map((id) => categorie[id]).map((c) => (c?.startsWith('editoriale') ? 'editoriale' : c))
      .find((c) => ['libri', 'articoli', 'seminari', 'dossier', 'editoriale'].includes(c)) || 'articoli';
    const immagine = p._embedded?.['wp:featuredmedia']?.[0]?.source_url;
    await salva('pubblicazioni', nome, {
      titolo,
      data: p.date.slice(0, 10),
      categoria: cat,
      immagine: await scarica(immagine),
      riassunto: testo(p.excerpt.rendered).replace(/\s*\[…\]$/, '').slice(0, 300),
      siti: [SIGLA],
      vecchio_url: p.link,
    }, await markdown(p.content.rendered));
    nuove++;
  }
  console.log(`Pubblicazioni: ${nuove} nuove, ${unite} già presenti (aggiunto il sito)`);
}

async function importaEventi() {
  const eventi = [];
  for (let pagina = 1; ; pagina++) {
    const d = await json(`${SITO}/wp-json/tribe/events/v1/events?per_page=50&page=${pagina}&start_date=2000-01-01&end_date=2035-12-31`).catch(() => ({ events: [] }));
    eventi.push(...d.events);
    if (!d.next_rest_url) break;
  }
  const gia = await esistenti('eventi');
  const usati = new Set(gia.map((g) => g.nome));
  let nuovi = 0, uniti = 0, saltati = 0;
  for (const e of eventi) {
    const titolo = testo(e.title);
    if (/^questo è un evento$/i.test(titolo)) { saltati++; continue; } // evento di prova
    const inizio = e.start_date.slice(0, 16).replace(' ', 'T');
    const doppione = gia.find((g) => g.inizio === inizio && simili(g.titolo, titolo));
    if (doppione) {
      await aggiungiSito(doppione);
      uniti++;
      continue;
    }
    let nome = `${e.start_date.slice(0, 10)}-${slug(titolo)}`;
    while (usati.has(nome)) nome += '-bis';
    usati.add(nome);
    const luogo = e.venue && !Array.isArray(e.venue) ? e.venue : null;
    await salva('eventi', nome, {
      titolo,
      inizio,
      fine: e.end_date.slice(0, 16).replace(' ', 'T'),
      tutto_il_giorno: e.all_day ? true : undefined,
      luogo: luogo ? testo(luogo.venue) : '',
      indirizzo: luogo ? [luogo.address, luogo.city].filter(Boolean).map(testo).join(', ') : '',
      locandina: await scarica(e.image?.url),
      siti: [SIGLA],
      vecchio_url: e.url,
    }, await markdown(e.description));
    nuovi++;
  }
  console.log(`Eventi: ${nuovi} nuovi, ${uniti} già presenti (aggiunto il sito), ${saltati} di prova saltati`);
}

async function importaPagine() {
  const pagine = await tutteLePagine();
  for (const p of pagine) {
    await salva(`${SIGLA}/pagine-importate`, slug(p.slug.replace(/^associazione_|^freudlab_/, '')), {
      titolo: testo(p.title.rendered),
      vecchio_url: p.link,
    }, await markdown(p.content.rendered));
  }
  console.log(`Pagine: ${pagine.length} (in contenuti/${SIGLA}/pagine-importate, da rivedere a mano)`);
}

console.log(`Importazione da ${SITO} (${SIGLA})…`);
await importaPubblicazioni();
await importaEventi();
await importaPagine();
console.log(`File scaricati: ${scaricati.size}`);
