/** Types of the files in data/ (see data/schema/) and lazy loaders. */

export interface Decree {
  n: number;
  date: string;
  title: string;
  summary: string | null;
  note: string | null;
  url: string | null;
  doc: string | null;
  process: string | null;
  errata: { kind: 'errata' | 'aclaracion'; date: string; url: string }[];
  articles: string[];
  president: string;
  legislature: string | null;
}

export interface Article {
  id: string;
  titulo: string | null;
  capitulo: string | null;
  reforms: number[];
  errata: { kind: 'errata' | 'aclaracion'; date: string; url: string }[];
  words1917: number | null;
  words2006: number | null;
  wordsNow: number;
  textVersions: number;
  citedBy: Record<string, number>;
}

export interface President {
  id: string;
  name: string;
  short: string;
  officialName: string;
  start: string;
  end: string;
  decrees: number[];
  reportedArticles: number | null;
}

export interface Legislature {
  id: string;
  start: string;
  end: string;
  decrees: number[];
}

export interface KeyMoment {
  n: number;
  priority: 1 | 2;
  es: string;
  en: string;
}

export interface Constitution {
  generated: string;
  asOf: string;
  decrees: Decree[];
  articles: Article[];
  presidents: President[];
  legislatures: Legislature[];
  keyMoments: KeyMoment[];
}

export interface Growth {
  coverage: { from: string; to: string; versions: number };
  original: { date: string; words: number; estimate: boolean };
  versions: {
    date: string;
    commit: string;
    decrees: number[];
    words: number;
    added: number;
    removed: number;
    editorialAdded: number;
    editorialRemoved: number;
    changed: string[];
  }[];
}

/** [0, n]: keep n characters of the previous text; [1, s]: insert s; [-1, s]: delete s. */
export type Op = [0, number] | [1 | -1, string];

export interface ArticleText {
  id: string;
  versions: { date: string; decrees: number[]; words: number; added: number; removed: number; ops: Op[] }[];
}

export interface GraphNode {
  id: string;
  title: string;
  abbreviation: string;
  group: string;
  articles: number;
  words: number;
  published: string;
  lastReform: string | null;
  selfReferences: number;
  out: number;
  in: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  mentions: number;
  articles: number;
  top: [string, number][];
}

export interface Graph {
  groups: Record<string, string>;
  nodes: GraphNode[];
  edges: GraphEdge[];
  constitution: Record<string, Record<string, number>>;
  stats: { mentions: number; articleCitations: number; resolved: number; unresolved: number; constitutional: number; constitutionalResolved: number };
}

export interface Meta {
  generated: string;
  leyesMx: { repo: string; commit: string; date: string };
  sources: { id: string; name: string; url: string; retrieved: string; sha256: string; bytes: number; note?: string }[];
  checks: {
    decreesVsLeyesMx: { compared: number; leyesMx: number; dateMismatches: number[] };
    articleReforms: { parsed: number; pageSummary: { articles: number; total: number } | null };
    presidentsVsTermPage: { decrees: number[] };
    orig1917: { articles: number; absoluteDifference: number; wordsCompared: number };
  };
}

const BASE = import.meta.env.BASE_URL;
const cache = new Map<string, Promise<unknown>>();

export function load<T>(path: string): Promise<T> {
  let p = cache.get(path);
  if (!p) {
    p = fetch(`${BASE}data/${path}`).then((r) => {
      if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
      return r.json() as Promise<unknown>;
    });
    cache.set(path, p);
  }
  return p as Promise<T>;
}

/** Rebuilds the full text of every version of an article from its diff operations. */
export function rebuild(text: ArticleText): string[] {
  const out: string[] = [];
  let prev = '';
  for (const v of text.versions) {
    let next = '';
    let at = 0;
    for (const op of v.ops) {
      if (op[0] === 0) {
        next += prev.slice(at, at + op[1]);
        at += op[1];
      } else if (op[0] === 1) {
        next += op[1];
      } else {
        at += op[1].length;
      }
    }
    out.push(next);
    prev = next;
  }
  return out;
}

export function yearOf(iso: string): number {
  return Number(iso.slice(0, 4));
}

/** Fractional year, for continuous time scales. */
export function fyear(iso: string): number {
  const [y = 0, m = 1, d = 1] = iso.split('-').map(Number);
  return y + (m - 1) / 12 + (d - 1) / 365;
}
