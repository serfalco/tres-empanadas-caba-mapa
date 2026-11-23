// leaflet.heat espera Leaflet como variable global.
import L from 'leaflet';
(window as unknown as { L: typeof L }).L = L;
