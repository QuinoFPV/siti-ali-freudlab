import type { CollectionEntry } from 'astro:content';

// Genera un file .ics (iCalendar) leggibile da Google Calendar, Apple Calendario e Outlook
const pulisci = (s = '') => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');
const dataIcs = (s: string) => s.slice(0, 16).replace(/[-:]/g, '') + '00';
const piega = (riga: string) => riga.match(/.{1,74}/gu)!.join('\r\n ');

export function calendario(eventi: CollectionEntry<'eventi'>[], dominio: string, nome: string) {
  const timbro = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const righe = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', `PRODID:-//${nome}//IT`, 'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${pulisci(nome)}`, 'X-WR-TIMEZONE:Europe/Rome',
  ];
  for (const e of eventi) {
    const d = e.data;
    const fine = d.fine && d.fine > d.inizio ? d.fine : d.inizio.slice(0, 11) + String(Number(d.inizio.slice(11, 13)) + 2).padStart(2, '0') + d.inizio.slice(13, 16);
    righe.push(
      'BEGIN:VEVENT',
      `UID:${e.id}@${dominio}`,
      `DTSTAMP:${timbro}`,
      ...(d.tutto_il_giorno
        ? [`DTSTART;VALUE=DATE:${d.inizio.slice(0, 10).replace(/-/g, '')}`]
        : [`DTSTART;TZID=Europe/Rome:${dataIcs(d.inizio)}`, `DTEND;TZID=Europe/Rome:${dataIcs(fine)}`]),
      `SUMMARY:${pulisci(d.titolo)}`,
      ...(d.luogo ? [`LOCATION:${pulisci([d.luogo, d.indirizzo].filter(Boolean).join(', '))}`] : []),
      `URL:https://${dominio}/appuntamenti/${e.id}/`,
      'END:VEVENT',
    );
  }
  righe.push('END:VCALENDAR');
  return new Response(righe.map(piega).join('\r\n') + '\r\n', {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8' },
  });
}
