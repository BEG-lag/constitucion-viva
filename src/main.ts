import '@fontsource/jetbrains-mono/latin-400.css';
import '@fontsource/jetbrains-mono/latin-600.css';
import '@fontsource/jetbrains-mono/latin-700.css';
import '@fontsource/jetbrains-mono/latin-800.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/cormorant-garamond/latin-500-italic.css';
import '@fontsource/cormorant-garamond/latin-600-italic.css';
import './styles.css';

import { makeContext, type Ctx } from './context.ts';
import { load, type Constitution } from './data.ts';
import { applyStatic, getLang, onLang, setLang } from './i18n.ts';
import { soon } from './ui.ts';
import { initArticle } from './sections/article.ts';
import { initHero } from './sections/hero.ts';
import { initMachine } from './sections/machine.ts';
import { initMethod } from './sections/method.ts';
import { initRanking } from './sections/ranking.ts';
import { initStory } from './sections/story.ts';

let ctx: Ctx | null = null;

async function main(): Promise<void> {
  document.documentElement.lang = getLang();
  applyStatic();
  onLang(() => applyStatic());
  document.getElementById('lang-toggle')!.addEventListener('click', () => setLang(getLang() === 'es' ? 'en' : 'es'));

  const openArticle = initArticle(() => ctx);
  const c = await load<Constitution>('constitution.json');
  ctx = makeContext(c, openArticle);

  initHero(ctx);
  initStory(ctx);
  initMachine(ctx);
  initRanking(ctx);
  // Heavier sections load as separate chunks, when idle or when they come near.
  const c2 = ctx;
  soon(document.getElementById('growth-root')!, () => {
    void import('./sections/growth.ts').then((m) => m.initGrowth(c2));
  });
  soon(document.getElementById('web-root')!, () => {
    void import('./sections/web.ts').then((m) => m.initWeb(c2));
  });
  initMethod();

  // Deep links: #art-27 opens the article view.
  const route = () => {
    const m = /^#art-(\d{1,3})$/.exec(location.hash);
    if (m?.[1]) openArticle(m[1]);
  };
  window.addEventListener('hashchange', route);
  route();

  // Mark the section in view in the top navigation.
  const links = [...document.querySelectorAll<HTMLAnchorElement>('.nav a')];
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        for (const a of links) a.setAttribute('aria-current', String(a.getAttribute('href') === `#${e.target.id}`));
      }
    },
    { rootMargin: '-45% 0px -50% 0px' },
  );
  for (const sec of document.querySelectorAll('main > section')) io.observe(sec);
}

void main();
