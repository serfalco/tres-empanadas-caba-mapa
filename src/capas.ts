export interface CapaDef {
  id: string;
  nombre: string;
  color: string;
  visible: boolean;
  pesoCalor: number;
  /** Oferta de espectáculos (cuenta en totales, diversidad y puntajes). El resto es equipamiento cultural. */
  principal: boolean;
}

// Capas culturales (spec §10, capas A–E). Colores aptos para fondo claro.
export const CAPAS_CULTURA: CapaDef[] = [
  { id: 'teatro', nombre: 'Teatros', color: '#d62728', visible: true, pesoCalor: 1, principal: true },
  { id: 'centro_cultural', nombre: 'Centros culturales', color: '#1f77b4', visible: true, pesoCalor: 1, principal: true },
  { id: 'bar', nombre: 'Bares (culturales, notables, milongas)', color: '#ff7f0e', visible: true, pesoCalor: 1, principal: true },
  { id: 'cine', nombre: 'Cines', color: '#9467bd', visible: true, pesoCalor: 1, principal: true },
  { id: 'musica', nombre: 'Música en vivo', color: '#2ca02c', visible: true, pesoCalor: 1, principal: true },
  { id: 'museo', nombre: 'Museos', color: '#8c564b', visible: true, pesoCalor: 0, principal: false },
  { id: 'galeria', nombre: 'Galerías de arte', color: '#e377c2', visible: true, pesoCalor: 0, principal: false },
  { id: 'biblioteca', nombre: 'Bibliotecas', color: '#17becf', visible: true, pesoCalor: 0, principal: false },
  { id: 'libreria', nombre: 'Librerías y disquerías', color: '#bcbd22', visible: true, pesoCalor: 0, principal: false },
  { id: 'formacion', nombre: 'Espacios de formación', color: '#393b79', visible: true, pesoCalor: 0, principal: false },
  { id: 'otros', nombre: 'Patrimonio y otros (monumentos, ferias, calesitas…)', color: '#7f7f7f', visible: true, pesoCalor: 0, principal: false },
];

export const PRINCIPALES = CAPAS_CULTURA.filter((c) => c.principal).map((c) => c.id);
export const SECUNDARIAS = CAPAS_CULTURA.filter((c) => !c.principal).map((c) => c.id);

// Colores oficiales aproximados de las líneas de subte.
export const COLOR_SUBTE: Record<string, string> = {
  A: '#00aedb',
  B: '#e4002b',
  C: '#0067b1',
  D: '#00a94f',
  E: '#7b2c8e',
  H: '#ffd100',
  P: '#f7941d',
};

export const COLOR_TREN = '#555555';
export const COLOR_METROBUS = '#00843d';
export const COLOR_COLECTIVO = '#8a6d3b';
export const COLOR_INMUEBLE = '#111111';
