import type { Espacio, Inmueble } from './tipos';
import { enlace, esc, pesos } from './util';

const fila = (k: string, v: unknown) =>
  v === null || v === undefined || v === '' ? '' : `<tr><th>${k}</th><td>${esc(v)}</td></tr>`;

export function fichaHTML(p: Espacio): string {
  const links = [enlace(p.web, 'Web'), enlace(p.instagram, 'Instagram')].filter(Boolean).join(' · ');
  return `
    <div class="ficha">
      <h3>${esc(p.nombre)}</h3>
      <table>
        ${fila('Categoría', [p.categoria_original, p.subcategoria].filter(Boolean).join(' · '))}
        ${fila('También', p.funcion_secundaria)}
        ${fila('Dirección', p.direccion)}
        ${fila('Barrio', [p.barrio, p.comuna].filter(Boolean).join(' · '))}
        ${fila('Capacidad', p.capacidad)}
        ${fila('Salas', p.salas)}
        ${fila('Estado', p.estado)}
      </table>
      ${links ? `<p>${links}</p>` : ''}
      <p class="fuente">Fuente: <a href="${esc(p.enlace)}" target="_blank" rel="noopener">${esc(p.fuente)}</a>, actualizada ${esc(p.fecha_fuente)}.</p>
    </div>`;
}

export function fichaInmuebleHTML(p: Inmueble): string {
  const m2 = p.alquiler && p.superficie_m2 ? Math.round(p.alquiler / p.superficie_m2) : null;
  return `
    <div class="ficha">
      <h3>${esc(p.direccion)}</h3>
      <table>
        ${fila('Barrio', p.barrio)}
        ${fila('Tipo', p.tipo)}
        ${fila('Superficie', p.superficie_m2 ? `${p.superficie_m2} m²` : null)}
        ${fila('Alquiler', pesos(p.alquiler))}
        ${fila('Expensas', p.expensas ? pesos(p.expensas) : 'Sin dato')}
        ${fila('Alquiler por m²', m2 ? pesos(m2) : null)}
        ${fila('Estado', p.estado)}
        ${fila('Distribución', p.distribucion)}
        ${fila('Habilitación', p.habilitacion)}
        ${fila('Potencial', p.potencial)}
        ${fila('Seguimiento', p.observaciones)}
        ${fila('Actualizado', p.fecha_actualizacion)}
      </table>
      ${p.nota_ubicacion ? `<p class="aviso">⚠ ${esc(p.nota_ubicacion)}</p>` : ''}
      <p>${enlace(p.enlace, `Publicación (${p.fuente ?? 'fuente'})`)}</p>
      <p class="acciones">
        <button type="button" data-accion="zona" data-id="${esc(p.id)}">Analizar entorno</button>
        <button type="button" data-accion="economia" data-id="${esc(p.id)}">Simular economía</button>
      </p>
      <p class="fuente">Fuente: planilla Oportunidades. Ubicación: ${esc(p.geocodificacion ?? '')}.</p>
    </div>`;
}
