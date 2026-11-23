// Etapa 5: análisis de microzonas y comparador.
import L from 'leaflet';
import { CAPAS_CULTURA } from './capas';
import type { Datos } from './tipos';
import { $, esc, guardarLocal, leerLocal, metros, num, pesos } from './util';
import { analizarZona, PESOS_DEFECTO, puntuar, type AnalisisZona, type Pesos } from './zona';

const MAX_COMPARAR = 4;

function cercano(c: AnalisisZona['subteMasCercano']) {
  return c ? `${esc(c.nombre)} (${esc(c.detalle)}), a ${metros(c.distancia)}` : 'Sin datos';
}

function resultadoHTML(z: AnalisisZona): string {
  const filasCultura = CAPAS_CULTURA.map(
    (c) => `<tr><th><span class="punto" style="background:${c.color}"></span>${esc(c.nombre.split(' (')[0])}</th><td>${z.porCategoria[c.id] ?? 0}</td></tr>`,
  ).join('');
  const inm = z.inmueblesEnRadio.length
    ? `<ul>${z.inmueblesEnRadio.map((i) => `<li>${esc(i.direccion)}: ${pesos(i.alquiler)}${i.m2 ? `, ${i.m2} m²` : ''}</li>`).join('')}</ul>`
    : '<p class="nota">Ninguno de la planilla en el radio.</p>';
  return `
    <h2>${esc(z.etiqueta)}</h2>
    <p class="nota">Radio ${metros(z.radio)} · Barrio: ${esc(z.barrio ?? 'fuera de CABA')}</p>
    <div class="dimension"><h3>A. Actividad cultural</h3>
      <table class="tabla-mini">${filasCultura}</table>
      <p>Total (sin "otros"): <strong>${z.totalCultura}</strong> · Categorías presentes: ${z.categoriasPresentes} de 5 · Diversidad: ${(z.diversidad * 100).toFixed(0)}%</p>
      <p class="nota">Teatro más cercano: ${z.teatroMasCercano ? `${esc(z.teatroMasCercano.nombre)}, a ${metros(z.teatroMasCercano.distancia)}` : 's/d'}</p>
    </div>
    <div class="dimension"><h3>B. Conectividad</h3>
      <p>Estaciones de subte en el radio: <strong>${z.subteEnRadio}</strong>${z.lineasSubte.length ? ` (líneas ${z.lineasSubte.join(', ')})` : ''} · Tren: <strong>${z.trenEnRadio}</strong></p>
      <p class="nota">Subte más cercano: ${cercano(z.subteMasCercano)}<br>Tren más cercano: ${cercano(z.trenMasCercano)}</p>
      <p>Colectivo: <strong>${z.lineasColectivo}</strong> líneas con parada a menos de 400 m (${z.paradasColectivo} paradas) · Metrobus en el radio: ${z.metrobusEnRadio}</p>
      <p class="nota">Frecuencias y servicio nocturno: todavía no incorporados.</p>
    </div>
    <div class="dimension"><h3>C. Potencial barrial</h3>
      <p>Densidad del barrio (2010): <strong>${num(z.densidad2010)}</strong> hab./km²</p>
      <p>Otros espacios en el radio (bibliotecas, librerías, formación, museos…): <strong>${z.equipamientoComunitario}</strong></p>
    </div>
    <div class="dimension"><h3>D. Economía</h3>
      ${inm}
      ${z.alquilerM2Promedio ? `<p>Alquiler promedio por m² de esos inmuebles: <strong>${pesos(z.alquilerM2Promedio)}</strong></p>` : ''}
    </div>
    <div class="dimension"><h3>E. Riesgos y verificaciones</h3>
      <ul>${z.observaciones.map((o) => `<li>${esc(o)}</li>`).join('')}</ul>
    </div>
    <button type="button" class="boton" id="zona-agregar">Agregar al comparador</button>`;
}

export function montarZona(mapa: L.Map, datos: Datos, irAPestana: (id: string) => void) {
  let radio = 800;
  let eligiendo = false;
  let actual: AnalisisZona | null = null;
  const comparar: AnalisisZona[] = [];
  let pesosPunt: Pesos = leerLocal('tres.pesosZona', PESOS_DEFECTO);
  const marca = L.layerGroup().addTo(mapa);

  const radioInput = $('zona-radio') as HTMLInputElement;
  radioInput.addEventListener('input', () => {
    radio = Number(radioInput.value);
    $('zona-radio-valor').textContent = metros(radio);
    if (actual) analizar(actual.centro, actual.etiqueta);
  });

  const botonElegir = $('zona-elegir');
  botonElegir.addEventListener('click', () => {
    eligiendo = !eligiendo;
    botonElegir.textContent = eligiendo ? 'Tocá un punto del mapa…' : 'Elegir punto en el mapa';
    mapa.getContainer().classList.toggle('eligiendo', eligiendo);
  });

  mapa.on('click', (e: L.LeafletMouseEvent) => {
    if (!eligiendo) return;
    eligiendo = false;
    botonElegir.textContent = 'Elegir punto en el mapa';
    mapa.getContainer().classList.remove('eligiendo');
    analizar([e.latlng.lng, e.latlng.lat], `Punto ${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`);
  });

  function analizar(centro: [number, number], etiqueta: string) {
    actual = analizarZona(datos, centro, radio, etiqueta);
    marca.clearLayers();
    L.circle([centro[1], centro[0]], { radius: radio, color: '#b5452b', weight: 2, fillOpacity: 0.06, interactive: false }).addTo(marca);
    L.circleMarker([centro[1], centro[0]], { radius: 4, color: '#b5452b', fillOpacity: 1, interactive: false }).addTo(marca);
    $('zona-resultado').innerHTML = resultadoHTML(actual);
    irAPestana('zona');
  }

  $('zona-resultado').addEventListener('click', (e) => {
    if ((e.target as HTMLElement).id !== 'zona-agregar' || !actual) return;
    if (comparar.length >= MAX_COMPARAR) comparar.shift();
    comparar.push(actual);
    dibujarComparador();
  });

  function dibujarComparador() {
    const el = $('comparador');
    if (!comparar.length) {
      el.innerHTML = `<p class="nota">Agregá hasta ${MAX_COMPARAR} zonas o inmuebles para compararlos.</p>`;
      return;
    }
    const puntajes = puntuar(comparar, pesosPunt);
    const col = (f: (z: AnalisisZona) => string) => comparar.map((z) => `<td>${f(z)}</td>`).join('');
    el.innerHTML = `
      <div class="tabla-scroll"><table class="tabla-comparar">
        <thead><tr><th></th>${comparar.map((z, i) => `<th>${esc(z.etiqueta)} <button type="button" class="quitar" data-quitar="${i}" aria-label="Quitar">×</button></th>`).join('')}</tr></thead>
        <tbody>
          <tr><th>Barrio</th>${col((z) => esc(z.barrio ?? '—'))}</tr>
          <tr><th>Radio</th>${col((z) => metros(z.radio))}</tr>
          <tr class="grupo"><th colspan="${comparar.length + 1}">A. Cultura</th></tr>
          <tr><th>Espacios culturales</th>${col((z) => String(z.totalCultura))}</tr>
          <tr><th>Teatros</th>${col((z) => String(z.porCategoria.teatro ?? 0))}</tr>
          <tr><th>Diversidad</th>${col((z) => `${(z.diversidad * 100).toFixed(0)}%`)}</tr>
          <tr class="grupo"><th colspan="${comparar.length + 1}">B. Conectividad</th></tr>
          <tr><th>Estaciones de subte</th>${col((z) => String(z.subteEnRadio))}</tr>
          <tr><th>Estaciones de tren</th>${col((z) => String(z.trenEnRadio))}</tr>
          <tr><th>Líneas de colectivo (400 m)</th>${col((z) => String(z.lineasColectivo))}</tr>
          <tr><th>Subte más cercano</th>${col((z) => (z.subteMasCercano ? metros(z.subteMasCercano.distancia) : '—'))}</tr>
          <tr class="grupo"><th colspan="${comparar.length + 1}">C. Barrial</th></tr>
          <tr><th>Densidad 2010</th>${col((z) => num(z.densidad2010))}</tr>
          <tr><th>Otros espacios</th>${col((z) => String(z.equipamientoComunitario))}</tr>
          <tr class="grupo"><th colspan="${comparar.length + 1}">D. Economía</th></tr>
          <tr><th>Inmuebles en radio</th>${col((z) => String(z.inmueblesEnRadio.length))}</tr>
          <tr><th>Alquiler por m²</th>${col((z) => pesos(z.alquilerM2Promedio))}</tr>
          <tr class="grupo"><th colspan="${comparar.length + 1}">Puntaje relativo (configurable)</th></tr>
          <tr><th>Puntaje 0–100</th>${puntajes.map((p) => `<td><strong>${p}</strong></td>`).join('')}</tr>
        </tbody>
      </table></div>
      <details class="sub-bloque"><summary>Pesos del puntaje</summary>
        ${(['cultura', 'conectividad', 'barrial', 'economia'] as (keyof Pesos)[])
          .map((k) => `<label class="campo fila"><span>${k === 'economia' ? 'Economía (menor $/m²)' : k[0].toUpperCase() + k.slice(1)}</span>
            <input type="range" min="0" max="3" step="0.5" value="${pesosPunt[k]}" data-peso-zona="${k}" /><output>${pesosPunt[k]}</output></label>`)
          .join('')}
      </details>
      <p class="nota aviso">El puntaje sólo ordena las alternativas de esta tabla con los pesos elegidos. No es una verdad absoluta: leer cada dimensión y verificar en recorrida.</p>`;
  }

  $('comparador').addEventListener('click', (e) => {
    const q = (e.target as HTMLElement).closest<HTMLElement>('[data-quitar]');
    if (q) {
      comparar.splice(Number(q.dataset.quitar), 1);
      dibujarComparador();
    }
  });
  $('comparador').addEventListener('change', (e) => {
    const input = e.target as HTMLInputElement;
    const k = input.dataset.pesoZona as keyof Pesos | undefined;
    if (!k) return;
    pesosPunt = { ...pesosPunt, [k]: Number(input.value) };
    guardarLocal('tres.pesosZona', pesosPunt);
    dibujarComparador();
  });

  return {
    analizarInmueble(id: string) {
      const f = datos.inmuebles.find((i) => i.properties.id === id);
      if (!f) return;
      mapa.setView([f.geometry.coordinates[1], f.geometry.coordinates[0]], 15);
      analizar(f.geometry.coordinates, f.properties.direccion ?? id);
    },
  };
}
