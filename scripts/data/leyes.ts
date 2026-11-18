/**
 * Reads the leyes-mx repository (https://github.com/BEG-lag/leyes-mx), where
 * every federal law is a Markdown file and every DOF reform is a commit dated
 * on its publication day. The repository is cloned into .cache/leyes-mx and
 * read from there (read only).
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { CACHE, options } from './http.ts';

export const LEYES_DIR = join(CACHE, 'leyes-mx');
const DEFAULT_REPO = 'https://github.com/BEG-lag/leyes-mx.git';

function git(args: string[], maxBuffer = 64 * 1024 * 1024): string {
  return execFileSync('git', ['-C', LEYES_DIR, ...args], { encoding: 'utf8', maxBuffer });
}

/** Clones leyes-mx into the cache (or reuses the clone) and returns the commit used. */
export function ensureClone(): { commit: string; date: string; repo: string } {
  const repo = process.env['LEYES_MX_REPO'] ?? DEFAULT_REPO;
  if (!existsSync(join(LEYES_DIR, '.git'))) {
    if (options.offline) throw new Error(`offline and leyes-mx is not cloned in ${LEYES_DIR}`);
    console.log(`  cloning ${repo}`);
    execFileSync('git', ['clone', '--quiet', repo, LEYES_DIR], { stdio: 'inherit' });
  } else if (options.refresh) {
    git(['pull', '--quiet', '--ff-only']);
  }
  const [commit = '', date = ''] = git(['log', '-1', '--format=%H%x09%cs']).trim().split('\t');
  return { commit, date, repo: repo === DEFAULT_REPO ? 'https://github.com/BEG-lag/leyes-mx' : repo };
}

export interface Version {
  commit: string;
  date: string;
  subject: string;
}

/** Commits that touched a law, oldest first. Commit dates are DOF publication dates. */
export function versions(slug: string): Version[] {
  return git(['log', '--reverse', '--date=short', '--format=%H%x09%ad%x09%s', '--', `leyes/${slug}.md`])
    .trim()
    .split('\n')
    .map((line) => {
      const [commit = '', date = '', subject = ''] = line.split('\t');
      return { commit, date, subject };
    });
}

export function show(commit: string, slug: string): string {
  return git(['show', `${commit}:leyes/${slug}.md`]);
}

export function current(slug: string): string {
  return git(['show', `HEAD:leyes/${slug}.md`]);
}

export interface FrontMatter {
  title: string;
  abbreviation: string;
  slug: string;
  published_dof: string;
  last_reform_dof: string | null;
  articles: number;
}

export function frontMatter(md: string): FrontMatter {
  const block = /^---\n([\s\S]*?)\n---/.exec(md)?.[1] ?? '';
  const get = (k: string) => new RegExp(`^${k}:\\s*(.*)$`, 'm').exec(block)?.[1]?.trim() ?? '';
  const last = get('last_reform_dof');
  return {
    title: get('title'),
    abbreviation: get('abbreviation'),
    slug: get('slug'),
    published_dof: get('published_dof'),
    last_reform_dof: last === 'null' || last === '' ? null : last,
    articles: Number(get('articles')),
  };
}

const LATIN = '(bis|ter|qu[aá]ter|quinquies|sexies|septies|octies|nonies|decies)';

/** Normalises an article number with its suffix: "17-A", "32 Bis", "2 Bis 1", "27". */
export function normaliseArticle(num: string, letter?: string, latin?: string, extra?: string): string {
  let id = String(Number(num));
  if (letter) id += `-${letter.toUpperCase()}`;
  if (latin) {
    const word = latin.toLowerCase().replace('quater', 'quáter');
    id += ` ${word.charAt(0).toUpperCase()}${word.slice(1)}`;
    if (extra) id += ` ${extra.toUpperCase()}`;
  }
  return id;
}

const HEADING = new RegExp(
  `^Art[ií]culo\\s+(\\d{1,4})\\s*(?:o\\.?|º|°)?\\s*(?:-\\s*([A-Z]{1,2})(?![a-z])|\\s([A-Za-z])(?![a-záéíóúñ]))?` +
    `(?:[-\\s]\\s*${LATIN}(?:\\s*(\\d{1,2}|[A-Z])(?![a-z]))?)?\\s*\\.?(?:\\s.*)?$`,
  'i',
);

/** "Artículo 1o." / "Artículo 27" / "Artículo 17-A." / "Artículo 228 a bis." heading text to an id. */
export function headingId(text: string): string | null {
  const m = HEADING.exec(text.trim());
  if (!m) return null;
  return normaliseArticle(m[1] ?? '0', m[2] ?? m[3], m[4], m[5]);
}

export interface Section {
  id: string;
  /** Clean text: paragraphs joined by blank lines, without the editorial notes of the Cámara. */
  text: string;
  titulo: string | null;
  capitulo: string | null;
}

/** Editorial notes added by the Cámara ("*Párrafo reformado DOF 10-06-2011*") are not constitutional text. */
const NOTE = /^\*[^*].*\*$/;
const SIC = /\s*\((?:[^()]{0,60}?,\s*)?sic DOF [0-9-]+\)/g;

/**
 * Splits a law into its articles (body only: everything before the first
 * "Transitorios" heading). Works for any heading level (#### to ######).
 */
export function articles(md: string): Map<string, Section> {
  const out = new Map<string, Section>();
  const lines = md.replace(/^---\n[\s\S]*?\n---\n/, '').split('\n');
  let titulo: string | null = null;
  let capitulo: string | null = null;
  let id: string | null = null;
  let buf: string[] = [];
  const flush = () => {
    if (id !== null && !out.has(id)) {
      const text = buf
        .filter((l) => !NOTE.test(l.trim()))
        .join('\n')
        .replace(SIC, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      out.set(id, { id, text, titulo, capitulo });
    }
    id = null;
    buf = [];
  };
  for (const line of lines) {
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      const level = (h[1] ?? '').length;
      const text = (h[2] ?? '').trim();
      if (/transitori/i.test(text) && level <= 3) {
        flush();
        break;
      }
      const art = /^Art[ií]culo\s/i.test(text) ? headingId(text) : null;
      if (art) {
        flush();
        id = art;
        continue;
      }
      flush();
      if (/^T[ií]tulo\b/i.test(text)) {
        titulo = text;
        capitulo = null;
      } else if (/^Cap[ií]tulo\b/i.test(text)) {
        capitulo = text;
      }
      continue;
    }
    if (id !== null) buf.push(line);
  }
  flush();
  return out;
}

const WORD = /[\p{L}\p{N}]+/gu;

export function countWords(text: string): number {
  return text.match(WORD)?.length ?? 0;
}
