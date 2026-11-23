export const esc = (s: unknown): string =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export const norm = (s: string | null | undefined) =>
  (s ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

/** Distancia en metros entre dos puntos [lon, lat]. */
export function distancia([lon1, lat1]: [number, number], [lon2, lat2]: [number, number]): number {
  const R = 6371000;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function enAnillo([x, y]: [number, number], anillo: number[][]): boolean {
  let dentro = false;
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
    const [xi, yi] = anillo[i];
    const [xj, yj] = anillo[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dentro = !dentro;
  }
  return dentro;
}

export function enPoligono(
  pt: [number, number],
  geom: { type: 'Polygon'; coordinates: number[][][] } | { type: 'MultiPolygon'; coordinates: number[][][][] },
): boolean {
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
  return polys.some((p) => enAnillo(pt, p[0]) && !p.slice(1).some((h) => enAnillo(pt, h)));
}

const fmtNum = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });
export const num = (n: number | null | undefined) =>
  n === null || n === undefined || Number.isNaN(n) ? '—' : fmtNum.format(n);
export const pesos = (n: number | null | undefined) =>
  n === null || n === undefined || Number.isNaN(n) ? '—' : `${n < 0 ? '−' : ''}$${fmtNum.format(Math.abs(n))}`;
export const metros = (m: number) =>
  m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1).replace('.', ',')} km`;

export const enlace = (url: string | null | undefined, texto: string) =>
  url && /^https?:\/\//i.test(url) ? `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(texto)}</a>` : '';

export function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Falta #${id}`);
  return el;
}

export function guardarLocal(clave: string, valor: unknown) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    /* sin almacenamiento disponible */
  }
}

export function leerLocal<T extends object>(clave: string, defecto: T): T {
  try {
    const v = localStorage.getItem(clave);
    return v ? { ...defecto, ...JSON.parse(v) } : defecto;
  } catch {
    return defecto;
  }
}
