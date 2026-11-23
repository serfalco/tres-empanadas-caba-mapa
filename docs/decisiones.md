# Decisiones técnicas y limitaciones

## 2026-11-22 · MVP (etapas 1 y 2)

- **Leaflet en lugar de MapLibre.** Es más simple, no necesita estilos vectoriales ni claves, y alcanza para puntos y capas. Si más adelante se necesitan muchas capas vectoriales, se puede migrar.
- **Base cartográfica CARTO light (datos OSM).** Gratuita para uso bajo, sin clave, y visualmente sobria. Si el uso crece, revisar sus términos o autohospedar tiles.
- **Render en canvas** (`preferCanvas`) con `circleMarker`, para dibujar unos 3.000 puntos con fluidez.
- **Mapeo de categorías** (`FUNCION_PRINCIPAL` → capa):
  - `SALA DE TEATRO` → teatro (A)
  - `CENTRO CULTURAL` → centro_cultural (B)
  - `BAR` → bar (C), que incluye culturales, notables y milongas: el dataset no distingue cuáles tienen stand-up.
  - `SALA DE CINE` → cine (D)
  - `CLUB DE MUSICA EN VIVO` → musica (E)
  - Todo lo demás → otros (oculto por defecto)
  - `FUNCION_SECUNDARIA` se conserva en la ficha. Todavía no se usa para que un espacio aparezca en varias capas.
- **Coordenadas.** Se descartan las que caen fuera de un recuadro aproximado de CABA o vienen como "NA". Esos registros no se geocodifican automáticamente: van a la lista de pendientes.
- **Estado.** Todos los registros quedan como `sin verificar`, porque la fuente oficial no garantiza que sigan activos.
- **Datos crudos versionados** en `data/raw/` para que el proceso sea reproducible.

## 2026-11-23 · Etapas 3 a 6

- **Mapa de calor** con `leaflet.heat`. El radio se define en metros y se convierte a píxeles según el zoom, para que el "radio de influencia" sea comparable entre escalas. Cada categoría tiene un peso de 0 a 3, y "otros" arranca en 0. El panel aclara que densidad de oferta no es demanda.
- **Transporte:** subte con colores por línea y tren punteado, en un pane intermedio, para que los puntos culturales queden arriba.
- **Barrios:** coropleta por quintiles con escala de un solo tono. Indicadores: espacios por km², teatros por km², espacios cada 10.000 habitantes, densidad 2010 y estaciones.
- **Microzonas:** círculo de radio configurable (300 a 2.000 m) alrededor de un punto o un inmueble. Las 5 dimensiones del spec (§12) se muestran por separado:
  - Diversidad: índice de Shannon normalizado sobre las 5 capas principales.
  - Riesgos: observaciones automáticas (sin subte a 800 m, vacío cultural, alta concentración de teatros, baja densidad), siempre con la advertencia de verificar en recorrida.
- **Comparador:** hasta 4 zonas. El puntaje 0–100 es opcional y relativo al grupo comparado (normalización min–max por dimensión), con pesos editables. No es un puntaje absoluto de la ciudad.
- **Simulador económico:** modelo mensual simple y transparente (`src/economia.ts`).
  - Ingresos: funciones propias (capacidad × ocupación × funciones × entrada × parte de la sala), seguros de sala, talleres y margen gastronómico sobre el público propio.
  - Costos: alquiler, expensas, operativos, publicidad y amortización de la inversión.
  - Capacidad estimada: superficie × 0,6, con tope de 150, editable por inmueble.
  - Ocupación de equilibrio: se calcula en forma analítica.
  - Todos los valores por defecto son supuestos de ejemplo y se guardan en `localStorage` de cada navegador. No hay datos de mercado detrás.
- **Inmuebles sin expensas informadas** suman 0 de expensas, y se avisa en pantalla.

## Limitaciones conocidas

- No hay datos de colectivos ni de transporte nocturno.
- La población es del Censo 2010.
- No hay datos de seguridad, circulación peatonal ni habilitaciones: deben relevarse en recorrida.
- La sincronización con la planilla es manual (exportar CSV y geocodificar). Una sincronización automática requeriría un Worker con credenciales, que no conviene exponer en el navegador.
- El sitio todavía no está protegido. El despliegue previsto es Cloudflare Pages + Access.

## Pendiente de decidir

- Cómo fusionar duplicados cuando se sumen otras fuentes (Alternativa Teatral, Indicadores de Cultura Independiente).
- Si conviene que la búsqueda también filtre la lista de pendientes.
