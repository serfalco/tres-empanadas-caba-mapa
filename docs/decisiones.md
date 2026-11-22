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

## Pendiente de decidir

- Cómo fusionar duplicados cuando se sumen otras fuentes (Alternativa Teatral, Indicadores de Cultura Independiente).
- Si conviene que la búsqueda también filtre la lista de pendientes.
