# Método / Method

How every number in constitución viva is produced, the rules behind it and how well
those rules work. The code is in [`scripts/data/`](../scripts/data/); sources and
retrieval dates are in [`fuentes.md`](fuentes.md).

*Cómo se produce cada cifra, con qué reglas y qué tan bien funcionan. Resumen en español
al final.*

## 1. Decrees and the articles they amended

- **Decrees** come from the Cámara de Diputados page "Reformas en orden cronológico"
  (`ref/cpeum_crono.htm`): number, DOF date, title, the Cámara's summary, links to the
  published decree (PDF or scanned image), the Word file and the legislative process,
  and any errata or clarification. The pages are ISO-8859-1 and are read as
  Windows-1252.
- **Articles per decree** come from "Reformas por artículo" (`ref/cpeum_art.htm`),
  section "Artículos 1o. al 136". Each entry ("3ª Reforma DOF 05-03-1993") links to a
  decree file whose name carries the decree number (`CPEUM_ref_124_...`). The build
  asserts that every entry's ordinal is consecutive and that its date equals the date
  of the decree it links to. Entries labelled "Fe de erratas" or "Aclaración" are kept
  apart and not counted as reforms.
- The transitory articles (of 1917 and of reform decrees) use a different layout and
  are out of scope; six decrees touched only transitory provisions and appear in the
  timelines with no article.
- **Cross-checks.** All 285 decrees match, in number and date, the independent parse
  of the same page in leyes-mx. The detailed by-article list has 857 entries; the
  page's own summary says 856 (an inconsistency in the source; the detailed list is
  used).

## 2. Presidents and legislatures

- **Presidential terms** are the official ones printed on "Reformas por periodo
  presidencial" (`ref/cpeum_per.htm`), from Álvaro Obregón (1920) to Claudia Sheinbaum
  (2024). A decree is attributed to the president whose term contains its DOF date. On
  the two transfer days where terms touch (1930-02-05 and 1932-09-04) the page's own
  listing decides; no decree falls on them.
- **Cross-check.** For each president the page links the decrees of their term. Three
  decrees (15, 168, 169) are not linked under the president of their date: the page
  sometimes links, instead, the decree being amended.
- **Legislatures** come from the Spanish Wikipedia list of legislatures (revision in
  `fuentes.md`), from the XXIX (1920) on, since no reform was published before July
  1921. The build asserts that the legislatures do not overlap and that the years of the
  LIX to LXVI agree with the Cámara's own page (`legis.htm`). A decree is attributed to
  the legislature in office on its DOF date, which is not necessarily the one that
  approved it.

## 3. Text, length and word-level changes (2006 onward)

- [leyes-mx](https://github.com/BEG-lag/leyes-mx) keeps the Constitution as Markdown
  with one commit per version, dated on the DOF date of the reform it reflects: 44
  versions from April 7, 2006 to October 7, 2026. The repository is cloned into
  `.cache/leyes-mx` and read from there.
- Each version is split into articles at its `Artículo N` headings, up to the first
  "Transitorios" heading. The Cámara's editorial notes (whole italic lines such as
  `*Párrafo reformado DOF 10-06-2011*`) and inline notes like `(sic DOF 05-02-1917)` are
  removed: they are not constitutional text. Every version has exactly 136 articles.
- **Words** are runs of letters or digits (`/[\p{L}\p{N}]+/u`).
- **Changes** are computed with jsdiff's whitespace-significant word diff between
  consecutive versions of each article and stored as operations (keep *n* characters,
  insert, delete). The build rebuilds every version from its operations and fails if
  the result differs by a single character from the text in leyes-mx;
  `npm run check:data` repeats the check and compares word counts.
- A version can bundle several decrees. A change in an article is attributed to the
  decrees published since the previous version that, per the Cámara, amended that
  article. When none did (65 cases: 49 in the 2008-08-29 version, 13 in two 2014 versions, 3 in 2019) the
  change is a correction of the consolidated text by the Cámara and is shown as
  editorial, and counted apart in the growth chart.

## 4. The 1917 estimate

- Source: the Cámara's transcription of the DOF of February 5, 1917
  (`ref/cpeum/CPEUM_orig_05feb1917.pdf`), laid out in three columns.
- `pdftotext -bbox` (Poppler) gives every word with its position. Words are put back in
  reading order (page, column by x position, line by exact baseline, x); running headers
  and footers are dropped; the text between "Art. 1o.-" and "ARTÍCULOS TRANSITORIOS." is
  split at each "Art. N.-" that starts a line (all 136 are found in sequence); the labels
  and all-caps headings (Título, Capítulo, Sección) are not counted.
- **Accuracy.** The 17 articles never amended must have the same length in 1917 and in
  2006. Their difference adds up to 18 words out of 770 (2.3%). The total, about 20,600
  words, is shown as an estimate and drawn apart from the 2006 to 2026 series, with no
  line in between.

## 5. The web of laws

Corpus: the 36 instruments of leyes-mx (the Constitution and 35 laws and codes), current
text, body only (before the first "Transitorios" heading), without editorial notes.

1. **Mentions.** Case-insensitive, accent-sensitive exact match of each law's official
   title (from its front matter) plus four aliases that are unambiguous inside the
   corpus: "Constitución Federal" and "Constitución General de la República" for the
   Constitution, "Ley de Amparo" and "Ley Minera" (its former name) for those laws.
   Longer names are matched first and their span is masked, so the Constitution is not
   counted inside "Ley de Amparo, Reglamentaria de los artículos 103 y 107 de la
   Constitución Política de los Estados Unidos Mexicanos". A name preceded by
   "Reglamento de la" or "Reglamento del" belongs to a regulation, not the law, and is
   skipped (9 cases). A law naming itself counts as a self-reference, not an edge.
2. **Article citations.** "artículo(s) N[, M y K] [fracción, párrafo, inciso...] de la |
   del <law>" right before a mention, and "artículo N constitucional". The list must be
   made only of article numbers (with suffixes such as 17-A or 32 Bis), or it is
   rejected. A citation is **resolved** only if the article exists in the current text of
   the cited law.
3. **Self-references** ("esta Ley", "la presente Ley", "este Código", "esta
   Constitución") are counted per law.

**Precision.**

- Article citations: 333 of 333 citations to other laws resolve to an existing article,
  and 49 of 49 "artículo N constitucional". Before the regulation rule, the only
  unresolved one was a citation to the *Reglamento* of the Income Tax Law, which is how
  that rule was found.
- Mentions: a deterministic random sample of 60 mentions (saved in
  [`data/graph-sample.json`](../data/graph-sample.json)) was read by hand: all 60 are real
  references to the named law.
- Recall is not measured. The graph misses generic references ("las leyes
  aplicables"), abbreviations defined inside a law, abrogated laws and laws outside the
  corpus. Edges are a lower bound.

## 6. What is authored by hand

[`scripts/data/curated.ts`](../scripts/data/curated.ts): short names of the presidents
(checked against the Cámara's list) and the annotated key moments. Each key moment must
match its decree's DOF date and a phrase of its title or of the Cámara's summary, or the
build fails. Labels paraphrase that title or summary.

## Resumen en español

- Decretos: lista cronológica de la Cámara; artículos por decreto: lista «por artículo»,
  con comprobación de fechas y numeración; 285 de 285 coinciden con leyes-mx.
- Presidencias: periodos oficiales de la Cámara; atribución por fecha del DOF.
  Legislaturas: Wikipedia, contrastada con la Cámara para la LIX a la LXVI.
- Texto: 44 versiones de leyes-mx desde 2006, sin notas editoriales; diferencias palabra
  por palabra que reconstruyen el texto exacto; 65 cambios sin decreto se marcan como
  editoriales.
- 1917: estimación con posiciones de palabras del PDF de la Cámara; error de 2.3% en los
  17 artículos nunca reformados.
- Red: nombres oficiales exactos más cuatro alias; citas a artículos verificadas (382 de
  382); muestra manual de 60 menciones, 60 correctas; no mide exhaustividad.
