// Etapa 5: indicadores de una microzona (círculo alrededor de un punto).
// Los indicadores se presentan por separado (spec §12). La puntuación del
// comparador es opcional, configurable y no reemplaza la lectura de cada dimensión.

import { CAPAS_CULTURA } from './capas';
import type { BarrioFeature, Datos, InmuebleFeature, TransporteFeature } from './tipos';
import { distancia, enPoligono } from './util';

export interface Cercano {
  nombre: string;
  detalle: string;
  distancia: number;
}

export interface AnalisisZona {
  etiqueta: string;
  centro: [number, number];
  radio: number;
  // A. Actividad cultural
  porCategoria: Record<string, number>;
  totalCultura: number;
  categoriasPresentes: number;
  diversidad: number; // Shannon normalizado 0–1 sobre las 5 capas principales
  teatroMasCercano: Cercano | null;
  // B. Conectividad
  subteEnRadio: number;
  lineasSubte: string[];
  trenEnRadio: number;
  lineasColectivo: number; // líneas distintas con parada a menos de 400 m
  paradasColectivo: number;
  metrobusEnRadio: number;
  subteMasCercano: Cercano | null;
  trenMasCercano: Cercano | null;
  // C. Potencial barrial
  barrio: string | null;
  densidad2010: number | null;
  equipamientoComunitario: number; // bibliotecas, librerías, espacios de formación, etc. ("otros")
  // D. Economía
  inmueblesEnRadio: { id: string; direccion: string; alquiler: number | null; m2: number | null }[];
  alquilerM2Promedio: number | null;
  // E. Observaciones de riesgo (no son conclusiones)
  observaciones: string[];
}

const PRINCIPALES = CAPAS_CULTURA.filter((c) => c.id !== 'otros').map((c) => c.id);

function masCercano(centro: [number, number], items: TransporteFeature[], detalle: (t: TransporteFeature) => string): Cercano | null {
  let mejor: Cercano | null = null;
  for (const t of items) {
    if (t.geometry.type !== 'Point') continue;
    const d = distancia(centro, t.geometry.coordinates);
    if (!mejor || d < mejor.distancia) mejor = { nombre: t.properties.nombre, detalle: detalle(t), distancia: d };
  }
  return mejor;
}

export function barrioDe(centro: [number, number], barrios: BarrioFeature[]): BarrioFeature | null {
  return barrios.find((b) => enPoligono(centro, b.geometry)) ?? null;
}

export function analizarZona(datos: Datos, centro: [number, number], radio: number, etiqueta: string): AnalisisZona {
  const porCategoria: Record<string, number> = {};
  let teatro: Cercano | null = null;
  for (const e of datos.espacios) {
    const d = distancia(centro, e.geometry.coordinates);
    const cat = e.properties.categoria;
    if (d <= radio) porCategoria[cat] = (porCategoria[cat] ?? 0) + 1;
    if (cat === 'teatro' && (!teatro || d < teatro.distancia)) {
      teatro = { nombre: e.properties.nombre ?? '', detalle: e.properties.direccion ?? '', distancia: d };
    }
  }
  const totalCultura = PRINCIPALES.reduce((s, c) => s + (porCategoria[c] ?? 0), 0);
  const presentes = PRINCIPALES.filter((c) => (porCategoria[c] ?? 0) > 0);
  let diversidad = 0;
  if (totalCultura > 0 && PRINCIPALES.length > 1) {
    const h = -presentes.reduce((s, c) => {
      const p = porCategoria[c] / totalCultura;
      return s + p * Math.log(p);
    }, 0);
    diversidad = h / Math.log(PRINCIPALES.length);
  }

  const subtes = datos.transporte.filter((t) => t.properties.tipo === 'subte_estacion');
  const trenes = datos.transporte.filter((t) => t.properties.tipo === 'tren_estacion');
  const enRadio = (lista: TransporteFeature[]) =>
    lista.filter((t) => t.geometry.type === 'Point' && distancia(centro, t.geometry.coordinates) <= radio);
  const subteEnRadio = enRadio(subtes);
  const trenEnRadio = enRadio(trenes);

  const RADIO_CAMINATA = 400;
  const lineasCol = new Set<string>();
  let paradasCol = 0;
  for (const [lon, lat, lineas] of datos.colectivos.paradas) {
    if (distancia(centro, [lon, lat]) <= RADIO_CAMINATA) {
      paradasCol++;
      for (const l of lineas.split(',')) lineasCol.add(l);
    }
  }
  const metrobusEnRadio = enRadio(datos.transporte.filter((t) => t.properties.tipo === 'metrobus_estacion')).length;

  const barrio = barrioDe(centro, datos.barrios);

  const inmuebles = datos.inmuebles
    .filter((i: InmuebleFeature) => distancia(centro, i.geometry.coordinates) <= radio)
    .map((i) => ({
      id: i.properties.id,
      direccion: i.properties.direccion ?? '',
      alquiler: i.properties.alquiler,
      m2: i.properties.superficie_m2,
    }));
  const conM2 = inmuebles.filter((i) => i.alquiler && i.m2);
  const alquilerM2Promedio = conM2.length
    ? Math.round(conM2.reduce((s, i) => s + i.alquiler! / i.m2!, 0) / conM2.length)
    : null;

  const subteCerca = masCercano(centro, subtes, (t) => `Línea ${t.properties.linea}`);
  const trenCerca = masCercano(centro, trenes, (t) => t.properties.linea ?? '');

  const obs: string[] = [];
  if (!subteCerca || subteCerca.distancia > 800) obs.push(`No hay subte a menos de 800 m: la llegada desde otros barrios depende de colectivo (${lineasCol.size} líneas a 400 m) o tren.`);
  if (lineasCol.size < 5) obs.push('Pocas líneas de colectivo a distancia caminable (menos de 5 a 400 m).');
  if (totalCultura === 0) obs.push('Sin espacios culturales registrados en el radio. Puede ser un vacío de oferta o falta de demanda: verificar en recorrida.');
  if ((porCategoria.teatro ?? 0) >= 15) obs.push(`Alta concentración de teatros (${porCategoria.teatro}): circuito consolidado, pero también más competencia.`);
  if (barrio?.properties.densidad_2010 && barrio.properties.densidad_2010 < 10000) obs.push('Densidad residencial baja (Censo 2010): menos público que llegue caminando.');
  obs.push('Seguridad, circulación nocturna y habilitación no surgen de estos datos: observar jueves y sábados de 20:30 a 23:00.');

  return {
    etiqueta,
    centro,
    radio,
    porCategoria,
    totalCultura,
    categoriasPresentes: presentes.length,
    diversidad,
    teatroMasCercano: teatro,
    subteEnRadio: subteEnRadio.length,
    lineasSubte: [...new Set(subteEnRadio.map((t) => t.properties.linea ?? ''))].filter(Boolean).sort(),
    trenEnRadio: trenEnRadio.length,
    lineasColectivo: lineasCol.size,
    paradasColectivo: paradasCol,
    metrobusEnRadio,
    subteMasCercano: subteCerca,
    trenMasCercano: trenCerca,
    barrio: barrio?.properties.nombre ?? null,
    densidad2010: barrio?.properties.densidad_2010 ?? null,
    equipamientoComunitario: porCategoria.otros ?? 0,
    inmueblesEnRadio: inmuebles,
    alquilerM2Promedio,
    observaciones: obs,
  };
}

// ---------- Puntuación configurable (comparador) ----------

export interface Pesos {
  cultura: number;
  conectividad: number;
  barrial: number;
  economia: number;
}

export const PESOS_DEFECTO: Pesos = { cultura: 1, conectividad: 1, barrial: 1, economia: 1 };

/**
 * Puntaje relativo 0–100 entre las zonas comparadas (normalización min–max dentro
 * del grupo). Sólo sirve para ordenar alternativas con los pesos elegidos.
 */
export function puntuar(zonas: AnalisisZona[], pesos: Pesos): number[] {
  const dims = zonas.map((z) => ({
    cultura: z.totalCultura * (0.5 + z.diversidad / 2),
    conectividad: z.subteEnRadio * 2 + z.trenEnRadio + z.metrobusEnRadio * 0.5 + z.lineasColectivo / 5 + (z.subteMasCercano ? Math.max(0, 1 - z.subteMasCercano.distancia / 1500) * 3 : 0),
    barrial: (z.densidad2010 ?? 0) / 10000 + z.equipamientoComunitario / 10,
    // menor alquiler por m² es mejor; sin dato = neutro
    economia: z.alquilerM2Promedio ? -z.alquilerM2Promedio : NaN,
  }));
  const claves: (keyof Pesos)[] = ['cultura', 'conectividad', 'barrial', 'economia'];
  const normal: Record<string, number[]> = {};
  for (const k of claves) {
    const vals = dims.map((d) => d[k]).filter((v) => !Number.isNaN(v));
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    normal[k] = dims.map((d) => (Number.isNaN(d[k]) ? 0.5 : max === min ? 0.5 : (d[k] - min) / (max - min)));
  }
  const sumaPesos = claves.reduce((s, k) => s + pesos[k], 0) || 1;
  return zonas.map((_, i) => Math.round((claves.reduce((s, k) => s + normal[k][i] * pesos[k], 0) / sumaPesos) * 100));
}
