// Normaliza el dataset oficial "Espacios culturales" (BA Data) al modelo común
// del proyecto y genera public/data/espacios-culturales.geojson.
//
// Uso: npm run datos
// Entrada: data/raw/espacios-culturales.csv (descarga sin modificar)
// Salida:  public/data/espacios-culturales.geojson
//          public/data/espacios-sin-coordenadas.json (registros sin ubicación válida)

import { readFileSync, writeFileSync } from 'node:fs';

const ENTRADA = 'data/raw/espacios-culturales.csv';
const SALIDA = 'public/data/espacios-culturales.geojson';
const SALIDA_PENDIENTES = 'public/data/espacios-sin-coordenadas.json';

const FUENTE = {
  nombre: 'Datos Abiertos BA — Ministerio de Cultura GCBA',
  dataset: 'https://data.buenosaires.gob.ar/dataset/espacios-culturales',
  recurso:
    'https://cdn.buenosaires.gob.ar/datosabiertos/datasets/ministerio-de-cultura/espacios-culturales/espacios-culturales.csv',
  licencia: 'CC-BY-2.5-AR',
  // metadata_modified del dataset en la API CKAN al momento de la descarga
  fecha_fuente: '2026-06-18',
  fecha_descarga: '2026-11-22',
};

// FUNCION_PRINCIPAL del dataset -> capa del mapa (ver docs/decisiones.md)
const CAPAS = {
  'SALA DE TEATRO': 'teatro',
  'CENTRO CULTURAL': 'centro_cultural',
  BAR: 'bar',
  'SALA DE CINE': 'cine',
  'CLUB DE MUSICA EN VIVO': 'musica',
  'CLUB DE MUSICA EN VIVO - NUEVO': 'musica',
  MUSEO: 'museo',
  'GALERIA DE ARTE': 'galeria',
  BIBLIOTECA: 'biblioteca',
  LIBRERIA: 'libreria',
  DISQUERIA: 'libreria',
  'ESPACIO DE FORMACION': 'formacion',
  // MONUMENTOS Y LUGARES HISTORICOS, ESPACIO FERIAL, CALESITA, ANFITEATRO -> 'otros'
};

// Límites aproximados de CABA para descartar coordenadas erróneas
const BBOX = { latMin: -34.71, latMax: -34.52, lonMin: -58.54, lonMax: -58.33 };

/** Parser CSV mínimo (RFC 4180: comillas, comas y saltos de línea dentro de campos). */
function parseCSV(texto) {
  const filas = [];
  let fila = [];
  let campo = '';
  let comillas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (comillas) {
      if (c === '"') {
        if (texto[i + 1] === '"') { campo += '"'; i++; } else comillas = false;
      } else campo += c;
    } else if (c === '"') comillas = true;
    else if (c === ',') { fila.push(campo); campo = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++;
      fila.push(campo); filas.push(fila); fila = []; campo = '';
    } else campo += c;
  }
  if (campo || fila.length) { fila.push(campo); filas.push(fila); }
  return filas.filter((f) => f.some((v) => v.trim() !== ''));
}

const limpiar = (v) => {
  const s = (v ?? '').trim();
  return s === '' || s.toUpperCase() === 'NA' ? null : s;
};

const titulo = (s) =>
  s ? s.toLowerCase().replace(/(^|[\s(/-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase()) : s;

const texto = readFileSync(ENTRADA, 'utf8').replace(/^﻿/, '');
const [cabecera, ...registros] = parseCSV(texto);
const idx = Object.fromEntries(cabecera.map((h, i) => [h, i]).filter(([h]) => h));

const features = [];
const pendientes = [];
const conteo = {};

for (const r of registros) {
  const g = (col) => limpiar(r[idx[col]]);
  const funcion = g('FUNCION_PRINCIPAL');
  const capa = CAPAS[funcion] ?? 'otros';
  const lat = Number(g('LATITUD'));
  const lon = Number(g('LONGITUD'));
  const url = (v) => (v && !/^https?:\/\//i.test(v) ? `http://${v.toLowerCase()}` : v);
  const ig = g('INSTAGRAM');

  const props = {
    id: `bacultura-${g('fid')}`,
    nombre: titulo(g('ESTABLECIMIENTO')),
    categoria: capa,
    categoria_original: funcion,
    subcategoria: g('SUBCATEGORIA'),
    funcion_secundaria: g('FUNCION_SECUNDARIA'),
    direccion: g('DIRECCION'),
    barrio: titulo(g('BARRIO')),
    comuna: g('COMUNA'),
    capacidad: g('CAPACIDAD_TOTAL') ? Number(g('CAPACIDAD_TOTAL')) || null : null,
    salas: g('CANTIDAD_SALAS') ? Number(g('CANTIDAD_SALAS')) || null : null,
    sala: [g('SUCURSAL'), g('SALA')].filter(Boolean).map(titulo).join(' · ') || null,
    telefono: g('TELEFONO'),
    mail: g('MAIL')?.toLowerCase() ?? null,
    web: url(g('WEB')),
    instagram: ig ? (/^@/.test(ig) ? `https://www.instagram.com/${ig.slice(1)}/` : url(ig)) : null,
    facebook: url(g('FACEBOOK')),
    programacion: g('PROGRAMACION') ? /^s/i.test(g('PROGRAMACION')) : null,
    fuente: FUENTE.nombre,
    enlace: FUENTE.dataset,
    fecha_fuente: FUENTE.fecha_fuente,
    fecha_verificacion: null,
    estado: 'sin verificar',
    confianza: 'fuente oficial, sin verificación propia',
  };

  const valida =
    Number.isFinite(lat) && Number.isFinite(lon) &&
    lat >= BBOX.latMin && lat <= BBOX.latMax && lon >= BBOX.lonMin && lon <= BBOX.lonMax;

  if (!valida) {
    pendientes.push({ ...props, latitud_original: g('LATITUD'), longitud_original: g('LONGITUD') });
    continue;
  }
  conteo[capa] = (conteo[capa] ?? 0) + 1;
  features.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [lon, lat] }, properties: props });
}

writeFileSync(
  SALIDA,
  JSON.stringify({ type: 'FeatureCollection', metadata: { fuente: FUENTE, total: features.length, por_capa: conteo }, features }),
);
writeFileSync(SALIDA_PENDIENTES, JSON.stringify(pendientes, null, 2));

console.log(`Registros leídos: ${registros.length}`);
console.log(`Con coordenadas válidas: ${features.length}`);
console.log(`Sin coordenadas válidas: ${pendientes.length}`);
console.log('Por capa:', conteo);
