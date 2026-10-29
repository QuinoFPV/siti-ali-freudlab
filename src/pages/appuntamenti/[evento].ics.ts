import type { CollectionEntry } from 'astro:content';
import { eventiDelSito } from '../../lib/utili';
import { calendario } from '../../lib/calendario';

export async function getStaticPaths() {
  return (await eventiDelSito()).map((e) => ({ params: { evento: e.id }, props: { e } }));
}

export function GET({ props }: { props: { e: CollectionEntry<'eventi'> } }) {
  return calendario([props.e], 'ali-milano.it', props.e.data.titolo);
}
