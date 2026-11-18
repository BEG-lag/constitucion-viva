/** Small DOM, color and accessibility helpers shared by every section. */
import { interpolateRgbBasis } from 'd3-interpolate';
import { t } from './i18n.ts';

export const COLORS = {
  ink: '#0a0c10',
  ink2: '#11141b',
  ink3: '#191d27',
  paper: '#eceee6',
  lime: '#cfff45',
  amber: '#ffb648',
  coral: '#ff5d47',
  cyan: '#7fd8ff',
  muted: '#969dab',
} as const;

const ramp = interpolateRgbBasis([COLORS.cyan, '#9be7c4', COLORS.lime, COLORS.amber, COLORS.coral]);
export const FIRST_YEAR = 1917;
export const LAST_YEAR = 2026;

/** Color of a moment in time: cyan in 1917, through lime and amber, to coral today. */
export function yearColor(year: number): string {
  return ramp(Math.max(0, Math.min(1, (year - FIRST_YEAR) / (LAST_YEAR + 1 - FIRST_YEAR))));
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

type Attrs = Record<string, string | number | boolean | null | undefined>;

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...children: (Node | string | null | undefined)[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'html') el.innerHTML = String(v);
    else if (k === 'text') el.textContent = String(v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children) if (c !== null && c !== undefined) el.append(c);
  return el;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
export function s<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Attrs = {}): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'text') el.textContent = String(v);
    else el.setAttribute(k, String(v));
  }
  return el;
}

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ESCAPES[c] ?? c);
}

/** One floating tooltip for the whole page. Purely visual: every chart has a text alternative. */
let tip: HTMLElement | null = null;
export function showTip(html: string, x: number, y: number): void {
  tip ??= document.getElementById('tooltip');
  if (!tip) return;
  tip.innerHTML = html;
  tip.hidden = false;
  const r = tip.getBoundingClientRect();
  const vw = document.documentElement.clientWidth;
  let left = x + 14;
  let top = y + 14;
  if (left + r.width > vw - 8) left = Math.max(8, x - r.width - 14);
  if (top + r.height > window.innerHeight - 8) top = Math.max(8, y - r.height - 14);
  tip.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
}
export function hideTip(): void {
  tip ??= document.getElementById('tooltip');
  if (tip) tip.hidden = true;
}
/** Places the tooltip next to an element (keyboard focus). */
export function tipAt(el: Element, html: string): void {
  const r = el.getBoundingClientRect();
  showTip(html, r.left + r.width / 2, r.bottom);
}

/** A collapsible, screen-reader friendly table with the data behind a chart. */
export function dataTable(headers: string[], rows: (string | number)[][], caption?: string): HTMLDetailsElement {
  const table = h('table', { class: 'data-table' });
  if (caption) table.append(h('caption', { text: caption }));
  const thead = h('thead');
  const tr = h('tr');
  for (const head of headers) tr.append(h('th', { scope: 'col', text: head }));
  thead.append(tr);
  const tbody = h('tbody');
  for (const row of rows) {
    const r = h('tr');
    row.forEach((cell, i) => r.append(i === 0 ? h('th', { scope: 'row', text: String(cell) }) : h('td', { text: String(cell) })));
    tbody.append(r);
  }
  table.append(thead, tbody);
  const details = h('details', { class: 'data' }, h('summary', { text: t('table.show') }), h('div', { class: 'table-wrap', tabindex: 0 }, table));
  return details;
}

/** Runs `fn` once, the first time `el` comes near the viewport. */
export function whenNear(el: Element, fn: () => void, margin = '600px'): void {
  if (!('IntersectionObserver' in window)) {
    fn();
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        fn();
      }
    },
    { rootMargin: margin },
  );
  io.observe(el);
}

/**
 * Runs `fn` once: when the browser is idle after the first paint, or earlier
 * if `el` comes near the viewport. Keeps the first load light without leaving
 * sections empty (and jumping) when someone follows an anchor link.
 */
export function soon(el: Element, fn: () => void): void {
  let done = false;
  const run = () => {
    if (done) return;
    done = true;
    fn();
  };
  whenNear(el, run, '1200px');
  if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 2500 });
  else setTimeout(run, 1200);
}

/** Width of an element's content box (without padding). */
export function contentWidth(el: Element): number {
  const cs = getComputedStyle(el);
  return Math.floor(el.getBoundingClientRect().width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight));
}

/** Calls `fn` with the element's content width now and whenever it changes (debounced). */
export function onWidth(el: Element, fn: (width: number) => void): void {
  let last = -1;
  let frame = 0;
  const run = () => {
    const w = contentWidth(el);
    if (w !== last && w > 0) {
      last = w;
      fn(w);
    }
  };
  new ResizeObserver(() => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(run);
  }).observe(el);
  run();
}

export function clear(el: Element): void {
  while (el.firstChild) el.firstChild.remove();
}
