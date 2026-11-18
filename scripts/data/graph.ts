/**
 * Citation graph between the 36 instruments in leyes-mx.
 *
 * Rules (documented in docs/metodo.md):
 *  1. Only the body of each law is read (everything before its first
 *     "Transitorios" heading), without the Cámara's editorial notes.
 *  2. A mention of another law is an exact, case-insensitive match of its
 *     official title or of a curated alias (ALIASES). Longer names are matched
 *     first and their span is masked, so "Ley de Amparo, Reglamentaria de los
 *     artículos 103 y 107 de la Constitución Política..." is not also counted
 *     as a mention of the Constitution.
 *  3. An article citation is "artículo(s) N[, M y K] [fracción/párrafo/inciso
 *     ...] de la|del <law>" right before a mention, or "artículo N
 *     constitucional". A cited article is "resolved" only if that article
 *     exists in the current text of the target; unresolved ones are counted
 *     but not drawn.
 *     A name preceded by "Reglamento de la|del" is a regulation, not the law,
 *     and is skipped (counted in stats.regulations).
 *  4. Self-references ("esta Ley", "la presente Ley", "este Código",
 *     "esta Constitución") are counted per law, not drawn as edges.
 */
import { normaliseArticle } from './leyes.ts';

export interface LawText {
  slug: string;
  title: string;
  abbreviation: string;
  articles: Map<string, string>;
}

/** Extra names under which a law is cited. Every alias is unambiguous inside this corpus. */
export const ALIASES: Record<string, string[]> = {
  cpeum: ['Constitución Federal', 'Constitución General de la República', 'Constitución Política de los Estados Unidos Mexicanos'],
  lamp: ['Ley de Amparo'],
  lmin: ['Ley Minera'],
};

const ESC = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Accent-sensitive, case-insensitive pattern that tolerates any run of whitespace. */
function namePattern(name: string): string {
  return ESC(name).replace(/\s+/g, '\\s+');
}

const SELF = /\b(?:est[ae]|la presente|el presente)\s+(?:Ley|C[oó]digo|Constituci[oó]n)\b/gi;

const NUM_RE = /^(\d{1,4})\s*(?:o\.|º|°)?(?:\s*-\s*([A-Z]{1,2})|\s+([A-Z]))?(?:[\s-]+(bis|ter|qu[aá]ter|quinquies|sexies)(?:\s+(\d{1,2}))?)?$/i;
const QUALIFIER = /\s*,?\s*(?:(?:primer|segundo|tercer|cuarto|quinto|sexto|s[eé]ptimo|octavo|noveno|d[eé]cimo|[uú]ltimo|pen[uú]ltimo)[oa]?\s+)?(?:fracci[oó]n|fracciones|p[aá]rrafo|p[aá]rrafos|inciso|incisos|apartado|base|numeral)\b.*$/i;

/**
 * Parses "27, 28 y 123" / "17-A y 17-B" / "2 Bis" into normalised article
 * ids. Returns null unless every item is an article number, so prose that
 * happens to sit between "artículo" and a law name is rejected.
 */
export function splitList(list: string): string[] | null {
  const items = list
    .trim()
    .split(/\s*,\s*|\s+(?:y|e|o|u|al|a)\s+/i)
    .filter(Boolean);
  if (items.length === 0 || items.length > 30) return null;
  const out: string[] = [];
  for (const item of items) {
    const m = NUM_RE.exec(item.trim());
    if (!m) return null;
    out.push(normaliseArticle(m[1] ?? '0', m[2] ?? m[3], m[4], m[5]));
  }
  return out;
}

/** "artículo(s) <list> [fracción ...] de la|del" ending the text before a law name. */
function citedBefore(before: string): string[] | null {
  const tail = /\s*,?\s*(?:de\s+la|del|de\s+los|de\s+el)\s*$/i.exec(before);
  if (!tail) return null;
  const head = before.slice(0, tail.index);
  const at = head.search(/art[ií]culos?\s+\d[^]*$/i);
  if (at < 0) return null;
  const list = head
    .slice(at)
    .replace(/^art[ií]culos?\s+/i, '')
    .replace(QUALIFIER, '');
  if (/[;:.]\s/.test(list) || list.length > 120) return null;
  return splitList(list);
}

const CONSTITUTIONAL = /art[ií]culos?\s+(\d[\dA-Za-z\s,º°.-]{0,80}?)\s+constitucional(?:es)?\b/gi;

export interface Edge {
  source: string;
  target: string;
  /** Mentions of the target's name in the source's body. */
  mentions: number;
  /** Article citations that resolve to an existing article of the target. */
  articles: number;
  /** Most cited target articles, [id, count]. */
  top: [string, number][];
}

export interface GraphResult {
  edges: Edge[];
  self: Record<string, number>;
  /** cpeum article id -> citing law -> count. */
  constitution: Record<string, Record<string, number>>;
  stats: {
    mentions: number;
    articleCitations: number;
    resolved: number;
    unresolved: number;
    constitutional: number;
    constitutionalResolved: number;
    /** Names skipped because they belong to a regulation ("Reglamento de la Ley ..."). */
    regulations: number;
  };
  /** Small random sample of matches with context, for the manual precision check. */
  sample: { source: string; target: string; context: string }[];
  /** Article citations whose article does not exist in the cited law. */
  unresolved: { source: string; target: string; article: string; context: string }[];
}

interface Matcher {
  slug: string;
  re: RegExp;
  length: number;
}

export function buildGraph(laws: LawText[], seed = 17): GraphResult {
  const bySlug = new Map(laws.map((l) => [l.slug, l]));
  const matchers: Matcher[] = [];
  for (const l of laws) {
    const names = new Set([l.title, ...(ALIASES[l.slug] ?? [])]);
    for (const n of names) matchers.push({ slug: l.slug, re: new RegExp(namePattern(n), 'gi'), length: n.length });
  }
  matchers.sort((a, b) => b.length - a.length);

  const edges = new Map<string, Edge & { counts: Map<string, number> }>();
  const self: Record<string, number> = {};
  const constitution: Record<string, Record<string, number>> = {};
  const stats = { mentions: 0, articleCitations: 0, resolved: 0, unresolved: 0, constitutional: 0, constitutionalResolved: 0, regulations: 0 };
  const allMatches: { source: string; target: string; context: string }[] = [];
  const unresolved: GraphResult['unresolved'] = [];
  const cpeum = bySlug.get('cpeum');

  for (const law of laws) {
    for (const text of law.articles.values()) {
      // Mask matched spans so shorter names inside longer ones are not counted twice.
      const masked = text.split('');
      const found: { slug: string; start: number; end: number }[] = [];
      for (const m of matchers) {
        m.re.lastIndex = 0;
        let r: RegExpExecArray | null;
        while ((r = m.re.exec(text))) {
          const start = r.index;
          const end = start + r[0].length;
          if (masked.slice(start, end).includes('\u0000')) continue;
          for (let i = start; i < end; i++) masked[i] = '\u0000';
          if (/Reglamentos?\s+(?:de\s+la|del|de)\s*$/i.test(text.slice(Math.max(0, start - 30), start))) {
            stats.regulations++;
            continue;
          }
          found.push({ slug: m.slug, start, end });
        }
      }
      found.sort((a, b) => a.start - b.start);
      for (const f of found) {
        if (f.slug === law.slug) {
          self[law.slug] = (self[law.slug] ?? 0) + 1;
          continue;
        }
        const key = `${law.slug}>${f.slug}`;
        let e = edges.get(key);
        if (!e) {
          e = { source: law.slug, target: f.slug, mentions: 0, articles: 0, top: [], counts: new Map() };
          edges.set(key, e);
        }
        e.mentions++;
        stats.mentions++;
        allMatches.push({
          source: law.slug,
          target: f.slug,
          context: text.slice(Math.max(0, f.start - 90), Math.min(text.length, f.end + 30)).replace(/\s+/g, ' '),
        });
        const cited = citedBefore(text.slice(Math.max(0, f.start - 220), f.start));
        if (cited) {
          const target = bySlug.get(f.slug);
          for (const id of cited) {
            stats.articleCitations++;
            if (target?.articles.has(id)) {
              stats.resolved++;
              e.articles++;
              e.counts.set(id, (e.counts.get(id) ?? 0) + 1);
              if (f.slug === 'cpeum') {
                const row = (constitution[id] ??= {});
                row[law.slug] = (row[law.slug] ?? 0) + 1;
              }
            } else {
              stats.unresolved++;
              unresolved.push({ source: law.slug, target: f.slug, article: id, context: text.slice(Math.max(0, f.start - 120), f.end).replace(/\s+/g, ' ') });
            }
          }
        }
      }
      self[law.slug] = (self[law.slug] ?? 0) + (text.match(SELF)?.length ?? 0);
      if (law.slug !== 'cpeum' && cpeum) {
        CONSTITUTIONAL.lastIndex = 0;
        let c: RegExpExecArray | null;
        while ((c = CONSTITUTIONAL.exec(text))) {
          for (const id of splitList((c[1] ?? '').replace(QUALIFIER, '')) ?? []) {
            stats.constitutional++;
            if (!cpeum.articles.has(id)) continue;
            stats.constitutionalResolved++;
            const row = (constitution[id] ??= {});
            row[law.slug] = (row[law.slug] ?? 0) + 1;
            const key = `${law.slug}>cpeum`;
            let e = edges.get(key);
            if (!e) {
              e = { source: law.slug, target: 'cpeum', mentions: 0, articles: 0, top: [], counts: new Map() };
              edges.set(key, e);
            }
            e.articles++;
            e.counts.set(id, (e.counts.get(id) ?? 0) + 1);
          }
        }
      }
    }
  }

  // Deterministic pseudo-random sample for the precision check.
  let s = seed;
  const rand = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
  const sample = [...allMatches]
    .map((m) => ({ m, k: rand() }))
    .sort((a, b) => a.k - b.k)
    .slice(0, 60)
    .map((x) => x.m);

  return {
    edges: [...edges.values()]
      .map(({ counts, ...e }) => ({
        ...e,
        top: [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es', { numeric: true })).slice(0, 8),
      }))
      .sort((a, b) => a.source.localeCompare(b.source) || a.target.localeCompare(b.target)),
    self,
    constitution,
    stats,
    sample,
    unresolved,
  };
}
