# Mapa cultural e inmobiliario de CABA — Tres Empanadas Comedia

Herramienta interactiva para analizar CABA (oferta cultural, transporte e inmuebles) y encontrar una sede para Tres Empanadas Comedia. La especificación completa está en [`docs/especificacion.md`](docs/especificacion.md).

## Estado

| Etapa | Estado |
| --- | --- |
| 1. Datos culturales | ✅ Inventario inicial: dataset oficial "Espacios culturales" (3.053 registros, 3.031 con coordenadas) |
| 2. Mapa interactivo | ✅ MVP: capas A–E, búsqueda, filtro por barrio, fichas con fuente |
| 3. Mapa de calor | Pendiente |
| 4. Transporte e inmuebles | Pendiente |
| 5. Evaluación territorial | Pendiente |
| 6. Economía y seguimiento | Pendiente |

## Uso local

Requiere Node 20 o superior.

```bash
npm install
npm run dev       # servidor local en http://localhost:5173
npm run build     # verifica tipos y genera dist/
```

## Actualizar los datos culturales

1. Descargar el CSV desde https://data.buenosaires.gob.ar/dataset/espacios-culturales y reemplazar `data/raw/espacios-culturales.csv` (sin editarlo).
2. Actualizar `fecha_fuente` y `fecha_descarga` en `scripts/normalizar-espacios.mjs`.
3. Ejecutar `npm run datos`. Regenera `public/data/espacios-culturales.geojson` y `public/data/espacios-sin-coordenadas.json`.
4. Revisar el resumen que imprime el script y commitear.

## Estructura

```
data/raw/          descargas originales, sin modificar
scripts/           normalización de fuentes al modelo común
public/data/       GeoJSON/JSON que consume el mapa
src/               aplicación (TypeScript + Vite + Leaflet)
docs/              especificación, fuentes y decisiones técnicas
```

## Fuentes y licencias

Ver [`docs/fuentes.md`](docs/fuentes.md). Decisiones técnicas y limitaciones en [`docs/decisiones.md`](docs/decisiones.md).
