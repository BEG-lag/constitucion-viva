/**
 * Writes assets/banner.svg for the README from data/constitution.json: every
 * decree since 1917 as a bar (x: DOF date, height: articles amended, color:
 * year). Animated with CSS; static under prefers-reduced-motion.
 *
 *   node scripts/banner.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { interpolateRgbBasis } from 'd3-interpolate';

const ROOT = resolve(import.meta.dirname, '..');
const c = JSON.parse(readFileSync(join(ROOT, 'data', 'constitution.json'), 'utf8')) as {
  asOf: string;
  decrees: { n: number; date: string; articles: string[] }[];
  articles: { reforms: number[] }[];
};
const ramp = interpolateRgbBasis(['#7fd8ff', '#9be7c4', '#cfff45', '#ffb648', '#ff5d47']);
const fyear = (iso: string) => {
  const [y = 0, m = 1, d = 1] = iso.split('-').map(Number);
  return y + (m - 1) / 12 + (d - 1) / 365;
};
const W = 1200;
const H = 360;
const x0 = 600;
const x1 = 1160;
const base = 292;
const maxK = Math.max(...c.decrees.map((d) => d.articles.length));
const reforms = c.articles.reduce((s, a) => s + a.reforms.length, 0);
const x = (iso: string) => x0 + ((fyear(iso) - 1917) / (fyear(c.asOf) + 0.5 - 1917)) * (x1 - x0);

const bars = c.decrees
  .map((d, i) => {
    const h = 6 + Math.sqrt(Math.max(1, d.articles.length) / maxK) * 200;
    const color = ramp((fyear(d.date) - 1917) / (fyear(c.asOf) + 0.5 - 1917));
    const delay = ((i / c.decrees.length) * 2.6).toFixed(2);
    return `<rect class="b" style="animation-delay:${delay}s" x="${x(d.date).toFixed(1)}" y="${(base - h).toFixed(1)}" width="1.6" height="${h.toFixed(1)}" fill="${color}"/>`;
  })
  .join('');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="t d">
<title id="t">constitución viva</title>
<desc id="d">Every reform decree to the Mexican Constitution since 1917 as a bar: ${c.decrees.length} decrees, ${reforms} article reforms.</desc>
<style>
.b{transform-box:fill-box;transform-origin:bottom;animation:grow .9s cubic-bezier(.2,.7,.1,1) both}
.dot{animation:pulse 2.4s ease-in-out infinite}
@keyframes grow{from{transform:scaleY(0);opacity:0}to{transform:scaleY(1);opacity:1}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
@media (prefers-reduced-motion:reduce){.b,.dot{animation:none}}
text{font-family:'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.serif{font-family:'Cormorant Garamond',Georgia,'Times New Roman',serif;font-style:italic}
</style>
<rect width="${W}" height="${H}" rx="18" fill="#0a0c10"/>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="18" fill="none" stroke="#191d27"/>
<circle class="dot" cx="58" cy="72" r="7" fill="#cfff45"/>
<text x="76" y="80" font-size="24" font-weight="700" fill="#eceee6">constitución <tspan fill="#cfff45" font-weight="400">viva</tspan></text>
<text x="56" y="182" font-size="92" font-weight="800" fill="#cfff45" letter-spacing="-5">${c.decrees.length}</text>
<text x="58" y="216" font-size="17" fill="#eceee6">decretos de reforma · reform decrees</text>
<text class="serif" x="58" y="262" font-size="24" fill="#eceee6">Una constitución que nunca ha dejado de escribirse.</text>
<text x="58" y="312" font-size="13" fill="#969dab">1917–${c.asOf.slice(0, 4)} · ${reforms} reformas a artículos · 136 artículos</text>
<line x1="${x0}" x2="${x1}" y1="${base + 0.5}" y2="${base + 0.5}" stroke="#2a2f3b"/>
${bars}
<text x="${x0}" y="${base + 24}" font-size="12" fill="#969dab">1917</text>
<text x="${x(`1950-01-01`)}" y="${base + 24}" font-size="12" fill="#969dab" text-anchor="middle">1950</text>
<text x="${x(`2000-01-01`)}" y="${base + 24}" font-size="12" fill="#969dab" text-anchor="middle">2000</text>
<text x="${x1}" y="${base + 24}" font-size="12" fill="#969dab" text-anchor="end">${c.asOf.slice(0, 4)}</text>
</svg>
`;
writeFileSync(join(ROOT, 'assets', 'banner.svg'), svg);
console.log(`assets/banner.svg: ${c.decrees.length} decrees, ${(svg.length / 1024).toFixed(1)} KB`);
