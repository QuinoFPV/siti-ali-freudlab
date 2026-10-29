import { eventiDelSito } from '../lib/utili';
import { calendario } from '../lib/calendario';

export async function GET() {
  return calendario(await eventiDelSito(), 'ali-milano.it', 'Appuntamenti ALI Milano');
}
