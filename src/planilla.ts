// Sincronización en vivo con la planilla "Oportunidades" (Google Sheets).
//
// Al cargar la página se lee la planilla como CSV (export gviz, sin credenciales:
// funciona mientras la planilla esté compartida "cualquiera con el enlace").
// Cada dirección se ubica con:
//   1. la geocodificación verificada a mano (public/data/inmuebles-geocodificacion.json), o
//   2. el normalizador USIG del GCBA, aceptando el resultado sólo si cae dentro
//      (o a menos de 300 m) del barrio informado en la planilla.
// Si la planilla no responde, se usa la copia incluida en el sitio.

import { barrioDe } from './zona';
import type { BarrioFeature, Inmueble, InmuebleFeature } from './tipos';
import { distancia, enPoligono, norm } from './util';

const ID_PLANILLA = '1kDHSjORkNzTJW6osuQNesOC3OThMV4Z9Ms4t2ZmWQd0';
const URL_PLANILLA =
  (import.meta.env.VITE_PLANILLA_CSV as string | undefined) ||
  `https://docs.google.com/spreadsheets/d/${ID_PLANILLA}/gviz/tq?tqx=out:csv&sheet=Oportunidades`;
const USIG = 'https://servicios.usig.buenosaires.gob.ar/normalizar/';
const CACHE = 'tres.usig.v1';

export interface Geocodificacion {
  _fuente: string;
  _fecha: string;
  [direccion: string]: { normalizada: string; lat: number; lon: number; tipo: string; nota: string | null } | string;
}

export interface EstadoPlanilla {
  modo: 'en-vivo' | 'copia';
  detalle: string;
}

function parseCSV(texto: string): string[][] {
  const filas: string[][] = [];
  let fila: string[] = [];
  let campo = '';
  let q = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (q) {
      if (c === '"') {
        if (texto[i + 1] === '"') { campo += '"'; i++; } else q = false;
      } else campo += c;
    } else if (c === '"') q = true;
    else if (c === ',') { fila.push(campo); campo = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++;
      fila.push(campo); filas.push(fila); fila = []; campo = '';
    } else campo += c;
  }
  if (campo || fila.length) { fila.push(campo); filas.push(fila); }
  return filas.filter((f) => f.some((v) => v.trim()));
}

const numero = (v: string | undefined) => {
  const s = (v ?? '').replace(/[^\d]/g, '');
  return s ? Number(s) : null;
};
const fecha = (v: string | undefined) => {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec((v ?? '').trim());
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : v?.trim() || null;
};

function leerCache(): Record<string, [number, number, string] | null> {
  try { return JSON.parse(localStorage.getItem(CACHE) ?? '{}'); } catch { return {}; }
}
function guardarCache(c: Record<string, [number, number, string] | null>) {
  try { localStorage.setItem(CACHE, JSON.stringify(c)); } catch { /* sin almacenamiento */ }
}

/** Distancia mínima aproximada (m) de un punto a los vértices del barrio, 0 si está adentro. */
function distanciaABarrio(pt: [number, number], b: BarrioFeature): number {
  if (enPoligono(pt, b.geometry)) return 0;
  const anillos = b.geometry.type === 'Polygon' ? b.geometry.coordinates : b.geometry.coordinates.flat();
  let min = Infinity;
  for (const a of anillos) for (const c of a) min = Math.min(min, distancia(pt, c as [number, number]));
  return min;
}

async function geocodificarUSIG(
  direccion: string,
  barrio: BarrioFeature | undefined,
): Promise<[number, number, string] | null> {
  const url = `${USIG}?direccion=${encodeURIComponent(direccion)}&geocodificar=TRUE&srid=4326&maxOptions=10`;
  const r = await fetch(url);
  if (!r.ok) return null;
  const j = await r.json();
  const candidatos = (j.direccionesNormalizadas ?? [])
    .filter((d: { cod_partido: string; coordenadas?: unknown }) => d.cod_partido === 'caba' && d.coordenadas)
    .map((d: { direccion: string; coordenadas: { x: string; y: string } }) => ({
      dir: d.direccion,
      pt: [Number(d.coordenadas.x), Number(d.coordenadas.y)] as [number, number],
    }));
  if (!candidatos.length) return null;
  // Con barrio informado: quedarse con el candidato que cae en ese barrio (o a < 300 m).
  if (barrio) {
    const ok = candidatos.filter((c: { pt: [number, number] }) => distanciaABarrio(c.pt, barrio) < 300);
    return ok.length === 1 ? [ok[0].pt[0], ok[0].pt[1], ok[0].dir] : null;
  }
  return candidatos.length === 1 ? [candidatos[0].pt[0], candidatos[0].pt[1], candidatos[0].dir] : null;
}

export async function cargarPlanilla(
  barrios: BarrioFeature[],
  geo: Geocodificacion,
): Promise<{ inmuebles: InmuebleFeature[]; pendientes: Inmueble[]; estado: EstadoPlanilla } | null> {
  let texto: string;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch(URL_PLANILLA, { signal: ctrl.signal });
    clearTimeout(t);
    if (!r.ok) return null;
    texto = await r.text();
  } catch {
    return null;
  }
  const [cab, ...filas] = parseCSV(texto.replace(/^﻿/, ''));
  if (!cab?.includes('Dirección / referencia')) return null;

  const cache = leerCache();
  const inmuebles: InmuebleFeature[] = [];
  const pendientes: Inmueble[] = [];
  const porBarrio = new Map(barrios.map((b) => [norm(b.properties.nombre), b]));

  await Promise.all(
    filas.map(async (r, i) => {
      const g = (col: string) => (r[cab.indexOf(col)] ?? '').trim() || null;
      const direccion = g('Dirección / referencia');
      const alquiler = numero(g('Alquiler ARS') ?? undefined);
      const expensas = numero(g('Expensas ARS') ?? undefined);
      const p: Inmueble = {
        id: `inmueble-${i + 1}`,
        direccion,
        barrio: g('Barrio'),
        tipo: g('Tipo de inmueble'),
        superficie_m2: numero(g('Superficie m²') ?? undefined),
        alquiler,
        expensas,
        costo_total: numero(g('Costo total conocido ARS') ?? undefined) ?? (alquiler !== null ? alquiler + (expensas ?? 0) : null),
        enlace: g('Enlace publicación'),
        fuente: g('Fuente'),
        estado: g('Estado'),
        distribucion: g('Sala / distribución posible'),
        habilitacion: g('Habilitación y obras'),
        potencial: g('Potencial cultural / convocatoria'),
        observaciones: g('Observaciones / seguimiento'),
        fecha_hallazgo: fecha(g('Fecha hallazgo') ?? undefined),
        fecha_actualizacion: fecha(g('Última revisión') ?? undefined),
      };

      const manual = direccion ? geo[direccion] : undefined;
      if (manual && typeof manual !== 'string') {
        inmuebles.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [manual.lon, manual.lat] },
          properties: { ...p, direccion_normalizada: manual.normalizada, geocodificacion: `${geo._fuente}, ${geo._fecha}`, precision: manual.tipo === 'calle_altura' ? 'altura' : 'esquina', nota_ubicacion: manual.nota },
        });
        return;
      }
      if (!direccion || /no informad/i.test(direccion)) {
        pendientes.push({ ...p, motivo: 'Sin dirección publicada' });
        return;
      }
      const barrio = p.barrio ? porBarrio.get(norm(p.barrio)) : undefined;
      const clave = `${norm(direccion)}|${norm(p.barrio)}`;
      let res = cache[clave];
      if (res === undefined) {
        try { res = await geocodificarUSIG(direccion, barrio); } catch { res = null; }
        cache[clave] = res;
      }
      if (!res) {
        pendientes.push({ ...p, motivo: 'Dirección no encontrada o ambigua en USIG para el barrio informado' });
        return;
      }
      const enBarrio = barrioDe([res[0], res[1]], barrios)?.properties.nombre;
      inmuebles.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [res[0], res[1]] },
        properties: {
          ...p,
          direccion_normalizada: res[2],
          geocodificacion: 'USIG (automático al cargar la planilla)',
          precision: 'altura',
          nota_ubicacion: `Ubicación automática (${res[2]}${enBarrio && norm(enBarrio) !== norm(p.barrio) ? `, cae en ${enBarrio}` : ''}): verificar.`,
        },
      });
    }),
  );
  guardarCache(cache);
  inmuebles.sort((a, b) => a.properties.id.localeCompare(b.properties.id, 'es', { numeric: true }));
  const hora = new Date().toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
  return {
    inmuebles,
    pendientes,
    estado: { modo: 'en-vivo', detalle: `Planilla leída en vivo (${filas.length} filas, ${hora}).` },
  };
}
