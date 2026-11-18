/** Method, sources (with retrieval dates), checks, limitations, disclaimer and credits. */
import { load, type Graph, type Meta } from '../data.ts';
import { dofDate, fmt, onLang, t } from '../i18n.ts';
import { clear, h, soon } from '../ui.ts';

const SOURCE_LINKS: Record<string, string> = {
  wikipedia: 'https://es.wikipedia.org/wiki/Anexo:Congresos_y_Legislaturas_del_Congreso_de_la_Uni%C3%B3n',
};

export function initMethod(): void {
  const root = document.getElementById('method-root')!;
  const footer = document.getElementById('footer-meta')!;
  soon(root, () => {
    void Promise.all([load<Meta>('meta.json'), load<Graph>('graph.json')]).then(([meta, graph]) => {
      const render = () => {
        clear(root);
        const sources = h('ul', { class: 'source-list' });
        for (const src of meta.sources) {
          const href = SOURCE_LINKS[src.id] ?? src.url;
          sources.append(h('li', {}, h('a', { href, target: '_blank', rel: 'noopener', text: src.name }), h('span', { class: 'when', text: t('method.retrieved', { date: dofDate(src.retrieved) }) })));
        }
        sources.append(
          h('li', {},
            h('a', { href: `${meta.leyesMx.repo}/tree/${meta.leyesMx.commit}`, target: '_blank', rel: 'noopener', text: `leyes-mx (${meta.leyesMx.commit.slice(0, 7)})` }),
            h('span', { class: 'when', text: t('method.retrieved', { date: dofDate(meta.leyesMx.date) }) }),
          ),
        );
        const ck = meta.checks;
        const o = ck.orig1917;
        const checks = h('ul', {},
          h('li', { text: t('method.check.decrees', { n: ck.decreesVsLeyesMx.compared - ck.decreesVsLeyesMx.dateMismatches.length }) }),
          h('li', { text: t('method.check.articles', { parsed: ck.articleReforms.parsed, official: ck.articleReforms.pageSummary?.articles ?? '?' }) }),
          h('li', { text: t('method.check.1917', { n: o.articles, diff: o.absoluteDifference, total: fmt(o.wordsCompared), pct: `${fmt((o.absoluteDifference / o.wordsCompared) * 100, 1)}%` }) }),
          h('li', { text: t('method.check.graph', { resolved: graph.stats.resolved + graph.stats.constitutionalResolved, total: graph.stats.articleCitations + graph.stats.constitutional }) }),
          h('li', { text: t('method.check.presidents', { n: ck.presidentsVsTermPage.decrees.length }) }),
        );
        root.append(
          h('div', { class: 'panel' }, h('h3', { text: t('method.sources') }), sources),
          h('div', { class: 'panel', html: `<h3>${t('method.how')}</h3>${t('method.how.body')}` }),
          h('div', { class: 'panel' }, h('h3', { text: t('method.checks') }), checks),
          h('div', { class: 'panel', html: `<h3>${t('method.limits')}</h3>${t('method.limits.body')}` }),
          h('div', { class: 'disclaimer-box wide', role: 'note', text: t('method.disclaimer') }),
          h('div', { class: 'panel wide', html: `<h3>${t('method.credits')}</h3>${t('method.credits.body')}` }),
        );
        footer.textContent = t('method.data', { generated: dofDate(meta.generated), commit: meta.leyesMx.commit.slice(0, 7) });
      };
      render();
      onLang(render);
    });
  });
}
