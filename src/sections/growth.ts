/**
 * Growth: total words of articles 1 to 136, 2006 to today from leyes-mx, plus
 * the 1917 estimate drawn apart (broken axis, "no data" in between).
 */
import { scaleLinear } from 'd3-scale';
import { area, curveStepAfter, line } from 'd3-shape';
import type { Ctx } from '../context.ts';
import { fyear, load, type Growth } from '../data.ts';
import { dofDate, fmt, getLang, longDate, onLang, t } from '../i18n.ts';
import { clear, COLORS, contentWidth, dataTable, esc, h, hideTip, onWidth, s, showTip, tipAt } from '../ui.ts';

export function initGrowth(ctx: Ctx): void {
  const root = document.getElementById('growth-root')!;
  void load<Growth>('growth.json').then((g) => render(ctx, root, g));
}

function render(ctx: Ctx, root: HTMLElement, g: Growth): void {
  const { c } = ctx;
  const layout = h('div', { class: 'growth-grid' });
  const main = h('div', { class: 'panel growth' });
  const side = h('div', { class: 'panel' });
  const coverage = h('p', { class: 'note' });
  const chartBox = h('div');
  const deltaBox = h('div');
  const tableBox = h('div');
  main.append(chartBox, h('h3', { style: 'margin-top:22px' }), deltaBox, coverage, tableBox);
  layout.append(main, side);
  root.append(layout);

  const first = g.versions[0]!;
  const last = g.versions[g.versions.length - 1]!;
  const moments = new Map(c.keyMoments.map((k) => [k.n, k]));

  const draw = (width: number) => {
    clear(chartBox);
    clear(deltaBox);
    const narrow = width < 560;
    const H = narrow ? 260 : 340;
    const m = { top: 24, right: narrow ? 12 : 24, bottom: 28, left: narrow ? 44 : 56 };
    const stubW = narrow ? 54 : 84;
    const gap = narrow ? 26 : 40;
    const x0 = m.left + stubW + gap;
    const x = scaleLinear().domain([fyear(first.date) - 0.4, fyear(c.asOf) + 0.6]).range([x0, width - m.right]);
    const y = scaleLinear().domain([0, Math.ceil((last.words * 1.3) / 10000) * 10000]).range([H - m.bottom, m.top]);
    const svg = s('svg', { viewBox: `0 0 ${width} ${H}`, role: 'img', 'aria-label': t('growth.chart', { from: first.date.slice(0, 4), to: last.date.slice(0, 4), a: fmt(first.words), b: fmt(last.words), c: fmt(g.original.words) }) });
    const defs = s('defs');
    const grad = s('linearGradient', { id: 'growth-fill', x1: 0, x2: 0, y1: 0, y2: 1 });
    grad.append(s('stop', { offset: '0%', 'stop-color': COLORS.lime, 'stop-opacity': 0.32 }), s('stop', { offset: '100%', 'stop-color': COLORS.lime, 'stop-opacity': 0 }));
    defs.append(grad);
    svg.append(defs);
    // y grid
    const axis = s('g', { class: 'axis' });
    for (const v of y.ticks(narrow ? 4 : 5)) {
      axis.append(s('line', { x1: m.left, x2: width - m.right, y1: y(v), y2: y(v), class: 'gridline' }));
      axis.append(s('text', { x: m.left - 8, y: y(v) + 4, 'text-anchor': 'end', text: v === 0 ? '0' : `${fmt(v / 1000)}k` }));
    }
    for (const yr of narrow ? [2006, 2016, 2026] : [2006, 2010, 2014, 2018, 2022, 2026]) {
      axis.append(s('text', { x: x(yr), y: H - 8, 'text-anchor': 'middle', text: yr }));
    }
    axis.append(s('text', { x: m.left + stubW / 2, y: H - 8, 'text-anchor': 'middle', text: '1917' }));
    svg.append(axis);
    // 1917 stub, break and "no data"
    const sx = m.left + stubW / 2;
    svg.append(
      s('line', { x1: sx, x2: sx, y1: y(0), y2: y(g.original.words), stroke: COLORS.cyan, 'stroke-width': 2, 'stroke-dasharray': '2 3' }),
      s('circle', { cx: sx, cy: y(g.original.words), r: 6, fill: COLORS.ink, stroke: COLORS.cyan, 'stroke-width': 2 }),
      s('text', { x: sx, y: y(g.original.words) - 14, 'text-anchor': 'middle', fill: COLORS.cyan, 'font-size': narrow ? 10 : 11.5, text: t('growth.estimate', { n: fmt(Math.round(g.original.words / 100) * 100) }).replace(' (', ' (') }),
    );
    const bx = m.left + stubW + gap / 2;
    svg.append(
      s('path', { d: `M${bx - 7},${y(0) + 6} l6,-12 M${bx + 1},${y(0) + 6} l6,-12`, stroke: COLORS.muted, 'stroke-width': 1.4 }),
      s('text', { x: bx, y: y(0) - 16, 'text-anchor': 'middle', fill: COLORS.muted, 'font-size': 10, text: t('growth.gap') }),
      s('line', { x1: bx, x2: bx, y1: y(y.domain()[1] ?? 0) + 40, y2: y(0) - 28, stroke: 'rgba(150,157,171,0.35)', 'stroke-dasharray': '1 4' }),
    );
    // area + line (step: the text holds until the next version)
    const pts = g.versions.map((v) => ({ x: x(fyear(v.date)), y: y(v.words), v }));
    pts.push({ x: x(fyear(c.asOf) + 0.6), y: y(last.words), v: last });
    const ar = area<(typeof pts)[number]>().x((p) => p.x).y0(y(0)).y1((p) => p.y).curve(curveStepAfter);
    const ln = line<(typeof pts)[number]>().x((p) => p.x).y((p) => p.y).curve(curveStepAfter);
    svg.append(s('path', { d: ar(pts) ?? '', fill: 'url(#growth-fill)' }), s('path', { d: ln(pts) ?? '', fill: 'none', stroke: COLORS.lime, 'stroke-width': 2.2 }));
    // biggest jumps, labelled by their key moments
    const jumps = [...g.versions].sort((a, b) => b.added - b.removed - (a.added - a.removed)).slice(0, narrow ? 2 : 3);
    // Labels go above the line, right-aligned to their version, in rows so they never overlap.
    const boxes: { x0: number; x1: number; row: number }[] = [];
    for (const v of [...jumps].sort((a, b) => b.date.localeCompare(a.date))) {
      const k = v.decrees.map((n) => moments.get(n)).find(Boolean);
      const text = `${v.date.slice(0, 4)} +${fmt(v.added - v.removed)}${k ? ` · ${k[getLang()]}` : ''}`;
      const xx = x(fyear(v.date));
      const yy = y(v.words);
      const w = text.length * 6.4;
      const x1 = Math.min(width - m.right, xx + 6);
      const x0 = x1 - w;
      let row = 0;
      while (boxes.some((b) => b.row === row && !(x1 < b.x0 - 6 || x0 > b.x1 + 6))) row++;
      boxes.push({ x0, x1, row });
      const ty = m.top + 8 + row * 15;
      svg.append(
        s('line', { x1: xx, x2: xx, y1: yy - 6, y2: ty + 4, stroke: COLORS.paper, 'stroke-width': 1, opacity: 0.4 }),
        s('text', { x: x1, y: ty, 'text-anchor': 'end', fill: COLORS.paper, 'font-size': 10.5, text }),
      );
    }
    // focusable version dots
    for (const p of pts.slice(0, -1)) {
      const v = p.v;
      const tip = `<b>${esc(longDate(v.date))}</b> · ${fmt(v.words)} ${esc(t('growth.words'))}<br>+${fmt(v.added)} / −${fmt(v.removed)}${v.editorialAdded + v.editorialRemoved > 0 ? ` <span class="t-date">(+${fmt(v.editorialAdded)} / −${fmt(v.editorialRemoved)} ed.)</span>` : ''}${v.decrees.length ? `<span class="t-title">${esc(v.decrees.map((n) => t('tooltip.decree', { n })).join(', '))}</span>` : ''}`;
      const dot = s('circle', { cx: p.x, cy: p.y, r: 3.4, fill: COLORS.ink, stroke: COLORS.lime, 'stroke-width': 1.6, tabindex: 0, role: 'img', 'aria-label': t('growth.version', { date: dofDate(v.date), words: fmt(v.words), added: fmt(v.added), removed: fmt(v.removed) }) });
      dot.addEventListener('pointerenter', (e) => showTip(tip, e.clientX, e.clientY));
      dot.addEventListener('pointerleave', hideTip);
      dot.addEventListener('focus', () => tipAt(dot, tip));
      dot.addEventListener('blur', hideTip);
      svg.append(dot);
    }
    chartBox.append(svg);

    // deltas
    (main.querySelector('h3') as HTMLElement).textContent = t('growth.delta.title');
    const DH = narrow ? 120 : 150;
    const maxD = Math.max(...g.versions.slice(1).map((v) => Math.max(v.added + v.editorialAdded, v.removed + v.editorialRemoved)));
    const dy = scaleLinear().domain([0, maxD]).range([0, DH / 2 - 14]);
    const mid = DH / 2;
    const dsvg = s('svg', { viewBox: `0 0 ${width} ${DH}`, role: 'img', 'aria-label': t('growth.delta.title') });
    dsvg.append(s('line', { x1: x0, x2: width - m.right, y1: mid, y2: mid, stroke: 'rgba(236,238,230,0.25)' }));
    const bw = Math.max(2, Math.min(9, (width - x0) / 70));
    for (const v of g.versions.slice(1)) {
      const xx = x(fyear(v.date)) - bw / 2;
      const add = dy(v.added);
      const rem = dy(v.removed);
      dsvg.append(s('rect', { x: xx, y: mid - add, width: bw, height: add, fill: COLORS.lime, rx: 1 }));
      dsvg.append(s('rect', { x: xx, y: mid, width: bw, height: rem, fill: COLORS.coral, rx: 1 }));
      if (v.editorialAdded + v.editorialRemoved > 0) {
        dsvg.append(s('rect', { x: xx, y: mid - add - dy(v.editorialAdded), width: bw, height: dy(v.editorialAdded), fill: COLORS.muted, opacity: 0.7 }));
        dsvg.append(s('rect', { x: xx, y: mid + rem, width: bw, height: dy(v.editorialRemoved), fill: COLORS.muted, opacity: 0.7 }));
      }
    }
    dsvg.append(
      s('text', { x: m.left, y: 14, fill: COLORS.lime, 'font-size': 10.5, text: `▲ ${t('growth.delta.added')}` }),
      s('text', { x: m.left, y: DH - 6, fill: COLORS.coral, 'font-size': 10.5, text: `▼ ${t('growth.delta.removed')}` }),
    );
    deltaBox.append(dsvg, h('p', { class: 'note', html: `<span class="legend-swatch" style="background:${COLORS.muted}"></span>${esc(t('growth.delta.editorial'))}` }));
  };

  const renderSide = () => {
    clear(side);
    const ratio1917 = last.words / g.original.words;
    const since2006 = (last.words / first.words - 1) * 100;
    side.append(
      h('div', { class: 'growth-big' }, h('span', { class: 'n', text: fmt(last.words) }), h('span', { class: 'u', text: `${t('growth.words')} · ${dofDate(last.date)}` })),
      h('div', { class: 'growth-big' }, h('span', { class: 'n', style: 'color:var(--cyan)', text: `×${fmt(ratio1917, 1)}` }), h('span', { class: 'u', text: getLang() === 'es' ? 'desde 1917 (est.)' : 'since 1917 (est.)' })),
      h('div', { class: 'growth-big' }, h('span', { class: 'n', style: 'color:var(--amber)', text: `+${fmt(since2006)}%` }), h('span', { class: 'u', text: getLang() === 'es' ? `desde ${dofDate(first.date)}` : `since ${dofDate(first.date)}` })),
      h('h3', { style: 'margin-top:22px', text: t('growth.top.title') }),
    );
    const list = h('ul', { class: 'grow-list' });
    const grown = c.articles.filter((a) => (a.words1917 ?? 0) > 0).sort((a, b) => b.wordsNow - (b.words1917 ?? 0) - (a.wordsNow - (a.words1917 ?? 0))).slice(0, 10);
    for (const a of grown) {
      const btn = h('button', { type: 'button', text: t('growth.top.row', { id: a.id, a: fmt(a.words1917 ?? 0), b: fmt(a.wordsNow) }) });
      btn.addEventListener('click', () => ctx.openArticle(a.id, btn));
      list.append(h('li', {}, btn, h('span', { class: 'x', text: t('growth.times', { n: fmt(a.wordsNow / (a.words1917 ?? 1), 1) }) })));
    }
    side.append(list);
  };

  const renderText = () => {
    coverage.textContent = t('growth.coverage', { from: dofDate(g.coverage.from), to: dofDate(g.coverage.to), versions: g.coverage.versions });
    clear(tableBox);
    tableBox.append(
      dataTable(
        [t('table.date'), t('table.words'), t('table.added'), t('table.removed'), t('table.decrees')],
        [['1917-02-05 (≈)', g.original.words, '', '', ''], ...g.versions.map((v) => [v.date, v.words, v.added, v.removed, v.decrees.join(', ')])],
      ),
    );
    renderSide();
  };
  renderText();
  onWidth(main, draw);
  onLang(() => {
    renderText();
    draw(contentWidth(main));
  });
}
