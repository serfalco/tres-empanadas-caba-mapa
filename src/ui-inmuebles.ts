// Etapa 4: capa G, oportunidades inmobiliarias.
import L from 'leaflet';
import { fichaInmuebleHTML } from './ficha';
import type { Datos } from './tipos';
import { $, esc, pesos } from './util';

interface Acciones {
  analizar: (id: string) => void;
  simular: (id: string) => void;
}

const ICONO = L.divIcon({ className: 'icono-inmueble', html: '<span>⌂</span>', iconSize: [26, 26], iconAnchor: [13, 13], popupAnchor: [0, -12] });

export function montarInmuebles(mapa: L.Map, datos: Datos, acciones: Acciones) {
  const capa = L.layerGroup().addTo(mapa);
  const marcadores = new Map<string, L.Marker>();

  for (const f of datos.inmuebles) {
    const [lon, lat] = f.geometry.coordinates;
    const m = L.marker([lat, lon], { icon: ICONO, pane: 'inmuebles', title: f.properties.direccion ?? '' })
      .bindPopup(() => fichaInmuebleHTML(f.properties), { maxWidth: 340 });
    marcadores.set(f.properties.id, m);
  }

  // Botones dentro de los popups
  mapa.getContainer().addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-accion]');
    if (!b?.dataset.id) return;
    if (b.dataset.accion === 'zona') acciones.analizar(b.dataset.id);
    if (b.dataset.accion === 'economia') acciones.simular(b.dataset.id);
    mapa.closePopup();
  });

  const alquiler = $('filtro-alquiler') as HTMLInputElement;
  const m2 = $('filtro-m2') as HTMLInputElement;
  const mostrar = $('capa-inmuebles') as HTMLInputElement;

  const aplicar = () => {
    const maxAlq = Number(alquiler.value);
    const minM2 = Number(m2.value);
    $('filtro-alquiler-valor').textContent = pesos(maxAlq);
    $('filtro-m2-valor').textContent = `${minM2} m²`;
    capa.clearLayers();
    const ok = datos.inmuebles.filter(
      (f) => (f.properties.alquiler ?? 0) <= maxAlq && (f.properties.superficie_m2 ?? 0) >= minM2,
    );
    if (mostrar.checked) for (const f of ok) marcadores.get(f.properties.id)!.addTo(capa);
    if (mostrar.checked && !mapa.hasLayer(capa)) capa.addTo(mapa);
    if (!mostrar.checked) capa.remove();

    const filas = [...ok]
      .sort((a, b) => (a.properties.alquiler ?? 0) - (b.properties.alquiler ?? 0))
      .map(({ properties: p }) => {
        const porM2 = p.alquiler && p.superficie_m2 ? Math.round(p.alquiler / p.superficie_m2) : null;
        return `<li>
          <button type="button" class="enlace" data-ir="${esc(p.id)}"><strong>${esc(p.direccion)}</strong></button>
          <span class="nota">${esc(p.barrio)} · ${esc(p.tipo)} · ${p.superficie_m2 ?? '?'} m²</span>
          <span>${pesos(p.alquiler)}${p.expensas ? ` + ${pesos(p.expensas)} exp.` : ''} · ${porM2 ? `${pesos(porM2)}/m²` : ''}</span>
          <span class="acciones">
            <button type="button" data-accion-lista="zona" data-id="${esc(p.id)}">Entorno</button>
            <button type="button" data-accion-lista="economia" data-id="${esc(p.id)}">Economía</button>
          </span>
        </li>`;
      });
    $('lista-inmuebles').innerHTML = filas.length
      ? `<ul class="tarjetas">${filas.join('')}</ul>`
      : '<p class="nota">Ningún inmueble cumple los filtros.</p>';
  };

  $('lista-inmuebles').addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const ir = t.closest<HTMLElement>('[data-ir]');
    if (ir) {
      const m = marcadores.get(ir.dataset.ir!)!;
      mapa.setView(m.getLatLng(), 16);
      m.openPopup();
      return;
    }
    const acc = t.closest<HTMLElement>('[data-accion-lista]');
    if (acc?.dataset.id) {
      if (acc.dataset.accionLista === 'zona') acciones.analizar(acc.dataset.id);
      else acciones.simular(acc.dataset.id);
    }
  });

  $('inmuebles-pendientes').innerHTML = datos.inmueblesPendientes
    .map((p) => `<li>${esc(p.barrio)} · ${esc(p.tipo)} · ${p.superficie_m2 ?? '?'} m² · ${pesos(p.alquiler)} — ${esc(p.motivo)}. ${p.enlace ? `<a href="${esc(p.enlace)}" target="_blank" rel="noopener">Búsqueda</a>` : ''}</li>`)
    .join('');

  [alquiler, m2].forEach((i) => i.addEventListener('input', aplicar));
  mostrar.addEventListener('change', aplicar);
  aplicar();
}
