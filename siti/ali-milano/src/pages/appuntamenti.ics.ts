import { eventiDelSito, SITO } from '@condiviso/lib/utili';
import { calendario } from '@condiviso/lib/calendario';

export async function GET() {
  return calendario(await eventiDelSito(), SITO.dominio, SITO.nomeCalendario);
}
