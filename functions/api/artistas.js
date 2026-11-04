import { json, randomId, sha256hex, readImage, putImage, listJson, parseArtista, publicArtista, requireBucket, MAX_BYTES } from '../_lib/util.js';

export async function onRequestGet({ env }) {
  const err = requireBucket(env); if (err) return err;
  const lista = await listJson(env.R2_BUCKET, 'artistas/datos/', 60);
  return json({ artistas: lista.map(publicArtista) });
}

// Crea un perfil nuevo y devuelve la CLAVE ÚNICA (solo se muestra esta vez)
export async function onRequestPost({ request, env }) {
  try {
    const err = requireBucket(env); if (err) return err;
    if (Number(request.headers.get('content-length') || 0) > MAX_BYTES + 200000) {
      return json({ error: 'El envío es demasiado grande (máx. 5 MB).' }, 413);
    }
    const fd = await request.formData();
    const p = parseArtista(fd);
    if (p.error) return json({ error: p.error }, 400);

    const img = await readImage(fd.get('foto'));
    if (img.error) return json({ error: img.error }, 400);

    let id;
    do { id = randomId(6); } while (await env.R2_BUCKET.head(`artistas/datos/${id}.json`));
    const secret = randomId(12);

    const imgKey = `artistas/img/${id}-${randomId(4).toLowerCase()}.${img.ext}`;
    await putImage(env.R2_BUCKET, imgKey, img);

    const ahora = new Date().toISOString();
    const artista = {
      id, ...p.data,
      foto: `/api/img/${imgKey}`,
      fotoKey: imgKey,
      claveHash: await sha256hex(secret),
      creado: ahora, actualizado: ahora
    };
    await env.R2_BUCKET.put(`artistas/datos/${id}.json`, JSON.stringify(artista), {
      httpMetadata: { contentType: 'application/json' }
    });
    return json({ ok: true, clave: `LUC-${id}-${secret}`, artista: publicArtista(artista) });
  } catch (e) {
    return json({ error: 'Error del servidor: ' + e.message }, 500);
  }
}
