export interface CapaDef {
  id: string;
  nombre: string;
  color: string;
  visible: boolean;
  pesoCalor: number;
}

// Capas culturales (spec §10, capas A–E). Colores aptos para fondo claro.
export const CAPAS_CULTURA: CapaDef[] = [
  { id: 'teatro', nombre: 'Teatros', color: '#d62728', visible: true, pesoCalor: 1 },
  { id: 'centro_cultural', nombre: 'Centros culturales', color: '#1f77b4', visible: true, pesoCalor: 1 },
  { id: 'bar', nombre: 'Bares (culturales, notables, milongas)', color: '#ff7f0e', visible: true, pesoCalor: 1 },
  { id: 'cine', nombre: 'Cines', color: '#9467bd', visible: true, pesoCalor: 1 },
  { id: 'musica', nombre: 'Música en vivo', color: '#2ca02c', visible: true, pesoCalor: 1 },
  { id: 'otros', nombre: 'Otros (bibliotecas, librerías, museos…)', color: '#7f7f7f', visible: false, pesoCalor: 0 },
];

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
export const COLOR_INMUEBLE = '#111111';
