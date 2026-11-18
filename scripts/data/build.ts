/**
 * Regenerates everything in data/ from the sources.
 *
 *   npm run data            fetch what is missing, then build
 *   npm run data:offline    build from the cache only (.cache/)
 *   node scripts/data/build.ts --refresh   refetch every source
 *
 * Sources: the Cámara de Diputados (LeyesBiblio), leyes-mx (git history of the
 * texts), Wikipedia (dates of the legislatures). See docs/fuentes.md.
 * Requires git and Poppler's pdftotext on the PATH.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { diffWordsWithSpace } from 'diff';
import { cached, decodeLatin1, ROOT, type CacheEntry } from './http.ts';
import { articleId, parseByArticle, parseByArticleTotals, parseByTerm, parseCrono } from './diputados.ts';
import { articles as parseArticles, countWords, current, ensureClone, frontMatter, LEYES_DIR, show, versions } from './leyes.ts';
import { buildGraph, type LawText } from './graph.ts';
import { originalLengths } from './orig1917.ts';
import { isoFromSpanish } from './html.ts';
import { KEY_MOMENTS, PRESIDENT_SHORT } from './curated.ts';

const DATA = join(ROOT, 'data');
const TODAY = new Date().toLocaleDateString('sv-SE'); // local YYYY-MM-DD
const REF = 'https://www.diputados.gob.mx/LeyesBiblio/ref/';
const WIKI_PAGE = 'Anexo:Congresos_y_Legislaturas_del_Congreso_de_la_Unión';

const sources: (CacheEntry & { id: string; name: string; note?: string })[] = [];
const checks: Record<string, unknown> = {};

function write(file: string, value: unknown, pretty = true): void {
  const path = join(DATA, file);
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, (pretty ? JSON.stringify(value, null, 1) : JSON.stringify(value)) + '\n');
}

async function page(id: string, name: string, url: string, file: string): Promise<string> {
  const { body, entry } = await cached(url, file);
  sources.push({ id, name, ...entry });
  return decodeLatin1(body);
}

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(`check failed: ${message}`);
}

console.log('1/7 sources');
const cronoHtml = await page('crono', 'Reformas constitucionales en orden cronológico', `${REF}cpeum_crono.htm`, 'diputados/cpeum_crono.htm');
const artHtml = await page('art', 'Reformas constitucionales por artículo', `${REF}cpeum_art.htm`, 'diputados/cpeum_art.htm');
const perHtml = await page('per', 'Reformas constitucionales por periodo presidencial', `${REF}cpeum_per.htm`, 'diputados/cpeum_per.htm');
const legisHtml = await page('legis', 'Reformas constitucionales y legales por legislatura', 'https://www.diputados.gob.mx/LeyesBiblio/legis.htm', 'diputados/legis.htm');
const wiki = await cached(
  `https://es.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(WIKI_PAGE)}&prop=wikitext%7Crevid&format=json&formatversion=2`,
  'wikipedia/legislaturas.json',
);
const wikiJson = JSON.parse(wiki.body.toString('utf8')) as { parse: { wikitext: string; revid: number } };
sources.push({ id: 'wikipedia', name: 'Anexo: Congresos y Legislaturas del Congreso de la Unión (Wikipedia en español)', ...wiki.entry, note: `revid ${wikiJson.parse.revid}` });
const pdf = await cached(`${REF}cpeum/CPEUM_orig_05feb1917.pdf`, 'diputados/pdf/CPEUM_orig_05feb1917.pdf');
sources.push({ id: 'orig1917', name: 'Constitución de 1917, texto original (transcripción de la Cámara de Diputados del DOF del 5 de febrero de 1917)', ...pdf.entry });
const leyes = ensureClone();

console.log('2/7 decrees');
const raw = parseCrono(cronoHtml);
const byArticle = parseByArticle(artHtml);
const officialTotals = parseByArticleTotals(artHtml);
assert(raw.length > 280, `expected more than 280 decrees, got ${raw.length}`);
raw.forEach((d, i) => assert(d.n === i + 1, `decrees are numbered 1..N without gaps (at ${d.n})`));
assert(byArticle.length === 136, `by-article lists 136 articles, got ${byArticle.length}`);

// Cross-check with leyes-mx's own parse of the same page.
const leyesReformas = JSON.parse(readFileSync(join(LEYES_DIR, 'data/reformas/cpeum.json'), 'utf8')) as {
  decrees: { number: number; dof_date: string; title: string }[];
};
const leyesByN = new Map(leyesReformas.decrees.map((d) => [d.number, d]));
const crossDiff = raw.filter((d) => {
  const o = leyesByN.get(d.n);
  return !o || o.dof_date !== d.date;
});
checks['decreesVsLeyesMx'] = { compared: raw.length, leyesMx: leyesReformas.decrees.length, dateMismatches: crossDiff.map((d) => d.n) };

const touched = new Map<number, string[]>();
const articleRows = byArticle.map((a) => {
  const id = articleId(a.label);
  assert(id, `article id for ${a.label}`);
  a.reforms.forEach((r, i) => {
    assert(r.ordinal === i + 1, `ordinals of article ${id} are 1..N`);
    assert(r.decree !== null, `decree number in ${r.url}`);
    const d = raw[r.decree - 1];
    assert(d && d.date === r.date, `article ${id} reform ${r.ordinal}: date ${r.date} matches decree ${r.decree}`);
    const list = touched.get(r.decree) ?? [];
    if (!list.includes(id)) list.push(id);
    touched.set(r.decree, list);
  });
  return { id, raw: a };
});
const articleReformCount = articleRows.reduce((s, a) => s + a.raw.reforms.length, 0);
checks['articleReforms'] = { parsed: articleReformCount, pageSummary: officialTotals };

console.log('3/7 presidents and legislatures');
const presidentsRaw = parseByTerm(perHtml).sort((a, b) => a.start.localeCompare(b.start));
const presidents = presidentsRaw.map((p) => {
  const short = PRESIDENT_SHORT[p.name];
  assert(short, `short name for ${p.name}`);
  return { ...p, id: short.id, short: short.short, display: short.display };
});
function presidentFor(n: number, date: string): string {
  const cands = presidents.filter((p) => p.start <= date && date <= p.end);
  if (cands.length === 1) return cands[0]?.id ?? '';
  // Transfer days (the outgoing term ends the day the next one starts): the page's own listing decides.
  const listed = cands.find((p) => p.decrees.includes(n));
  assert(listed, `president for decree ${n} on ${date}`);
  return listed.id;
}

const legislatures: { id: string; start: string; end: string }[] = [];
for (const row of wikiJson.parse.wikitext.split(/\n\|-/)) {
  const id = /\[\[(?:Anexo:)?([LXVI]+) Legislatura/.exec(row)?.[1];
  const dates = [...row.matchAll(/\d{1,2} de [a-z]+ de \d{4}/g)].map((m) => isoFromSpanish(m[0]));
  if (!id || dates.length < 2 || !dates[0] || !dates[1]) continue;
  if (dates[0] < '1920-01-01') continue; // no reform was published before July 1921
  legislatures.push({ id, start: dates[0], end: dates[1] });
}
legislatures.sort((a, b) => a.start.localeCompare(b.start));
legislatures.forEach((l, i) => {
  const next = legislatures[i + 1];
  if (next) assert(next.start > l.end, `legislatures do not overlap (${l.id})`);
});
// The Cámara lists the recent legislatures with their years: they must agree.
for (const m of legisHtml.matchAll(/([LXVI]+) Legislatura \((\d{4})-(\d{4})\)/g)) {
  const l = legislatures.find((x) => x.id === m[1]);
  assert(l && l.start.startsWith(m[2] ?? '') && l.end.startsWith(m[3] ?? ''), `legislature ${m[1]} agrees with the Cámara (${m[2]}-${m[3]})`);
}
function legislatureFor(date: string): string | null {
  return legislatures.find((l) => l.start <= date && date <= l.end)?.id ?? null;
}

const decrees = raw.map((d) => ({
  n: d.n,
  date: d.date,
  title: d.title,
  summary: d.summary,
  note: d.note,
  url: d.pdf ?? d.image ?? d.doc,
  doc: d.doc,
  process: d.process,
  errata: d.errata,
  articles: (touched.get(d.n) ?? []).sort((a, b) => Number(a) - Number(b)),
  president: presidentFor(d.n, d.date),
  legislature: legislatureFor(d.date),
}));
const presidentMismatch = decrees.filter((d) => !presidents.find((p) => p.id === d.president)?.decrees.includes(d.n)).map((d) => d.n);
checks['presidentsVsTermPage'] = {
  note: 'Decrees attributed by DOF date whose number does not appear in that president\'s block of the by-term page.',
  decrees: presidentMismatch,
};

// Key moments: every entry must match its decree's title or summary.
const keyMoments = KEY_MOMENTS.map((k) => {
  const d = decrees[k.n - 1];
  assert(d, `key moment decree ${k.n}`);
  assert(k.expect.test(`${d.title} ${d.summary ?? ''}`), `key moment ${k.n} (${d.date}) matches ${String(k.expect)}`);
  assert(d.date === k.date, `key moment ${k.n} date ${k.date}`);
  return { n: k.n, priority: k.priority, es: k.es, en: k.en };
});

console.log('4/7 texts (leyes-mx)');
const vs = versions('cpeum');
assert(vs.length >= 40, `leyes-mx has the history of the Constitution (${vs.length} versions)`);
const textDir = join(DATA, 'text');
rmSync(textDir, { recursive: true, force: true });
/** [0, n]: keep n characters of the previous text; [1, s]: insert s; [-1, s]: delete s. */
type Op = [0, number] | [1 | -1, string];
interface ArticleVersion {
  date: string;
  decrees: number[];
  words: number;
  added: number;
  removed: number;
  ops: Op[];
}
const textVersions = new Map<string, ArticleVersion[]>();
const lastText = new Map<string, string>();
const growth: {
  date: string;
  commit: string;
  decrees: number[];
  words: number;
  /** Words added and removed in articles that a decree of this window touched. */
  added: number;
  removed: number;
  /** Same, for articles changed without a decree in the window (corrections of the consolidated text). */
  editorialAdded: number;
  editorialRemoved: number;
  changed: string[];
}[] = [];
let prevDate = '0000-00-00';
let latestSections = new Map<string, { titulo: string | null; capitulo: string | null; text: string }>();
let firstWords = new Map<string, number>();
for (const [i, v] of vs.entries()) {
  const arts = parseArticles(show(v.commit, 'cpeum'));
  assert(arts.size === 136, `version ${v.date} has 136 articles`);
  const inRange = decrees.filter((d) => d.date > prevDate && d.date <= v.date).map((d) => d.n);
  let total = 0;
  let added = 0;
  let removed = 0;
  let editorialAdded = 0;
  let editorialRemoved = 0;
  const changed: string[] = [];
  for (const [id, sec] of arts) {
    total += countWords(sec.text);
    const before = lastText.get(id);
    if (before === sec.text) continue;
    let ops: Op[];
    let a = 0;
    let r = 0;
    if (before === undefined) {
      ops = [[1, sec.text]];
    } else {
      // Whitespace-significant word diff: old = kept + removed and new = kept + added, exactly.
      ops = diffWordsWithSpace(before, sec.text).map((c): Op => (c.added ? [1, c.value] : c.removed ? [-1, c.value] : [0, c.value.length]));
      let rebuilt = '';
      let at = 0;
      for (const op of ops) {
        if (op[0] === 0) {
          rebuilt += before.slice(at, at + op[1]);
          at += op[1];
        } else if (op[0] === 1) rebuilt += op[1];
        else at += op[1].length;
      }
      assert(rebuilt === sec.text && at === before.length, `diff of article ${id} at ${v.date} rebuilds the text`);
      for (const [op, t] of ops) {
        if (op === 1) a += countWords(t);
        if (op === -1) r += countWords(t);
      }
      changed.push(id);
    }
    const byDecree = i === 0 ? [] : inRange.filter((n) => decrees[n - 1]?.articles.includes(id));
    if (byDecree.length > 0) {
      added += a;
      removed += r;
    } else {
      editorialAdded += a;
      editorialRemoved += r;
    }
    const list = textVersions.get(id) ?? [];
    list.push({
      date: v.date,
      decrees: byDecree,
      words: countWords(sec.text),
      added: a,
      removed: r,
      ops,
    });
    textVersions.set(id, list);
    lastText.set(id, sec.text);
  }
  if (i === 0) firstWords = new Map([...arts].map(([id, s]) => [id, countWords(s.text)]));
  growth.push({ date: v.date, commit: v.commit, decrees: i === 0 ? [] : inRange, words: total, added, removed, editorialAdded, editorialRemoved, changed });
  prevDate = v.date;
  latestSections = arts;
}
for (const [id, list] of textVersions) {
  write(`text/${id}.json`, { id, versions: list }, false);
}
// Changes with no decree that touched the article in that window are editorial (typos, notes).
const editorial = [...textVersions.entries()].flatMap(([id, list]) => list.slice(1).filter((v) => v.decrees.length === 0).map((v) => `${id}@${v.date}`));
checks['editorialChanges'] = { note: 'Article text changed between versions without a decree touching it in that window.', items: editorial };

const orig = originalLengths(join(ROOT, '.cache', 'diputados/pdf/CPEUM_orig_05feb1917.pdf'));
const unreformed = articleRows.filter((a) => a.raw.unreformed).map((a) => a.id);
const dev = unreformed.map((id) => Math.abs((orig.articles[id] ?? 0) - (firstWords.get(id) ?? 0)));
const devBase = unreformed.reduce((s, id) => s + (firstWords.get(id) ?? 0), 0);
checks['orig1917'] = {
  note: 'Words per article in 1917 (estimate from the PDF) against 2006 for the articles never reformed; they should be equal.',
  articles: unreformed.length,
  absoluteDifference: dev.reduce((a, b) => a + b, 0),
  wordsCompared: devBase,
};

console.log('5/7 articles');
const articlesOut = articleRows.map(({ id, raw: a }) => {
  const sec = latestSections.get(id);
  assert(sec, `current text of article ${id}`);
  const vlist = textVersions.get(id) ?? [];
  return {
    id,
    titulo: sec.titulo,
    capitulo: sec.capitulo,
    reforms: a.reforms.map((r) => r.decree ?? 0),
    errata: a.errata,
    words1917: orig.articles[id] ?? null,
    words2006: firstWords.get(id) ?? null,
    wordsNow: countWords(sec.text),
    textVersions: vlist.length,
  };
});

console.log('6/7 citation graph');
const catalog = readFileSync(join(LEYES_DIR, 'catalog.yml'), 'utf8');
const groupNames: Record<string, string> = Object.fromEntries([...catalog.matchAll(/^ {2}(\w+): "([^"]+)"$/gm)].map((m): [string, string] => [m[1] ?? '', m[2] ?? '']));
const catalogLaws = [...catalog.matchAll(/\{key: (\w+), slug: (\w+), group: (\w+)/g)].map((m) => ({ slug: m[2] ?? '', group: m[3] ?? '' }));
assert(catalogLaws.length === 36, `leyes-mx catalog has 36 laws (${catalogLaws.length})`);
const laws: (LawText & { group: string; words: number; published: string; lastReform: string | null })[] = catalogLaws.map((c) => {
  const md = current(c.slug);
  const fm = frontMatter(md);
  const arts = parseArticles(md);
  let words = 0;
  for (const s of arts.values()) words += countWords(s.text);
  return {
    slug: c.slug,
    title: fm.title,
    abbreviation: fm.abbreviation,
    articles: new Map([...arts].map(([k, s]) => [k, s.text])),
    group: c.group,
    words,
    published: fm.published_dof,
    lastReform: fm.last_reform_dof,
  };
});
const graph = buildGraph(laws);
const degree = (slug: string, dir: 'source' | 'target') => graph.edges.filter((e) => e[dir] === slug).length;
write('graph.json', {
  groups: groupNames,
  nodes: laws.map((l) => ({
    id: l.slug,
    title: l.title,
    abbreviation: l.abbreviation,
    group: l.group,
    articles: l.articles.size,
    words: l.words,
    published: l.published,
    lastReform: l.lastReform,
    selfReferences: graph.self[l.slug] ?? 0,
    out: degree(l.slug, 'source'),
    in: degree(l.slug, 'target'),
  })),
  edges: graph.edges,
  constitution: graph.constitution,
  stats: graph.stats,
});
write('graph-sample.json', { note: 'Deterministic random sample of law-name matches, for the manual precision check in docs/metodo.md.', sample: graph.sample });

console.log('7/7 summary');
const lastDecree = decrees[decrees.length - 1];
assert(lastDecree, 'at least one decree');
write('constitution.json', {
  generated: TODAY,
  asOf: lastDecree.date,
  decrees,
  articles: articlesOut.map((a) => ({ ...a, citedBy: graph.constitution[a.id] ?? {} })),
  presidents: presidents.map((p) => ({
    id: p.id,
    name: p.display,
    short: p.short,
    officialName: p.name,
    start: p.start,
    end: p.end,
    decrees: decrees.filter((d) => d.president === p.id).map((d) => d.n),
    reportedArticles: p.reportedArticles,
  })),
  legislatures: legislatures.map((l) => ({ ...l, decrees: decrees.filter((d) => d.legislature === l.id).map((d) => d.n) })),
  keyMoments,
});
write('growth.json', {
  coverage: { from: vs[0]?.date, to: vs[vs.length - 1]?.date, versions: vs.length },
  original: { date: '1917-02-05', words: orig.total, estimate: true },
  versions: growth.map((g) => ({ ...g, commit: g.commit.slice(0, 7) })),
});
write('meta.json', {
  generated: TODAY,
  leyesMx: { repo: leyes.repo, commit: leyes.commit, date: leyes.date },
  sources: sources.map(({ id, name, url, retrieved, sha256, bytes, note }) => ({ id, name, url, retrieved, sha256, bytes, ...(note ? { note } : {}) })),
  checks,
});
// docs/fuentes.md: sources and retrieval dates, regenerated with the data.
const fuentes = [
  '# Fuentes / Sources',
  '',
  '<!-- Generated by scripts/data/build.ts. Do not edit by hand. -->',
  '',
  `Datos generados el ${TODAY} con \`npm run data\`. Cada fuente se descarga una vez, con pausas de 1.5 s entre solicitudes, reintentos y un User-Agent genérico, y se guarda en caché (\`.cache/\`, fuera de git). La huella SHA-256 identifica la copia exacta que se usó.`,
  '',
  `*Data generated on ${TODAY} with \`npm run data\`. Each source is downloaded once, with 1.5 s pauses, retries and a generic User-Agent, and cached in \`.cache/\` (not in git). The SHA-256 identifies the exact copy used.*`,
  '',
  '| Fuente / Source | Consultada / Retrieved | Bytes | SHA-256 |',
  '|---|---|---:|---|',
  ...sources.map((src) => `| [${src.name}](${src.id === 'wikipedia' ? 'https://es.wikipedia.org/wiki/Anexo:Congresos_y_Legislaturas_del_Congreso_de_la_Uni%C3%B3n' : src.url})${src.note ? ` (${src.note})` : ''} | ${src.retrieved} | ${src.bytes.toLocaleString('en-US')} | \`${src.sha256.slice(0, 16)}…\` |`),
  `| [leyes-mx](${leyes.repo}), commit [\`${leyes.commit.slice(0, 7)}\`](${leyes.repo}/tree/${leyes.commit}) (clon local de solo lectura / read-only local clone) | ${leyes.date} | | |`,
  '',
  '## Qué se toma de cada fuente / What comes from each source',
  '',
  '- **Reformas en orden cronológico** (Cámara de Diputados, LeyesBiblio): número, fecha DOF, título, resumen, liga al decreto y al proceso legislativo de cada decreto. / Number, DOF date, title, summary, links to each decree and its legislative process.',
  '- **Reformas por artículo**: qué decretos reformaron cada uno de los artículos 1 a 136 (y fe de erratas o aclaraciones). / Which decrees amended each of articles 1 to 136 (plus errata and clarifications).',
  '- **Reformas por periodo presidencial**: nombres y periodos de cada presidencia; sirve para atribuir decretos por fecha y como comprobación. / Names and terms of each presidency; used to attribute decrees by date and as a cross-check.',
  '- **Reformas por legislatura** y **Wikipedia**: fechas de inicio y fin de cada legislatura desde la XXIX; las de la LIX a la LXVI se comparan con la Cámara. / Start and end dates of each legislature since the XXIX; LIX to LXVI are checked against the Chamber.',
  '- **Texto original de 1917** (PDF de la Cámara): estimación de palabras por artículo en 1917. / Estimated words per article in 1917.',
  '- **leyes-mx**: 44 versiones del texto de la Constitución desde el 7 de abril de 2006 (una por commit, fechado en el DOF), el texto vigente de 36 leyes para la red de citas y un análisis independiente de la lista de decretos para comparar. / 44 versions of the text since April 7, 2006, current text of 36 laws for the citation web, and an independent parse of the decree list for comparison.',
  '',
  '## Comprobaciones / Checks',
  '',
  `- Decretos: ${raw.length} en la Cámara; ${raw.length - crossDiff.length} coinciden en número y fecha con leyes-mx. / ${raw.length} decrees; ${raw.length - crossDiff.length} match leyes-mx in number and date.`,
  `- Reformas por artículo: ${articleReformCount} entradas en la lista detallada; el resumen de la misma página dice ${officialTotals?.articles ?? '?'}. / ${articleReformCount} entries in the detailed list; the page summary says ${officialTotals?.articles ?? '?'}.`,
  `- Atribución por fecha vs. bloques de la página por periodo presidencial: ${presidentMismatch.length} decretos (${presidentMismatch.join(', ')}) no aparecen en el bloque de su presidencia. / ${presidentMismatch.length} decrees not listed under their presidency on that page.`,
  `- Estimación de 1917: en los ${unreformed.length} artículos nunca reformados, diferencia absoluta de ${dev.reduce((a, b) => a + b, 0)} palabras sobre ${devBase} contra el texto de 2006. / Absolute difference of ${dev.reduce((a, b) => a + b, 0)} words out of ${devBase} against 2006 for the never-amended articles.`,
  `- Cambios de texto sin decreto en su ventana (correcciones del texto consolidado): ${editorial.length}. / Text changes with no decree in their window (corrections of the consolidated text): ${editorial.length}.`,
  '',
];
writeFileSync(join(ROOT, 'docs', 'fuentes.md'), fuentes.join('\n'));

console.log(
  `done: ${decrees.length} decrees, ${articleReformCount} article reforms, ${vs.length} versions, ${graph.edges.length} edges; ` +
    `words ${orig.total} (1917, est.) -> ${growth[0]?.words} (${growth[0]?.date}) -> ${growth[growth.length - 1]?.words} (${lastDecree.date})`,
);
