/**
 * Spanish first, English on request. Every string of the interface lives
 * here. Templates use {name} placeholders filled from the data, so no number
 * is ever typed by hand.
 */
export type Lang = 'es' | 'en';

const es = {
  'meta.title': 'Constitución viva · 1917–2026',
  'meta.description': 'Las 285 reformas a la Constitución mexicana de 1917, artículo por artículo, con los cambios de texto palabra por palabra desde 2006 y la red de citas de 36 leyes federales.',
  skip: 'Saltar al contenido',
  'nav.story': 'Historia',
  'nav.machine': 'Máquina del tiempo',
  'nav.ranking': 'Ranking',
  'nav.growth': 'Crecimiento',
  'nav.web': 'Red de leyes',
  'nav.method': 'Método',
  'lang.switch': 'English',
  'lang.label': 'Cambiar idioma a inglés',

  'hero.kicker': 'Constitución Política de los Estados Unidos Mexicanos · 1917–2026',
  'hero.unit': 'decretos de reforma',
  'hero.line': 'Una constitución que nunca ha dejado de escribirse.',
  'hero.sub': 'Cada punto es la reforma de un artículo: {reforms} en {years} años. Las filas son los 136 artículos; el tiempo corre de izquierda a derecha.',
  'hero.stat.reformed': '<b>{n}</b> de 136 artículos reformados',
  'hero.stat.untouched': '<b>{n}</b> intactos desde 1917',
  'hero.stat.words': '<b>{now}</b> palabras hoy, ≈{then} en 1917',
  'hero.cue': 'Desliza para empezar',
  'hero.canvas': 'Diagrama de puntos: {reforms} reformas a artículos entre 1917 y {year}, con el tiempo en el eje horizontal y los artículos 1 a 136 en el vertical. Los puntos se concentran después de 1980.',
  'hero.asof': 'Datos al DOF del {date}',

  'story.kicker': 'Historia',
  'story.title': 'Un siglo de reformas, decreto por decreto',
  's1.title': '5 de febrero de 1917',
  's1.body': 'El Congreso Constituyente de Querétaro publica en el Diario Oficial una constitución de 136 artículos y unas {words} palabras. En esta gráfica, cada punto será un decreto que la reforma; su tamaño, cuántos artículos toca.',
  's2.title': 'La primera reforma tardó cuatro años',
  's2.body': 'El {date} se publicó el primer decreto: facultó al Congreso para establecer escuelas en toda la República. Tocó el artículo 73, que con el tiempo sería el más reformado de todos: {n73} veces.',
  's3.title': 'La mitad, en los últimos {late} años',
  's3.body': 'De los {total} decretos, la mitad se publicó en los primeros {early} años, hasta {median}. La otra mitad llegó en los {late} años siguientes.',
  's4.title': 'Las reformas más grandes',
  's4.body': 'Solo {count} decretos tocaron {min} artículos o más a la vez. El mayor, del {date}, creó la Ciudad de México como entidad federativa y modificó {max} artículos.',
  's5.title': 'El ritmo de hoy',
  's5.body': 'Desde el {start}, con la presidencia actual, se han publicado {n} decretos en {years} años: {rate} por año, el ritmo más alto desde 1917.',
  's5.bodyNotMax': 'Desde el {start}, con la presidencia actual, se han publicado {n} decretos en {years} años: {rate} por año.',
  's6.title': '¿Y cada artículo?',
  's6.body': 'Algunos artículos no han cambiado una coma desde 1917; otros se reescriben cada pocos años. La máquina del tiempo lo muestra artículo por artículo.',
  'story.chart': 'Gráfica de puntos de los {n} decretos de reforma por año de publicación, de 1921 a {year}. Cada punto es un decreto; su tamaño indica cuántos artículos reformó.',
  'story.axis': 'Decretos por año',

  'machine.kicker': 'Máquina del tiempo',
  'machine.title': 'Los 136 artículos, encendiéndose',
  'machine.lede': 'Arrastra la línea del tiempo o pulsa reproducir. Cada casilla es un artículo: se ilumina cuando un decreto lo reforma, y su color dice cuándo fue la última vez.',
  'machine.play': 'Reproducir',
  'machine.pause': 'Pausa',
  'machine.prev': 'Decreto anterior',
  'machine.next': 'Decreto siguiente',
  'machine.slider': 'Fecha en la línea del tiempo',
  'machine.status': '<b>{decrees}</b> decretos · <b>{reforms}</b> reformas a artículos · <b>{touched}</b> de 136 artículos reformados',
  'machine.legend.color': 'Color: año de la última reforma',
  'machine.legend.count': 'Brillo y barra: número de reformas',
  'machine.legend.none': 'Sin reformar a esa fecha',
  'machine.cell': 'Artículo {id}: {count} reformas hasta el {date}. Abrir detalle.',
  'machine.cell.none': 'Artículo {id}: sin reformas hasta el {date}. Abrir detalle.',
  'machine.latest': 'Último decreto a la fecha',
  'machine.none': 'Aún sin reformas: el texto original de 1917.',
  'machine.touches': 'Reformó {n} artículos',
  'machine.touches1': 'Reformó 1 artículo',
  'machine.touches0': 'Reformó solo disposiciones transitorias',
  'machine.titulos': 'Títulos de la Constitución',

  'ranking.kicker': 'Ranking',
  'ranking.title': 'Qué cambió y quién lo cambió',
  'ranking.lede': 'Los mismos {reforms} cambios, ordenados por artículo, por presidencia, por legislatura y por década.',
  'top.title': 'Los artículos más reformados',
  'top.sub': 'Cada marca es una reforma en su fecha. Toca un artículo para ver su historia.',
  'top.row': 'Artículo {id}: {n} reformas. Abrir detalle.',
  'by.title': 'Reformas por periodo',
  'by.president': 'Presidencia',
  'by.legislature': 'Legislatura',
  'by.metric.decrees': 'Decretos',
  'by.metric.reforms': 'Reformas a artículos',
  'by.metric.rate': 'Decretos por año',
  'by.note.president': 'Atribución por la fecha de publicación en el DOF dentro de cada periodo, según la Cámara de Diputados. El periodo actual está en curso.',
  'by.note.legislature': 'Legislatura en funciones el día de la publicación en el DOF (no necesariamente la que aprobó la reforma).',
  'decade.title': 'Por década',
  'decade.decrees': 'Decretos',
  'decade.reforms': 'Reformas a artículos',
  'heat.title': 'Mapa de calor: 136 artículos × 11 décadas',
  'heat.sub': 'Cada columna es un artículo; cada fila, una década. Más claro, más reformas.',
  'heat.cell': 'Artículo {id}, década de {decade}: {n} reformas',
  'deep.title': 'De cerca',
  'deep.73': 'Las facultades del Congreso. Cada materia nueva que la Federación quiere legislar pasa por aquí.',
  'deep.27': 'Tierras, aguas y recursos del subsuelo: del reparto agrario al petróleo, la electricidad y el litio.',
  'deep.123': 'Trabajo y previsión social: de la jornada de ocho horas de 1917 a la reducción de la jornada laboral de 2026.',
  'deep.open': 'Ver el artículo {id}',
  'deep.stat': '{n} reformas · {words} palabras hoy',

  'growth.kicker': 'Crecimiento',
  'growth.title': 'Una constitución cada vez más larga',
  'growth.lede': 'Palabras en los artículos 1 a 136, sin transitorios ni notas editoriales de la Cámara.',
  'growth.coverage': 'Cobertura: texto completo de {from} a {to} ({versions} versiones de leyes-mx). Para 1917, estimación a partir de la transcripción del DOF del 5 de febrero de 1917 hecha por la Cámara de Diputados. Entre 1917 y 2006 no hay datos en este proyecto.',
  'growth.gap': 'sin datos',
  'growth.estimate': '≈{n} (estimado)',
  'growth.words': 'palabras',
  'growth.delta.title': 'Palabras añadidas y eliminadas en cada versión',
  'growth.delta.added': 'Añadidas',
  'growth.delta.removed': 'Eliminadas',
  'growth.delta.editorial': 'Correcciones del texto consolidado (sin decreto)',
  'growth.chart': 'Gráfica de línea: palabras de la Constitución de {from} a {to}, de {a} a {b}. Punto aislado para 1917: ≈{c}.',
  'growth.version': 'Versión DOF {date}: {words} palabras; +{added} / −{removed} por decreto',
  'growth.top.title': 'Los artículos que más crecieron desde 1917',
  'growth.top.row': 'Art. {id}: {a} → {b} palabras',
  'growth.times': '×{n}',

  'art.title': 'Artículo {id}',
  'art.close': 'Cerrar',
  'art.reforms': '{n} reformas',
  'art.reform1': '1 reforma',
  'art.never': 'Nunca reformado',
  'art.first': 'Primera reforma',
  'art.last': 'Última reforma',
  'art.words': 'Palabras',
  'art.words.detail': '{a} en 1917 (est.) · {b} en 2006 · {c} hoy',
  'art.timeline': 'Línea de reformas, 1917–{year}',
  'art.list': 'Decretos que lo reformaron',
  'art.text': 'Texto y cambios desde 2006',
  'art.version': 'Versión',
  'art.diff': 'Cambios respecto de la versión anterior',
  'art.clean': 'Texto de esta versión',
  'art.base': 'Texto vigente al 7 de abril de 2006, primera versión del archivo.',
  'art.editorial': 'Corrección del texto consolidado por la Cámara, sin decreto que tocara este artículo en ese periodo.',
  'art.delta': '+{a} / −{r} palabras',
  'art.nochange': 'El texto no cambió entre 2006 y hoy.',
  'art.loading': 'Cargando el texto…',
  'art.citedBy': 'Citado por {n} leyes del corpus',
  'art.citedBy0': 'Ninguna ley del corpus lo cita por número.',
  'art.leyes': 'Leer en leyes-mx',
  'art.pdf': 'Decreto (PDF)',
  'art.process': 'Proceso legislativo',
  'art.errata': 'Fe de erratas',
  'art.aclaracion': 'Aclaración',
  'art.context': 'Ubicación',
  'art.president': 'Presidencia',

  'web.kicker': 'Red de leyes',
  'web.title': 'Cómo se citan 36 leyes federales',
  'web.lede': 'La Constitución y 35 leyes y códigos de leyes-mx. Una línea va de la ley que cita a la ley citada; su grosor, cuántas veces la nombra. Solo se dibujan citas con nombre oficial exacto.',
  'web.groups': 'Grupos',
  'web.min': 'Menciones mínimas: {n}',
  'web.cpeum': 'Mostrar la Constitución',
  'web.reset': 'Restablecer',
  'web.panel.hint': 'Toca o enfoca una ley para ver a quién cita y quién la cita.',
  'web.panel.out': 'Cita a',
  'web.panel.in': 'La citan',
  'web.panel.self': 'Referencias a sí misma («esta Ley», «el presente Código»): {n}',
  'web.panel.meta': '{articles} artículos · {words} palabras',
  'web.edge': '{a} cita a {b}: {n} menciones, {k} a artículos concretos',
  'web.node': '{name}: cita a {out} leyes y la citan {in}. Abrir detalle.',
  'web.stats': '{edges} conexiones · {mentions} menciones · {resolved} de {total} citas a artículos verificadas contra el texto citado',
  'web.const.title': 'Los artículos de la Constitución que más citan las leyes',
  'web.const.row': 'Art. {id}: {n} citas desde {laws} leyes',
  'web.chart': 'Red de citas entre 36 leyes federales: {edges} conexiones dirigidas. La Ley del Impuesto sobre la Renta y el Código Fiscal de la Federación son el par más conectado.',

  'table.show': 'Ver los datos en tabla',
  'table.article': 'Artículo',
  'table.reforms': 'Reformas',
  'table.date': 'Fecha DOF',
  'table.decree': 'Decreto',
  'table.articles': 'Artículos',
  'table.period': 'Periodo',
  'table.decrees': 'Decretos',
  'table.rate': 'Decretos por año',
  'table.decade': 'Década',
  'table.words': 'Palabras',
  'table.added': 'Añadidas',
  'table.removed': 'Eliminadas',
  'table.source': 'Ley que cita',
  'table.target': 'Ley citada',
  'table.mentions': 'Menciones',
  'table.articleCitations': 'Citas a artículos',
  'table.year': 'Año',

  'method.kicker': 'Método',
  'method.title': 'Fuentes, método y límites',
  'method.sources': 'Fuentes',
  'method.retrieved': 'Consultada el {date}',
  'method.how': 'Cómo se hizo',
  'method.how.body': '<p>Un script (<code>npm run data</code>) descarga con pausas y caché las páginas de la Cámara de Diputados, lee el historial de git de <a href="https://github.com/BEG-lag/leyes-mx">leyes-mx</a> y regenera todos los archivos de <code>data/</code>. La lista de decretos viene de «Reformas en orden cronológico»; qué artículos tocó cada uno, de «Reformas por artículo»; los periodos presidenciales, de «Reformas por periodo presidencial»; las legislaturas, de Wikipedia, contrastadas con la Cámara.</p><p>El texto de cada versión desde 2006 sale de los 44 commits de la Constitución en leyes-mx. Las palabras se cuentan en los artículos 1 a 136, sin transitorios ni notas editoriales («Párrafo reformado DOF…»). Los cambios se calculan palabra por palabra.</p><p>La red de leyes busca en el cuerpo de cada ley el nombre oficial exacto de las otras 35 (y tres alias inequívocos), y las fórmulas «artículo N de la Ley X» y «artículo N constitucional». Una cita a un artículo solo cuenta si ese artículo existe en el texto vigente de la ley citada.</p>',
  'method.checks': 'Comprobaciones',
  'method.check.decrees': '{n} de {n} decretos coinciden en número y fecha con el análisis independiente de leyes-mx.',
  'method.check.articles': 'La página «Reformas por artículo» lista {parsed} reformas a los artículos 1 a 136; su propio resumen dice {official}. Se usa la lista detallada.',
  'method.check.1917': 'Estimación de 1917: en los {n} artículos nunca reformados, la diferencia con el texto de 2006 es de {diff} palabras sobre {total} ({pct}).',
  'method.check.graph': 'Red: {resolved} de {total} citas a artículos concretos existen en la ley citada; en una muestra aleatoria de 60 menciones revisadas a mano, las 60 son citas reales.',
  'method.check.presidents': 'Atribución por fecha: {n} decretos no aparecen en el bloque de su presidencia en la página de la Cámara, que a veces enlaza el decreto que se modifica.',
  'method.limits': 'Límites',
  'method.limits.body': '<ul><li>Un decreto se cuenta como reforma de un artículo si la Cámara lo lista en «Reformas por artículo»; no se mide cuánto cambió antes de 2006.</li><li>El texto anterior a 2006 no está en este proyecto. La cifra de 1917 es una estimación.</li><li>Las versiones de leyes-mx agrupan a veces varios decretos; el cambio se atribuye a los decretos de ese periodo que tocaron el artículo.</li><li>Atribuir una reforma a una presidencia o legislatura por su fecha de publicación es una convención: la aprobación involucra al Congreso y a las legislaturas de los estados.</li><li>La red solo ve citas por nombre oficial; omite referencias genéricas («las leyes aplicables») y leyes fuera del corpus de 36.</li></ul>',
  'method.disclaimer': 'No oficial. Solo el Diario Oficial de la Federación tiene validez oficial. No es asesoría legal.',
  'method.credits': 'Créditos',
  'method.credits.body': '<p>Hecho por <a href="https://pivotek.mx">Benjamín Esponda García</a>, abogado corporativo que construye con IA. Código abierto en <a href="https://github.com/BEG-lag/constitucion-viva">GitHub</a> (MIT); datos derivados en dominio público (CC0). Los textos legales no son objeto de derecho de autor (art. 14, fr. VIII, LFDA), según la interpretación del autor.</p>',
  'method.data': 'Datos: {generated} · leyes-mx {commit}',
  'footer.top': 'Volver arriba',
  'tooltip.decree': 'Decreto {n}',
  'noscript': 'Esta experiencia necesita JavaScript. Los datos están en la carpeta data/ del repositorio.',
} as const;

export type Key = keyof typeof es;

const en: Record<Key, string> = {
  'meta.title': 'Living Constitution · 1917–2026',
  'meta.description': 'All 285 reforms to the Mexican Constitution of 1917, article by article, with word-level text changes since 2006 and the citation web of 36 federal laws.',
  skip: 'Skip to content',
  'nav.story': 'Story',
  'nav.machine': 'Time machine',
  'nav.ranking': 'Rankings',
  'nav.growth': 'Growth',
  'nav.web': 'Web of laws',
  'nav.method': 'Method',
  'lang.switch': 'Español',
  'lang.label': 'Cambiar el idioma a español',

  'hero.kicker': 'Political Constitution of the United Mexican States · 1917–2026',
  'hero.unit': 'reform decrees',
  'hero.line': 'A constitution that has never stopped being written.',
  'hero.sub': 'Each dot is a reform to one article: {reforms} in {years} years. Rows are the 136 articles; time runs from left to right.',
  'hero.stat.reformed': '<b>{n}</b> of 136 articles amended',
  'hero.stat.untouched': '<b>{n}</b> untouched since 1917',
  'hero.stat.words': '<b>{now}</b> words today, ≈{then} in 1917',
  'hero.cue': 'Scroll to begin',
  'hero.canvas': 'Dot plot: {reforms} article reforms between 1917 and {year}, with time on the horizontal axis and articles 1 to 136 on the vertical axis. Dots cluster after 1980.',
  'hero.asof': 'Data as of DOF {date}',

  'story.kicker': 'Story',
  'story.title': 'A century of amendments, decree by decree',
  's1.title': 'February 5, 1917',
  's1.body': 'The Constituent Congress of Querétaro publishes in the Official Gazette a constitution of 136 articles and about {words} words. In this chart, each dot will be a decree that amends it; its size, how many articles it touches.',
  's2.title': 'The first reform took four years',
  's2.body': 'On {date} the first decree was published: it allowed Congress to set up schools across the Republic. It touched article 73, which would become the most amended of all: {n73} times.',
  's3.title': 'Half of it in the last {late} years',
  's3.body': 'Of the {total} decrees, half were published in the first {early} years, up to {median}. The other half came in the {late} years that followed.',
  's4.title': 'The largest reforms',
  's4.body': 'Only {count} decrees touched {min} or more articles at once. The largest, of {date}, made Mexico City a state-level entity and amended {max} articles.',
  's5.title': 'Today’s pace',
  's5.body': 'Since {start}, under the current presidency, {n} decrees have been published in {years} years: {rate} a year, the fastest pace since 1917.',
  's5.bodyNotMax': 'Since {start}, under the current presidency, {n} decrees have been published in {years} years: {rate} a year.',
  's6.title': 'And each article?',
  's6.body': 'Some articles have not lost a comma since 1917; others are rewritten every few years. The time machine shows it article by article.',
  'story.chart': 'Dot chart of the {n} reform decrees by year of publication, 1921 to {year}. Each dot is a decree; its size shows how many articles it amended.',
  'story.axis': 'Decrees per year',

  'machine.kicker': 'Time machine',
  'machine.title': 'The 136 articles, lighting up',
  'machine.lede': 'Drag the timeline or press play. Each tile is an article: it lights up when a decree amends it, and its color tells when that last happened.',
  'machine.play': 'Play',
  'machine.pause': 'Pause',
  'machine.prev': 'Previous decree',
  'machine.next': 'Next decree',
  'machine.slider': 'Date on the timeline',
  'machine.status': '<b>{decrees}</b> decrees · <b>{reforms}</b> article reforms · <b>{touched}</b> of 136 articles amended',
  'machine.legend.color': 'Color: year of the latest reform',
  'machine.legend.count': 'Brightness and bar: number of reforms',
  'machine.legend.none': 'Not yet amended',
  'machine.cell': 'Article {id}: {count} reforms up to {date}. Open details.',
  'machine.cell.none': 'Article {id}: no reforms up to {date}. Open details.',
  'machine.latest': 'Latest decree at this date',
  'machine.none': 'No reforms yet: the original text of 1917.',
  'machine.touches': 'Amended {n} articles',
  'machine.touches1': 'Amended 1 article',
  'machine.touches0': 'Amended transitory provisions only',
  'machine.titulos': 'Titles of the Constitution',

  'ranking.kicker': 'Rankings',
  'ranking.title': 'What changed, and who changed it',
  'ranking.lede': 'The same {reforms} changes, sorted by article, presidency, legislature and decade.',
  'top.title': 'The most amended articles',
  'top.sub': 'Each tick is a reform on its date. Tap an article to see its history.',
  'top.row': 'Article {id}: {n} reforms. Open details.',
  'by.title': 'Reforms by period',
  'by.president': 'Presidency',
  'by.legislature': 'Legislature',
  'by.metric.decrees': 'Decrees',
  'by.metric.reforms': 'Article reforms',
  'by.metric.rate': 'Decrees per year',
  'by.note.president': 'Attributed by DOF publication date within each term, as listed by the Chamber of Deputies. The current term is ongoing.',
  'by.note.legislature': 'Legislature in office on the DOF publication date (not necessarily the one that approved the reform).',
  'decade.title': 'By decade',
  'decade.decrees': 'Decrees',
  'decade.reforms': 'Article reforms',
  'heat.title': 'Heatmap: 136 articles × 11 decades',
  'heat.sub': 'Each column is an article; each row, a decade. Brighter means more reforms.',
  'heat.cell': 'Article {id}, {decade}s: {n} reforms',
  'deep.title': 'Up close',
  'deep.73': 'The powers of Congress. Every new subject the Federation wants to legislate on goes through here.',
  'deep.27': 'Land, water and subsoil: from land reform to oil, electricity and lithium.',
  'deep.123': 'Labor and social security: from the eight-hour day of 1917 to the shorter working week of 2026.',
  'deep.open': 'Open article {id}',
  'deep.stat': '{n} reforms · {words} words today',

  'growth.kicker': 'Growth',
  'growth.title': 'A constitution that keeps getting longer',
  'growth.lede': 'Words in articles 1 to 136, without transitory provisions or the Chamber’s editorial notes.',
  'growth.coverage': 'Coverage: full text from {from} to {to} ({versions} versions in leyes-mx). For 1917, an estimate from the Chamber of Deputies’ transcription of the DOF of February 5, 1917. There is no data between 1917 and 2006 in this project.',
  'growth.gap': 'no data',
  'growth.estimate': '≈{n} (estimate)',
  'growth.words': 'words',
  'growth.delta.title': 'Words added and removed in each version',
  'growth.delta.added': 'Added',
  'growth.delta.removed': 'Removed',
  'growth.delta.editorial': 'Corrections to the consolidated text (no decree)',
  'growth.chart': 'Line chart: words in the Constitution from {from} to {to}, from {a} to {b}. Separate point for 1917: about {c}.',
  'growth.version': 'Version DOF {date}: {words} words; +{added} / −{removed} by decree',
  'growth.top.title': 'The articles that grew the most since 1917',
  'growth.top.row': 'Art. {id}: {a} → {b} words',
  'growth.times': '×{n}',

  'art.title': 'Article {id}',
  'art.close': 'Close',
  'art.reforms': '{n} reforms',
  'art.reform1': '1 reform',
  'art.never': 'Never amended',
  'art.first': 'First reform',
  'art.last': 'Latest reform',
  'art.words': 'Words',
  'art.words.detail': '{a} in 1917 (est.) · {b} in 2006 · {c} today',
  'art.timeline': 'Reform timeline, 1917–{year}',
  'art.list': 'Decrees that amended it',
  'art.text': 'Text and changes since 2006',
  'art.version': 'Version',
  'art.diff': 'Changes from the previous version',
  'art.clean': 'Text of this version',
  'art.base': 'Text in force on April 7, 2006, the first version in the archive.',
  'art.editorial': 'Correction of the consolidated text by the Chamber, with no decree touching this article in that window.',
  'art.delta': '+{a} / −{r} words',
  'art.nochange': 'The text did not change between 2006 and today.',
  'art.loading': 'Loading the text…',
  'art.citedBy': 'Cited by {n} laws in the corpus',
  'art.citedBy0': 'No law in the corpus cites it by number.',
  'art.leyes': 'Read in leyes-mx',
  'art.pdf': 'Decree (PDF)',
  'art.process': 'Legislative process',
  'art.errata': 'Erratum',
  'art.aclaracion': 'Clarification',
  'art.context': 'Location',
  'art.president': 'Presidency',

  'web.kicker': 'Web of laws',
  'web.title': 'How 36 federal laws cite each other',
  'web.lede': 'The Constitution and 35 laws and codes in leyes-mx. A line runs from the citing law to the cited one; its width, how often it names it. Only exact official names are drawn.',
  'web.groups': 'Groups',
  'web.min': 'Minimum mentions: {n}',
  'web.cpeum': 'Show the Constitution',
  'web.reset': 'Reset',
  'web.panel.hint': 'Tap or focus a law to see what it cites and what cites it.',
  'web.panel.out': 'Cites',
  'web.panel.in': 'Cited by',
  'web.panel.self': 'References to itself (“this Law”, “this Code”): {n}',
  'web.panel.meta': '{articles} articles · {words} words',
  'web.edge': '{a} cites {b}: {n} mentions, {k} to specific articles',
  'web.node': '{name}: cites {out} laws and is cited by {in}. Open details.',
  'web.stats': '{edges} links · {mentions} mentions · {resolved} of {total} article citations checked against the cited text',
  'web.const.title': 'The constitutional articles laws cite most',
  'web.const.row': 'Art. {id}: {n} citations from {laws} laws',
  'web.chart': 'Citation network among 36 federal laws: {edges} directed links. The Income Tax Law and the Federal Tax Code are the most connected pair.',

  'table.show': 'Show the data as a table',
  'table.article': 'Article',
  'table.reforms': 'Reforms',
  'table.date': 'DOF date',
  'table.decree': 'Decree',
  'table.articles': 'Articles',
  'table.period': 'Period',
  'table.decrees': 'Decrees',
  'table.rate': 'Decrees per year',
  'table.decade': 'Decade',
  'table.words': 'Words',
  'table.added': 'Added',
  'table.removed': 'Removed',
  'table.source': 'Citing law',
  'table.target': 'Cited law',
  'table.mentions': 'Mentions',
  'table.articleCitations': 'Article citations',
  'table.year': 'Year',

  'method.kicker': 'Method',
  'method.title': 'Sources, method and limitations',
  'method.sources': 'Sources',
  'method.retrieved': 'Retrieved {date}',
  'method.how': 'How it was built',
  'method.how.body': '<p>A script (<code>npm run data</code>) downloads the Chamber of Deputies pages with pauses and a cache, reads the git history of <a href="https://github.com/BEG-lag/leyes-mx">leyes-mx</a> and regenerates every file in <code>data/</code>. The list of decrees comes from “Reformas en orden cronológico”; which articles each one touched, from “Reformas por artículo”; presidential terms, from “Reformas por periodo presidencial”; legislatures, from Wikipedia, checked against the Chamber.</p><p>The text of every version since 2006 comes from the 44 commits of the Constitution in leyes-mx. Words are counted in articles 1 to 136, without transitory provisions or editorial notes (“Párrafo reformado DOF…”). Changes are computed word by word.</p><p>The web of laws looks in the body of each law for the exact official name of the other 35 (plus three unambiguous aliases), and for “artículo N de la Ley X” and “artículo N constitucional”. A citation to an article only counts if that article exists in the current text of the cited law.</p>',
  'method.checks': 'Checks',
  'method.check.decrees': '{n} of {n} decrees match in number and date the independent parse in leyes-mx.',
  'method.check.articles': 'The “Reformas por artículo” page lists {parsed} reforms to articles 1 to 136; its own summary says {official}. The detailed list is used.',
  'method.check.1917': '1917 estimate: across the {n} never-amended articles, the difference from the 2006 text is {diff} words out of {total} ({pct}).',
  'method.check.graph': 'Web: {resolved} of {total} citations to specific articles exist in the cited law; in a random sample of 60 mentions checked by hand, all 60 are real citations.',
  'method.check.presidents': 'Attribution by date: {n} decrees do not appear under their presidency on the Chamber’s page, which sometimes links the decree being amended instead.',
  'method.limits': 'Limitations',
  'method.limits.body': '<ul><li>A decree counts as a reform of an article if the Chamber lists it under “Reformas por artículo”; how much text changed is not measured before 2006.</li><li>Text before 2006 is not in this project. The 1917 figure is an estimate.</li><li>leyes-mx versions sometimes bundle several decrees; a change is attributed to the decrees of that window that touched the article.</li><li>Attributing a reform to a presidency or legislature by publication date is a convention: approval involves Congress and the state legislatures.</li><li>The web only sees citations by official name; it misses generic references (“the applicable laws”) and laws outside the corpus of 36.</li></ul>',
  'method.disclaimer': 'Unofficial. Only the Diario Oficial de la Federación is authoritative. Not legal advice.',
  'method.credits': 'Credits',
  'method.credits.body': '<p>Made by <a href="https://pivotek.mx">Benjamín Esponda García</a>, a Mexican corporate lawyer who builds with AI. Open source on <a href="https://github.com/BEG-lag/constitucion-viva">GitHub</a> (MIT); derived data in the public domain (CC0). Legal texts are not subject to copyright (art. 14, fr. VIII, Mexican Copyright Act), in the author’s understanding.</p>',
  'method.data': 'Data: {generated} · leyes-mx {commit}',
  'footer.top': 'Back to top',
  'tooltip.decree': 'Decree {n}',
  'noscript': 'This experience needs JavaScript. The data is in the data/ folder of the repository.',
};

const dictionaries: Record<Lang, Record<Key, string>> = { es, en };

let lang: Lang = initialLang();
const listeners = new Set<() => void>();

function initialLang(): Lang {
  const fromUrl = new URLSearchParams(location.search).get('lang');
  if (fromUrl === 'en' || fromUrl === 'es') return fromUrl;
  try {
    const saved = localStorage.getItem('cv-lang');
    if (saved === 'en' || saved === 'es') return saved;
  } catch {
    // storage blocked: fall through
  }
  return 'es';
}

export function getLang(): Lang {
  return lang;
}

export function setLang(next: Lang): void {
  if (next === lang) return;
  lang = next;
  try {
    localStorage.setItem('cv-lang', next);
  } catch {
    // storage blocked: the choice lasts for this visit
  }
  document.documentElement.lang = next;
  for (const fn of listeners) fn();
}

export function onLang(fn: () => void): void {
  listeners.add(fn);
}

export function t(key: Key, vars: Record<string, string | number> = {}): string {
  const template = dictionaries[lang][key];
  return template.replace(/\{(\w+)\}/g, (_, name: string) => {
    const v = vars[name];
    return v === undefined ? `{${name}}` : typeof v === 'number' ? fmt(v) : v;
  });
}

const locale = () => (lang === 'es' ? 'es-MX' : 'en-US');

export function fmt(n: number, digits = 0): string {
  return n.toLocaleString(locale(), { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

const parse = (iso: string) => new Date(`${iso}T12:00:00Z`);

/** "8 de julio de 1921" / "July 8, 1921". */
export function longDate(iso: string): string {
  return parse(iso).toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/** "08-07-1921", the DOF style, in both languages. */
export function dofDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}-${m}-${y}`;
}

/** "jul 1921" / "Jul 1921". */
export function monthYear(iso: string): string {
  return parse(iso).toLocaleDateString(locale(), { month: 'short', year: 'numeric', timeZone: 'UTC' }).replace('.', '');
}

/** Applies data-i18n (text) and data-i18n-html (trusted markup from this file) under a root. */
export function applyStatic(root: ParentNode = document): void {
  for (const el of root.querySelectorAll<HTMLElement>('[data-i18n]')) {
    el.textContent = t(el.dataset['i18n'] as Key);
  }
  for (const el of root.querySelectorAll<HTMLElement>('[data-i18n-html]')) {
    el.innerHTML = t(el.dataset['i18nHtml'] as Key);
  }
  for (const el of root.querySelectorAll<HTMLElement>('[data-i18n-label]')) {
    el.setAttribute('aria-label', t(el.dataset['i18nLabel'] as Key));
  }
  document.title = t('meta.title');
  document.querySelector('meta[name="description"]')?.setAttribute('content', t('meta.description'));
}
