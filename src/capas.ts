export interface CapaDef {
  id: string;
  nombre: string;
  color: string;
  visible: boolean;
}

// Orden y colores de las capas culturales (spec, sección 10: capas A–E).
export const CAPAS: CapaDef[] = [
  { id: 'teatro', nombre: 'Teatros', color: '#d62728', visible: true },
  { id: 'centro_cultural', nombre: 'Centros culturales', color: '#1f77b4', visible: true },
  { id: 'bar', nombre: 'Bares (culturales, notables, milongas)', color: '#ff7f0e', visible: true },
  { id: 'cine', nombre: 'Cines', color: '#9467bd', visible: true },
  { id: 'musica', nombre: 'Música en vivo', color: '#2ca02c', visible: true },
  { id: 'otros', nombre: 'Otros (bibliotecas, librerías, museos…)', color: '#7f7f7f', visible: false },
];
