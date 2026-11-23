# Fuentes de datos

| Fuente | Uso | Licencia | Fecha fuente | Descargado | Estado |
| --- | --- | --- | --- | --- | --- |
| [BA Data, Espacios culturales](https://data.buenosaires.gob.ar/dataset/espacios-culturales) (Ministerio de Cultura GCBA) | Capas A–E y "otros" | CC-BY 2.5 AR (atribución) | 2026-06-18 (metadata del dataset) | 2026-11-22 | Importado |
| [BA Data, Estaciones de subte](https://data.buenosaires.gob.ar/dataset/subte-estaciones) (SBASE) | Capa F: estaciones y red | CC-BY 2.5 AR | 2026-11-06 | 2026-11-23 | Importado |
| [BA Data, Estaciones de ferrocarril](https://data.buenosaires.gob.ar/dataset/estaciones-ferrocarril) | Capa F: estaciones y red | CC-BY 2.5 AR | Estaciones 2026-11-06, red 2019-09-16 | 2026-11-23 | Importado (recortado a CABA) |
| [BA Data, Barrios](https://data.buenosaires.gob.ar/dataset/barrios) | Límites, área y población por barrio | CC-BY 2.5 AR | Límites 2026-11-17, población Censo 2010 | 2026-11-23 | Importado |
| [Normalizador USIG](https://servicios.usig.buenosaires.gob.ar/normalizar/) (GCBA) | Geocodificación de inmuebles | Servicio público del GCBA | Consulta 2026-11-23 | — | Usado para 6 direcciones |
| [Indicadores de Cultura Independiente](https://indicadoresculturaindependiente.ar/) | Salas independientes | A verificar | — | — | Pendiente |
| [Alternativa Teatral](https://www.alternativateatral.com/) | Salas y programación | A verificar (términos de uso) | — | — | Pendiente |
| [OpenStreetMap](https://www.openstreetmap.org/) | Cartografía base y datos complementarios | ODbL | — | — | Base del mapa |
| Google Sheets "Oportunidades" (privada) | Capa G, inmuebles | Privada | Revisión 2026-11-21 | 2026-11-23 | Importado (8 filas) |

## BA Data, Espacios culturales

- Recurso: `espacios-culturales.csv`. También existe en GeoJSON, SHP y XLSX.
- 3.053 registros: 3.031 con coordenadas dentro de CABA y 22 sin coordenadas válidas (se listan en el panel).
- Incluye bibliotecas, librerías, monumentos, museos, galerías, etc. (1.960 registros en "otros"). Quedan ocultos por defecto.
- Limitaciones conocidas: el dataset no indica si cada espacio sigue activo. Los bares "notables" son una categoría patrimonial y no implican programación. Las direcciones vienen en mayúsculas.

## Transporte y barrios

- Subte: 90 estaciones y la red por línea (A, B, C, D, E, H). El premetro no está incluido en estos archivos.
- Tren: se conservan estaciones y tramos dentro de un recuadro de CABA con margen. La red está simplificada (vértices cada ~50 m) para aliviar el archivo.
- Población por barrio: Censo 2010. Es el último dato por barrio publicado en BA Data. El Censo 2022 por barrio todavía no está en el portal, así que la densidad sirve como orden relativo y no como valor actual.
- Los conteos por barrio (cultura y estaciones) se calculan según la ubicación dentro de cada polígono, no por el campo "barrio" de cada fuente.
- Descartado: "mercado-inmobiliario / precio-alquiler-deptos" de BA Data. Llega a 2019, es de departamentos y no sirve para locales en pesos actuales.

## Inmuebles

- 8 filas de la planilla: 6 ubicadas con USIG y 2 sin dirección publicada (Villa del Parque y Mataderos), que quedan como pendientes.
- "J. V. González y J. B. Justo" es una esquina: ubicación aproximada. USIG la ubica dentro del polígono de Villa Santa Rita, en el límite con Floresta.
- "Gral. M. A. Rodríguez 1600" se interpretó como Gral. Manuel A. Rodríguez. Hay que confirmarlo con el aviso.
- "Bonorino 3156" se tomó como Av. Cnel. Esteban Bonorino, que coincide con el barrio informado. Existe otra calle Bonorino en Saavedra.
