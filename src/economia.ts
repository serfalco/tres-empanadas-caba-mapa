// Etapa 6: simulador económico por inmueble (spec §16).
// Todos los valores por defecto son SUPUESTOS DE EJEMPLO para editar.
// No son proyecciones ni datos de mercado.

import type { Inmueble } from './tipos';

export const SEMANAS_MES = 4.33;

export interface Supuestos {
  servicios: number;
  personal: number;
  publicidad: number;
  mantenimiento: number;
  otrosCostos: number;
  inversionInicial: number;
  mesesAmortizacion: number;
  espectadoresPorM2: number; // capacidad estimada = superficie × factor
  capacidadMaxima: number;
  funcionesSemana: number;
  precioEntrada: number;
  participacionCasaFunciones: number; // % de la recaudación propia que queda a la sala
  importeSeguroSala: number;
  cursos: number;
  cuotaTaller: number;
  participacionCasaTalleres: number; // %
  consumoPorAsistente: number;
  margenGastronomia: number; // %
}

export interface Escenario {
  id: 'baja' | 'moderada' | 'alta';
  nombre: string;
  ocupacion: number; // % de la capacidad en funciones propias
  fechasTerceros: number; // seguros de sala por mes
  alumnosPorCurso: number;
}

export interface Ajustes {
  capacidad?: number | null;
  publicidad?: number | null;
  inversionInicial?: number | null;
}

export const SUPUESTOS_DEFECTO: Supuestos = {
  servicios: 150000,
  personal: 300000,
  publicidad: 150000,
  mantenimiento: 50000,
  otrosCostos: 50000,
  inversionInicial: 3000000,
  mesesAmortizacion: 24,
  espectadoresPorM2: 0.6,
  capacidadMaxima: 150,
  funcionesSemana: 3,
  precioEntrada: 8000,
  participacionCasaFunciones: 40,
  importeSeguroSala: 80000,
  cursos: 2,
  cuotaTaller: 30000,
  participacionCasaTalleres: 30,
  consumoPorAsistente: 4000,
  margenGastronomia: 35,
};

export const ESCENARIOS_DEFECTO: Escenario[] = [
  { id: 'baja', nombre: 'Convocatoria baja', ocupacion: 25, fechasTerceros: 2, alumnosPorCurso: 4 },
  { id: 'moderada', nombre: 'Convocatoria moderada', ocupacion: 45, fechasTerceros: 4, alumnosPorCurso: 7 },
  { id: 'alta', nombre: 'Convocatoria alta', ocupacion: 70, fechasTerceros: 8, alumnosPorCurso: 10 },
];

export interface Resultado {
  capacidad: number;
  espectadoresMes: number;
  ingresos: { funciones: number; seguros: number; talleres: number; gastronomia: number; total: number };
  costos: { alquiler: number; expensas: number; operativos: number; publicidad: number; amortizacion: number; total: number };
  resultado: number;
  ocupacionEquilibrio: number | null; // % de ocupación propia que deja resultado 0
}

export function capacidadEstimada(inm: Inmueble, s: Supuestos, aj: Ajustes): number {
  if (aj.capacidad) return aj.capacidad;
  const m2 = inm.superficie_m2 ?? 0;
  return Math.max(0, Math.min(s.capacidadMaxima, Math.round(m2 * s.espectadoresPorM2)));
}

export function simular(inm: Inmueble, s: Supuestos, e: Escenario, aj: Ajustes = {}): Resultado {
  const capacidad = capacidadEstimada(inm, s, aj);
  const funcionesMes = s.funcionesSemana * SEMANAS_MES;
  const ingresoPorPuntoOcupacion = (capacidad / 100) * funcionesMes *
    (s.precioEntrada * (s.participacionCasaFunciones / 100) + s.consumoPorAsistente * (s.margenGastronomia / 100));

  const espectadoresMes = Math.round(capacidad * (e.ocupacion / 100) * funcionesMes);
  const funciones = espectadoresMes * s.precioEntrada * (s.participacionCasaFunciones / 100);
  // La gastronomía se calcula sólo sobre el público de funciones propias (criterio conservador).
  const gastronomia = espectadoresMes * s.consumoPorAsistente * (s.margenGastronomia / 100);
  const seguros = e.fechasTerceros * s.importeSeguroSala;
  const talleres = s.cursos * e.alumnosPorCurso * s.cuotaTaller * (s.participacionCasaTalleres / 100);
  const totalIngresos = funciones + seguros + talleres + gastronomia;

  const alquiler = inm.alquiler ?? 0;
  const expensas = inm.expensas ?? 0;
  const publicidad = aj.publicidad ?? s.publicidad;
  const operativos = s.servicios + s.personal + s.mantenimiento + s.otrosCostos;
  const inversion = aj.inversionInicial ?? s.inversionInicial;
  const amortizacion = s.mesesAmortizacion > 0 ? inversion / s.mesesAmortizacion : 0;
  const totalCostos = alquiler + expensas + operativos + publicidad + amortizacion;

  const resultado = totalIngresos - totalCostos;
  const sinFunciones = seguros + talleres - totalCostos;
  const ocupacionEquilibrio = ingresoPorPuntoOcupacion > 0 ? Math.max(0, -sinFunciones / ingresoPorPuntoOcupacion) : null;

  return {
    capacidad,
    espectadoresMes,
    ingresos: { funciones, seguros, talleres, gastronomia, total: totalIngresos },
    costos: { alquiler, expensas, operativos, publicidad, amortizacion, total: totalCostos },
    resultado,
    ocupacionEquilibrio,
  };
}
