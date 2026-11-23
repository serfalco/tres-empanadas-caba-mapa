export interface Espacio {
  id: string;
  nombre: string | null;
  categoria: string;
  categoria_original: string | null;
  subcategoria: string | null;
  funcion_secundaria: string | null;
  direccion: string | null;
  barrio: string | null;
  comuna: string | null;
  capacidad: number | null;
  salas: number | null;
  web: string | null;
  instagram: string | null;
  fuente: string;
  enlace: string;
  fecha_fuente: string;
  fecha_verificacion: string | null;
  estado: string;
  confianza: string;
}

export interface EspacioFeature {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: Espacio;
}

export interface Coleccion<F> {
  type: 'FeatureCollection';
  features: F[];
}

export interface Inmueble {
  id: string;
  direccion: string | null;
  direccion_normalizada?: string;
  barrio: string | null;
  tipo: string | null;
  superficie_m2: number | null;
  alquiler: number | null;
  expensas: number | null;
  costo_total: number | null;
  enlace: string | null;
  fuente: string | null;
  estado: string | null;
  distribucion: string | null;
  habilitacion: string | null;
  potencial: string | null;
  observaciones: string | null;
  fecha_hallazgo: string | null;
  fecha_actualizacion: string | null;
  geocodificacion?: string;
  precision?: string;
  nota_ubicacion?: string | null;
  motivo?: string;
}

export interface InmuebleFeature {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: Inmueble;
}

export interface TransporteProps {
  tipo: 'subte_estacion' | 'subte_linea' | 'tren_estacion' | 'tren_linea';
  nombre: string;
  linea?: string;
  ramal?: string;
  fuente: string;
  enlace: string;
  fecha_fuente: string;
}

export type PuntoGeom = { type: 'Point'; coordinates: [number, number] };
export type LineaGeom = { type: 'LineString'; coordinates: [number, number][] };

export interface TransporteFeature {
  type: 'Feature';
  geometry: PuntoGeom | LineaGeom;
  properties: TransporteProps;
}

export interface BarrioProps {
  nombre: string;
  clave: string;
  comuna: number;
  area_km2: number;
  poblacion_2010: number | null;
  densidad_2010: number | null;
  cultura: Record<string, number>;
  estaciones_subte: number;
  estaciones_tren: number;
  fuente: string;
  enlace: string;
  fecha_fuente: string;
  fuente_poblacion: string;
}

export interface BarrioFeature {
  type: 'Feature';
  geometry: { type: 'Polygon'; coordinates: number[][][] } | { type: 'MultiPolygon'; coordinates: number[][][][] };
  properties: BarrioProps;
}

export interface Datos {
  espacios: EspacioFeature[];
  espaciosPendientes: Espacio[];
  transporte: TransporteFeature[];
  barrios: BarrioFeature[];
  inmuebles: InmuebleFeature[];
  inmueblesPendientes: Inmueble[];
}
