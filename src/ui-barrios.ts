// Etapa 5: capa H, indicadores por barrio (coropletas).
import L from 'leaflet';
import type { BarrioProps, Datos } from './tipos';
import { $, esc, num } from './util';

type Indicador = { nombre: string; valor: (p: BarrioProps) => number | null; unidad: string };

const PRINCIPALES = ['teatro', 'centro_cultural', 'bar', 'cine', 'musica'];
const totalCultura = (p: BarrioProps) => PRINCIPALES.reduce((s, c) => s + (p.cultura[c] ?? 0), 0);

const INDICADORES: Record<string, Indicador> = {
  cultura_km2: { nombre: 'Espacios culturales por km²', valor: (p) => totalCultura(p) / p.area_km2, unidad: '/km²' },
  teatro_km2: { nombre: 'Teatros por km²', valor: (p) => (p.cultura.teatro ?? 0) / p.area_km2, unidad: '/km²' },
  cultura_hab: {
    nombre: 'Espacios cada 10.000 hab. (pob. 2010)',
    valor: (p) => (p.poblacion_2010 ? (totalCultura(p) / p.poblacion_2010) * 10000 : null),
    unidad: '',
  },
  densidad: { nombre: 'Habitantes por km² (Censo 2010)', valor: (p) => p.densidad_2010, unidad: 'hab./km²' },
  estaciones: { nombre: 'Estaciones de subte y tren', valor: (p) => p.estaciones_subte + p.estaciones_tren, unidad: '' },
};

// Escala secuencial de un solo tono (claro = bajo, oscuro = alto).
const ESCALA = ['#fdeee7', '#f9c9b3', '#f09a7c', '#dc6a4f', '#b5452b'];

function cortes(valores: number[]): number[] {
  const v = [...valores].sort((a, b) => a - b);
  return [0.2, 0.4, 0.6, 0.8].map((q) => v[Math.floor(q * (v.length - 1))]);
}

function fmt(n: number) {
  return n >= 100 ? num(n) : n.toFixed(1).replace('.', ',');
}

export function fichaBarrioHTML(p: BarrioProps): string {
  const c = p.cultura;
  return `<div class="ficha"><h3>${esc(p.nombre)}</h3>
    <table>
      <tr><th>Comuna</th><td>${p.comuna}</td></tr>
      <tr><th>Superficie</th><td>${String(p.area_km2).replace('.', ',')} km²</td></tr>
      <tr><th>Población 2010</th><td>${num(p.poblacion_2010)}</td></tr>
      <tr><th>Densidad 2010</th><td>${num(p.densidad_2010)} hab./km²</td></tr>
      <tr><th>Teatros</th><td>${c.teatro ?? 0}</td></tr>
      <tr><th>Centros culturales</th><td>${c.centro_cultural ?? 0}</td></tr>
      <tr><th>Bares</th><td>${c.bar ?? 0}</td></tr>
      <tr><th>Cines</th><td>${c.cine ?? 0}</td></tr>
      <tr><th>Música en vivo</th><td>${c.musica ?? 0}</td></tr>
      <tr><th>Otros espacios</th><td>${c.otros ?? 0}</td></tr>
      <tr><th>Estaciones subte / tren</th><td>${p.estaciones_subte} / ${p.estaciones_tren}</td></tr>
    </table>
    <p class="fuente">Límites: BA Data (${esc(p.fecha_fuente)}). Población: ${esc(p.fuente_poblacion)}. Conteos por ubicación dentro del polígono.</p></div>`;
}

export function montarBarrios(mapa: L.Map, datos: Datos) {
  const capa = L.geoJSON(datos.barrios as unknown as GeoJSON.FeatureCollection, {
    pane: 'barrios',
    style: () => ({ color: '#999', weight: 1, fillOpacity: 0 }),
    onEachFeature: (f, layer) => {
      const p = f.properties as BarrioProps;
      layer.bindPopup(() => fichaBarrioHTML(p), { maxWidth: 300 });
    },
  });

  const sel = $('indicador-barrio') as HTMLSelectElement;
  const leyenda = $('leyenda-barrio');

  const aplicar = () => {
    const ind = INDICADORES[sel.value];
    if (!ind) {
      capa.remove();
      leyenda.innerHTML = '';
      return;
    }
    const valores = datos.barrios.map((b) => ind.valor(b.properties)).filter((v): v is number => v !== null);
    const c = cortes(valores);
    const color = (v: number | null) => (v === null ? '#eee' : ESCALA[c.filter((x) => v > x).length]);
    capa.setStyle((f) => {
      const v = ind.valor((f as unknown as { properties: BarrioProps }).properties);
      return { color: '#888', weight: 1, fillColor: color(v), fillOpacity: 0.55 };
    });
    capa.eachLayer((l) => {
      const p = ((l as L.GeoJSON).feature as unknown as { properties: BarrioProps }).properties;
      const v = ind.valor(p);
      (l as L.Path).bindTooltip(`${esc(p.nombre)}: ${v === null ? 's/d' : fmt(v)} ${ind.unidad}`, { sticky: true });
    });
    capa.addTo(mapa);
    const min = Math.min(...valores);
    const max = Math.max(...valores);
    const limites = [min, ...c, max];
    leyenda.innerHTML = `<p class="nota">${esc(ind.nombre)} (quintiles)</p><ul>${ESCALA.map(
      (col, i) => `<li><span class="cuadro" style="background:${col}"></span>${fmt(limites[i])} – ${fmt(limites[i + 1])}</li>`,
    ).join('')}</ul>`;
  };
  sel.addEventListener('change', aplicar);
}
