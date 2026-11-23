// Etapa 4: capa F, transporte (subte y tren).
import L from 'leaflet';
import { COLOR_SUBTE, COLOR_TREN } from './capas';
import type { Datos } from './tipos';
import { $, esc } from './util';

export function montarTransporte(mapa: L.Map, datos: Datos) {
  const subte = L.layerGroup();
  const tren = L.layerGroup();

  for (const f of datos.transporte) {
    const p = f.properties;
    const fuente = `<p class="fuente">Fuente: <a href="${esc(p.enlace)}" target="_blank" rel="noopener">${esc(p.fuente)}</a>, ${esc(p.fecha_fuente)}.</p>`;
    if (f.geometry.type === 'LineString') {
      const latlngs = f.geometry.coordinates.map(([lon, lat]) => [lat, lon] as L.LatLngTuple);
      if (p.tipo === 'subte_linea') {
        L.polyline(latlngs, { pane: 'transporte', color: COLOR_SUBTE[p.linea ?? ''] ?? '#333', weight: 4, opacity: 0.9, interactive: false }).addTo(subte);
      } else {
        L.polyline(latlngs, { pane: 'transporte', color: COLOR_TREN, weight: 2, opacity: 0.7, dashArray: '6 4', interactive: false }).addTo(tren);
      }
    } else {
      const [lon, lat] = f.geometry.coordinates;
      if (p.tipo === 'subte_estacion') {
        L.circleMarker([lat, lon], { pane: 'transporte', radius: 4, color: COLOR_SUBTE[p.linea ?? ''] ?? '#333', weight: 2, fillColor: '#fff', fillOpacity: 1 })
          .bindTooltip(`${esc(p.nombre)} · Línea ${esc(p.linea)}`)
          .bindPopup(`<div class="ficha"><h3>${esc(p.nombre)}</h3><p>Subte, línea ${esc(p.linea)}</p>${fuente}</div>`)
          .addTo(subte);
      } else {
        L.circleMarker([lat, lon], { pane: 'transporte', radius: 4, color: COLOR_TREN, weight: 2, fillColor: '#fff', fillOpacity: 1 })
          .bindTooltip(`${esc(p.nombre)} · ${esc(p.linea)}`)
          .bindPopup(`<div class="ficha"><h3>Estación ${esc(p.nombre)}</h3><p>${esc(p.linea)}<br>${esc(p.ramal ?? '')}</p>${fuente}</div>`)
          .addTo(tren);
      }
    }
  }

  const enlazar = (id: string, capa: L.LayerGroup) => {
    const input = $(id) as HTMLInputElement;
    const aplicar = () => (input.checked ? capa.addTo(mapa) : capa.remove());
    input.addEventListener('change', aplicar);
    aplicar();
  };
  enlazar('capa-subte', subte);
  enlazar('capa-tren', tren);
}
