// Vínculo compartible de una fotografía: /f/ID (vista previa con la imagen en redes sociales)
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export async function onRequestGet({ request, env, params }) {
  const url = new URL(request.url);
  const id = String(params.id || '');
  const volver = () => Response.redirect(url.origin + '/#registro', 302);
  if (!env.R2_BUCKET || !/^[A-Z2-9]{10}$/.test(id)) return volver();
  const obj = await env.R2_BUCKET.get(`fotos/datos/${id}.json`);
  if (!obj) return volver();
  let f; try { f = await obj.json(); } catch { return volver(); }
  if (f.estado !== 'publicada') return volver();

  let fecha = f.fecha;
  try { fecha = new Date(f.fecha + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' }); } catch {}
  const titulo = (f.nota || 'Fotografía') + ' · Registro Fotográfico Lucila';
  const desc = `Foto de ${f.nombre} · ${fecha} · ${f.lugar}`.slice(0, 200);
  const imagen = new URL(f.imagen, url.origin).toString();
  const destino = `/#foto-${id}`;

  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Asociación Cultural de Músicos y Artistas Lucila">
<meta property="og:title" content="${esc(f.nota || 'Registro Fotográfico Lucila')}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(imagen)}">
<meta property="og:url" content="${esc(url.origin + '/f/' + id)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${esc(imagen)}">
</head><body><p><a href="${destino}">Ver la fotografía</a></p>
<script>location.replace(${JSON.stringify(destino)});</script></body></html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
}
