/**
 * Validates data/ against the JSON Schemas in data/schema/ and checks the
 * invariants the schemas cannot express (numbering, cross-references, that
 * every diff rebuilds a text whose word count matches the stored one).
 *
 *   node scripts/validate-data.ts
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Ajv } from 'ajv';

const DATA = resolve(import.meta.dirname, '..', 'data');
const read = (f: string): unknown => JSON.parse(readFileSync(join(DATA, f), 'utf8'));
const ajv = new Ajv({ allErrors: true, strict: true, strictTuples: false });
const problems: string[] = [];

function validate(schemaFile: string, dataFile: string): unknown {
  const schema = read(`schema/${schemaFile}`) as { $id: string };
  const data = read(dataFile);
  const fn = ajv.getSchema(schema.$id) ?? ajv.compile(schema);
  if (!fn(data)) {
    for (const e of fn.errors ?? []) problems.push(`${dataFile}${e.instancePath}: ${e.message ?? ''}`);
  }
  return data;
}

interface C {
  decrees: { n: number; date: string; articles: string[]; president: string; legislature: string | null }[];
  articles: { id: string; reforms: number[]; wordsNow: number; textVersions: number }[];
  presidents: { id: string; start: string; end: string; decrees: number[] }[];
  legislatures: { id: string; decrees: number[] }[];
  keyMoments: { n: number }[];
}
type Op = [0, number] | [1 | -1, string];

const c = validate('constitution.schema.json', 'constitution.json') as C;
const growth = validate('growth.schema.json', 'growth.json') as { versions: { words: number; date: string }[] };
validate('graph.schema.json', 'graph.json');
const meta = validate('meta.schema.json', 'meta.json') as { checks: { articleReforms: { parsed: number } } };

// numbering and order
c.decrees.forEach((d, i) => {
  if (d.n !== i + 1) problems.push(`decree at index ${i} has number ${d.n}`);
  const prev = c.decrees[i - 1];
  if (prev && prev.date > d.date) problems.push(`decree ${d.n} is dated before decree ${prev.n}`);
});
c.articles.forEach((a, i) => {
  if (a.id !== String(i + 1)) problems.push(`article at index ${i} is ${a.id}`);
});
// cross-references
let reforms = 0;
for (const a of c.articles) {
  reforms += a.reforms.length;
  for (const n of a.reforms) {
    const d = c.decrees[n - 1];
    if (!d) problems.push(`article ${a.id} cites missing decree ${n}`);
    else if (!d.articles.includes(a.id)) problems.push(`decree ${n} does not list article ${a.id}`);
  }
  const dates = a.reforms.map((n) => c.decrees[n - 1]?.date ?? '');
  if (dates.some((d, i) => i > 0 && d < (dates[i - 1] ?? ''))) problems.push(`article ${a.id}: reforms out of order`);
}
if (reforms !== meta.checks.articleReforms.parsed) problems.push(`article reforms ${reforms} != meta ${meta.checks.articleReforms.parsed}`);
const pres = new Set(c.presidents.map((p) => p.id));
const legs = new Set(c.legislatures.map((l) => l.id));
for (const d of c.decrees) {
  if (!pres.has(d.president)) problems.push(`decree ${d.n}: unknown president ${d.president}`);
  if (d.legislature && !legs.has(d.legislature)) problems.push(`decree ${d.n}: unknown legislature ${d.legislature}`);
  const p = c.presidents.find((x) => x.id === d.president);
  if (p && (d.date < p.start || d.date > p.end)) problems.push(`decree ${d.n} (${d.date}) outside the term of ${p.id}`);
}
if (c.presidents.reduce((s, p) => s + p.decrees.length, 0) !== c.decrees.length) problems.push('every decree belongs to exactly one presidency');
for (const k of c.keyMoments) if (!c.decrees[k.n - 1]) problems.push(`key moment ${k.n} has no decree`);

// texts: every article has a file; diffs rebuild consistent texts
const WORD = /[\p{L}\p{N}]+/gu;
const files = readdirSync(join(DATA, 'text')).filter((f) => f.endsWith('.json'));
if (files.length !== 136) problems.push(`expected 136 text files, found ${files.length}`);
let sum = 0;
for (const a of c.articles) {
  const text = validate('text.schema.json', `text/${a.id}.json`) as { versions: { date: string; words: number; ops: Op[] }[] };
  if (text.versions.length !== a.textVersions) problems.push(`text/${a.id}.json: ${text.versions.length} versions, constitution.json says ${a.textVersions}`);
  let prev = '';
  for (const v of text.versions) {
    let next = '';
    let at = 0;
    for (const op of v.ops) {
      if (op[0] === 0) {
        next += prev.slice(at, at + op[1]);
        at += op[1];
      } else if (op[0] === 1) next += op[1];
      else at += op[1].length;
    }
    if (at !== prev.length) problems.push(`text/${a.id}.json ${v.date}: ops consume ${at} of ${prev.length} characters`);
    const words = next.match(WORD)?.length ?? 0;
    if (words !== v.words) problems.push(`text/${a.id}.json ${v.date}: ${words} words rebuilt, ${v.words} stored`);
    prev = next;
  }
  if ((prev.match(WORD)?.length ?? 0) !== a.wordsNow) problems.push(`article ${a.id}: current text has a different word count than wordsNow`);
  sum += a.wordsNow;
}
const lastGrowth = growth.versions[growth.versions.length - 1];
if (lastGrowth && lastGrowth.words !== sum) problems.push(`growth.json last version ${lastGrowth.words} words, articles sum to ${sum}`);

if (problems.length) {
  console.error(`${problems.length} problem(s) in data/:\n${problems.slice(0, 50).join('\n')}`);
  process.exit(1);
}
console.log(`data/ is valid: ${c.decrees.length} decrees, ${reforms} article reforms, ${files.length} article histories.`);
