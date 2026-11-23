// Etapa 6: interfaz del simulador económico.
import { ESCENARIOS_DEFECTO, SUPUESTOS_DEFECTO, capacidadEstimada, simular, type Ajustes, type Escenario, type Supuestos } from './economia';
import type { Datos, Inmueble } from './tipos';
import { $, esc, guardarLocal, leerLocal, pesos } from './util';

type Campo = { clave: keyof Supuestos; nombre: string; unidad?: string };

const GRUPOS: { titulo: string; campos: Campo[] }[] = [
  {
    titulo: 'Costos mensuales (además de alquiler y expensas)',
    campos: [
      { clave: 'servicios', nombre: 'Servicios (luz, gas, agua, internet)', unidad: '$' },
      { clave: 'personal', nombre: 'Personal', unidad: '$' },
      { clave: 'publicidad', nombre: 'Publicidad', unidad: '$' },
      { clave: 'mantenimiento', nombre: 'Mantenimiento', unidad: '$' },
      { clave: 'otrosCostos', nombre: 'Otros (seguros, impuestos, ticketera)', unidad: '$' },
    ],
  },
  {
    titulo: 'Inversión inicial',
    campos: [
      { clave: 'inversionInicial', nombre: 'Adecuación (acústica, técnica, habilitación)', unidad: '$' },
      { clave: 'mesesAmortizacion', nombre: 'Meses para amortizar', unidad: 'meses' },
    ],
  },
  {
    titulo: 'Sala y funciones propias',
    campos: [
      { clave: 'espectadoresPorM2', nombre: 'Espectadores por m² de superficie', unidad: '×' },
      { clave: 'capacidadMaxima', nombre: 'Capacidad máxima', unidad: 'personas' },
      { clave: 'funcionesSemana', nombre: 'Funciones propias por semana', unidad: 'n' },
      { clave: 'precioEntrada', nombre: 'Entrada promedio', unidad: '$' },
      { clave: 'participacionCasaFunciones', nombre: 'Parte de la recaudación para la sala', unidad: '%' },
    ],
  },
  {
    titulo: 'Otros ingresos',
    campos: [
      { clave: 'importeSeguroSala', nombre: 'Seguro de sala por fecha de terceros', unidad: '$' },
      { clave: 'cursos', nombre: 'Talleres activos', unidad: 'n' },
      { clave: 'cuotaTaller', nombre: 'Cuota mensual por alumno', unidad: '$' },
      { clave: 'participacionCasaTalleres', nombre: 'Parte de la cuota para la sala', unidad: '%' },
      { clave: 'consumoPorAsistente', nombre: 'Consumo gastronómico por espectador', unidad: '$' },
      { clave: 'margenGastronomia', nombre: 'Margen gastronómico', unidad: '%' },
    ],
  },
];

export function montarEconomia(datos: Datos) {
  let s: Supuestos = leerLocal('tres.supuestos', SUPUESTOS_DEFECTO);
  let escenarios: Escenario[] = ESCENARIOS_DEFECTO.map((e) => ({ ...e, ...leerLocal(`tres.escenario.${e.id}`, {}) }));
  const ajustes: Record<string, Ajustes> = leerLocal('tres.ajustes', {});

  const todos: Inmueble[] = [...datos.inmuebles.map((f) => f.properties), ...datos.inmueblesPendientes];
  const sel = $('eco-inmueble') as HTMLSelectElement;
  for (const p of todos) sel.add(new Option(`${p.direccion ?? 'Sin dirección'} · ${p.barrio} · ${pesos(p.alquiler)}`, p.id));

  const inmueble = () => todos.find((p) => p.id === sel.value) ?? todos[0];

  function dibujarSupuestos() {
    $('eco-supuestos').innerHTML = GRUPOS.map(
      (g) => `<fieldset><legend>${esc(g.titulo)}</legend>${g.campos
        .map((c) => `<label class="campo fila"><span>${esc(c.nombre)}</span>
          <input type="number" inputmode="decimal" min="0" step="any" data-supuesto="${c.clave}" value="${s[c.clave]}" />
          <small>${c.unidad ?? ''}</small></label>`)
        .join('')}</fieldset>`,
    ).join('') + `<fieldset><legend>Escenarios</legend>
      <div class="tabla-scroll"><table class="tabla-mini"><thead><tr><th></th>${escenarios.map((e) => `<th>${esc(e.nombre.replace('Convocatoria ', ''))}</th>`).join('')}</tr></thead>
      <tbody>
        <tr><th>Ocupación funciones propias (%)</th>${escenarios.map((e) => `<td><input type="number" min="0" max="100" data-esc="${e.id}" data-campo="ocupacion" value="${e.ocupacion}" /></td>`).join('')}</tr>
        <tr><th>Fechas de terceros por mes</th>${escenarios.map((e) => `<td><input type="number" min="0" data-esc="${e.id}" data-campo="fechasTerceros" value="${e.fechasTerceros}" /></td>`).join('')}</tr>
        <tr><th>Alumnos por taller</th>${escenarios.map((e) => `<td><input type="number" min="0" data-esc="${e.id}" data-campo="alumnosPorCurso" value="${e.alumnosPorCurso}" /></td>`).join('')}</tr>
      </tbody></table></div></fieldset>`;
  }

  function dibujarResultado() {
    const inm = inmueble();
    if (!inm) return;
    const aj = ajustes[inm.id] ?? {};
    const r = escenarios.map((e) => simular(inm, s, e, aj));
    const fila = (t: string, f: (x: (typeof r)[number]) => string, clase = '') =>
      `<tr class="${clase}"><th>${t}</th>${r.map((x) => `<td>${f(x)}</td>`).join('')}</tr>`;
    $('eco-resultado').innerHTML = `
      <h2>${esc(inm.direccion ?? 'Sin dirección')} · ${esc(inm.barrio)}</h2>
      <p class="nota">${inm.superficie_m2 ?? '?'} m² · alquiler ${pesos(inm.alquiler)} · expensas ${inm.expensas ? pesos(inm.expensas) : 'sin dato (se toma 0)'}</p>
      <fieldset class="ajustes"><legend>Ajustes para este inmueble (vacío = supuesto general)</legend>
        <label class="campo fila"><span>Capacidad (estimada ${capacidadEstimada(inm, s, {})})</span><input type="number" min="0" data-ajuste="capacidad" value="${aj.capacidad ?? ''}" /><small>personas</small></label>
        <label class="campo fila"><span>Publicidad según ubicación</span><input type="number" min="0" data-ajuste="publicidad" value="${aj.publicidad ?? ''}" /><small>$</small></label>
        <label class="campo fila"><span>Inversión inicial</span><input type="number" min="0" data-ajuste="inversionInicial" value="${aj.inversionInicial ?? ''}" /><small>$</small></label>
      </fieldset>
      <div class="tabla-scroll"><table class="tabla-eco">
        <thead><tr><th>Mensual</th>${escenarios.map((e) => `<th>${esc(e.nombre.replace('Convocatoria ', ''))}</th>`).join('')}</tr></thead>
        <tbody>
          ${fila('Espectadores propios', (x) => String(x.espectadoresMes))}
          ${fila('Funciones propias', (x) => pesos(x.ingresos.funciones))}
          ${fila('Seguros de sala', (x) => pesos(x.ingresos.seguros))}
          ${fila('Talleres', (x) => pesos(x.ingresos.talleres))}
          ${fila('Gastronomía (margen)', (x) => pesos(x.ingresos.gastronomia))}
          ${fila('Ingresos', (x) => pesos(x.ingresos.total), 'total')}
          ${fila('Alquiler + expensas', (x) => pesos(x.costos.alquiler + x.costos.expensas))}
          ${fila('Operativos', (x) => pesos(x.costos.operativos))}
          ${fila('Publicidad', (x) => pesos(x.costos.publicidad))}
          ${fila('Amortización', (x) => pesos(x.costos.amortizacion))}
          ${fila('Costos', (x) => pesos(x.costos.total), 'total')}
          ${fila('Resultado', (x) => `<strong class="${x.resultado >= 0 ? 'positivo' : 'negativo'}">${pesos(Math.round(x.resultado))}</strong>`, 'total')}
          ${fila('Ocupación de equilibrio', (x) => (x.ocupacionEquilibrio === null ? '—' : `${Math.round(x.ocupacionEquilibrio)}%${x.ocupacionEquilibrio > 100 ? ' (inalcanzable)' : ''}`))}
        </tbody>
      </table></div>
      <p class="nota">Ocupación de equilibrio: porcentaje de la capacidad que deberían ocupar las funciones propias para cubrir todos los costos, con los demás ingresos del escenario.</p>`;
  }

  function dibujarComparacion() {
    const filas = todos.map((inm) => {
      const aj = ajustes[inm.id] ?? {};
      const r = escenarios.map((e) => simular(inm, s, e, aj));
      return { inm, r };
    }).sort((a, b) => b.r[0].resultado - a.r[0].resultado);
    $('eco-comparacion').innerHTML = `<div class="tabla-scroll"><table class="tabla-eco">
      <thead><tr><th>Inmueble</th><th>Cap.</th><th>Costos fijos</th>${escenarios.map((e) => `<th>${esc(e.nombre.replace('Convocatoria ', ''))}</th>`).join('')}<th>Equilibrio</th></tr></thead>
      <tbody>${filas.map(({ inm, r }) => `<tr>
        <th>${esc(inm.direccion ?? 'Sin dirección')}<br><small>${esc(inm.barrio)}</small></th>
        <td>${r[0].capacidad}</td>
        <td>${pesos(Math.round(r[0].costos.total))}</td>
        ${r.map((x) => `<td class="${x.resultado >= 0 ? 'positivo' : 'negativo'}">${pesos(Math.round(x.resultado))}</td>`).join('')}
        <td>${r[1].ocupacionEquilibrio === null ? '—' : `${Math.round(r[1].ocupacionEquilibrio)}%`}</td>
      </tr>`).join('')}</tbody></table></div>
      <p class="nota">Ordenado por resultado en convocatoria baja (resiliencia). Equilibrio calculado con el escenario moderado. Los inmuebles sin expensas informadas suman 0 de expensas.</p>`;
  }

  const redibujar = () => {
    dibujarResultado();
    dibujarComparacion();
  };

  $('eco-supuestos').addEventListener('input', (e) => {
    const input = e.target as HTMLInputElement;
    const v = Number(input.value);
    if (Number.isNaN(v)) return;
    if (input.dataset.supuesto) {
      s = { ...s, [input.dataset.supuesto]: v };
      guardarLocal('tres.supuestos', s);
    } else if (input.dataset.esc) {
      escenarios = escenarios.map((x) => (x.id === input.dataset.esc ? { ...x, [input.dataset.campo!]: v } : x));
      const x = escenarios.find((x) => x.id === input.dataset.esc)!;
      guardarLocal(`tres.escenario.${x.id}`, { ocupacion: x.ocupacion, fechasTerceros: x.fechasTerceros, alumnosPorCurso: x.alumnosPorCurso });
    }
    redibujar();
  });

  $('eco-resultado').addEventListener('change', (e) => {
    const input = e.target as HTMLInputElement;
    const k = input.dataset.ajuste as keyof Ajustes | undefined;
    if (!k) return;
    const id = inmueble().id;
    ajustes[id] = { ...ajustes[id], [k]: input.value === '' ? null : Number(input.value) };
    guardarLocal('tres.ajustes', ajustes);
    redibujar();
  });

  $('eco-restablecer').addEventListener('click', () => {
    s = { ...SUPUESTOS_DEFECTO };
    escenarios = ESCENARIOS_DEFECTO.map((e) => ({ ...e }));
    guardarLocal('tres.supuestos', s);
    for (const e of escenarios) guardarLocal(`tres.escenario.${e.id}`, {});
    dibujarSupuestos();
    redibujar();
  });

  sel.addEventListener('change', dibujarResultado);
  dibujarSupuestos();
  redibujar();

  return {
    seleccionar(id: string) {
      sel.value = id;
      dibujarResultado();
    },
  };
}
