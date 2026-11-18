/**
 * The only hand-written inputs of the data build. Everything here is checked
 * against the scraped data in build.ts (a key moment must match the title or
 * summary of its decree and its DOF date, a president must exist on the
 * Cámara's by-term page), so a typo fails the build instead of shipping.
 */

/** Official (upper-case) name on the Cámara's by-term page to id, short label and display name. */
export const PRESIDENT_SHORT: Record<string, { id: string; short: string; display: string }> = {
  'ÁLVARO OBREGÓN': { id: 'obregon', short: 'Obregón', display: 'Álvaro Obregón' },
  'PLUTARCO ELÍAS CALLES CAMPUZANO': { id: 'calles', short: 'Calles', display: 'Plutarco Elías Calles' },
  'EMILIO PORTES GIL': { id: 'portes-gil', short: 'Portes Gil', display: 'Emilio Portes Gil' },
  'PASCUAL ORTIZ RUBIO': { id: 'ortiz-rubio', short: 'Ortiz Rubio', display: 'Pascual Ortiz Rubio' },
  'ABELARDO L. RODRÍGUEZ': { id: 'rodriguez', short: 'A. L. Rodríguez', display: 'Abelardo L. Rodríguez' },
  'LÁZARO CÁRDENAS DEL RÍO': { id: 'cardenas', short: 'Cárdenas', display: 'Lázaro Cárdenas del Río' },
  'MANUEL ÁVILA CAMACHO': { id: 'avila-camacho', short: 'Ávila Camacho', display: 'Manuel Ávila Camacho' },
  'MIGUEL ALEMÁN VALDÉS': { id: 'aleman', short: 'Alemán', display: 'Miguel Alemán Valdés' },
  'ADOLFO RUIZ CORTINES': { id: 'ruiz-cortines', short: 'Ruiz Cortines', display: 'Adolfo Ruiz Cortines' },
  'ADOLFO LÓPEZ MATEOS': { id: 'lopez-mateos', short: 'López Mateos', display: 'Adolfo López Mateos' },
  'GUSTAVO DÍAZ ORDAZ': { id: 'diaz-ordaz', short: 'Díaz Ordaz', display: 'Gustavo Díaz Ordaz' },
  'LUIS ECHEVERRÍA ÁLVAREZ': { id: 'echeverria', short: 'Echeverría', display: 'Luis Echeverría Álvarez' },
  'JOSÉ LÓPEZ PORTILLO Y PACHECO': { id: 'lopez-portillo', short: 'López Portillo', display: 'José López Portillo y Pacheco' },
  'MIGUEL DE LA MADRID HURTADO': { id: 'de-la-madrid', short: 'De la Madrid', display: 'Miguel de la Madrid Hurtado' },
  'CARLOS SALINAS DE GORTARI': { id: 'salinas', short: 'Salinas', display: 'Carlos Salinas de Gortari' },
  'ERNESTO ZEDILLO PONCE DE LEÓN': { id: 'zedillo', short: 'Zedillo', display: 'Ernesto Zedillo Ponce de León' },
  'VICENTE FOX QUESADA': { id: 'fox', short: 'Fox', display: 'Vicente Fox Quesada' },
  'FELIPE DE JESÚS CALDERÓN HINOJOSA': { id: 'calderon', short: 'Calderón', display: 'Felipe de Jesús Calderón Hinojosa' },
  'ENRIQUE PEÑA NIETO': { id: 'pena-nieto', short: 'Peña Nieto', display: 'Enrique Peña Nieto' },
  'ANDRÉS MANUEL LÓPEZ OBRADOR': { id: 'lopez-obrador', short: 'López Obrador', display: 'Andrés Manuel López Obrador' },
  'CLAUDIA SHEINBAUM PARDO': { id: 'sheinbaum', short: 'Sheinbaum', display: 'Claudia Sheinbaum Pardo' },
};

export interface KeyMoment {
  n: number;
  date: string;
  /** Must match the decree's title or the Cámara's summary of it. */
  expect: RegExp;
  /** 1: always labelled; 2: labelled when there is room. */
  priority: 1 | 2;
  es: string;
  en: string;
}

/** Annotated decrees on the timeline. Each label paraphrases the decree's own title or summary. */
export const KEY_MOMENTS: KeyMoment[] = [
  { n: 1, date: '1921-07-08', expect: /escuelas rurales/, priority: 1, es: 'Primera reforma: escuelas federales', en: 'First reform: federal schools' },
  { n: 12, date: '1933-04-29', expect: /No Reelecci[oó]n de manera absoluta/i, priority: 2, es: 'No reelección absoluta', en: 'Absolute no re-election' },
  { n: 29, date: '1940-11-09', expect: /Petr[oó]leo/, priority: 2, es: 'Petróleo sin concesiones', en: 'No oil concessions' },
  { n: 53, date: '1953-10-17', expect: /las mujeres/, priority: 1, es: 'Las mujeres, ciudadanas', en: 'Women become citizens' },
  { n: 57, date: '1960-12-29', expect: /energ[ií]a el[eé]ctrica/, priority: 2, es: 'Electricidad, exclusiva de la Nación', en: 'Electricity reserved to the Nation' },
  { n: 86, date: '1977-12-06', expect: /Reforma pol[ií]tico-electoral/, priority: 2, es: 'Reforma político-electoral', en: 'Political and electoral reform' },
  { n: 97, date: '1982-11-17', expect: /banca y cr[eé]dito/, priority: 2, es: 'Banca, exclusiva del Estado', en: 'Banking reserved to the State' },
  { n: 120, date: '1992-01-06', expect: /Propiedad ejidal/, priority: 2, es: 'Reforma al ejido', en: 'Ejido land reform' },
  { n: 133, date: '1994-12-31', expect: /Reforma judicial integral/, priority: 1, es: 'Reforma judicial integral', en: 'Overhaul of the judiciary' },
  { n: 136, date: '1996-08-22', expect: /Reforma integral en materia electoral/, priority: 2, es: 'Reforma electoral', en: 'Electoral reform' },
  { n: 151, date: '2001-08-14', expect: /materia ind[ií]gena/, priority: 2, es: 'Derechos indígenas', en: 'Indigenous rights' },
  { n: 194, date: '2011-06-10', expect: /derechos humanos/, priority: 1, es: 'Derechos humanos', en: 'Human rights' },
  { n: 212, date: '2013-12-20', expect: /Reforma energ[eé]tica/, priority: 1, es: 'Reforma energética', en: 'Energy reform' },
  { n: 216, date: '2014-02-10', expect: /Instituto Nacional Electoral/, priority: 2, es: 'Nace el INE', en: 'The INE is created' },
  { n: 223, date: '2015-05-27', expect: /Sistema Nacional Anticorrupci[oó]n/, priority: 2, es: 'Sistema Anticorrupción', en: 'Anti-corruption system' },
  { n: 227, date: '2016-01-29', expect: /Ciudad de M[eé]xico/, priority: 1, es: 'Nace la Ciudad de México', en: 'Mexico City becomes a state-level entity' },
  { n: 235, date: '2019-03-26', expect: /Guardia Nacional/, priority: 2, es: 'Guardia Nacional', en: 'National Guard' },
  { n: 238, date: '2019-06-06', expect: /paridad de g[eé]nero/i, priority: 2, es: 'Paridad de género', en: 'Gender parity' },
  { n: 258, date: '2024-09-15', expect: /elegidos de manera libre, directa y secreta por la ciudadan[ií]a/, priority: 1, es: 'Jueces electos por voto popular', en: 'Judges elected by popular vote' },
  { n: 262, date: '2024-10-31', expect: /empresa p[uú]blica del Estado/, priority: 1, es: 'Energía: empresas públicas del Estado', en: 'Energy: state-owned public companies' },
  { n: 268, date: '2024-12-20', expect: /simplificaci[oó]n org[aá]nica/, priority: 2, es: 'Simplificación orgánica', en: 'Organic simplification' },
  { n: 279, date: '2026-03-03', expect: /reducci[oó]n de la jornada laboral/, priority: 2, es: 'Jornada laboral más corta', en: 'Shorter working week' },
];
