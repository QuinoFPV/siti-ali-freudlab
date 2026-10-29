import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Le date degli eventi sono "ora di Milano" scritte come 2026-05-09T10:00
const dataOra = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);

const eventi = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/eventi' }),
  schema: z.object({
    titolo: z.string(),
    inizio: dataOra,
    fine: dataOra.optional(),
    tutto_il_giorno: z.boolean().optional(),
    luogo: z.string().optional(),
    indirizzo: z.string().optional(),
    online: z.string().optional(),
    locandina: z.string().optional(),
    siti: z.array(z.string()).default(['ali-milano']),
    vecchio_url: z.string().optional(),
  }),
});

const pubblicazioni = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pubblicazioni' }),
  schema: z.object({
    titolo: z.string(),
    data: z.coerce.string(),
    categoria: z.enum(['libri', 'articoli', 'seminari', 'dossier']),
    immagine: z.string().optional(),
    riassunto: z.string().optional(),
    vecchio_url: z.string().optional(),
  }),
});

const documenti = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/documenti' }),
  schema: z.object({
    titolo: z.string(),
    autore: z.string().optional(),
    data: z.coerce.string(),
    file: z.string(),
    sezione: z.string().default('consultorio'),
  }),
});

const pagine = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pagine' }),
  schema: z.object({
    titolo: z.string(),
    sottotitolo: z.string().optional(),
    ordine: z.number().default(99),
  }),
});

export const collections = { eventi, pubblicazioni, documenti, pagine };
