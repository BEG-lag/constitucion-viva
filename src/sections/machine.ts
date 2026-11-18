/**
 * Time machine: a month-by-month scrubber from February 1917 to the latest
 * decree, and a grid of the 136 articles that light up as decrees amend them.
 */
import type { Ctx } from '../context.ts';
import { fyear } from '../data.ts';
import { fmt, getLang, longDate, monthYear, onLang, t } from '../i18n.ts';
import { clear, dataTable, esc, h, hideTip, onWidth, prefersReducedMotion, s, showTip, tipAt, yearColor } from '../ui.ts';

const START = { y: 1917, m: 2 };

function monthIndex(iso: string): number {
  const [y = 0, m = 1] = iso.split('-').map(Number);
  return (y - START.y) * 12 + (m - START.m);
}

function monthIso(i: number): string {
  const total = START.m - 1 + i;
  const y = START.y + Math.floor(total / 12);
  const m = (total % 12) + 1;
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
}

function rgba(hex: string, a: number): string {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (m) return `rgba(${parseInt(m[1]!, 16)},${parseInt(m[2]!, 16)},${parseInt(m[3]!, 16)},${a})`;
  const r = /rgb\((\d+),\s*(\d+),\s*(\d+)\)/.exec(hex);
  return r ? `rgba(${r[1]},${r[2]},${r[3]},${a})` : hex;
}

export function initMachine(ctx: Ctx): void {
  const { c } = ctx;
  const root = document.getElementById('machine-root')!;
  const maxIndex = monthIndex(c.asOf);
  const byArticle = new Map(c.articles.map((a) => [a.id, a.reforms.map((n) => ctx.decree(n).date)]));
  const maxCount = Math.max(...c.articles.map((a) => a.reforms.length));
  const decreeMonths = c.decrees.map((d) => ({ n: d.n, i: monthIndex(d.date) }));
  let index = maxIndex;
  let playing = false;
  let timer = 0;

  // ---- layout
  const dateEl = h('div', { class: 'tm-date', 'aria-hidden': 'true' });
  const status = h('p', { class: 'tm-status', 'aria-live': 'polite' });
  const top = h('div', { class: 'tm-top' }, dateEl, status);
  const play = h('button', { type: 'button', class: 'btn primary icon', 'aria-pressed': 'false' });
  const prev = h('button', { type: 'button', class: 'btn icon', html: '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M9 2 4 7l5 5" stroke="currentColor" stroke-width="1.8" fill="none"/></svg>' });
  const next = h('button', { type: 'button', class: 'btn icon', html: '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="m5 2 5 5-5 5" stroke="currentColor" stroke-width="1.8" fill="none"/></svg>' });
  const spark = h('div', { class: 'tm-spark-wrap' });
  const range = h('input', { type: 'range', class: 'tm-range', min: 0, max: maxIndex, step: 1, value: index });
  const years = h('div', { class: 'tm-years abs', 'aria-hidden': 'true' });
  for (const yr of [1920, 1940, 1960, 1980, 2000, 2020]) {
    years.append(h('span', { style: `left:calc(9px + (100% - 18px) * ${monthIndex(`${yr}-01-01`) / maxIndex})`, text: String(yr) }));
  }
  const track = h('div', { class: 'tm-track' }, spark, range, years);
  const controls = h('div', { class: 'tm-controls' }, play, prev, next, track);
  const grid = h('div', { class: 'tm-grid', role: 'group' });
  const latest = h('div', { class: 'tm-latest panel' });
  const legend = h('div', { class: 'legend panel' });
  const side = h('div', { class: 'tm-side' }, latest, legend);
  const body = h('div', { class: 'tm-body' }, grid, side);
  root.append(top, controls, body);

  const cells = c.articles.map((a) => {
    const cell = h('button', { type: 'button', class: 'tm-cell', 'data-id': a.id }, h('span', { class: 'num', text: a.id }), h('span', { class: 'bar' }));
    cell.addEventListener('click', () => ctx.openArticle(a.id, cell));
    const tip = () => {
      const iso = monthIso(index);
      const dates = (byArticle.get(a.id) ?? []).filter((d) => d <= iso);
      const lastDate = dates[dates.length - 1];
      return `<b>Art. ${esc(a.id)}</b> · ${esc(fmt(dates.length))} ${esc(t('table.reforms').toLowerCase())}${lastDate ? ` <span class="t-date">· ${esc(longDate(lastDate))}</span>` : ''}<span class="t-title">${esc([a.titulo, a.capitulo].filter(Boolean).join(' · '))}</span>`;
    };
    cell.addEventListener('pointerenter', (e) => showTip(tip(), e.clientX, e.clientY));
    cell.addEventListener('pointermove', (e) => showTip(tip(), e.clientX, e.clientY));
    cell.addEventListener('pointerleave', hideTip);
    cell.addEventListener('focus', () => tipAt(cell, tip()));
    cell.addEventListener('blur', hideTip);
    grid.append(cell);
    return { a, cell, bar: cell.querySelector<HTMLElement>('.bar')! };
  });

  // ---- sparkline: decrees per year, with key moments
  let cursor: SVGLineElement | null = null;
  let sparkWidth = 0;
  const drawSpark = (width: number) => {
    sparkWidth = width;
    clear(spark);
    const height = 54;
    const svg = s('svg', { class: 'tm-spark', viewBox: `0 0 ${width} ${height}`, 'aria-hidden': 'true' });
    const per = new Map<number, number>();
    for (const d of c.decrees) per.set(Number(d.date.slice(0, 4)), (per.get(Number(d.date.slice(0, 4))) ?? 0) + 1);
    const maxPer = Math.max(...per.values());
    const xOf = (i: number) => 9 + (i / maxIndex) * (width - 18);
    const bw = Math.max(1, (width - 18) / (maxIndex / 12) - 1);
    for (const [y, n] of per) {
      const xx = xOf(monthIndex(`${y}-01-01`));
      const bh = (n / maxPer) * (height - 16);
      svg.append(s('rect', { x: xx, y: height - bh, width: bw, height: bh, fill: yearColor(y), opacity: 0.75, rx: 1 }));
    }
    for (const k of c.keyMoments) {
      const d = ctx.decree(k.n);
      const xx = xOf(monthIndex(d.date));
      svg.append(s('circle', { cx: xx, cy: 4, r: k.priority === 1 ? 2.6 : 1.8, fill: '#eceee6', opacity: k.priority === 1 ? 0.95 : 0.55 }));
    }
    cursor = s('line', { y1: 0, y2: height, stroke: '#cfff45', 'stroke-width': 1.5 });
    svg.append(cursor);
    spark.append(svg);
    updateCursor();
  };
  const updateCursor = () => {
    if (!cursor || !sparkWidth) return;
    const xx = 9 + (index / maxIndex) * (sparkWidth - 18);
    cursor.setAttribute('x1', String(xx));
    cursor.setAttribute('x2', String(xx));
  };

  // ---- legend
  const renderLegend = () => {
    const stops = Array.from({ length: 11 }, (_, i) => yearColor(1917 + (i / 10) * 110)).join(',');
    legend.replaceChildren(
      h('div', { text: t('machine.legend.color') }),
      h('div', { class: 'legend-ramp', style: `background:linear-gradient(90deg,${stops})` }),
      h('div', { class: 'legend-years' }, h('span', { text: '1917' }), h('span', { text: '1970' }), h('span', { text: c.asOf.slice(0, 4) })),
      h('div', { text: t('machine.legend.count') }),
      h('div', {}, h('span', { class: 'legend-swatch' }), document.createTextNode(t('machine.legend.none'))),
    );
  };

  // ---- update
  const update = (flashFrom: number | null) => {
    const iso = monthIso(index);
    const fromIso = flashFrom === null ? null : monthIso(flashFrom);
    dateEl.textContent = monthYear(iso);
    let decrees = 0;
    for (const d of decreeMonths) if (d.i <= index) decrees++;
    let reforms = 0;
    let touched = 0;
    const flash = new Set<string>();
    if (fromIso !== null && flashFrom !== null && index > flashFrom && index - flashFrom <= 36) {
      for (const d of c.decrees) if (d.date > fromIso && d.date <= iso) for (const a of d.articles) flash.add(a);
    }
    for (const { a, cell, bar } of cells) {
      const dates = (byArticle.get(a.id) ?? []).filter((d) => d <= iso);
      const n = dates.length;
      reforms += n;
      if (n > 0) touched++;
      if (n === 0) {
        cell.style.backgroundColor = '';
        cell.style.color = '';
        bar.style.width = '0%';
        cell.setAttribute('aria-label', t('machine.cell.none', { id: a.id, date: longDate(iso) }));
      } else {
        const last = dates[n - 1]!;
        const col = yearColor(fyear(last));
        const alpha = 0.5 + 0.5 * Math.sqrt(n / maxCount);
        cell.style.backgroundColor = rgba(col, alpha);
        cell.style.color = '#0a0c10';
        bar.style.width = `${Math.max(8, Math.sqrt(n / maxCount) * 100)}%`;
        cell.setAttribute('aria-label', t('machine.cell', { id: a.id, count: n, date: longDate(iso) }));
      }
      if (flash.has(a.id) && !prefersReducedMotion()) {
        cell.classList.remove('flash');
        cell.getBoundingClientRect(); // restart the animation
        cell.classList.add('flash');
      }
    }
    status.innerHTML = t('machine.status', { decrees, reforms, touched });
    range.value = String(index);
    range.setAttribute('aria-valuetext', `${monthYear(iso)}: ${t('machine.status', { decrees, reforms, touched }).replace(/<[^>]+>/g, '')}`);
    updateCursor();
    // latest decree
    const last = [...c.decrees].reverse().find((d) => d.date <= iso);
    if (!last) {
      latest.replaceChildren(h('p', { class: 'label', text: t('machine.latest') }), h('p', { class: 'moment', text: '1917' }), h('p', { class: 'title', text: t('machine.none') }));
    } else {
      const moment = [...c.keyMoments].reverse().find((k) => k.n <= last.n && ctx.decree(k.n).date > monthIso(Math.max(0, index - 30)));
      const k = last.articles.length;
      const touches = k === 0 ? t('machine.touches0') : k === 1 ? t('machine.touches1') : t('machine.touches', { n: k });
      latest.replaceChildren(
        h('p', { class: 'label', text: t('machine.latest') }),
        moment ? h('p', { class: 'moment', text: moment[getLang()] }) : h('p', { class: 'moment', text: longDate(last.date) }),
        h('p', { class: 'title', text: last.title }),
        h('p', { class: 'meta', text: `${t('tooltip.decree', { n: last.n })} · ${longDate(last.date)} · ${touches} · ${ctx.president(last.president).short}` }),
      );
    }
  };

  const setIndex = (i: number, flash = true) => {
    const prevIndex = index;
    index = Math.max(0, Math.min(maxIndex, i));
    update(flash ? prevIndex : null);
  };

  const renderPlay = () => {
    play.innerHTML = playing
      ? '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><rect x="3" y="2" width="3" height="10" fill="currentColor"/><rect x="8" y="2" width="3" height="10" fill="currentColor"/></svg>'
      : '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 1.5v11l9-5.5z" fill="currentColor"/></svg>';
    play.setAttribute('aria-label', playing ? t('machine.pause') : t('machine.play'));
    play.setAttribute('aria-pressed', String(playing));
  };
  const stop = () => {
    playing = false;
    window.clearInterval(timer);
    renderPlay();
  };
  const start = () => {
    if (index >= maxIndex) setIndex(0, false);
    playing = true;
    renderPlay();
    const stepMonths = prefersReducedMotion() ? 12 : 2;
    const every = prefersReducedMotion() ? 400 : 34;
    timer = window.setInterval(() => {
      if (index >= maxIndex) {
        stop();
        return;
      }
      setIndex(index + stepMonths);
    }, every);
  };
  play.addEventListener('click', () => (playing ? stop() : start()));
  range.addEventListener('input', () => {
    stop();
    setIndex(Number(range.value));
  });
  const jump = (dir: 1 | -1) => {
    stop();
    const target = dir === 1 ? decreeMonths.find((d) => d.i > index) : [...decreeMonths].reverse().find((d) => d.i < index);
    if (target) setIndex(target.i);
  };
  prev.addEventListener('click', () => jump(-1));
  next.addEventListener('click', () => jump(1));

  const renderLabels = () => {
    prev.setAttribute('aria-label', t('machine.prev'));
    next.setAttribute('aria-label', t('machine.next'));
    range.setAttribute('aria-label', t('machine.slider'));
    grid.setAttribute('aria-label', t('machine.titulos'));
    renderPlay();
    renderLegend();
    update(null);
  };
  renderLabels();
  onLang(renderLabels);
  onWidth(track, drawSpark);

  // Text alternative: every article with its reform count and dates.
  const table = () =>
    dataTable(
      [t('table.article'), t('table.reforms'), t('table.date')],
      c.articles.map((a) => [a.id, a.reforms.length, a.reforms.map((n) => ctx.decree(n).date).join(', ')]),
    );
  let tbl = table();
  root.append(tbl);
  onLang(() => {
    const nextTbl = table();
    tbl.replaceWith(nextTbl);
    tbl = nextTbl;
  });

  // Play once from 1917 the first time the grid is well in view.
  if (!prefersReducedMotion() && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          setIndex(0, false);
          start();
        }
      },
      { threshold: 0.45 },
    );
    io.observe(grid);
  }
}
