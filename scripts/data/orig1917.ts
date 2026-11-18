/**
 * Length of the original text of 1917, article by article, from the Cámara de
 * Diputados transcription of the DOF of 5 February 1917
 * (LeyesBiblio/ref/cpeum/CPEUM_orig_05feb1917.pdf).
 *
 * The PDF is laid out in three columns. `pdftotext -bbox` (Poppler) gives every
 * word with its position; words are put back in reading order (page, column,
 * line, x), page headers and footers are dropped, and the text between
 * "Art. 1o.-" and "ARTÍCULOS TRANSITORIOS." is split at each "Art. N.-" that
 * starts a line. All-caps lines (Título, Capítulo and Sección headings) are not
 * counted. The result is an estimate: a few words may be lost or gained at
 * column breaks.
 */
import { execFileSync } from 'node:child_process';
import { countWords } from './leyes.ts';

interface Word {
  page: number;
  col: number;
  x: number;
  y: number;
  text: string;
}

const COLUMN_EDGES = [214, 386];
const MASTHEAD = new Set(['ADMINISTRADOR', 'JOSE', 'FERNANDEZ', 'NESPRAL']);

export function originalLengths(pdfPath: string): { total: number; articles: Record<string, number> } {
  const html = execFileSync('pdftotext', ['-bbox', pdfPath, '-'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const words: Word[] = [];
  html.split('<page ').slice(1).forEach((page, p) => {
    for (const m of page.matchAll(/xMin="([\d.]+)" yMin="([\d.]+)" xMax="[\d.]+" yMax="[\d.]+">([^<]*)</g)) {
      const x = Number(m[1]);
      const y = Number(m[2]);
      if (y < 45 || y > 745) continue; // running header and footer
      const text = (m[3] ?? '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
      if (p === 0 && MASTHEAD.has(text)) continue;
      const col = x < (COLUMN_EDGES[0] ?? 0) ? 0 : x < (COLUMN_EDGES[1] ?? 0) ? 1 : 2;
      words.push({ page: p, col, x, y, text });
    }
  });
  // Lines in neighbouring columns sit on slightly different baselines, so a line is an exact y.
  words.sort((a, b) => a.page - b.page || a.col - b.col || a.y - b.y || a.x - b.x);
  // Rebuild lines.
  const lines: string[] = [];
  let key = '';
  for (const w of words) {
    const k = `${w.page}:${w.col}:${w.y.toFixed(1)}`;
    if (k !== key) {
      lines.push(w.text);
      key = k;
    } else {
      lines[lines.length - 1] = `${lines[lines.length - 1] ?? ''} ${w.text}`;
    }
  }
  const start = lines.findIndex((l) => /^Art\.\s*1o\.-/.test(l));
  const end = lines.findIndex((l, i) => i > start && /^ART[IÍ]CULOS TRANSITORIOS/.test(l));
  if (start < 0 || end < 0) throw new Error('1917: could not find the articles');
  const articles: Record<string, number> = {};
  let current: string | null = null;
  let expected = 1;
  for (const line of lines.slice(start, end)) {
    const letters = line.replace(/[^\p{L}]/gu, '');
    const isHeading = letters.length >= 2 && letters === letters.toUpperCase() && /\p{L}{2,}.*\s\p{L}{2,}|^(TITULO|CAPITULO|SECCION)/u.test(line);
    if (isHeading) continue;
    const art = /^Art\.\s*(\d{1,3})\s*o?\.\s*-/.exec(line);
    let body = line;
    if (art && Number(art[1]) === expected) {
      current = String(expected);
      expected++;
      body = line.slice(art[0].length); // the label "Art. N.-" is not counted, like the modern headings
    }
    if (current) articles[current] = (articles[current] ?? 0) + countWords(body);
  }
  if (expected !== 137) throw new Error(`1917: found ${expected - 1} articles, expected 136`);
  const total = Object.values(articles).reduce((a, b) => a + b, 0);
  return { total, articles };
}
