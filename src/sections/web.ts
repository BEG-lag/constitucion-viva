/** The web of laws: a force-directed citation graph of the 36 laws in leyes-mx. */
import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY, type SimulationLinkDatum, type SimulationNodeDatum } from 'd3-force';
import type { Ctx } from '../context.ts';
import { load, type Graph, type GraphEdge, type GraphNode } from '../data.ts';
import { fmt, onLang, t } from '../i18n.ts';
import { clear, COLORS, dataTable, esc, h, hideTip, onWidth, s, showTip, tipAt } from '../ui.ts';

const GROUP_COLORS: Record<string, string> = {
  constitucion: COLORS.lime,
  energia: COLORS.amber,
  recursos: COLORS.cyan,
  empresa: COLORS.coral,
  intangibles: '#b6a4ff',
  general: '#d9dbd2',
  publico: COLORS.muted,
};

interface N extends SimulationNodeDatum {
  d: GraphNode;
  r: number;
}
interface L extends SimulationLinkDatum<N> {
  e: GraphEdge;
  w: number;
}

const weight = (e: GraphEdge) => Math.max(e.mentions, e.articles);

export function initWeb(ctx: Ctx): void {
  const root = document.getElementById('web-root')!;
  void load<Graph>('graph.json').then((g) => render(ctx, root, g));
}

function render(ctx: Ctx, root: HTMLElement, g: Graph): void {
  const controls = h('div', { class: 'toggle-row', style: 'align-items:center' });
  const figure = h('figure', { class: 'web-figure panel' });
  const panel = h('div', { class: 'panel web-panel' });
  const layout = h('div', { class: 'web-grid' }, figure, panel);
  const stats = h('p', { class: 'note' });
  const constPanel = h('div', { class: 'panel', style: 'margin-top:20px' });
  const tableBox = h('div');
  root.append(controls, layout, stats, constPanel, tableBox);

  const groups = Object.keys(g.groups);
  const active = new Set(groups);
  let minMentions = 1;
  let showConst = true;
  let selected: string | null = null;
  const byId = new Map(g.nodes.map((n) => [n.id, n]));

  // Layout once, on the full graph, so filtering never moves the nodes.
  const nodes: N[] = g.nodes.map((d) => ({ d, r: 4 + Math.sqrt(d.words) / 26 }));
  const nodeById = new Map(nodes.map((n) => [n.d.id, n]));
  const links: L[] = g.edges.map((e) => ({ source: nodeById.get(e.source)!, target: nodeById.get(e.target)!, e, w: weight(e) }));
  const sim = forceSimulation(nodes)
    .force('link', forceLink<N, L>(links).distance((l) => 95 + 50 / Math.sqrt(l.w)).strength((l) => Math.min(0.5, 0.05 + Math.log1p(l.w) * 0.05)))
    .force('charge', forceManyBody<N>().strength(-420))
    .force('collide', forceCollide<N>().radius((n) => n.r + 18))
    .force('x', forceX<N>(0).strength(0.06))
    .force('y', forceY<N>(0).strength(0.09))
    .stop();
  for (let i = 0; i < 400; i++) sim.tick();
  const xs = nodes.map((n) => n.x ?? 0);
  const ys = nodes.map((n) => n.y ?? 0);
  const bounds = { x0: Math.min(...xs) - 40, x1: Math.max(...xs) + 40, y0: Math.min(...ys) - 40, y1: Math.max(...ys) + 40 };

  let svg: SVGSVGElement | null = null;
  const edgeEls = new Map<L, SVGPathElement>();
  const nodeEls = new Map<string, SVGGElement>();

  const visibleEdge = (l: L) => {
    const a = (l.source as N).d;
    const b = (l.target as N).d;
    if (l.w < minMentions) return false;
    if (!showConst && (a.id === 'cpeum' || b.id === 'cpeum')) return false;
    return active.has(a.group) && active.has(b.group);
  };
  const visibleNode = (n: GraphNode) => active.has(n.group) && (showConst || n.id !== 'cpeum');

  const draw = (width: number) => {
    clear(figure);
    edgeEls.clear();
    nodeEls.clear();
    const narrow = width < 600;
    const bw = bounds.x1 - bounds.x0;
    const bh = bounds.y1 - bounds.y0;
    // Portrait on phones: rotate the layout so it uses the height.
    const rotate = narrow && bw > bh;
    const W = rotate ? bh : bw;
    const H = rotate ? bw : bh;
    const px = (n: N) => (rotate ? (n.y ?? 0) - bounds.y0 : (n.x ?? 0) - bounds.x0);
    const py = (n: N) => (rotate ? (n.x ?? 0) - bounds.x0 : (n.y ?? 0) - bounds.y0);
    svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'group', 'aria-label': t('web.chart', { edges: g.edges.length }) });
    const defs = s('defs');
    defs.append(
      Object.assign(s('marker', { id: 'arrow', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 5, markerHeight: 5, orient: 'auto-start-reverse' }), {}),
    );
    defs.querySelector('marker')!.append(s('path', { d: 'M0,1 L9,5 L0,9', fill: 'rgba(236,238,230,0.5)' }));
    svg.append(defs);
    const edgeLayer = s('g');
    const maxW = Math.max(...links.map((l) => l.w));
    for (const l of links) {
      const a = l.source as N;
      const b = l.target as N;
      const x1 = px(a);
      const y1 = py(a);
      const x2 = px(b);
      const y2 = py(b);
      const dx = x2 - x1;
      const dy = y2 - y1;
      const dist = Math.hypot(dx, dy) || 1;
      // shorten to the circle edges, bend to the right so A>B and B>A do not overlap
      const ux = dx / dist;
      const uy = dy / dist;
      const sx = x1 + ux * a.r;
      const sy = y1 + uy * a.r;
      const ex = x2 - ux * (b.r + 3);
      const ey = y2 - uy * (b.r + 3);
      const mx = (sx + ex) / 2 - uy * dist * 0.12;
      const my = (sy + ey) / 2 + ux * dist * 0.12;
      const path = s('path', {
        class: 'edge',
        d: `M${sx},${sy} Q${mx},${my} ${ex},${ey}`,
        stroke: GROUP_COLORS[a.d.group] ?? COLORS.paper,
        'stroke-width': 0.6 + (Math.log1p(l.w) / Math.log1p(maxW)) * 5,
        'marker-end': 'url(#arrow)',
      });
      path.addEventListener('pointerenter', (e) => showTip(esc(t('web.edge', { a: a.d.abbreviation, b: b.d.abbreviation, n: l.e.mentions, k: l.e.articles })), e.clientX, e.clientY));
      path.addEventListener('pointerleave', hideTip);
      edgeEls.set(l, path);
      edgeLayer.append(path);
    }
    svg.append(edgeLayer);
    const nodeLayer = s('g');
    for (const n of nodes) {
      const color = GROUP_COLORS[n.d.group] ?? COLORS.paper;
      const gEl = s('g', { class: 'node', tabindex: 0, role: 'button', transform: `translate(${px(n)},${py(n)})` });
      gEl.setAttribute('aria-label', t('web.node', { name: n.d.title, out: n.d.out, in: n.d.in }));
      gEl.append(
        s('circle', { r: n.r, fill: color, 'fill-opacity': 0.9, stroke: COLORS.ink2, 'stroke-width': 1.5 }),
        s('text', { y: n.r + 13, 'text-anchor': 'middle', text: n.d.abbreviation }),
      );
      const tip = `<b>${esc(n.d.abbreviation)}</b> <span class="t-title">${esc(n.d.title)}</span>`;
      gEl.addEventListener('pointerenter', (e) => {
        showTip(tip, e.clientX, e.clientY);
        highlight(n.d.id);
      });
      gEl.addEventListener('pointerleave', () => {
        hideTip();
        highlight(selected);
      });
      gEl.addEventListener('focus', () => {
        tipAt(gEl, tip);
        highlight(n.d.id);
      });
      gEl.addEventListener('blur', () => {
        hideTip();
        highlight(selected);
      });
      const choose = () => {
        selected = selected === n.d.id ? null : n.d.id;
        renderPanel();
        highlight(selected);
      };
      gEl.addEventListener('click', choose);
      gEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          choose();
        }
      });
      nodeEls.set(n.d.id, gEl);
      nodeLayer.append(gEl);
    }
    svg.append(nodeLayer);
    figure.append(svg);
    highlight(selected);
  };

  const highlight = (focus: string | null) => {
    for (const [l, el] of edgeEls) {
      const a = (l.source as N).d.id;
      const b = (l.target as N).d.id;
      const vis = visibleEdge(l);
      el.style.display = vis ? '' : 'none';
      if (!vis) continue;
      if (focus === null) {
        el.style.opacity = '0.42';
        el.setAttribute('stroke', GROUP_COLORS[(l.source as N).d.group] ?? COLORS.paper);
      } else if (a === focus) {
        el.style.opacity = '0.95';
        el.setAttribute('stroke', COLORS.lime);
      } else if (b === focus) {
        el.style.opacity = '0.95';
        el.setAttribute('stroke', COLORS.cyan);
      } else {
        el.style.opacity = '0.06';
      }
    }
    const neighbours = new Set<string>();
    if (focus) {
      for (const l of links) {
        if (!visibleEdge(l)) continue;
        if ((l.source as N).d.id === focus) neighbours.add((l.target as N).d.id);
        if ((l.target as N).d.id === focus) neighbours.add((l.source as N).d.id);
      }
    }
    for (const [id, el] of nodeEls) {
      const d = byId.get(id)!;
      el.style.display = visibleNode(d) ? '' : 'none';
      el.style.opacity = focus === null || id === focus || neighbours.has(id) ? '1' : '0.25';
    }
  };

  const renderControls = () => {
    clear(controls);
    controls.append(h('span', { class: 'note', style: 'margin:0 6px 0 0', text: `${t('web.groups')}:` }));
    for (const id of groups) {
      const chip = h('button', { type: 'button', class: 'chip', 'aria-pressed': String(active.has(id)) }, h('span', { class: 'dot', style: `background:${GROUP_COLORS[id] ?? COLORS.paper}` }), document.createTextNode(g.groups[id] ?? id));
      chip.addEventListener('click', () => {
        if (active.has(id)) active.delete(id);
        else active.add(id);
        chip.setAttribute('aria-pressed', String(active.has(id)));
        highlight(selected);
      });
      controls.append(chip);
    }
    const rangeLabel = h('span', { text: t('web.min', { n: minMentions }) });
    const range = h('input', { type: 'range', min: 1, max: 20, step: 1, value: minMentions, 'aria-label': t('web.min', { n: minMentions }) });
    range.addEventListener('input', () => {
      minMentions = Number(range.value);
      rangeLabel.textContent = t('web.min', { n: minMentions });
      range.setAttribute('aria-label', t('web.min', { n: minMentions }));
      highlight(selected);
    });
    const check = h('input', { type: 'checkbox', checked: showConst });
    check.addEventListener('change', () => {
      showConst = check.checked;
      if (!showConst && selected === 'cpeum') selected = null;
      highlight(selected);
      renderPanel();
    });
    const reset = h('button', { type: 'button', class: 'btn', text: t('web.reset') });
    reset.addEventListener('click', () => {
      groups.forEach((id) => active.add(id));
      minMentions = 1;
      showConst = true;
      selected = null;
      renderControls();
      renderPanel();
      highlight(null);
    });
    controls.append(h('label', { class: 'range-row' }, rangeLabel, range), h('label', { class: 'check-row' }, check, h('span', { text: t('web.cpeum') })), reset);
  };

  const renderPanel = () => {
    clear(panel);
    if (!selected) {
      panel.append(h('p', { class: 'meta', text: t('web.panel.hint') }));
      const ranked = [...g.nodes].sort((a, b) => b.in - a.in).slice(0, 8);
      panel.append(h('p', { class: 'k', text: t('web.panel.in') }));
      const ul = h('ul');
      for (const n of ranked) ul.append(h('li', {}, h('span', { text: n.abbreviation }), h('span', { text: fmt(n.in) })));
      panel.append(ul);
      return;
    }
    const n = byId.get(selected)!;
    const out = g.edges.filter((e) => e.source === n.id).sort((a, b) => weight(b) - weight(a));
    const inn = g.edges.filter((e) => e.target === n.id).sort((a, b) => weight(b) - weight(a));
    panel.append(
      h('h3', { text: n.abbreviation }),
      h('p', { text: n.title, style: 'font-size:14px;margin:0 0 6px' }),
      h('p', { class: 'meta', text: t('web.panel.meta', { articles: n.articles, words: fmt(n.words) }) }),
      h('p', { class: 'meta', text: t('web.panel.self', { n: n.selfReferences }) }),
    );
    const list = (label: string, edges: GraphEdge[], key: 'source' | 'target') => {
      panel.append(h('p', { class: 'k', text: `${label} (${edges.length})` }));
      const ul = h('ul');
      for (const e of edges.slice(0, 10)) {
        const other = byId.get(e[key])!;
        const topArts = e.top.slice(0, 3).map(([id, c]) => `${id}${c > 1 ? `×${c}` : ''}`).join(', ');
        ul.append(h('li', {}, h('span', { text: `${other.abbreviation}${topArts ? ` · art. ${topArts}` : ''}` }), h('span', { text: fmt(weight(e)) })));
      }
      panel.append(ul);
    };
    list(t('web.panel.out'), out, 'target');
    list(t('web.panel.in'), inn, 'source');
    if (n.id === 'cpeum') {
      const btn = h('button', { type: 'button', class: 'btn', text: t('deep.open', { id: '27' }) });
      btn.addEventListener('click', () => ctx.openArticle('27', btn));
      panel.append(btn);
    }
  };

  const renderConst = () => {
    clear(constPanel);
    constPanel.append(h('h3', { text: t('web.const.title') }));
    const rows = Object.entries(g.constitution)
      .map(([id, by]) => ({ id, n: Object.values(by).reduce((a, b) => a + b, 0), laws: Object.keys(by).length }))
      .sort((a, b) => b.n - a.n || b.laws - a.laws)
      .slice(0, 10);
    const max = rows[0]?.n ?? 1;
    const ul = h('ul', { class: 'top-list', style: 'margin-top:10px' });
    for (const r of rows) {
      const btn = h('button', { type: 'button', class: 'top-row', style: 'grid-template-columns:64px 44px minmax(0,1fr)', 'aria-label': t('web.const.row', { id: r.id, n: r.n, laws: r.laws }) },
        h('span', { class: 'id', text: `Art. ${r.id}` }),
        h('span', { class: 'n', text: fmt(r.n) }),
        h('span', { style: `display:block;height:10px;border-radius:3px;background:var(--lime);opacity:.85;width:${Math.max(4, (r.n / max) * 100)}%` }),
      );
      btn.addEventListener('click', () => ctx.openArticle(r.id, btn));
      ul.append(h('li', {}, btn));
    }
    constPanel.append(ul);
  };

  const renderAll = () => {
    renderControls();
    renderPanel();
    renderConst();
    stats.textContent = t('web.stats', { edges: g.edges.length, mentions: g.stats.mentions, resolved: g.stats.resolved + g.stats.constitutionalResolved, total: g.stats.articleCitations + g.stats.constitutional });
    clear(tableBox);
    tableBox.append(
      dataTable(
        [t('table.source'), t('table.target'), t('table.mentions'), t('table.articleCitations')],
        [...g.edges].sort((a, b) => weight(b) - weight(a)).map((e) => [byId.get(e.source)?.abbreviation ?? e.source, byId.get(e.target)?.abbreviation ?? e.target, e.mentions, e.articles]),
      ),
    );
  };
  renderAll();
  onWidth(figure, draw);
  onLang(() => {
    renderAll();
    if (svg) draw(Math.floor(figure.getBoundingClientRect().width));
  });
}
