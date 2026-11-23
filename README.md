# Mapa cultural e inmobiliario de CABA — Tres Empanadas Comedia

Herramienta interactiva para analizar CABA (oferta cultural, transporte e inmuebles) y encontrar una sede para Tres Empanadas Comedia. La especificación completa está en [`docs/especificacion.md`](docs/especificacion.md).

## Estado

| Etapa | Estado |
| --- | --- |
| 1. Datos culturales | ✅ Inventario inicial: dataset oficial "Espacios culturales" (3.053 registros, 3.031 con coordenadas) |
| 2. Mapa interactivo | ✅ MVP: capas A–E, búsqueda, filtro por barrio, fichas con fuente |
| 3. Mapa de calor | ✅ Densidad por categoría con pesos y radio de influencia en metros |
| 4. Transporte e inmuebles | ✅ Subte, tren, metrobus y unas 7.000 paradas de colectivo. Inmuebles de la planilla con filtros de alquiler y superficie (6 ubicados, 2 pendientes) |
| 5. Evaluación territorial | ✅ Análisis de microzona en 5 dimensiones, coropletas por barrio y comparador con puntaje configurable |
| 6. Economía y seguimiento | ✅ Simulador por inmueble con 3 escenarios, ocupación de equilibrio y comparación entre inmuebles. La planilla se sincroniza en vivo |

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

## Actualizar los inmuebles

**Automático:** el sitio lee la planilla "Oportunidades" en vivo cada vez que se abre (export CSV de Google Sheets, sin credenciales). Requiere que la planilla siga compartida como "cualquier persona con el enlace puede ver".
- Las direcciones nuevas se ubican solas con USIG, sólo si el resultado cae en el barrio informado (o a menos de 300 m). Quedan marcadas como "ubicación automática: verificar".
- Las que no se pueden ubicar sin ambigüedad pasan a "Sin ubicación verificada".
- Si la planilla no responde, se usa la copia incluida.
- Para usar otra planilla o URL, definir `VITE_PLANILLA_CSV` en el build.

**Copia incluida (respaldo):**

1. Exportar la pestaña "Oportunidades" de la planilla como CSV y reemplazar `data/raw/inmuebles-oportunidades.csv`.
2. Para cada dirección nueva, consultar el normalizador USIG del GCBA (desde el navegador):
   `https://servicios.usig.buenosaires.gob.ar/normalizar/?direccion=<dirección>&geocodificar=TRUE&srid=4326`
   y agregar el resultado en `data/raw/inmuebles-geocodificacion.json`, con la dirección de la planilla como clave. Si la dirección es ambigua o no existe, no se agrega: el inmueble queda en "Sin ubicación verificada".
3. Ejecutar `npm run datos`.

## Uso de la aplicación

- **Mapa:** capas culturales, mapa de calor, transporte y coropletas por barrio.
- **Inmuebles:** filtros, lista y acceso a "Entorno" y "Economía" de cada inmueble.
- **Zonas:** se elige un punto o un inmueble y se ven las 5 dimensiones (cultura, conectividad, barrio, economía y riesgos). Se pueden comparar hasta 4.
- **Economía:** supuestos editables, que se guardan en el navegador, con escenarios de convocatoria baja, moderada y alta.

## Estructura

```
data/raw/          descargas originales, sin modificar
scripts/           normalización de fuentes al modelo común
public/data/       GeoJSON/JSON que consume el mapa
src/               aplicación (TypeScript + Vite + Leaflet)
docs/              especificación, fuentes y decisiones técnicas
```

## Despliegue (Cloudflare Pages + Access)

Publicado en **https://mapa-tres-caba.pages.dev**, proyecto `mapa-tres-caba` conectado a este repositorio: cada push vuelve a publicar el sitio. Todavía no tiene acceso restringido.

Pasos para recrearlo:

1. En Cloudflare, ir a Workers & Pages, luego Create, Pages, y conectar este repositorio.
2. Configurar el build: comando `npm run build`, salida `dist`, Node 20 o superior.
3. Antes de compartir la URL, ir a Zero Trust, luego Access, Applications, Add (Self-hosted). Ahí cargar el dominio `*.pages.dev` del proyecto y una política que permita sólo los emails autorizados. Access es gratuito hasta 50 usuarios.

## Fuentes y licencias

Ver [`docs/fuentes.md`](docs/fuentes.md). Decisiones técnicas y limitaciones en [`docs/decisiones.md`](docs/decisiones.md).
