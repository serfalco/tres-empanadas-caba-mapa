import type { Espacio } from './tipos';

const esc = (s: unknown): string =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const fila = (k: string, v: unknown) => (v === null || v === undefined || v === '' ? '' : `<tr><th>${k}</th><td>${esc(v)}</td></tr>`);

const enlace = (url: string | null, texto: string) =>
  url && /^https?:\/\//i.test(url) ? `<a href="${esc(url)}" target="_blank" rel="noopener">${texto}</a>` : '';

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
