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

export interface Coleccion {
  type: 'FeatureCollection';
  metadata: { total: number; por_capa: Record<string, number> };
  features: EspacioFeature[];
}
