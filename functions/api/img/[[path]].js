// Sirve imágenes guardadas en R2: /api/img/eventos/img/xxx.jpg
export async function onRequestGet({ params, env }) {
  const key = Array.isArray(params.path) ? params.path.join('/') : String(params.path || '');
  if (!env.R2_BUCKET || !/^(eventos|artistas|fotos)\/img\/[A-Za-z0-9._-]+$/.test(key)) {
    return new Response('No encontrado', { status: 404 });
  }
  const obj = await env.R2_BUCKET.get(key);
  if (!obj) return new Response('No encontrado', { status: 404 });
  return new Response(obj.body, {
    headers: {
      'Content-Type': obj.httpMetadata?.contentType || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      'ETag': obj.httpEtag
    }
  });
}
