// Vínculo compartible de un evento: /e/ID
// Entrega las etiquetas Open Graph (para que WhatsApp, Facebook, X, etc. muestren el afiche)
// y luego lleva a la persona a la tarjeta dentro de la página principal.
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export async function onRequestGet({ request, env, params }) {
  const url = new URL(request.url);
  const id = String(params.id || '');
  const volver = (to) => Response.redirect(url.origin + to, 302);

  if (!env.R2_BUCKET || !/^[A-Z2-9]{10}$/.test(id)) return volver('/#eventos');
  const obj = await env.R2_BUCKET.get(`eventos/datos/${id}.json`);
  if (!obj) return volver('/#eventos');

  let ev;
  try { ev = await obj.json(); } catch { return volver('/#eventos'); }

  let fecha = ev.fecha;
  try { fecha = new Date(ev.fecha + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' }); } catch {}

  const titulo = `${ev.titulo} · Asociación Cultural Lucila`;
  const desc = `${fecha} · ${ev.lugar}. ${ev.descripcion || 'Evento de la Asociación Cultural de Músicos y Artistas Lucila.'}`.slice(0, 200);
  const imagen = new URL(ev.imagen, url.origin).toString();
  const destino = `/#evento-${id}`;

  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Asociación Cultural de Músicos y Artistas Lucila">
<meta property="og:title" content="${esc(ev.titulo)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(imagen)}">
<meta property="og:image:alt" content="${esc('Afiche: ' + ev.titulo)}">
<meta property="og:url" content="${esc(url.origin + '/e/' + id)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(ev.titulo)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(imagen)}">
</head><body>
<p><a href="${destino}">Ver el evento «${esc(ev.titulo)}»</a></p>
<script>location.replace(${JSON.stringify(destino)});</script>
</body></html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' }
  });
}
