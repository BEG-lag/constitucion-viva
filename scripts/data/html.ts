/** Small, dependency-light helpers to read the LeyesBiblio HTML tables. */

const ENTITIES: Record<string, string> = {
  nbsp: ' ',
  amp: '&',
  quot: '"',
  lt: '<',
  gt: '>',
  apos: "'",
  ordm: 'º',
  ordf: 'ª',
  deg: '°',
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, code: string) => {
    if (code.startsWith('#x') || code.startsWith('#X')) return String.fromCodePoint(parseInt(code.slice(2), 16));
    if (code.startsWith('#')) return String.fromCodePoint(parseInt(code.slice(1), 10));
    return ENTITIES[code.toLowerCase()] ?? m;
  });
}

/** Strips tags, decodes entities and collapses whitespace. */
export function textOf(html: string): string {
  // Inline tags can split a word ("M<span>inistras"); block tags separate words.
  return decodeEntities(
    html
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<\/?(?:span|font|b|i|u|a|strong|em|o:p|sup|sub)\b[^>]*>/gi, '')
      .replace(/<[^>]*>/g, ' '),
  )
    .replace(/[\s\u00a0]+/g, ' ')
    .trim();
}

/** Every href in a fragment, in order. */
export function hrefs(html: string): string[] {
  return [...html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)].map((m) => decodeEntities(m[1] ?? '').trim());
}

/** Splits a table into rows and each row into raw cell HTML. Tolerates unclosed tags. */
export function rows(html: string): string[][] {
  const out: string[][] = [];
  for (const tr of html.split(/<tr[\s>]/i).slice(1)) {
    const body = tr.split(/<\/tr>/i)[0] ?? '';
    const cells = body
      .split(/<td[\s>]/i)
      .slice(1)
      .map((c) => '<td ' + (c.split(/<\/td>/i)[0] ?? ''));
    out.push(cells);
  }
  return out;
}

/** Splits a cell into paragraph chunks (the pages often leave <p> unclosed). */
export function paragraphs(cell: string): string[] {
  // Drop the rest of the opening <p ...> tag left at the start of each chunk.
  return cell.split(/<p(?=[\s>])/i).map((p, i) => (i === 0 ? p : p.slice(p.indexOf('>') + 1)));
}

const MONTHS: Record<string, number> = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  setiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
};

const pad = (n: number) => String(n).padStart(2, '0');

/** "07/10/2026" or "07-10-2026" to ISO "2026-10-07". */
export function isoFromDmy(s: string): string | null {
  const m = /(\d{1,2})\s*[/-]\s*(\d{1,2})\s*[/-]\s*(\d{4})/.exec(s);
  if (!m) return null;
  return `${m[3]}-${pad(Number(m[2]))}-${pad(Number(m[1]))}`;
}

/** "1o. de diciembre de 1920" / "1° de octubre de 2024" / "30 de noviembre de 1924" to ISO. */
export function isoFromSpanish(s: string): string | null {
  const m = /(\d{1,2})\s*(?:o\.|°|º)?\s*de\s+([a-záéíóú]+)\s+del?\s+(\d{4})/i.exec(s);
  if (!m) return null;
  const month = MONTHS[(m[2] ?? '').toLowerCase()];
  if (!month) return null;
  return `${m[3]}-${pad(month)}-${pad(Number(m[1]))}`;
}

export const LEYESBIBLIO = 'https://www.diputados.gob.mx/LeyesBiblio/';

/** Resolves a relative link found on a LeyesBiblio/ref/ page. */
export function absolute(href: string, base = `${LEYESBIBLIO}ref/`): string {
  return new URL(href, base).toString();
}

/** Decree number encoded in a reform PDF link, e.g. CPEUM_ref_151_14ago01_ima.pdf -> 151. */
export function decreeFromHref(href: string): number | null {
  const m = /CPEUM_ref_(\d{1,3})_/i.exec(href) ?? /\/(\d{3})_DOF_/i.exec(href);
  return m ? Number(m[1]) : null;
}
