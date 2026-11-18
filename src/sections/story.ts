/**
 * Scrollytelling: a sticky swarm of the 285 decrees (x: date, size: number of
 * articles touched) that changes emphasis as the reader scrolls the steps.
 */
import { scaleLinear } from 'd3-scale';
import type { Ctx } from '../context.ts';
import { fyear } from '../data.ts';
import { fmt, getLang, longDate, onLang, t } from '../i18n.ts';
import { clear, dataTable, esc, h, hideTip, onWidth, s, showTip, yearColor } from '../ui.ts';

interface Placed {
  n: number;
  x: number;
  y: number;
  r: number;
  k: number;
  date: string;
}

/** Dodge: stack circles upward from the baseline without overlap, in date order. */
function dodge(items: { n: number; x: number; r: number; k: number; date: string }[], pad: number): Placed[] {
  const placed: Placed[] = [];
  for (const it of items) {
    const near = placed.filter((p) => Math.abs(p.x - it.x) < p.r + it.r + pad);
    const candidates = [it.r];
    for (const p of near) {
      const dx = it.x - p.x;
      const dist = p.r + it.r + pad;
      const dy = Math.sqrt(Math.max(0, dist * dist - dx * dx));
      candidates.push(p.y + dy);
    }
    candidates.sort((a, b) => a - b);
    let y = it.r;
    for (const cy of candidates) {
      if (cy < it.r) continue;
      if (near.every((p) => (p.x - it.x) ** 2 + (p.y - cy) ** 2 >= (p.r + it.r + pad) ** 2 - 0.01)) {
        y = cy;
        break;
      }
    }
    placed.push({ ...it, y });
  }
  return placed;
}

export function initStory(ctx: Ctx): void {
  const { c } = ctx;
  const chart = document.getElementById('story-chart')!;
  const stepsRoot = document.getElementById('story-steps')!;
  const caption = document.getElementById('story-caption')!;

  // Numbers for the text, all from the data.
  const sorted = [...c.decrees].sort((a, b) => a.date.localeCompare(b.date));
  const median = sorted[Math.floor(sorted.length / 2)]!;
  const start = fyear('1917-02-05');
  const now = fyear(c.asOf);
  const big = [...c.decrees].sort((a, b) => b.articles.length - a.articles.length || a.n - b.n).slice(0, 5);
  const biggest = big[0]!;
  const current = c.presidents[c.presidents.length - 1]!;
  const rate = (p: (typeof c.presidents)[number]) => p.decrees.length / (Math.min(fyear(p.end), now) - fyear(p.start));
  const currentRate = rate(current);
  const isMax = c.presidents.every((p) => p === current || rate(p) < currentRate);
  const words1917 = c.articles.reduce((a, x) => a + (x.words1917 ?? 0), 0);
  const first = ctx.decree(1);
  const n73 = ctx.article('73').reforms.length;

  type Step = { key: string; title: () => string; body: () => string };
  const num = (v: string | number) => `<span class="num">${typeof v === 'number' ? fmt(v) : esc(v)}</span>`;
  const steps: Step[] = [
    { key: 's1', title: () => t('s1.title'), body: () => t('s1.body', { words: num(fmt(Math.round(words1917 / 100) * 100)) }) },
    { key: 's2', title: () => t('s2.title'), body: () => t('s2.body', { date: longDate(first.date), n73: num(n73) }) },
    {
      key: 's3',
      title: () => t('s3.title', { late: Math.round(now - fyear(median.date)) }),
      body: () =>
        t('s3.body', {
          total: num(c.decrees.length),
          early: num(Math.round(fyear(median.date) - start)),
          median: longDate(median.date),
          late: num(Math.round(now - fyear(median.date))),
        }),
    },
    {
      key: 's4',
      title: () => t('s4.title'),
      body: () => t('s4.body', { count: num(big.length), min: num(big[big.length - 1]!.articles.length), date: longDate(biggest.date), max: num(biggest.articles.length) }),
    },
    {
      key: 's5',
      title: () => t('s5.title'),
      body: () =>
        t(isMax ? 's5.body' : 's5.bodyNotMax', {
          start: longDate(current.start),
          n: num(current.decrees.length),
          years: fmt(now - fyear(current.start), 1),
          rate: num(fmt(currentRate, 1)),
        }),
    },
    { key: 's6', title: () => t('s6.title'), body: () => t('s6.body') },
  ];

  const stepEls = steps.map((st) => {
    const el = h('div', { class: 'step', 'data-step': st.key }, h('div', { class: 'step-card' }, h('h3'), h('p')));
    stepsRoot.append(el);
    return el;
  });
  const renderSteps = () => {
    steps.forEach((st, i) => {
      const el = stepEls[i]!;
      el.querySelector('h3')!.textContent = st.title();
      el.querySelector('p')!.innerHTML = st.body();
    });
    caption.textContent = t('story.chart', { n: c.decrees.length, year: c.asOf.slice(0, 4) });
  };

  let active = 0;
  let svg: SVGSVGElement | null = null;
  let placed: Placed[] = [];
  let x = scaleLinear();

  const draw = (width: number) => {
    clear(chart);
    const height = Math.max(260, chart.getBoundingClientRect().height || 420);
    const m = { top: 28, right: 14, bottom: 30, left: 14 };
    x = scaleLinear().domain([1917, 2027]).range([m.left, width - m.right]);
    const maxK = Math.max(...c.decrees.map((d) => d.articles.length));
    const avail = height - m.top - m.bottom - 54;
    // Grow the dots until the swarm fills the available height (binary search on the scale).
    const layout = (k: number) =>
      dodge(
        sorted.map((d) => ({ n: d.n, x: x(fyear(d.date)), r: Math.max(1.6, Math.sqrt(Math.max(d.articles.length, 1) / maxK) * k), k: d.articles.length, date: d.date })),
        width < 520 ? 0.6 : 1,
      );
    let lo = 6;
    let hi = 40;
    placed = layout(lo);
    for (let i = 0; i < 9; i++) {
      const mid = (lo + hi) / 2;
      const trial = layout(mid);
      if (Math.max(...trial.map((p) => p.y + p.r)) <= avail) {
        lo = mid;
        placed = trial;
      } else hi = mid;
    }
    const maxY = Math.max(...placed.map((p) => p.y + p.r));
    const squash = maxY > avail ? avail / maxY : 1;
    svg = s('svg', { viewBox: `0 0 ${width} ${height}`, role: 'img', 'aria-labelledby': 'story-caption' });
    const base = height - m.bottom;
    const axis = s('g', { class: 'axis' });
    for (let yr = 1920; yr <= 2020; yr += width < 520 ? 20 : 10) {
      axis.append(s('line', { x1: x(yr), x2: x(yr), y1: m.top, y2: base, class: 'gridline' }));
      axis.append(s('text', { x: x(yr), y: base + 18, 'text-anchor': 'middle', text: yr }));
    }
    axis.append(s('line', { x1: m.left, x2: width - m.right, y1: base + 0.5, y2: base + 0.5, stroke: 'rgba(236,238,230,0.25)' }));
    svg.append(axis);
    // Overlays (median line, current term band, 1917 marker), toggled per step.
    const overlay = s('g', { class: 'overlays' });
    const medX = x(fyear(median.date));
    overlay.append(
      s('line', { class: 'ov ov-s3', x1: medX, x2: medX, y1: m.top - 10, y2: base, stroke: '#cfff45', 'stroke-dasharray': '3 4' }),
      s('text', { class: 'ov ov-s3 label', x: medX > width / 2 ? medX - 6 : medX + 6, y: m.top, 'text-anchor': medX > width / 2 ? 'end' : 'start', text: longDate(median.date) }),
    );
    const termX = x(fyear(current.start));
    overlay.append(
      s('rect', { class: 'ov ov-s5', x: termX, y: m.top - 10, width: Math.max(2, x(now) - termX), height: base - m.top + 10, fill: 'rgba(255,93,71,0.12)' }),
      s('text', { class: 'ov ov-s5 label', x: termX - 6, y: m.top, 'text-anchor': 'end', text: current.short }),
    );
    const x17 = x(1917.1);
    overlay.append(
      s('line', { class: 'ov ov-s1', x1: x17, x2: x17, y1: m.top - 10, y2: base, stroke: '#7fd8ff' }),
      s('text', { class: 'ov ov-s1 label', x: x17 + 8, y: m.top + 8, text: '1917 · 136' }),
    );
    svg.append(overlay);
    const dots = s('g', { class: 'dots' });
    for (const p of placed) {
      const d = ctx.decree(p.n);
      const circle = s('circle', {
        class: 'dot',
        cx: p.x,
        cy: base - p.y * squash,
        r: p.r * (squash < 1 ? Math.max(0.75, squash) : 1),
        fill: yearColor(fyear(p.date)),
        'data-n': p.n,
      });
      circle.addEventListener('pointerenter', (e) => {
        showTip(tipHtml(d.n), e.clientX, e.clientY);
      });
      circle.addEventListener('pointermove', (e) => showTip(tipHtml(d.n), e.clientX, e.clientY));
      circle.addEventListener('pointerleave', hideTip);
      dots.append(circle);
    }
    svg.append(dots);
    const labels = s('g', { class: 'labels' });
    // Labels stacked in the empty upper-left corner, joined to their dots by leader lines.
    const items = big
      .map((d) => ({ d, p: placed.find((q) => q.n === d.n)! }))
      .sort((a, b) => b.p.y - a.p.y);
    const narrowChart = width < 520;
    items.forEach(({ d, p }, i) => {
      const moment = c.keyMoments.find((k) => k.n === d.n);
      const name = moment && !narrowChart ? `${moment[getLang()]} · ` : '';
      const text = `${name}${d.date.slice(0, 4)} · ${d.articles.length} art.`;
      const lx = x(1921);
      const ly = m.top + 12 + i * 19;
      const tw = text.length * 6.6;
      const cy = base - p.y * squash;
      labels.append(
        s('path', { class: 'lab-big', d: `M${lx + tw + 6},${ly - 4} L${p.x - p.r * 0.7},${cy - p.r * 0.7}`, fill: 'none', stroke: 'rgba(236,238,230,0.45)', 'stroke-width': 1 }),
        s('text', { class: 'label lab-big', x: lx, y: ly, text }),
      );
    });
    const first = placed.find((q) => q.n === 1)!;
    labels.append(s('text', { class: 'label lab-first', x: first.x + 10, y: base - first.y * squash - 10, text: `${first.date.slice(0, 4)} · art. 73` }));
    svg.append(labels);
    chart.append(svg);
    apply();
  };

  const tipHtml = (n: number) => {
    const d = ctx.decree(n);
    return `<b>${esc(t('tooltip.decree', { n }))}</b> <span class="t-date">${esc(longDate(d.date))}</span><span class="t-title">${esc(d.title)}</span>`;
  };

  const apply = () => {
    if (!svg) return;
    const key = steps[active]?.key ?? 's1';
    const bigSet = new Set(big.map((d) => d.n));
    for (const el of svg.querySelectorAll<SVGCircleElement>('.dot')) {
      const n = Number(el.dataset['n']);
      const d = ctx.decree(n);
      let op = 1;
      if (key === 's1') op = 0;
      else if (key === 's2') op = n === 1 ? 1 : 0;
      else if (key === 's3') op = 0.9;
      else if (key === 's4') op = bigSet.has(n) ? 1 : 0.14;
      else if (key === 's5') op = d.president === current.id ? 1 : 0.14;
      el.style.opacity = String(op);
      el.style.pointerEvents = op < 0.05 ? 'none' : 'auto';
    }
    for (const el of svg.querySelectorAll<SVGElement>('.ov')) {
      el.style.opacity = el.classList.contains(`ov-${key}`) ? '1' : '0';
    }
    for (const el of svg.querySelectorAll<SVGElement>('.lab-big')) el.style.opacity = key === 's4' ? '1' : '0';
    for (const el of svg.querySelectorAll<SVGElement>('.lab-first')) el.style.opacity = key === 's2' ? '1' : '0';
    stepEls.forEach((el, i) => el.classList.toggle('is-active', i === active));
  };

  // Active step = the one whose card is nearest the middle of the viewport.
  let frame = 0;
  const onScroll = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const mid = window.innerHeight * (window.innerWidth < 860 ? 0.72 : 0.55);
      let best = 0;
      let bestDist = Infinity;
      stepEls.forEach((el, i) => {
        const r = el.querySelector('.step-card')!.getBoundingClientRect();
        const dist = Math.abs(r.top + r.height / 2 - mid);
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      });
      if (best !== active) {
        active = best;
        apply();
      }
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  renderSteps();
  onWidth(chart, draw);
  onLang(() => {
    renderSteps();
    draw(Math.floor(chart.getBoundingClientRect().width));
  });
  onScroll();

  // Text alternative: decrees per year.
  const perYear = new Map<number, number>();
  for (const d of c.decrees) perYear.set(Number(d.date.slice(0, 4)), (perYear.get(Number(d.date.slice(0, 4))) ?? 0) + 1);
  const table = () =>
    dataTable(
      [t('table.year'), t('table.decrees')],
      [...perYear.entries()].sort((a, b) => a[0] - b[0]).map(([y, n]) => [y, n]),
      t('story.axis'),
    );
  const figure = document.getElementById('story-figure')!;
  let tbl = table();
  figure.append(tbl);
  onLang(() => {
    const next = table();
    tbl.replaceWith(next);
    tbl = next;
  });
}
