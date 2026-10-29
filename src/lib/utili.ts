import { getCollection, type CollectionEntry } from 'astro:content';
import { marked } from 'marked';

export const SITO = 'ali-milano';

// Le date sono già in ora di Milano: le trattiamo come UTC solo per formattarle
const comeData = (s: string) => new Date(`${s.slice(0, 16)}:00Z`);
const fmt = (opzioni: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('it-IT', { timeZone: 'UTC', ...opzioni });

export const giorno = (s: string) => fmt({ day: 'numeric' }).format(comeData(s));
export const mese = (s: string) => fmt({ month: 'short' }).format(comeData(s)).replace('.', '');
export const anno = (s: string) => s.slice(0, 4);
export const dataLunga = (s: string) => fmt({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(comeData(s));
export const dataBreve = (s: string) => fmt({ day: 'numeric', month: 'long', year: 'numeric' }).format(comeData(s.length === 10 ? `${s}T00:00` : s));
export const ora = (s: string) => s.slice(11, 16).replace(':', '.');

export function orario(e: CollectionEntry<'eventi'>['data']) {
  if (e.tutto_il_giorno) return 'Tutto il giorno';
  return e.fine && e.fine.slice(0, 10) === e.inizio.slice(0, 10) && e.fine !== e.inizio
    ? `ore ${ora(e.inizio)} – ${ora(e.fine)}`
    : `ore ${ora(e.inizio)}`;
}

export async function eventiDelSito() {
  const tutti = await getCollection('eventi', (e) => e.data.siti.includes(SITO));
  return tutti.sort((a, b) => a.data.inizio.localeCompare(b.data.inizio));
}

export const md = (testo = '') => marked.parse(testo, { async: false }) as string;

export const CATEGORIE = {
  libri: 'Libri',
  articoli: 'Articoli',
  seminari: 'Seminari',
  dossier: 'Dossier',
} as const;
