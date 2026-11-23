// Protección simple del sitio con usuario y contraseña (HTTP Basic Auth).
// Las credenciales NO están en el repositorio: se leen de las variables
// secretas MAPA_USUARIO y MAPA_CLAVE del proyecto en Cloudflare Pages.
// Si faltan, el sitio queda cerrado.

const encoder = new TextEncoder();

async function iguales(a, b) {
  // Comparación en tiempo constante sobre hashes
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(a)),
    crypto.subtle.digest('SHA-256', encoder.encode(b)),
  ]);
  const x = new Uint8Array(ha);
  const y = new Uint8Array(hb);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

function pedirClave() {
  return new Response('Acceso restringido', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Mapa Tres Empanadas", charset="UTF-8"', 'Cache-Control': 'no-store' },
  });
}

export async function onRequest({ request, env, next }) {
  const usuario = env.MAPA_USUARIO;
  const clave = env.MAPA_CLAVE;
  if (!usuario || !clave) return new Response('Sitio no configurado', { status: 503 });

  const auth = request.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Basic ')) return pedirClave();
  let dato;
  try {
    dato = atob(auth.slice(6));
  } catch {
    return pedirClave();
  }
  const i = dato.indexOf(':');
  if (i < 0) return pedirClave();
  const okUsuario = await iguales(dato.slice(0, i), usuario);
  const okClave = await iguales(dato.slice(i + 1), clave);
  if (!(okUsuario && okClave)) return pedirClave();

  const resp = await next();
  const r = new Response(resp.body, resp);
  r.headers.set('Cache-Control', 'private, no-store');
  r.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return r;
}
