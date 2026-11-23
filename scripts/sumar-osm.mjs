// Suma a public/data/espacios-culturales.geojson los lugares de OpenStreetMap que
// no figuran en el dataset del GCBA.
//
// Uso: node scripts/sumar-osm.mjs (lo corre `npm run datos` si existe el archivo crudo)
// Entrada: data/raw/osm-cultura.json (respuesta de Overpass, ver docs/fuentes.md)
//
// Duplicados: se descarta un lugar OSM si hay un espacio del GCBA de la misma capa a
// menos de 80 m, o con nombre equivalente a menos de 250 m.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const ENTRADA = 'data/raw/osm-cultura.json';
const ESPACIOS = 'public/data/espacios-culturales.geojson';
if (!existsSync(ENTRADA)) {
  console.log('OSM: sin data/raw/osm-cultura.json, no se suma nada');
  process.exit(0);
}
const osm = JSON.parse(readFileSync(ENTRADA, 'utf8'));
const geo = JSON.parse(readFileSync(ESPACIOS, 'utf8'));
const FECHA = osm.osm3s?.timestamp_osm_base?.slice(0, 10) ?? null;

const CAPA = (t) => {
  if (t.amenity === 'theatre') return ['teatro', 'Teatro (OSM)'];
  if (t.amenity === 'arts_centre') return ['centro_cultural', 'Centro de artes (OSM)'];
  if (t.amenity === 'cinema') return ['cine', 'Cine (OSM)'];
  if (t.amenity === 'music_venue') return ['musica', 'Música en vivo (OSM)'];
  if (t.amenity === 'library') return ['biblioteca', 'Biblioteca (OSM)'];
  if (t.tourism === 'museum') return ['museo', 'Museo (OSM)'];
  if (t.tourism === 'gallery') return ['galeria', 'Galería (OSM)'];
  return null;
};

const norm = (s) =>
  (s ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/\b(teatro|sala|centro|cultural|museo|biblioteca|cine|galeria|de|del|la|el|los|las|y)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ').trim();

const R = 6371000;
const dist = ([lon1, lat1], [lon2, lat2]) => {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
};

// Barrio por polígono (límites oficiales ya procesados)
const barrios = JSON.parse(readFileSync('public/data/barrios.geojson', 'utf8')).features;
const enAnillo = ([x, y], anillo) => {
  let dentro = false;
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
    const [xi, yi] = anillo[i];
    const [xj, yj] = anillo[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dentro = !dentro;
  }
  return dentro;
};
const barrioDe = (pt) => {
  for (const b of barrios) {
    const polys = b.geometry.type === 'Polygon' ? [b.geometry.coordinates] : b.geometry.coordinates;
    if (polys.some((p) => enAnillo(pt, p[0]) && !p.slice(1).some((h) => enAnillo(pt, h)))) return b;
  }
  return null;
};

const BBOX = { latMin: -34.71, latMax: -34.52, lonMin: -58.54, lonMax: -58.33 };
const gcba = geo.features.filter((f) => !f.properties.id.startsWith('osm-'));
const conteo = {};
let duplicados = 0;
const nuevos = [];

for (const e of osm.elements) {
  const t = e.tags ?? {};
  let capa = CAPA(t);
  if (!capa || !t.name) continue;
  if (/^anfi/i.test(t.name)) capa = ['otros', 'Anfiteatro (OSM)'];
  const lat = e.lat ?? e.center?.lat;
  const lon = e.lon ?? e.center?.lon;
  if (!(lat >= BBOX.latMin && lat <= BBOX.latMax && lon >= BBOX.lonMin && lon <= BBOX.lonMax)) continue;
  const pt = [lon, lat];
  const n = norm(t.name);
  const dup = [...gcba, ...nuevos].some((f) => {
    const d = dist(pt, f.geometry.coordinates);
    if (d < 80 && f.properties.categoria === capa[0]) return true;
    const m = norm(f.properties.nombre);
    return d < 250 && n && m && (n === m || (n.length > 4 && m.includes(n)) || (m.length > 4 && n.includes(m)));
  });
  if (dup) { duplicados++; continue; }
  const barrio = barrioDe(pt);
  if (!barrio) continue; // fuera de CABA
  const calle = [t['addr:street'], t['addr:housenumber']].filter(Boolean).join(' ');
  const web = t.website ?? t['contact:website'] ?? null;
  const ig = t['contact:instagram'] ?? null;
  const fb = t['contact:facebook'] ?? null;
  nuevos.push({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [Number(lon.toFixed(6)), Number(lat.toFixed(6))] },
    properties: {
      id: `osm-${e.type}-${e.id}`,
      nombre: t.name,
      categoria: capa[0],
      categoria_original: capa[1],
      subcategoria: null,
      funcion_secundaria: null,
      direccion: calle || null,
      barrio: barrio.properties.nombre,
      comuna: barrio.properties.comuna ? `COMUNA ${barrio.properties.comuna}` : null,
      capacidad: Number(t.capacity) || null,
      salas: Number(t.screen) || null,
      sala: null,
      telefono: t.phone ?? t['contact:phone'] ?? null,
      mail: t.email ?? t['contact:email'] ?? null,
      web: web && /^https?:\/\//i.test(web) ? web : web ? `http://${web}` : null,
      instagram: ig ? (/^https?:/i.test(ig) ? ig : `https://www.instagram.com/${ig.replace(/^@/, '')}/`) : null,
      facebook: fb ? (/^https?:/i.test(fb) ? fb : `https://www.facebook.com/${fb}`) : null,
      programacion: null,
      fuente: 'OpenStreetMap (colaboradores)',
      enlace: `https://www.openstreetmap.org/${e.type}/${e.id}`,
      fecha_fuente: FECHA,
      fecha_verificacion: null,
      estado: 'sin verificar',
      confianza: 'mapeo colaborativo, sin verificación propia',
    },
  });
  conteo[capa[0]] = (conteo[capa[0]] ?? 0) + 1;
}

geo.features = [...gcba, ...nuevos];
writeFileSync(ESPACIOS, JSON.stringify(geo));
console.log(`OSM: ${nuevos.length} lugares nuevos, ${duplicados} descartados por duplicados`, conteo);
