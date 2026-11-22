# CLAUDE.md

Proyecto: mapa de inteligencia cultural e inmobiliaria de CABA para elegir la sede de Tres Empanadas Comedia. La especificación maestra es `docs/especificacion.md`: leerla antes de proponer cambios grandes.

## Reglas del proyecto

- Avanzar por etapas verificables (spec §20). No desarrollar todo a la vez.
- No inventar datos ni coordenadas. Un registro sin ubicación verificada va a una lista de pendientes.
- Conservar la procedencia de cada registro: `fuente`, `enlace`, `fecha_fuente`, `estado`, `confianza`.
- Verificar licencia y fecha de una fuente antes de importarla, y registrarla en `docs/fuentes.md`.
- No eludir bloqueos ni restricciones de sitios (no scrapear lo que lo prohíbe).
- No incorporar servicios pagos sin autorización. Arquitectura estática mientras alcance.
- No publicar credenciales, tokens ni datos privados de la planilla de propiedades.
- Registrar decisiones técnicas y limitaciones en `docs/decisiones.md`.
- Interfaz sobria, en español, usable en celular.

## Comandos

- `npm run dev`: servidor local.
- `npm run build`: chequeo de tipos y build.
- `npm run datos`: regenera `public/data/` a partir de `data/raw/`.

## Arquitectura

- Sitio estático: Vite + TypeScript + Leaflet, con base cartográfica de CARTO sobre OpenStreetMap.
- Datos en `public/data/*.geojson`, generados por scripts de `scripts/` a partir de `data/raw/`.
- Despliegue previsto: Cloudflare Pages, con Cloudflare Access restringiendo el acceso.
