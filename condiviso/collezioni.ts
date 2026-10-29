// Raccolte di contenuti comuni ai due siti. Eventi, pubblicazioni e documenti
// stanno in contenuti/ e ognuno dice su quali siti compare (campo "siti");
// le pagine fisse invece sono di ciascun sito, in contenuti/<sigla>/pagine.
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const contenuti = new URL('../contenuti/', import.meta.url);
const cartella = (percorso: string) => glob({ pattern: '**/*.md', base: new URL(percorso, contenuti) });

// Le date degli eventi sono "ora di Milano" scritte come 2026-05-09T10:00
const dataOra = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
const vuotoComeAssente = (v: unknown) => (v === '' || v === null ? undefined : v);
const testo = z.preprocess(vuotoComeAssente, z.string().optional());

export function collezioni(sigla: string) {
  return {
    eventi: defineCollection({
      loader: cartella('eventi/'),
      schema: z.object({
        titolo: z.string(),
        inizio: dataOra,
        fine: z.preprocess(vuotoComeAssente, dataOra.optional()),
        tutto_il_giorno: z.boolean().optional(),
        luogo: testo,
        indirizzo: testo,
        online: testo,
        locandina: testo,
        siti: z.array(z.string()).default(['ali-milano']),
        vecchio_url: testo,
      }),
    }),

    pubblicazioni: defineCollection({
      loader: cartella('pubblicazioni/'),
      schema: z.object({
        titolo: z.string(),
        data: z.coerce.string(),
        categoria: z.enum(['libri', 'articoli', 'seminari', 'dossier', 'editoriale']),
        immagine: testo,
        riassunto: testo,
        siti: z.array(z.string()).default(['ali-milano']),
        vecchio_url: testo,
      }),
    }),

    documenti: defineCollection({
      loader: cartella('documenti/'),
      schema: z.object({
        titolo: z.string(),
        autore: testo,
        data: z.coerce.string(),
        file: z.string(),
        sezione: z.string().default('consultorio'),
        siti: z.array(z.string()).default(['ali-milano']),
      }),
    }),

    pagine: defineCollection({
      loader: cartella(`${sigla}/pagine/`),
      schema: z.object({
        titolo: z.string(),
        sottotitolo: testo,
        ordine: z.number().default(99),
      }),
    }),
  };
}
