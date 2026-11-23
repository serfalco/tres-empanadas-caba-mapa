// Prepara las capas de transporte, barrios e inmuebles a partir de data/raw/.
//
// Uso: npm run datos (corre junto con normalizar-espacios.mjs)
// Salidas en public/data/:
//   transporte.geojson   estaciones y líneas de subte y tren (recortadas a CABA)
//   barrios.geojson      polígonos de barrios con área y población 2010
//   inmuebles.geojson    oportunidades con ubicación verificada por USIG
//   inmuebles-pendientes.json  oportunidades sin ubicación verificada

import { readFileSync, writeFileSync } from 'node:fs';

const leer = (f) => JSON.parse(readFileSync(`data/raw/${f}`, 'utf8'));
const escribir = (f, obj) => writeFileSync(`public/data/${f}`, JSON.stringify(obj));
const norm = (s) => (s ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase().replace(/\s+/g, ' ').trim();
const r5 = (n) => Math.round(n * 1e5) / 1e5;

// Recuadro amplio de CABA (con margen para estaciones de borde)
const BBOX = { latMin: -34.72, latMax: -34.52, lonMin: -58.54, lonMax: -58.33 };
const dentro = ([lon, lat]) => lat >= BBOX.latMin && lat <= BBOX.latMax && lon >= BBOX.lonMin && lon <= BBOX.lonMax;

const FUENTE_BA = (dataset, fecha) => ({
  fuente: 'Datos Abiertos BA (GCBA)',
  enlace: `https://data.buenosaires.gob.ar/dataset/${dataset}`,
  licencia: 'CC-BY-2.5-AR',
  fecha_fuente: fecha,
});

// ---------- Transporte ----------
const transporte = [];

for (const f of leer('subte-estaciones.geojson').features) {
  transporte.push({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: f.geometry.coordinates.map(r5) },
    properties: { tipo: 'subte_estacion', nombre: f.properties.estacion, linea: f.properties.linea, ...FUENTE_BA('subte-estaciones', '2026-11-06') },
  });
}
for (const f of leer('subte-red.geojson').features) {
  const linea = String(f.properties.nombre ?? '').replace(/^Linea\s+/i, '');
  transporte.push({
    type: 'Feature',
    geometry: { type: f.geometry.type, coordinates: f.geometry.coordinates.map((c) => c.map(r5)) },
    properties: { tipo: 'subte_linea', nombre: f.properties.nombre, linea, ...FUENTE_BA('subte-estaciones', '2026-11-06') },
  });
}
for (const f of leer('tren-estaciones.geojson').features) {
  const c = f.geometry.coordinates;
  if (!dentro(c)) continue;
  transporte.push({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: c.map(r5) },
    properties: { tipo: 'tren_estacion', nombre: f.properties.nombre, linea: f.properties.linea, ramal: f.properties.ramal, ...FUENTE_BA('estaciones-ferrocarril', '2026-11-06') },
  });
}
// Líneas de tren: se recortan a los tramos dentro del recuadro y se simplifican
// (un vértice cada ~50 m aprox.) para aliviar el archivo.
for (const f of leer('tren-red.geojson').features) {
  const tramos = f.geometry.type === 'LineString' ? [f.geometry.coordinates] : f.geometry.coordinates;
  for (const tramo of tramos) {
    let actual = [];
    const salida = [];
    for (const c of tramo) {
      if (dentro(c)) {
        const prev = actual[actual.length - 1];
        if (!prev || Math.hypot(prev[0] - c[0], prev[1] - c[1]) > 0.0005) actual.push(c.map(r5));
      } else if (actual.length) { salida.push(actual); actual = []; }
    }
    if (actual.length) salida.push(actual);
    for (const s of salida.filter((s) => s.length > 1)) {
      transporte.push({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: s },
        properties: { tipo: 'tren_linea', nombre: (f.properties.linea_2 ?? f.properties.linea ?? '').trim(), ramal: (f.properties.ramal ?? '').trim(), ...FUENTE_BA('estaciones-ferrocarril', '2019-09-16') },
      });
    }
  }
}
escribir('transporte.geojson', { type: 'FeatureCollection', features: transporte });

// ---------- Barrios ----------
// Nombres que difieren entre datasets
const ALIAS = { BOCA: 'LA BOCA' };

function enAnillo([x, y], anillo) {
  let dentro = false;
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
    const [xi, yi] = anillo[i]; const [xj, yj] = anillo[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dentro = !dentro;
  }
  return dentro;
}
const enPoligono = (pt, geom) => {
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
  return polys.some((p) => enAnillo(pt, p[0]) && !p.slice(1).some((h) => enAnillo(pt, h)));
};
const espacios = JSON.parse(readFileSync('public/data/espacios-culturales.geojson', 'utf8')).features;

const poblacion = Object.fromEntries(
  readFileSync('data/raw/poblacion-barrios-2010.csv', 'utf8').trim().split(/\r?\n/).slice(1)
    .map((l) => l.split(',')).map(([b, p]) => [ALIAS[norm(b)] ?? norm(b), Number(p)]),
);
const barrios = leer('barrios.geojson').features.map((f) => {
  const area_km2 = f.properties.area_metro / 1e6;
  const pob = poblacion[norm(f.properties.nombre)] ?? null;
  const ring = (r) => r.map((c) => c.map(r5));
  const coords = f.geometry.type === 'Polygon'
    ? f.geometry.coordinates.map(ring)
    : f.geometry.coordinates.map((p) => p.map(ring));
  // Conteos por punto en polígono (no por el campo "barrio" de cada fuente)
  const cultura = {};
  for (const e of espacios) {
    if (enPoligono(e.geometry.coordinates, f.geometry)) cultura[e.properties.categoria] = (cultura[e.properties.categoria] ?? 0) + 1;
  }
  const est = (tipo) => transporte.filter((t) => t.properties.tipo === tipo && enPoligono(t.geometry.coordinates, f.geometry)).length;
  return {
    type: 'Feature',
    geometry: { type: f.geometry.type, coordinates: coords },
    properties: {
      cultura,
      estaciones_subte: est('subte_estacion'),
      estaciones_tren: est('tren_estacion'),
      nombre: f.properties.nombre,
      clave: norm(f.properties.nombre),
      comuna: f.properties.comuna,
      area_km2: Math.round(area_km2 * 100) / 100,
      poblacion_2010: pob,
      densidad_2010: pob ? Math.round(pob / area_km2) : null,
      ...FUENTE_BA('barrios', '2026-11-17'),
      fuente_poblacion: 'Censo 2010 (INDEC), publicado por GCBA en BA Data',
    },
  };
});
const sinPob = barrios.filter((b) => b.properties.poblacion_2010 === null).map((b) => b.properties.nombre);
escribir('barrios.geojson', { type: 'FeatureCollection', features: barrios });

// ---------- Inmuebles ----------
function parseCSV(texto) {
  const filas = []; let fila = []; let campo = ''; let q = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (q) { if (c === '"') { if (texto[i + 1] === '"') { campo += '"'; i++; } else q = false; } else campo += c; }
    else if (c === '"') q = true;
    else if (c === ',') { fila.push(campo); campo = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && texto[i + 1] === '\n') i++; fila.push(campo); filas.push(fila); fila = []; campo = ''; }
    else campo += c;
  }
  if (campo || fila.length) { fila.push(campo); filas.push(fila); }
  return filas.filter((f) => f.some((v) => v.trim()));
}
const num = (v) => { const s = (v ?? '').replace(/[^\d]/g, ''); return s ? Number(s) : null; };
const fecha = (v) => { const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec((v ?? '').trim()); return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : v || null; };

const [cab, ...filas] = parseCSV(readFileSync('data/raw/inmuebles-oportunidades.csv', 'utf8').replace(/^﻿/, ''));
const geo = leer('inmuebles-geocodificacion.json');
const inmuebles = [];
const pendientes = [];
filas.forEach((r, i) => {
  const g = (col) => (r[cab.indexOf(col)] ?? '').trim() || null;
  const direccion = g('Dirección / referencia');
  const alquiler = num(g('Alquiler ARS'));
  const expensas = num(g('Expensas ARS'));
  const p = {
    id: `inmueble-${i + 1}`,
    direccion,
    barrio: g('Barrio'),
    tipo: g('Tipo de inmueble'),
    superficie_m2: num(g('Superficie m²')),
    alquiler,
    expensas,
    costo_total: num(g('Costo total conocido ARS')) ?? (alquiler !== null ? alquiler + (expensas ?? 0) : null),
    enlace: g('Enlace publicación'),
    fuente: g('Fuente'),
    estado: g('Estado'),
    distribucion: g('Sala / distribución posible'),
    habilitacion: g('Habilitación y obras'),
    potencial: g('Potencial cultural / convocatoria'),
    observaciones: g('Observaciones / seguimiento'),
    fecha_hallazgo: fecha(g('Fecha hallazgo')),
    fecha_actualizacion: fecha(g('Última revisión')),
  };
  const ub = direccion ? geo[direccion] : null;
  if (!ub) { pendientes.push({ ...p, motivo: 'Sin dirección verificable' }); return; }
  inmuebles.push({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [ub.lon, ub.lat] },
    properties: { ...p, direccion_normalizada: ub.normalizada, geocodificacion: `${geo._fuente}, ${geo._fecha}`, precision: ub.tipo === 'calle_altura' ? 'altura' : 'esquina', nota_ubicacion: ub.nota },
  });
});
escribir('inmuebles.geojson', { type: 'FeatureCollection', features: inmuebles });
escribir('inmuebles-pendientes.json', pendientes);

console.log(`Transporte: ${transporte.length} elementos`);
console.log(`Barrios: ${barrios.length} (sin población: ${sinPob.join(', ') || 'ninguno'})`);
console.log(`Inmuebles: ${inmuebles.length} ubicados, ${pendientes.length} pendientes`);
