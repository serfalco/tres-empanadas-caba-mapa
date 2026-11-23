// Etapa 4: capa F, transporte (subte y tren).
import L from 'leaflet';
import { COLOR_COLECTIVO, COLOR_METROBUS, COLOR_SUBTE, COLOR_TREN } from './capas';
import type { Datos } from './tipos';
import { $, esc } from './util';

export function montarTransporte(mapa: L.Map, datos: Datos) {
  const subte = L.layerGroup();
  const tren = L.layerGroup();
  const metrobus = L.layerGroup();

  for (const f of datos.transporte) {
    const p = f.properties;
    const fuente = `<p class="fuente">Fuente: <a href="${esc(p.enlace)}" target="_blank" rel="noopener">${esc(p.fuente)}</a>, ${esc(p.fecha_fuente)}.</p>`;
    if (f.geometry.type === 'LineString') {
      const latlngs = f.geometry.coordinates.map(([lon, lat]) => [lat, lon] as L.LatLngTuple);
      if (p.tipo === 'metrobus_linea') {
        L.polyline(latlngs, { pane: 'transporte', color: COLOR_METROBUS, weight: 5, opacity: 0.6, interactive: false }).addTo(metrobus);
      } else if (p.tipo === 'subte_linea') {
        L.polyline(latlngs, { pane: 'transporte', color: COLOR_SUBTE[p.linea ?? ''] ?? '#333', weight: 4, opacity: 0.9, interactive: false }).addTo(subte);
      } else {
        L.polyline(latlngs, { pane: 'transporte', color: COLOR_TREN, weight: 2, opacity: 0.7, dashArray: '6 4', interactive: false }).addTo(tren);
      }
    } else {
      const [lon, lat] = f.geometry.coordinates;
      if (p.tipo === 'metrobus_estacion') {
        L.circleMarker([lat, lon], { pane: 'transporte', radius: 3, color: COLOR_METROBUS, weight: 2, fillColor: '#fff', fillOpacity: 1 })
          .bindTooltip(`Metrobus ${esc(p.nombre)} · líneas ${esc(p.linea)}`)
          .addTo(metrobus);
      } else if (p.tipo === 'subte_estacion') {
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
  enlazar('capa-metrobus', metrobus);

  // Paradas de colectivo: ~7.000 puntos, sólo desde zoom 14 para no saturar.
  const colectivos = L.layerGroup();
  const fuenteCol = `Fuente: <a href="${esc(datos.colectivos.enlace)}" target="_blank" rel="noopener">${esc(datos.colectivos.fuente)}</a>, ${esc(datos.colectivos.fecha_fuente)}.`;
  for (const [lon, lat, lineas] of datos.colectivos.paradas) {
    L.circleMarker([lat, lon], { pane: 'transporte', radius: 2.5, color: COLOR_COLECTIVO, weight: 1, fillColor: COLOR_COLECTIVO, fillOpacity: 0.8 })
      .bindTooltip(`Colectivo: ${esc(lineas.split(',').join(', '))}`)
      .bindPopup(`<div class="ficha"><h3>Parada de colectivo</h3><p>Líneas: ${esc(lineas.split(',').join(', '))}</p><p class="fuente">${fuenteCol}</p></div>`)
      .addTo(colectivos);
  }
  const inputCol = $('capa-colectivos') as HTMLInputElement;
  const aplicarCol = () => {
    const ver = inputCol.checked && mapa.getZoom() >= 14;
    if (ver && !mapa.hasLayer(colectivos)) colectivos.addTo(mapa);
    if (!ver && mapa.hasLayer(colectivos)) colectivos.remove();
  };
  inputCol.addEventListener('change', aplicarCol);
  mapa.on('zoomend', aplicarCol);
}
