/**
 * Opening: the count of decrees and, behind it, every article-level reform
 * since 1917 as a dot (x: date, y: article), drawn in chronological order.
 */
import type { Ctx } from '../context.ts';
import { fyear } from '../data.ts';
import { dofDate, fmt, onLang, t } from '../i18n.ts';
import { h, LAST_YEAR, prefersReducedMotion, yearColor } from '../ui.ts';

export function initHero(ctx: Ctx): void {
  const { c } = ctx;
  const canvas = document.querySelector<HTMLCanvasElement>('.hero-canvas')!;
  const number = document.getElementById('hero-number')!;
  const words1917 = c.articles.reduce((s, a) => s + (a.words1917 ?? 0), 0);
  const wordsNow = c.articles.reduce((s, a) => s + a.wordsNow, 0);
  const reformed = c.articles.filter((a) => a.reforms.length > 0).length;
  const years = Math.floor(fyear(c.asOf) - fyear('1917-02-05'));

  const renderText = () => {
    document.getElementById('hero-sub')!.textContent = t('hero.sub', { reforms: ctx.totalReforms, years });
    const stats = document.getElementById('hero-stats')!;
    stats.replaceChildren(
      h('li', { html: t('hero.stat.reformed', { n: reformed }) }),
      h('li', { html: t('hero.stat.untouched', { n: 136 - reformed }) }),
      h('li', { html: t('hero.stat.words', { now: fmt(wordsNow), then: fmt(Math.round(words1917 / 100) * 100) }) }),
    );
    document.getElementById('hero-asof')!.textContent = t('hero.asof', { date: dofDate(c.asOf) });
    document.getElementById('hero-canvas-desc')!.textContent = t('hero.canvas', { reforms: ctx.totalReforms, year: c.asOf.slice(0, 4) });
    number.textContent = fmt(c.decrees.length);
  };
  renderText();
  onLang(renderText);

  // Count up once.
  const total = c.decrees.length;
  if (!prefersReducedMotion()) {
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 1600);
      const eased = 1 - Math.pow(1 - p, 3);
      number.textContent = fmt(Math.round(total * eased));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // Dots.
  const points = ctx.reforms.map((r) => ({ x: r.year, y: Number(r.id), color: yearColor(r.year) }));
  let progress = prefersReducedMotion() ? 1 : 0;
  const draw = () => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth;
    const hgt = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(hgt * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(hgt * dpr);
    }
    const g = canvas.getContext('2d');
    if (!g) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, hgt);
    const narrow = w < 700;
    const left = narrow ? 16 : w * 0.06;
    const right = w - (narrow ? 16 : 40);
    const top = 70;
    const bottom = hgt - 46;
    const x = (yr: number) => left + ((yr - 1917) / (LAST_YEAR + 1 - 1917)) * (right - left);
    const y = (art: number) => top + ((art - 1) / 135) * (bottom - top);
    // faint decade guides
    g.strokeStyle = 'rgba(236,238,230,0.05)';
    g.lineWidth = 1;
    g.font = '10px "JetBrains Mono", monospace';
    g.fillStyle = 'rgba(150,157,171,0.55)';
    for (let yr = 1920; yr <= 2020; yr += 10) {
      const xx = Math.round(x(yr)) + 0.5;
      g.beginPath();
      g.moveTo(xx, top - 8);
      g.lineTo(xx, bottom + 8);
      g.stroke();
      if (!narrow || yr % 20 === 0) g.fillText(String(yr), xx - 13, bottom + 26);
    }
    const cutoff = 1917 + progress * (LAST_YEAR + 1 - 1917);
    const r = narrow ? 1.6 : 2.1;
    for (const p of points) {
      if (p.x > cutoff) break;
      const fresh = cutoff - p.x < 2.5 && progress < 1;
      g.globalAlpha = fresh ? 1 : 0.82;
      g.fillStyle = p.color;
      g.beginPath();
      g.arc(x(p.x), y(p.y), fresh ? r * 1.9 : r, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
    if (progress < 1) {
      // the sweeping "now" line
      const xx = x(cutoff);
      const grad = g.createLinearGradient(xx - 60, 0, xx, 0);
      grad.addColorStop(0, 'rgba(207,255,69,0)');
      grad.addColorStop(1, 'rgba(207,255,69,0.18)');
      g.fillStyle = grad;
      g.fillRect(xx - 60, top - 8, 60, bottom - top + 16);
    }
  };

  const animate = () => {
    const start = performance.now();
    const step = (now: number) => {
      progress = Math.min(1, (now - start) / 3400);
      progress = 1 - Math.pow(1 - progress, 1.6);
      draw();
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  new ResizeObserver(() => draw()).observe(canvas);
  if (progress < 1) animate();
  else draw();
  // Re-draw once fonts are ready so the year labels use JetBrains Mono.
  void document.fonts.ready.then(draw);
}
