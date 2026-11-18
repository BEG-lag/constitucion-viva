/**
 * Parsers for the three Constitution pages of LeyesBiblio (Cámara de Diputados):
 *
 *   ref/cpeum_crono.htm  reform decrees in chronological order
 *   ref/cpeum_art.htm    reforms by article
 *   ref/cpeum_per.htm    reforms by presidential term
 */
import { absolute, decreeFromHref, hrefs, isoFromDmy, isoFromSpanish, paragraphs, rows, textOf } from './html.ts';

export interface RawDecree {
  n: number;
  date: string;
  title: string;
  summary: string | null;
  note: string | null;
  pdf: string | null;
  doc: string | null;
  image: string | null;
  errata: { kind: 'errata' | 'aclaracion'; date: string; url: string }[];
  /** Link to the legislative process of the decree, when the page has one. */
  process: string | null;
}

export function parseCrono(html: string): RawDecree[] {
  const out: RawDecree[] = [];
  for (const cells of rows(html)) {
    if (cells.length < 4) continue;
    const num = textOf(cells[0] ?? '');
    if (!/^\d{1,3}$/.test(num)) continue;
    const date = isoFromDmy(textOf(cells[2] ?? ''));
    if (!date) throw new Error(`crono: no date for decree ${num}`);
    let title = '';
    const summary: string[] = [];
    let note: string | null = null;
    let process: string | null = null;
    const errata: RawDecree['errata'] = [];
    for (const p of paragraphs(cells[1] ?? '')) {
      let t = textOf(p);
      if (!t || t === 'Nuevo') continue;
      if (/^(?:Fe de errata|Aclaraci[oó]n)/i.test(t)) {
        const link = hrefs(p).find((h) => !/_ima\.pdf$/i.test(h)) ?? hrefs(p)[0];
        const d = isoFromDmy(t);
        if (link && d) errata.push({ kind: /^Aclaraci/i.test(t) ? 'aclaracion' : 'errata', date: d, url: absolute(link) });
        continue;
      }
      if (/Proceso Legislativo/i.test(t)) {
        const m = /<a\s[^>]*href\s*=\s*["']([^"']+)["'][^>]*>(?:(?!<\/a>)[\s\S])*Proceso Legislativo/i.exec(p);
        if (m?.[1]) process = absolute(m[1]);
        t = t.replace(/\|?\s*Proceso Legislativo\s*\|?/gi, '').trim();
        if (!t) continue;
      }
      if (/^Nota\s*:/i.test(t)) {
        note = t.replace(/^Nota\s*:\s*/i, '');
        continue;
      }
      if (!title) title = t;
      else summary.push(t);
    }
    const links = hrefs(cells[3] ?? '');
    const pdf = links.find((h) => /\.pdf$/i.test(h) && !/_ima\.pdf$/i.test(h)) ?? null;
    const image = links.find((h) => /_ima\.pdf$/i.test(h)) ?? null;
    const doc = links.find((h) => /\.docx?$/i.test(h)) ?? null;
    out.push({
      n: Number(num),
      date,
      title,
      summary: summary.length ? summary.join(' ') : null,
      note,
      pdf: pdf ? absolute(pdf) : null,
      doc: doc ? absolute(doc) : null,
      image: image ? absolute(image) : null,
      errata,
      process,
    });
  }
  out.sort((a, b) => a.n - b.n);
  return out;
}

export interface RawArticleReform {
  ordinal: number;
  date: string;
  url: string;
  decree: number | null;
}

export interface RawArticle {
  label: string;
  unreformed: boolean;
  reforms: RawArticleReform[];
  /** Errata and clarifications published in the DOF (not counted as reforms). */
  errata: { kind: 'errata' | 'aclaracion'; date: string; url: string }[];
}

/** Article label as printed ("ARTÍCULO 27", "ARTÍCULO 1o.") to the id used in this project ("27", "1"). */
export function articleId(label: string): string | null {
  const m = /^ART[IÍ]CULO\s+(\d{1,3})\s*(?:o\.|º|°)?\s*$/i.exec(label.trim());
  return m ? String(Number(m[1])) : null;
}

export function parseByArticle(html: string): RawArticle[] {
  // Only the first section, "Artículos 1o. al 136". The transitory articles
  // use a different layout (no ordinals) and are out of scope.
  const start = html.search(/1o\. al 136<\/font>/i);
  const end = html.search(/Art[ií]culos Transitorios<\/span>/i);
  if (start < 0 || end < start) throw new Error('by-article: section "Artículos 1o. al 136" not found');
  const out: RawArticle[] = [];
  for (const cells of rows(html.slice(start, end))) {
    if (cells.length < 2) continue;
    const label = textOf(cells[0] ?? '');
    if (!/^ART[IÍ]CULO\s/i.test(label)) continue;
    const reforms: RawArticleReform[] = [];
    const errata: RawArticle['errata'] = [];
    const unreformed = /Sin reforma/i.test(textOf(cells[1] ?? ''));
    for (const p of paragraphs(cells[1] ?? '')) {
      const t = textOf(p);
      if (!t) continue;
      const links = hrefs(p);
      const dates = [...t.matchAll(/(\d{1,2})\s*-\s*(\d{1,2})\s*-\s*(\d{4})/g)];
      if (links.length !== 1 || dates.length !== 1) {
        if (links.length > 1 || dates.length > 1) throw new Error(`by-article: ambiguous entry in ${label}: ${t}`);
        continue;
      }
      const link = links[0] ?? '';
      const date = isoFromDmy(t);
      if (!date) continue;
      if (/Fe de errata|Aclaraci[oó]n/i.test(t)) {
        errata.push({ kind: /Aclaraci/i.test(t) ? 'aclaracion' : 'errata', date, url: absolute(link) });
        continue;
      }
      const ord = /(\d{1,3})\s*[ªa]\.?\s*Reforma/i.exec(t);
      if (!ord) throw new Error(`by-article: entry without ordinal in ${label}: ${t}`);
      reforms.push({ ordinal: Number(ord[1]), date, url: absolute(link), decree: decreeFromHref(link) });
    }
    out.push({ label, unreformed, reforms, errata });
  }
  return out;
}

/** The page's own totals ("Artículos 1o. al 136: 856 ... Total: 876"), used as a cross-check. */
export function parseByArticleTotals(html: string): { articles: number; total: number } | null {
  const all = textOf(html);
  const t = all.slice(all.search(/Reformas Constitucionales por Art[ií]culo al/i));
  const a = /Art[ií]culos 1o\. al 136:\s*(\d+)/i.exec(t);
  const total = /Total:\s*(\d+)/i.exec(t);
  return a && total ? { articles: Number(a[1]), total: Number(total[1]) } : null;
}

export interface RawPresident {
  name: string;
  term: string;
  start: string;
  end: string;
  decrees: number[];
  reportedArticles: number | null;
}

/**
 * The by-term page lists, for each president, the term and, year by year,
 * every reformed article with a link to its decree. We walk the page as a
 * stream of tokens: a name in capitals followed by a term ("1o. de diciembre
 * de 1920 al 30 de noviembre de 1924") opens a president; every decree link
 * until the next president belongs to it; "N artículos reformados" closes it.
 */
export function parseByTerm(html: string): RawPresident[] {
  const body = html.slice(html.search(/Constitucionales por Periodo Presidencial/i));
  const tokens: ({ kind: 'text'; text: string } | { kind: 'href'; href: string })[] = [];
  const re = /<a\s[^>]*href\s*=\s*["']([^"']+)["'][^>]*>|<[^>]+>|([^<]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    if (m[1]) tokens.push({ kind: 'href', href: m[1] });
    else if (m[2]) {
      const t = textOf(m[2]);
      if (t) tokens.push({ kind: 'text', text: t });
    }
  }
  // Merge adjacent text tokens so names and terms split across tags read whole.
  const merged: typeof tokens = [];
  for (const t of tokens) {
    const prev = merged[merged.length - 1];
    if (t.kind === 'text' && prev?.kind === 'text') prev.text = `${prev.text} ${t.text}`;
    else merged.push({ ...t });
  }
  const out: RawPresident[] = [];
  let current: RawPresident | null = null;
  const TERM = /((?:\d{1,2})\s*(?:o\.|°|º)?\s*de\s+[a-záéíóú]+\s+del?\s+\d{4})\s+al\s+((?:\d{1,2})\s*(?:o\.|°|º)?\s*de\s+[a-záéíóú]+\s+del?\s+\d{4})/i;
  for (const t of merged) {
    if (t.kind === 'href') {
      const n = decreeFromHref(t.href);
      if (current && n !== null && !current.decrees.includes(n)) current.decrees.push(n);
      continue;
    }
    // A merged text token can hold the closing total of one president and the
    // header of the next, so handle the events in the order they appear.
    const term = TERM.exec(t.text);
    const total = /(\d{1,3})\s+art[ií]culos\s+reformados/i.exec(t.text);
    const closeTotal = () => {
      if (total && current) current.reportedArticles = Number(total[1]);
    };
    if (total && (!term || total.index < term.index)) closeTotal();
    if (term) {
      const before = t.text.slice(0, term.index).trim();
      const name = /([A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ.\s]+)$/.exec(before)?.[1]?.trim();
      const start = isoFromSpanish(term[1] ?? '');
      const end = isoFromSpanish(term[2] ?? '');
      if (name && start && end) {
        current = { name, term: `${term[1]} al ${term[2]}`, start, end, decrees: [], reportedArticles: null };
        out.push(current);
      }
    }
    if (total && term && total.index > term.index) closeTotal();
  }
  return out;
}
