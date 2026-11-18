/**
 * Serves the production build (dist/) under /constitucion-viva/ and checks it
 * in a headless Chrome: no console errors, no horizontal scroll at 375 px,
 * keyboard path (skip link, time machine, article dialog), reduced motion.
 * Then captures the README screenshots and a short video of the time machine.
 *
 *   npm run build && npm run screenshots           checks + screenshots + video
 *   node scripts/screenshots.ts --check            checks only
 *
 * Uses the local Google Chrome through playwright-core (no browser download).
 * Set CHROME_PATH to use another Chromium binary.
 */
import { execFileSync } from 'node:child_process';
import { createServer, type Server } from 'node:http';
import { mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { chromium, type Browser, type Page } from 'playwright-core';

const ROOT = resolve(import.meta.dirname, '..');
const DIST = join(ROOT, 'dist');
const SHOTS = join(ROOT, 'assets', 'screenshots');
const BASE = '/constitucion-viva/';
const CHECK_ONLY = process.argv.includes('--check');

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};

function serve(): Promise<{ server: Server; url: string }> {
  const server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
    if (!path.startsWith(BASE)) {
      res.writeHead(404).end();
      return;
    }
    const rel = path.slice(BASE.length);
    const file = normalize(join(DIST, rel === '' || rel.endsWith('/') ? `${rel}index.html` : rel));
    if (!file.startsWith(DIST)) {
      res.writeHead(403).end();
      return;
    }
    readFile(file).then(
      (body) => res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(body),
      () => res.writeHead(404).end('not found'),
    );
  });
  return new Promise((ok) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      ok({ server, url: `http://127.0.0.1:${port}${BASE}` });
    });
  });
}

async function launch(): Promise<Browser> {
  const executablePath = process.env['CHROME_PATH'];
  return executablePath ? chromium.launch({ executablePath, headless: true }) : chromium.launch({ channel: 'chrome', headless: true });
}

function collectErrors(page: Page, label: string, errors: string[]): void {
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`${label}: ${m.text()}`);
  });
  page.on('pageerror', (e) => errors.push(`${label}: ${e.message}`));
  page.on('requestfailed', (r) => errors.push(`${label}: request failed ${r.url()}`));
}

/** Scrolls through the whole page so lazy sections load, then back to the top. */
async function scrollThrough(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const step = window.innerHeight * 0.8;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo({ top: y, behavior: 'instant' });
      await new Promise((r) => setTimeout(r, 90));
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
  await page.waitForTimeout(400);
}

async function scrollTo(page: Page, selector: string, offset = 0): Promise<void> {
  await page.evaluate(
    ([sel, off]) => {
      const el = document.querySelector(sel);
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 56 + off, behavior: 'instant' });
    },
    [selector, offset] as const,
  );
  await page.waitForTimeout(500);
  // Sections above may have finished rendering and moved the target: aim again.
  await page.evaluate(
    ([sel, off]) => {
      const el = document.querySelector(sel);
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 56 + off, behavior: 'instant' });
    },
    [selector, offset] as const,
  );
  await page.waitForTimeout(500);
}

async function main(): Promise<void> {
  const { server, url } = await serve();
  const browser = await launch();
  const errors: string[] = [];
  const problems: string[] = [];
  if (!CHECK_ONLY) {
    rmSync(SHOTS, { recursive: true, force: true });
    mkdirSync(SHOTS, { recursive: true });
  }

  // ---------- desktop
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
    const page = await ctx.newPage();
    collectErrors(page, 'desktop', errors);
    const t0 = Date.now();
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForSelector('#hero-stats li');
    console.log(`desktop: first content in ${Date.now() - t0} ms`);
    await page.waitForTimeout(3600);
    if (!CHECK_ONLY) await page.screenshot({ path: join(SHOTS, 'hero-desktop.png') });
    await scrollThrough(page);
    // story at the "largest reforms" step
    await scrollTo(page, '[data-step="s4"] .step-card', -260);
    if (!CHECK_ONLY) await page.screenshot({ path: join(SHOTS, 'story-desktop.png') });
    // time machine: let the autoplay run, then jump to the end
    await scrollTo(page, '#maquina .tm-top', -24);
    await page.waitForTimeout(2500);
    await page.evaluate(() => {
      const r = document.querySelector<HTMLInputElement>('.tm-range')!;
      r.value = String(Math.round(Number(r.max) * 0.86));
      r.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForTimeout(500);
    if (!CHECK_ONLY) await page.screenshot({ path: join(SHOTS, 'time-machine-desktop.png') });
    await scrollTo(page, '#ranking-root', -40);
    if (!CHECK_ONLY) await page.screenshot({ path: join(SHOTS, 'ranking-desktop.png') });
    await scrollTo(page, '#growth-root', -150);
    if (!CHECK_ONLY) await page.screenshot({ path: join(SHOTS, 'growth-desktop.png') });
    await scrollTo(page, '#web-root', -40);
    await page.waitForSelector('.web-figure svg');
    await page.locator('.web-figure .node').first().click();
    await page.waitForTimeout(300);
    if (!CHECK_ONLY) await page.screenshot({ path: join(SHOTS, 'web-desktop.png') });
    // article view with a word-level diff
    await page.goto(`${url}#art-27`, { waitUntil: 'load' });
    await page.waitForSelector('.article-dialog[open] .diff');
    await page.locator('.article-dialog .versions .chip', { hasText: '15-11-2024' }).click();
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      const d = document.querySelector('.article-dialog')!;
      const sec = d.querySelectorAll('.art-section');
      const last = sec[sec.length - 2];
      if (last) d.scrollTop = (last as HTMLElement).offsetTop - 80;
    });
    await page.waitForTimeout(300);
    if (!CHECK_ONLY) await page.screenshot({ path: join(SHOTS, 'article-desktop.png') });
    // English
    await page.goto(`${url}?lang=en`, { waitUntil: 'load' });
    await page.waitForSelector('#hero-stats li');
    const heroEn = await page.textContent('.hero-unit');
    if (heroEn?.trim() !== 'reform decrees') problems.push(`English toggle: hero unit is "${heroEn}"`);
    await ctx.close();
  }

  // ---------- keyboard path
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 }, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    collectErrors(page, 'keyboard', errors);
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForSelector('#hero-stats li');
    await page.keyboard.press('Tab');
    const first = await page.evaluate(() => document.activeElement?.className);
    if (first !== 'skip') problems.push(`keyboard: first Tab lands on "${String(first)}", expected the skip link`);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    // reach the first time machine tile by tabbing
    let found = false;
    for (let i = 0; i < 80; i++) {
      await page.keyboard.press('Tab');
      const cls = await page.evaluate(() => document.activeElement?.className ?? '');
      if (cls.includes('tm-cell')) {
        found = true;
        break;
      }
    }
    if (!found) problems.push('keyboard: could not reach a time machine tile with Tab');
    else {
      const id = await page.evaluate(() => (document.activeElement as HTMLElement).dataset['id']);
      await page.keyboard.press('Enter');
      await page.waitForSelector('.article-dialog[open]');
      const title = await page.textContent('#article-title');
      if (!title?.includes(String(id))) problems.push(`keyboard: Enter on tile ${id} opened "${title}"`);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
      const back = await page.evaluate(() => (document.activeElement as HTMLElement).dataset['id']);
      if (back !== id) problems.push(`keyboard: focus did not return to tile ${id} after closing (got ${back})`);
    }
    // the slider moves with the arrow keys
    await page.focus('.tm-range');
    const before = await page.inputValue('.tm-range');
    await page.keyboard.press('ArrowLeft');
    const after = await page.inputValue('.tm-range');
    if (before === after) problems.push('keyboard: ArrowLeft did not move the time machine slider');
    // every chart has a text alternative
    const tables = await page.evaluate(() => document.querySelectorAll('details.data table').length);
    if (tables < 4) problems.push(`a11y: expected data tables for the charts, found ${tables}`);
    await ctx.close();
  }

  // ---------- mobile
  {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    collectErrors(page, 'mobile', errors);
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForSelector('#hero-stats li');
    await page.waitForTimeout(3600);
    if (!CHECK_ONLY) await page.screenshot({ path: join(SHOTS, 'hero-mobile.png') });
    await scrollThrough(page);
    const overflow = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: window.innerWidth }));
    if (overflow.sw > overflow.w) problems.push(`mobile: horizontal scroll (${overflow.sw} > ${overflow.w})`);
    const wide = await page.evaluate(() =>
      [...document.querySelectorAll('body *')]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.right > window.innerWidth + 1 && !el.closest('.table-wrap, .hero-canvas');
        })
        .slice(0, 5)
        .map((el) => `${el.tagName.toLowerCase()} in #${el.closest('section')?.id ?? '?'} "${el.textContent.slice(0, 40)}" right=${Math.round(el.getBoundingClientRect().right)}`),
    );
    if (wide.length) problems.push(`mobile: elements wider than the viewport: ${wide.join(', ')}`);
    await scrollTo(page, '#maquina .tm-top', -16);
    await page.evaluate(() => {
      const r = document.querySelector<HTMLInputElement>('.tm-range')!;
      r.value = String(Math.round(Number(r.max) * 0.62));
      r.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForTimeout(600);
    if (!CHECK_ONLY) await page.screenshot({ path: join(SHOTS, 'time-machine-mobile.png') });
    await scrollTo(page, '[data-step="s5"] .step-card', -380);
    if (!CHECK_ONLY) await page.screenshot({ path: join(SHOTS, 'story-mobile.png') });
    await scrollTo(page, '.web-figure', -12);
    await page.waitForSelector('.web-figure svg');
    if (!CHECK_ONLY) await page.screenshot({ path: join(SHOTS, 'web-mobile.png') });
    await page.goto(`${url}#art-123`, { waitUntil: 'load' });
    await page.waitForSelector('.article-dialog[open] .diff');
    if (!CHECK_ONLY) await page.screenshot({ path: join(SHOTS, 'article-mobile.png') });
    await ctx.close();
  }

  // ---------- video of the time machine
  if (!CHECK_ONLY) {
    const dir = join(ROOT, '.cache', 'video');
    rmSync(dir, { recursive: true, force: true });
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 760 }, recordVideo: { dir, size: { width: 1280, height: 760 } } });
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForSelector('#hero-stats li');
    await page.evaluate(() => {
      const el = document.querySelector('#maquina .tm-top')!;
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 64, behavior: 'instant' });
    });
    await page.waitForTimeout(24000);
    await ctx.close();
    const webm = readdirSync(dir).find((f) => f.endsWith('.webm'));
    if (webm) {
      const out = join(ROOT, 'assets', 'time-machine.webm');
      renameSync(join(dir, webm), out);
      try {
        execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', '0.6', '-i', out, '-vf', 'fps=8,scale=720:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=64:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle', join(ROOT, 'assets', 'time-machine.gif')]);
        execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', out, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '28', '-movflags', '+faststart', join(ROOT, 'assets', 'time-machine.mp4')]);
      } catch (e) {
        console.warn(`ffmpeg not available or failed: ${(e as Error).message}`);
      }
    }
  }

  await browser.close();
  server.close();
  if (errors.length) problems.push(...errors.map((e) => `console: ${e}`));
  if (problems.length) {
    console.error(`${problems.length} problem(s):\n${problems.join('\n')}`);
    process.exit(1);
  }
  console.log(CHECK_ONLY ? 'All checks passed.' : `All checks passed. Screenshots in ${SHOTS}`);
}

await main();
