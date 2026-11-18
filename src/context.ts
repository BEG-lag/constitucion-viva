/** Indexes over constitution.json shared by the sections. */
import type { Article, Constitution, Decree, President } from './data.ts';
import { fyear } from './data.ts';

export interface Ctx {
  c: Constitution;
  decree: (n: number) => Decree;
  article: (id: string) => Article;
  president: (id: string) => President;
  /** Every article-level reform, in date order. */
  reforms: { id: string; n: number; date: string; year: number }[];
  totalReforms: number;
  openArticle: (id: string, opener?: HTMLElement | null) => void;
}

export function makeContext(c: Constitution, openArticle: Ctx['openArticle']): Ctx {
  const decrees = new Map(c.decrees.map((d) => [d.n, d]));
  const articles = new Map(c.articles.map((a) => [a.id, a]));
  const presidents = new Map(c.presidents.map((p) => [p.id, p]));
  const reforms = c.articles
    .flatMap((a) => a.reforms.map((n) => {
      const d = decrees.get(n)!;
      return { id: a.id, n, date: d.date, year: fyear(d.date) };
    }))
    .sort((a, b) => a.date.localeCompare(b.date) || Number(a.id) - Number(b.id));
  return {
    c,
    decree: (n) => decrees.get(n)!,
    article: (id) => articles.get(id)!,
    president: (id) => presidents.get(id)!,
    reforms,
    totalReforms: reforms.length,
    openArticle,
  };
}
