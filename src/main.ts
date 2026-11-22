import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './estilo.css';
import { CAPAS } from './capas';
import { fichaHTML } from './ficha';
import type { Coleccion, Espacio, EspacioFeature } from './tipos';

const CENTRO_CABA: L.LatLngExpression = [-34.6118, -58.4173];

const mapa = L.map('mapa', { preferCanvas: true, zoomControl: true }).setView(CENTRO_CABA, 12);
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  maxZoom: 19,
  subdomains: 'abcd',
  attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · © <a href="https://carto.com/attributions">CARTO</a>',
}).addTo(mapa);

const grupos = new Map<string, L.LayerGroup>();
const visibles = new Set(CAPAS.filter((c) => c.visible).map((c) => c.id));
let todos: EspacioFeature[] = [];

const norm = (s: string | null) => (s ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

function filtrados(): EspacioFeature[] {
  const q = norm((document.getElementById('buscar') as HTMLInputElement).value.trim());
  const barrio = (document.getElementById('barrio') as HTMLSelectElement).value;
  return todos.filter(({ properties: p }) => {
    if (barrio && p.barrio !== barrio) return false;
    if (q && !norm(`${p.nombre} ${p.direccion}`).includes(q)) return false;
    return true;
  });
}

function dibujar() {
  const lista = filtrados();
  const porCapa = new Map<string, number>();
  for (const g of grupos.values()) g.clearLayers();
  for (const f of lista) {
    const p = f.properties;
    porCapa.set(p.categoria, (porCapa.get(p.categoria) ?? 0) + 1);
    const def = CAPAS.find((c) => c.id === p.categoria)!;
    const [lon, lat] = f.geometry.coordinates;
    L.circleMarker([lat, lon], {
      radius: 5,
      color: '#fff',
      weight: 1,
      fillColor: def.color,
      fillOpacity: 0.85,
    })
      .bindPopup(() => fichaHTML(p), { maxWidth: 320 })
      .bindTooltip(p.nombre ?? '', { direction: 'top', offset: [0, -4] })
      .addTo(grupos.get(p.categoria)!);
  }
  for (const c of CAPAS) {
    const el = document.querySelector(`[data-conteo="${c.id}"]`);
    if (el) el.textContent = String(porCapa.get(c.id) ?? 0);
  }
  const enVista = lista.filter((f) => visibles.has(f.properties.categoria)).length;
  document.getElementById('resumen')!.textContent = `${enVista} espacios visibles de ${todos.length} con ubicación.`;
}

function armarCapas() {
  const ul = document.getElementById('capas')!;
  for (const c of CAPAS) {
    const g = L.layerGroup();
    grupos.set(c.id, g);
    if (c.visible) g.addTo(mapa);
    const li = document.createElement('li');
    li.innerHTML = `<label><input type="checkbox" ${c.visible ? 'checked' : ''} data-capa="${c.id}" />
      <span class="punto" style="background:${c.color}"></span>${c.nombre}
      <span class="conteo" data-conteo="${c.id}">0</span></label>`;
    ul.appendChild(li);
  }
  ul.addEventListener('change', (e) => {
    const input = e.target as HTMLInputElement;
    const id = input.dataset.capa;
    if (!id) return;
    const g = grupos.get(id)!;
    if (input.checked) { visibles.add(id); g.addTo(mapa); } else { visibles.delete(id); g.remove(); }
    dibujar();
  });
}

function armarPendientes(lista: Espacio[]) {
  document.getElementById('n-pendientes')!.textContent = String(lista.length);
  const ul = document.getElementById('pendientes')!;
  for (const p of lista) {
    const li = document.createElement('li');
    li.textContent = `${p.nombre ?? '(sin nombre)'} · ${p.categoria_original ?? ''} · ${p.direccion ?? 'sin dirección'}`;
    ul.appendChild(li);
  }
}

async function iniciar() {
  armarCapas();
  const base = import.meta.env.BASE_URL;
  const [col, pend] = await Promise.all([
    fetch(`${base}data/espacios-culturales.geojson`).then((r) => r.json() as Promise<Coleccion>),
    fetch(`${base}data/espacios-sin-coordenadas.json`).then((r) => r.json() as Promise<Espacio[]>),
  ]);
  todos = col.features;

  const barrios = [...new Set(todos.map((f) => f.properties.barrio).filter(Boolean))].sort() as string[];
  const sel = document.getElementById('barrio') as HTMLSelectElement;
  for (const b of barrios) sel.add(new Option(b, b));

  armarPendientes(pend);
  dibujar();

  let t: number | undefined;
  document.getElementById('buscar')!.addEventListener('input', () => { clearTimeout(t); t = window.setTimeout(dibujar, 200); });
  sel.addEventListener('change', dibujar);
  document.getElementById('toggle-panel')!.addEventListener('click', () => {
    document.getElementById('app')!.classList.toggle('sin-panel');
    setTimeout(() => mapa.invalidateSize(), 200);
  });
}

iniciar().catch((e) => {
  console.error(e);
  document.getElementById('resumen')!.textContent = 'Error al cargar los datos.';
});
