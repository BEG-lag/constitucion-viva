/**
 * Article view (modal dialog): reform timeline since 1917 with links to the
 * DOF decrees, and the word-level text changes between versions since 2006.
 * Deep link: #art-27.
 */
import type { Ctx } from '../context.ts';
import { fyear, load, rebuild, type ArticleText, type Graph } from '../data.ts';
import { dofDate, fmt, longDate, onLang, t } from '../i18n.ts';
import { clear, esc, h, hideTip, LAST_YEAR, s, showTip, yearColor } from '../ui.ts';

const LEYES = 'https://github.com/BEG-lag/leyes-mx/blob/main/leyes/cpeum.md';

export function initArticle(getCtx: () => Ctx | null): (id: string, opener?: HTMLElement | null) => void {
  const dialog = document.getElementById('article-dialog') as HTMLDialogElement;
  let currentId: string | null = null;
  let returnTo: HTMLElement | null = null;
  let selected = -1;
  let mode: 'diff' | 'clean' = 'diff';
  let previousHash = '';

  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => {
    hideTip();
    currentId = null;
    if (location.hash.startsWith('#art-')) history.replaceState(null, '', previousHash || location.pathname + location.search);
    returnTo?.focus();
  });

  const open = (id: string, opener?: HTMLElement | null) => {
    const ctx = getCtx();
    if (!ctx || !ctx.c.articles.some((a) => a.id === id)) return;
    returnTo = opener ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    if (!location.hash.startsWith('#art-')) previousHash = location.hash;
    history.replaceState(null, '', `#art-${id}`);
    currentId = id;
    selected = -1;
    mode = 'diff';
    render(ctx);
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
    dialog.querySelector<HTMLElement>('.art-head .btn')?.focus();
  };

  const render = (ctx: Ctx) => {
    if (!currentId) return;
    const a = ctx.article(currentId);
    const decrees = a.reforms.map((n) => ctx.decree(n));
    clear(dialog);
    const close = h('button', { type: 'button', class: 'btn', text: t('art.close') });
    close.addEventListener('click', () => dialog.close());
    dialog.append(
      h('div', { class: 'art-head' },
        h('div', {},
          h('h2', { id: 'article-title', text: t('art.title', { id: a.id }) }),
          h('p', { class: 'where', text: [a.titulo, a.capitulo].filter(Boolean).join(' · ') }),
        ),
        close,
      ),
    );
    const body = h('div', { class: 'art-body' });
    dialog.append(body);

    // stats
    const firstD = decrees[0];
    const lastD = decrees[decrees.length - 1];
    body.append(
      h('div', { class: 'art-stats' },
        h('div', {}, h('div', { class: 'k', text: t('table.reforms') }), h('div', { class: 'v', text: a.reforms.length === 0 ? t('art.never') : a.reforms.length === 1 ? t('art.reform1') : t('art.reforms', { n: a.reforms.length }) })),
        h('div', {}, h('div', { class: 'k', text: t('art.first') }), h('div', { class: 'v', html: firstD ? `${esc(dofDate(firstD.date))}<small>${esc(ctx.president(firstD.president).short)}</small>` : '·' })),
        h('div', {}, h('div', { class: 'k', text: t('art.last') }), h('div', { class: 'v', html: lastD ? `${esc(dofDate(lastD.date))}<small>${esc(ctx.president(lastD.president).short)}</small>` : '·' })),
        h('div', {}, h('div', { class: 'k', text: t('art.words') }), h('div', { class: 'v', html: `${fmt(a.wordsNow)}<small>${esc(t('art.words.detail', { a: a.words1917 === null ? '?' : fmt(a.words1917), b: a.words2006 === null ? '?' : fmt(a.words2006), c: fmt(a.wordsNow) }))}</small>` })),
      ),
    );

    // timeline
    const tl = h('div', { class: 'art-section art-timeline' }, h('h3', { text: t('art.timeline', { year: ctx.c.asOf.slice(0, 4) }) }));
    const svg = s('svg', { viewBox: '0 0 1000 64', preserveAspectRatio: 'none', role: 'img', 'aria-label': `${t('art.timeline', { year: ctx.c.asOf.slice(0, 4) })}: ${decrees.map((d) => dofDate(d.date)).join(', ') || t('art.never')}` });
    const xs = (yr: number) => 6 + ((yr - 1917) / (LAST_YEAR + 1 - 1917)) * 988;
    svg.append(s('line', { x1: 0, x2: 1000, y1: 40, y2: 40, stroke: 'rgba(236,238,230,0.25)', 'vector-effect': 'non-scaling-stroke' }));
    for (let yr = 1920; yr <= 2020; yr += 10) svg.append(s('line', { x1: xs(yr), x2: xs(yr), y1: 36, y2: 44, stroke: 'rgba(236,238,230,0.25)', 'vector-effect': 'non-scaling-stroke' }));
    for (const d of decrees) {
      const xx = xs(fyear(d.date));
      const mark = s('rect', { x: xx - 3, y: 10, width: 6, height: 30, rx: 1, fill: yearColor(fyear(d.date)) });
      const html = `<b>${esc(t('tooltip.decree', { n: d.n }))}</b> <span class="t-date">${esc(longDate(d.date))}</span><span class="t-title">${esc(d.title)}</span>`;
      mark.addEventListener('pointerenter', (e) => showTip(html, e.clientX, e.clientY));
      mark.addEventListener('pointerleave', hideTip);
      svg.append(mark);
    }
    tl.append(svg, h('div', { class: 'tm-years', 'aria-hidden': 'true' }, h('span', { text: '1917' }), h('span', { text: '1950' }), h('span', { text: '1983' }), h('span', { text: ctx.c.asOf.slice(0, 4) })));
    body.append(tl);

    // decree list
    if (decrees.length > 0) {
      const list = h('ol', { class: 'decree-list' });
      decrees.forEach((d, i) => {
        const links = h('span', { class: 'links' });
        if (d.url) links.append(h('a', { href: d.url, target: '_blank', rel: 'noopener', text: t('art.pdf') }));
        if (d.process) links.append(h('a', { href: d.process, target: '_blank', rel: 'noopener', text: t('art.process') }));
        links.append(h('span', { class: 'who', text: `${ctx.president(d.president).short}${d.legislature ? ` · ${d.legislature}` : ''}` }));
        list.append(
          h('li', {},
            h('span', { class: 'ord', text: String(i + 1) }),
            h('span', { class: 'date', html: `<span class="swatch" style="background:${yearColor(fyear(d.date))}"></span>${esc(dofDate(d.date))}` }),
            h('div', {}, h('div', { class: 't', text: d.title }), links),
          ),
        );
      });
      body.append(h('div', { class: 'art-section' }, h('h3', { text: t('art.list') }), list));
    }
    if (a.errata.length > 0) {
      const p = h('p', { class: 'cited' });
      a.errata.forEach((e, i) => {
        if (i > 0) p.append(' · ');
        p.append(h('a', { href: e.url, target: '_blank', rel: 'noopener', text: `${e.kind === 'errata' ? t('art.errata') : t('art.aclaracion')} DOF ${dofDate(e.date)}` }));
      });
      body.append(p);
    }

    // text versions
    const textSec = h('div', { class: 'art-section' }, h('h3', { text: t('art.text') }));
    const textBox = h('div', {}, h('p', { class: 'diff-meta', text: t('art.loading') }));
    textSec.append(textBox);
    body.append(textSec);
    void load<ArticleText>(`text/${a.id}.json`).then((text) => {
      if (currentId !== a.id) return;
      renderText(ctx, textBox, text);
    });

    // cited by + links
    const cited = h('p', { class: 'cited' });
    const lawIds = Object.keys(a.citedBy);
    if (lawIds.length === 0) cited.textContent = t('art.citedBy0');
    else {
      void load<Graph>('graph.json').then((g) => {
        const names = new Map(g.nodes.map((n) => [n.id, n]));
        cited.innerHTML = `<b>${esc(t('art.citedBy', { n: lawIds.length }))}:</b> ${lawIds
          .sort((x, y) => (a.citedBy[y] ?? 0) - (a.citedBy[x] ?? 0))
          .map((id) => `${esc(names.get(id)?.abbreviation ?? id)} (${fmt(a.citedBy[id] ?? 0)})`)
          .join(', ')}`;
      });
    }
    const n = Number(a.id);
    const anchor = `#artículo-${n}${n < 10 ? 'o' : ''}`;
    body.append(
      h('div', { class: 'art-section' }, cited,
        h('div', { class: 'art-links' },
          h('a', { href: `${LEYES}${anchor}`, target: '_blank', rel: 'noopener', text: t('art.leyes') }),
          h('a', { href: 'https://www.diputados.gob.mx/LeyesBiblio/ref/cpeum_art.htm', target: '_blank', rel: 'noopener', text: 'LeyesBiblio' }),
        ),
      ),
    );
  };

  const renderText = (ctx: Ctx, box: HTMLElement, text: ArticleText) => {
    clear(box);
    const full = rebuild(text);
    const vs = text.versions;
    if (selected < 0) selected = vs.length - 1;
    const chips = h('div', { class: 'versions', role: 'group', 'aria-label': t('art.version') });
    vs.forEach((v, i) => {
      const editorial = i > 0 && v.decrees.length === 0;
      const chip = h('button', { type: 'button', class: `chip${editorial ? ' editorial' : ''}`, 'aria-pressed': String(i === selected), text: dofDate(v.date) });
      chip.addEventListener('click', () => {
        selected = i;
        renderText(ctx, box, text);
        (box.querySelectorAll('.versions .chip')[i] as HTMLElement | undefined)?.focus();
      });
      chips.append(chip);
    });
    box.append(chips);
    const v = vs[selected]!;
    const meta = h('p', { class: 'diff-meta' });
    if (selected === 0) meta.textContent = vs.length === 1 ? `${t('art.base')} ${t('art.nochange')}` : t('art.base');
    else {
      meta.innerHTML = `<span class="add">+${fmt(v.added)}</span> / <span class="del">−${fmt(v.removed)}</span> · ${
        v.decrees.length
          ? v.decrees.map((n) => {
              const d = ctx.decree(n);
              return `<a href="${esc(d.url ?? '#')}" target="_blank" rel="noopener">${esc(t('tooltip.decree', { n }))}, DOF ${esc(dofDate(d.date))}</a>`;
            }).join(' · ')
          : esc(t('art.editorial'))
      }`;
    }
    box.append(meta);
    if (selected > 0) {
      const toggles = h('div', { class: 'toggle-row' });
      const mk = (label: string, m: 'diff' | 'clean') => {
        const b = h('button', { type: 'button', class: 'chip', 'aria-pressed': String(mode === m), text: label });
        b.addEventListener('click', () => {
          mode = m;
          renderText(ctx, box, text);
        });
        return b;
      };
      toggles.append(mk(t('art.diff'), 'diff'), mk(t('art.clean'), 'clean'));
      box.append(toggles);
    }
    const out = h('div', { class: 'diff', tabindex: 0, 'aria-label': `${t('art.title', { id: text.id })}, ${dofDate(v.date)}` });
    if (selected === 0 || mode === 'clean') {
      out.textContent = full[selected] ?? '';
    } else {
      const prev = full[selected - 1] ?? '';
      let at = 0;
      for (const op of v.ops) {
        if (op[0] === 0) {
          out.append(prev.slice(at, at + op[1]));
          at += op[1];
        } else if (op[0] === 1) {
          out.append(h('ins', { text: op[1] }));
        } else {
          out.append(h('del', { text: op[1] }));
          at += op[1].length;
        }
      }
    }
    box.append(out);
    // Bring the first change into view inside the text box.
    const firstChange = out.querySelector('ins, del');
    if (firstChange instanceof HTMLElement) out.scrollTop = Math.max(0, firstChange.offsetTop - 60);
  };

  onLang(() => {
    const ctx = getCtx();
    if (ctx && currentId && dialog.open) render(ctx);
  });
  return open;
}
