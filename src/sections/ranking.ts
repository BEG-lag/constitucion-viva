/** Rankings: most amended articles, reforms by period, by decade, heatmap and close-ups. */
import { scaleBand, scaleLinear } from 'd3-scale';
import type { Ctx } from '../context.ts';
import { fyear } from '../data.ts';
import { dofDate, fmt, onLang, t } from '../i18n.ts';
import { clear, contentWidth, dataTable, esc, h, hideTip, LAST_YEAR, onWidth, s, showTip, yearColor } from '../ui.ts';

type Metric = 'decrees' | 'reforms' | 'rate';
type Grouping = 'president' | 'legislature';

export function initRanking(ctx: Ctx): void {
  const { c } = ctx;
  const root = document.getElementById('ranking-root')!;
  const lede = document.getElementById('ranking-lede')!;
  const grid = h('div', { class: 'rank-grid' });
  root.append(grid);
  const now = fyear(c.asOf);

  // ---------- 1. most amended
  const topPanel = h('div', { class: 'panel' });
  const top = [...c.articles].sort((a, b) => b.reforms.length - a.reforms.length || Number(a.id) - Number(b.id)).slice(0, 15);
  const renderTop = () => {
    clear(topPanel);
    topPanel.append(h('h3', { text: t('top.title') }), h('p', { class: 'sub', text: t('top.sub') }));
    const list = h('ul', { class: 'top-list' });
    for (const a of top) {
      const svg = s('svg', { viewBox: '0 0 300 18', preserveAspectRatio: 'none', 'aria-hidden': 'true' });
      svg.append(s('line', { x1: 0, x2: 300, y1: 9, y2: 9, stroke: 'rgba(236,238,230,0.12)' }));
      for (const n of a.reforms) {
        const yr = fyear(ctx.decree(n).date);
        const xx = ((yr - 1917) / (LAST_YEAR + 1 - 1917)) * 300;
        svg.append(s('rect', { x: xx - 0.9, y: 2, width: 1.8, height: 14, fill: yearColor(yr) }));
      }
      const btn = h('button', { type: 'button', class: 'top-row', 'aria-label': t('top.row', { id: a.id, n: a.reforms.length }) },
        h('span', { class: 'id', text: `Art. ${a.id}` }),
        h('span', { class: 'n', text: fmt(a.reforms.length) }),
        svg as unknown as Node,
      );
      btn.addEventListener('click', () => ctx.openArticle(a.id, btn));
      list.append(h('li', {}, btn));
    }
    const axis = h('div', { class: 'tm-years', style: 'margin-left:132px;margin-top:4px', 'aria-hidden': 'true' }, h('span', { text: '1917' }), h('span', { text: '1971' }), h('span', { text: c.asOf.slice(0, 4) }));
    topPanel.append(list, axis);
  };

  // ---------- 2. by period
  const byPanel = h('div', { class: 'panel bars' });
  let grouping: Grouping = 'president';
  let metric: Metric = 'decrees';
  const chartBox = h('div');
  const renderBy = () => {
    clear(byPanel);
    const toggles = h('div', { class: 'toggle-row', role: 'group', 'aria-label': t('by.title') });
    const mk = (label: string, pressed: boolean, fn: () => void) => {
      const b = h('button', { type: 'button', class: 'chip', 'aria-pressed': String(pressed), text: label });
      b.addEventListener('click', fn);
      return b;
    };
    toggles.append(
      mk(t('by.president'), grouping === 'president', () => {
        grouping = 'president';
        renderBy();
      }),
      mk(t('by.legislature'), grouping === 'legislature', () => {
        grouping = 'legislature';
        renderBy();
      }),
      h('span', { class: 'sep', 'aria-hidden': 'true' }),
      mk(t('by.metric.decrees'), metric === 'decrees', () => {
        metric = 'decrees';
        renderBy();
      }),
      mk(t('by.metric.reforms'), metric === 'reforms', () => {
        metric = 'reforms';
        renderBy();
      }),
      mk(t('by.metric.rate'), metric === 'rate', () => {
        metric = 'rate';
        renderBy();
      }),
    );
    byPanel.append(h('h3', { text: t('by.title') }), toggles, chartBox, h('p', { class: 'note', text: grouping === 'president' ? t('by.note.president') : t('by.note.legislature') }));
    drawBy(contentWidth(byPanel));
    byPanel.append(byTable());
  };
  const periods = () =>
    grouping === 'president'
      ? c.presidents.map((p) => ({ id: p.id, label: p.short, sub: `${p.start.slice(0, 4)}–${p.end.slice(0, 4)}`, start: p.start, end: p.end, decrees: p.decrees }))
      : c.legislatures.map((l) => ({ id: l.id, label: l.id, sub: `${l.start.slice(0, 4)}–${l.end.slice(0, 4)}`, start: l.start, end: l.end, decrees: l.decrees }));
  const value = (p: ReturnType<typeof periods>[number]) => {
    if (metric === 'decrees') return p.decrees.length;
    if (metric === 'reforms') return p.decrees.reduce((sum, n) => sum + ctx.decree(n).articles.length, 0);
    const yrs = Math.min(fyear(p.end), now) - fyear(p.start);
    return yrs > 0 ? p.decrees.length / yrs : 0;
  };
  const drawBy = (width: number) => {
    clear(chartBox);
    if (width <= 0) return;
    const rows = periods();
    const rowH = grouping === 'president' ? 22 : 13;
    const labelW = grouping === 'president' ? 118 : 56;
    const height = rows.length * rowH + 8;
    const max = Math.max(...rows.map(value));
    const x = scaleLinear().domain([0, max]).range([0, Math.max(40, width - labelW - 52)]);
    const svg = s('svg', { viewBox: `0 0 ${width} ${height}`, role: 'img', 'aria-label': `${t('by.title')}: ${grouping === 'president' ? t('by.president') : t('by.legislature')}` });
    rows.forEach((p, i) => {
      const v = value(p);
      const y = i * rowH + 4;
      const mid = (fyear(p.start) + Math.min(fyear(p.end), now)) / 2;
      const g = s('g');
      g.append(s('text', { x: labelW - 8, y: y + rowH * 0.68, 'text-anchor': 'end', fill: '#eceee6', 'font-size': grouping === 'president' ? 11.5 : 9.5, text: p.label }));
      g.append(s('rect', { x: labelW, y: y + 2, width: Math.max(1, x(v)), height: rowH - 5, rx: 2, fill: yearColor(mid) }));
      g.append(s('text', { x: labelW + x(v) + 6, y: y + rowH * 0.68, fill: '#969dab', 'font-size': grouping === 'president' ? 11 : 9, text: fmt(v, metric === 'rate' ? 1 : 0) }));
      g.addEventListener('pointerenter', (e) => showTip(`<b>${esc(p.label)}</b> <span class="t-date">${esc(p.sub)}</span><br>${esc(t('by.metric.decrees'))}: ${fmt(p.decrees.length)} · ${esc(t('by.metric.reforms'))}: ${fmt(p.decrees.reduce((sum, n) => sum + ctx.decree(n).articles.length, 0))}`, e.clientX, e.clientY));
      g.addEventListener('pointerleave', hideTip);
      svg.append(g);
    });
    chartBox.append(svg);
  };
  const byTable = () =>
    dataTable(
      [t('table.period'), t('table.decrees'), t('by.metric.reforms'), t('table.rate')],
      periods().map((p) => {
        const yrs = Math.min(fyear(p.end), now) - fyear(p.start);
        return [`${p.label} (${p.sub})`, p.decrees.length, p.decrees.reduce((sum, n) => sum + ctx.decree(n).articles.length, 0), fmt(p.decrees.length / yrs, 2)];
      }),
    );

  // ---------- 3. by decade
  const decadePanel = h('div', { class: 'panel decade wide' });
  const decades = Array.from({ length: 11 }, (_, i) => 1920 + i * 10);
  decades.unshift(1910);
  const perDecade = (fn: (d: (typeof c.decrees)[number]) => number) =>
    decades.map((dec) => c.decrees.filter((d) => Math.floor(Number(d.date.slice(0, 4)) / 10) * 10 === dec).reduce((sum, d) => sum + fn(d), 0));
  const decCounts = perDecade(() => 1);
  const refCounts = perDecade((d) => d.articles.length);
  const renderDecade = () => {
    clear(decadePanel);
    decadePanel.append(h('h3', { text: t('decade.title') }));
    const box = h('div');
    decadePanel.append(box);
    const width = contentWidth(decadePanel);
    if (width > 0) {
      const half = 128;
      const svg = s('svg', { viewBox: `0 0 ${width} ${half * 2 + 40}`, role: 'img', 'aria-label': t('decade.title') });
      const x = scaleBand<number>().domain(decades).range([0, width]).padding(0.22);
      const series: [string, number[], number][] = [
        [t('decade.decrees'), decCounts, 0],
        [t('decade.reforms'), refCounts, half + 22],
      ];
      for (const [label, values, offset] of series) {
        const max = Math.max(...values);
        const y = scaleLinear().domain([0, max]).range([0, half - 34]);
        svg.append(s('text', { x: 0, y: offset + 12, fill: '#969dab', 'font-size': 11, text: label }));
        decades.forEach((dec, i) => {
          const v = values[i] ?? 0;
          const bx = x(dec) ?? 0;
          const bh = y(v);
          svg.append(s('rect', { x: bx, y: offset + half - 14 - bh, width: x.bandwidth(), height: Math.max(v > 0 ? 1 : 0, bh), rx: 2, fill: yearColor(dec + 5) }));
          svg.append(s('text', { x: bx + x.bandwidth() / 2, y: offset + half - 18 - bh, 'text-anchor': 'middle', fill: '#eceee6', 'font-size': 10, text: v > 0 ? fmt(v) : '' }));
          svg.append(s('text', { x: bx + x.bandwidth() / 2, y: offset + half, 'text-anchor': 'middle', fill: '#969dab', 'font-size': 9.5, text: `${String(dec).slice(2)}s` }));
        });
      }
      box.append(svg);
    }
    decadePanel.append(dataTable([t('table.decade'), t('table.decrees'), t('by.metric.reforms')], decades.map((d, i) => [`${d}s`, decCounts[i] ?? 0, refCounts[i] ?? 0])));
  };

  // ---------- 4. heatmap
  const heatPanel = h('div', { class: 'panel heat wide' });
  const heatDecades = decades.slice(1);
  const counts = new Map<string, number[]>();
  for (const a of c.articles) {
    counts.set(a.id, heatDecades.map((dec) => a.reforms.filter((n) => Math.floor(Number(ctx.decree(n).date.slice(0, 4)) / 10) * 10 === dec).length));
  }
  const heatMax = Math.max(...[...counts.values()].flat());
  const renderHeat = () => {
    clear(heatPanel);
    heatPanel.append(h('h3', { text: t('heat.title') }), h('p', { class: 'sub', text: t('heat.sub') }));
    const width = contentWidth(heatPanel);
    if (width > 0) {
      const labelW = 34;
      const cw = (width - labelW) / 136;
      const ch = Math.max(14, Math.min(22, cw * 2.4));
      const height = heatDecades.length * ch + 22;
      const svg = s('svg', { viewBox: `0 0 ${width} ${height}`, role: 'img', 'aria-label': t('heat.title') });
      heatDecades.forEach((dec, r) => {
        svg.append(s('text', { x: labelW - 6, y: r * ch + ch * 0.7, 'text-anchor': 'end', fill: '#969dab', 'font-size': 9.5, text: `${String(dec).slice(2)}s` }));
      });
      c.articles.forEach((a, col) => {
        const vals = counts.get(a.id)!;
        vals.forEach((v, r) => {
          const rect = s('rect', {
            x: labelW + col * cw,
            y: r * ch,
            width: Math.max(0.6, cw - (cw > 4 ? 1 : 0.3)),
            height: ch - 1.5,
            rx: cw > 5 ? 1.5 : 0,
            fill: v === 0 ? '#151922' : yearColor((heatDecades[r] ?? 1920) + 5),
            opacity: v === 0 ? 1 : 0.25 + 0.75 * Math.sqrt(v / heatMax),
          });
          rect.addEventListener('pointerenter', (e) => showTip(esc(t('heat.cell', { id: a.id, decade: heatDecades[r] ?? 0, n: v })), e.clientX, e.clientY));
          rect.addEventListener('pointerleave', hideTip);
          rect.addEventListener('click', () => ctx.openArticle(a.id));
          rect.style.cursor = 'pointer';
          svg.append(rect);
        });
      });
      for (const id of ['1', '27', '41', '73', '89', '107', '123', '136']) {
        const col = Number(id) - 1;
        svg.append(s('text', { x: labelW + col * cw + cw / 2, y: height - 4, 'text-anchor': 'middle', fill: '#969dab', 'font-size': 9.5, text: id }));
      }
      heatPanel.append(svg);
    }
    heatPanel.append(
      dataTable(
        [t('table.article'), ...heatDecades.map((d) => `${d}s`)],
        c.articles.map((a) => [a.id, ...(counts.get(a.id) ?? [])]),
      ),
    );
  };

  // ---------- 5. close-ups
  const deepPanel = h('div', { class: 'panel wide' });
  const renderDeep = () => {
    clear(deepPanel);
    deepPanel.append(h('h3', { text: t('deep.title'), style: 'margin-bottom:16px' }));
    const cards = h('div', { class: 'deep-grid' });
    for (const id of ['73', '27', '123'] as const) {
      const a = ctx.article(id);
      const dates = a.reforms.map((n) => ctx.decree(n).date);
      const svg = s('svg', { viewBox: '0 0 300 70', preserveAspectRatio: 'none', 'aria-hidden': 'true', style: 'width:100%;height:70px;display:block' });
      const xs = (yr: number) => ((yr - 1917) / (LAST_YEAR + 1 - 1917)) * 300;
      let path = `M0,70`;
      dates.forEach((d, i) => {
        const xx = xs(fyear(d));
        const yy = 70 - ((i + 1) / dates.length) * 64;
        const prevY = 70 - (i / dates.length) * 64;
        path += ` L${xx},${prevY} L${xx},${yy}`;
      });
      path += ` L300,6`;
      svg.append(s('path', { d: path, fill: 'none', stroke: '#cfff45', 'stroke-width': 1.6, 'vector-effect': 'non-scaling-stroke' }));
      const btn = h('button', { type: 'button', class: 'btn', text: t('deep.open', { id }) });
      btn.addEventListener('click', () => ctx.openArticle(id, btn));
      cards.append(
        h('div', { class: 'deep-card' },
          h('div', { class: 'big', text: `Art. ${id}` }),
          h('p', { text: t(`deep.${id}`) }),
          h('span', { class: 'stat', text: `${t('deep.stat', { n: a.reforms.length, words: fmt(a.wordsNow) })} · ${dofDate(dates[0] ?? '')} → ${dofDate(dates[dates.length - 1] ?? '')}` }),
          svg as unknown as Node,
          h('div', { style: 'margin-top:12px' }, btn),
        ),
      );
    }
    deepPanel.append(cards);
  };

  grid.append(topPanel, byPanel, decadePanel, heatPanel, deepPanel);

  const renderAll = () => {
    lede.textContent = t('ranking.lede', { reforms: ctx.totalReforms });
    renderTop();
    renderBy();
    renderDecade();
    renderHeat();
    renderDeep();
  };
  renderAll();
  onLang(renderAll);
  let lastW = 0;
  onWidth(grid, (w) => {
    if (Math.abs(w - lastW) < 2) return;
    lastW = w;
    renderBy();
    renderDecade();
    renderHeat();
  });
}
