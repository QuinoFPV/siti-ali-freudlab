import type { CollectionEntry } from 'astro:content';
import { eventiDelSito, SITO } from '@condiviso/lib/utili';
import { calendario } from '@condiviso/lib/calendario';

export async function getStaticPaths() {
  return (await eventiDelSito()).map((e) => ({ params: { evento: e.id }, props: { e } }));
}

export function GET({ props }: { props: { e: CollectionEntry<'eventi'> } }) {
  return calendario([props.e], SITO.dominio, props.e.data.titolo);
}
