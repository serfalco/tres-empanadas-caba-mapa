import './leaflet-global';
import L from 'leaflet';
import 'leaflet.heat';
import 'leaflet/dist/leaflet.css';
import './estilo.css';
import { CAPAS_CULTURA } from './capas';
import { fichaHTML } from './ficha';
import { montarBarrios } from './ui-barrios';
import { montarEconomia } from './ui-economia';
import { montarInmuebles } from './ui-inmuebles';
import { montarTransporte } from './ui-transporte';
import { montarZona } from './ui-zona';
import { cargarPlanilla, type Geocodificacion } from './planilla';
import type { BarrioFeature, Coleccion, Colectivos, Datos, Espacio, EspacioFeature, Inmueble, InmuebleFeature, TransporteFeature } from './tipos';
import { $, metros, norm } from './util';

const CENTRO_CABA: L.LatLngExpression = [-34.6118, -58.4173];

const mapa = L.map('mapa', { preferCanvas: true, zoomControl: true }).setView(CENTRO_CABA, 12);
// Mapa base de OpenStreetMap: gratuito y sin clave (CARTO pasó a exigir API key).
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  className: 'base-suave',
  attribution: '© <a href="https://www.openstreetmap.org/copyright">colaboradores de OpenStreetMap</a>',
}).addTo(mapa);

// Panes para ordenar capas: barrios abajo, transporte en el medio, puntos arriba.
(window as unknown as { mapaTres: L.Map }).mapaTres = mapa; // para depurar desde la consola
mapa.createPane('barrios').style.zIndex = '350';
// Con canvas, cada pane tiene su propio lienzo y el de arriba se "come" los clics de los de abajo.
// Por eso las líneas de transporte y el calor no reciben eventos, y las estaciones y paradas
// comparten el lienzo de los espacios culturales (overlayPane).
const paneTransporte = mapa.createPane('transporte');
paneTransporte.style.zIndex = '420';
paneTransporte.style.pointerEvents = 'none';
const paneCalor = mapa.createPane('calor');
paneCalor.style.zIndex = '430';
paneCalor.style.pointerEvents = 'none';
mapa.createPane('inmuebles').style.zIndex = '650';

// ---------- Pestañas ----------
export function irAPestana(id: string) {
  document.querySelectorAll<HTMLButtonElement>('[data-pestana]').forEach((b) =>
    b.setAttribute('aria-selected', String(b.dataset.pestana === id)),
  );
  document.querySelectorAll<HTMLElement>('[data-vista]').forEach((v) => (v.hidden = v.dataset.vista !== id));
  const app = document.getElementById('app')!;
  app.classList.remove('sin-panel');
  const ancho = id === 'zona' || id === 'economia';
  if (app.classList.contains('ancho') !== ancho) {
    app.classList.toggle('ancho', ancho);
    setTimeout(() => mapa.invalidateSize(), 50);
  }
}
document.querySelector('.pestanas')!.addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-pestana]');
  if (b) irAPestana(b.dataset.pestana!);
});

// ---------- Espacios culturales ----------
const grupos = new Map<string, L.LayerGroup>();
const visibles = new Set(CAPAS_CULTURA.filter((c) => c.visible).map((c) => c.id));
let espacios: EspacioFeature[] = [];
let ocultarPuntosPorCalor = false;

function filtrados(): EspacioFeature[] {
  const q = norm(($('buscar') as HTMLInputElement).value.trim());
  const barrio = ($('barrio') as HTMLSelectElement).value;
  return espacios.filter(({ properties: p }) => {
    if (barrio && p.barrio !== barrio) return false;
    if (q && !norm(`${p.nombre} ${p.direccion}`).includes(q)) return false;
    return true;
  });
}

function dibujarEspacios() {
  const lista = filtrados();
  const porCapa = new Map<string, number>();
  for (const g of grupos.values()) g.clearLayers();
  for (const f of lista) {
    const p = f.properties;
    porCapa.set(p.categoria, (porCapa.get(p.categoria) ?? 0) + 1);
    const def = CAPAS_CULTURA.find((c) => c.id === p.categoria)!;
    const [lon, lat] = f.geometry.coordinates;
    L.circleMarker([lat, lon], { radius: 5, color: '#fff', weight: 1, fillColor: def.color, fillOpacity: 0.85 })
      .bindPopup(() => fichaHTML(p, f.geometry.coordinates), { maxWidth: 320 })
      .bindTooltip(p.nombre ?? '', { direction: 'top', offset: [0, -4] })
      .addTo(grupos.get(p.categoria)!);
  }
  for (const c of CAPAS_CULTURA) {
    const el = document.querySelector(`[data-conteo="${c.id}"]`);
    if (el) el.textContent = String(porCapa.get(c.id) ?? 0);
  }
  const enVista = lista.filter((f) => visibles.has(f.properties.categoria)).length;
  $('resumen').textContent = `${enVista} espacios visibles de ${espacios.length} con ubicación.`;
  actualizarCalor();
}

function sincronizarGrupos() {
  for (const c of CAPAS_CULTURA) {
    const g = grupos.get(c.id)!;
    const mostrar = visibles.has(c.id) && !ocultarPuntosPorCalor;
    if (mostrar && !mapa.hasLayer(g)) g.addTo(mapa);
    if (!mostrar && mapa.hasLayer(g)) g.remove();
  }
}

function armarCapas() {
  const ul = $('capas');
  for (const c of CAPAS_CULTURA) {
    grupos.set(c.id, L.layerGroup());
    const li = document.createElement('li');
    li.innerHTML = `<label class="check"><input type="checkbox" ${c.visible ? 'checked' : ''} data-capa="${c.id}" />
      <span class="punto" style="background:${c.color}"></span>${c.nombre}
      <span class="conteo" data-conteo="${c.id}">0</span></label>`;
    ul.appendChild(li);
  }
  sincronizarGrupos();
  ul.addEventListener('change', (e) => {
    const id = (e.target as HTMLInputElement).dataset.capa;
    if (!id) return;
    if ((e.target as HTMLInputElement).checked) visibles.add(id);
    else visibles.delete(id);
    sincronizarGrupos();
    dibujarEspacios();
  });
}

// ---------- Mapa de calor (etapa 3) ----------
const pesos = new Map(CAPAS_CULTURA.map((c) => [c.id, c.pesoCalor]));
let radioCalor = 400; // metros
const calor = L.heatLayer([], { pane: 'calor', radius: 20, blur: 15, maxZoom: 15, minOpacity: 0.25 } as L.HeatMapOptions);

function metrosAPixeles(m: number) {
  const lat = mapa.getCenter().lat;
  const mpp = (156543.03392 * Math.cos((lat * Math.PI) / 180)) / 2 ** mapa.getZoom();
  return Math.max(2, m / mpp);
}

function actualizarCalor() {
  if (!mapa.hasLayer(calor)) return;
  const puntos: L.HeatLatLngTuple[] = [];
  for (const f of filtrados()) {
    const w = pesos.get(f.properties.categoria) ?? 0;
    if (w > 0) puntos.push([f.geometry.coordinates[1], f.geometry.coordinates[0], w]);
  }
  const r = metrosAPixeles(radioCalor);
  // max relativo: evita que un solo punto sature el color
  calor.setOptions({ radius: r, blur: r * 0.8, max: Math.max(1, Math.max(...pesos.values())) * 3 });
  calor.setLatLngs(puntos);
}

function armarCalor() {
  const ul = $('calor-pesos');
  for (const c of CAPAS_CULTURA) {
    const li = document.createElement('li');
    li.innerHTML = `<label><span class="punto" style="background:${c.color}"></span>${c.nombre.split(' (')[0]}
      <input type="range" min="0" max="3" step="0.5" value="${c.pesoCalor}" data-peso="${c.id}" />
      <output data-peso-valor="${c.id}">${c.pesoCalor}</output></label>`;
    ul.appendChild(li);
  }
  ul.addEventListener('input', (e) => {
    const input = e.target as HTMLInputElement;
    const id = input.dataset.peso;
    if (!id) return;
    pesos.set(id, Number(input.value));
    document.querySelector(`[data-peso-valor="${id}"]`)!.textContent = input.value;
    actualizarCalor();
  });
  $('calor-activo').addEventListener('change', (e) => {
    const on = (e.target as HTMLInputElement).checked;
    $('calor-opciones').hidden = !on;
    if (on) calor.addTo(mapa);
    else calor.remove();
    ocultarPuntosPorCalor = on && ($('calor-ocultar-puntos') as HTMLInputElement).checked;
    sincronizarGrupos();
    actualizarCalor();
  });
  $('calor-ocultar-puntos').addEventListener('change', (e) => {
    ocultarPuntosPorCalor = (e.target as HTMLInputElement).checked && mapa.hasLayer(calor);
    sincronizarGrupos();
  });
  $('calor-radio').addEventListener('input', (e) => {
    radioCalor = Number((e.target as HTMLInputElement).value);
    $('calor-radio-valor').textContent = metros(radioCalor);
    actualizarCalor();
  });
  mapa.on('zoomend', actualizarCalor);
}

function armarPendientes(lista: Espacio[]) {
  $('n-pendientes').textContent = String(lista.length);
  const ul = $('pendientes');
  for (const p of lista) {
    const li = document.createElement('li');
    li.textContent = `${p.nombre ?? '(sin nombre)'} · ${p.categoria_original ?? ''} · ${p.direccion ?? 'sin dirección'}`;
    ul.appendChild(li);
  }
}

const BASE = import.meta.env.BASE_URL;
function j<T>(f: string): Promise<T> {
  return fetch(`${BASE}data/${f}`, { credentials: 'same-origin' }).then((r) => {
    if (!r.ok) throw new Error(`${f}: ${r.status}`);
    return r.json() as Promise<T>;
  });
}

/** Inmuebles: intenta la planilla en vivo (con tope de tiempo); si falla, usa la copia incluida. */
async function cargarInmuebles(barrios: BarrioFeature[]) {
  const [inm, inmPend] = await Promise.all([
    j<Coleccion<InmuebleFeature>>('inmuebles.geojson'),
    j<Inmueble[]>('inmuebles-pendientes.json'),
  ]);
  let r = { inmuebles: inm.features, pendientes: inmPend, estado: 'Copia incluida en el sitio (exportada el 2026-11-23). No se pudo leer la planilla en vivo.' };
  try {
    const geo = await j<Geocodificacion>('inmuebles-geocodificacion.json');
    const tope = new Promise<null>((ok) => setTimeout(() => ok(null), 15000));
    const vivo = await Promise.race([cargarPlanilla(barrios, geo), tope]);
    if (vivo) r = { inmuebles: vivo.inmuebles, pendientes: vivo.pendientes, estado: vivo.estado.detalle };
  } catch (e) {
    console.warn('Planilla en vivo no disponible', e);
  }
  return r;
}

async function iniciar() {
  armarCapas();
  armarCalor();
  // 1. Capas base: se dibujan apenas llegan, sin esperar la planilla.
  const [esp, espPend, trans, barrios, colectivos] = await Promise.all([
    j<Coleccion<EspacioFeature>>('espacios-culturales.geojson'),
    j<Espacio[]>('espacios-sin-coordenadas.json'),
    j<Coleccion<TransporteFeature>>('transporte.geojson'),
    j<Coleccion<BarrioFeature>>('barrios.geojson'),
    j<Colectivos>('colectivos.json'),
  ]);
  espacios = esp.features;
  const nombres = [...new Set(espacios.map((f) => f.properties.barrio).filter(Boolean))].sort() as string[];
  const sel = $('barrio') as HTMLSelectElement;
  for (const b of nombres) sel.add(new Option(b, b));
  armarPendientes(espPend);
  dibujarEspacios();

  let t: number | undefined;
  $('buscar').addEventListener('input', () => {
    clearTimeout(t);
    t = window.setTimeout(dibujarEspacios, 200);
  });
  sel.addEventListener('change', dibujarEspacios);
  $('toggle-panel').addEventListener('click', () => {
    $('app').classList.toggle('sin-panel');
    setTimeout(() => mapa.invalidateSize(), 200);
  });

  const datos: Datos = {
    espacios,
    espaciosPendientes: espPend,
    transporte: trans.features,
    barrios: barrios.features,
    inmuebles: [],
    inmueblesPendientes: [],
    colectivos,
  };
  montarTransporte(mapa, datos);
  montarBarrios(mapa, datos);

  // 2. Inmuebles (planilla en vivo) y módulos que dependen de ellos.
  const inm = await cargarInmuebles(datos.barrios);
  datos.inmuebles = inm.inmuebles;
  datos.inmueblesPendientes = inm.pendientes;
  $('estado-planilla').textContent = inm.estado;
  const zona = montarZona(mapa, datos, irAPestana);
  const eco = montarEconomia(datos);
  montarInmuebles(mapa, datos, {
    analizar: (id) => zona.analizarInmueble(id),
    simular: (id) => { eco.seleccionar(id); irAPestana('economia'); },
  });
}

iniciar().catch((e) => {
  console.error(e);
  $('resumen').textContent = `Error al cargar los datos: ${e instanceof Error ? e.message : e}`;
});
