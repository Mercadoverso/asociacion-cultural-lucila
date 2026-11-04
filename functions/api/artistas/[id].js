import { json, randomId, readImage, putImage, parseArtista, parseClave, cargarArtistaConClave, publicArtista, requireBucket, MAX_BYTES } from '../../_lib/util.js';

// Edita un perfil. Solo funciona con la clave única del artista.
export async function onRequestPut({ request, env, params }) {
  try {
    const err = requireBucket(env); if (err) return err;
    if (Number(request.headers.get('content-length') || 0) > MAX_BYTES + 200000) {
      return json({ error: 'El envío es demasiado grande (máx. 5 MB).' }, 413);
    }
    const fd = await request.formData();
    const k = parseClave(fd.get('clave'));
    if (!k || k.id !== String(params.id).toUpperCase()) return json({ error: 'Clave incorrecta.' }, 401);

    const actual = await cargarArtistaConClave(env.R2_BUCKET, fd.get('clave'));
    if (!actual) return json({ error: 'Clave incorrecta.' }, 401);

    const p = parseArtista(fd);
    if (p.error) return json({ error: p.error }, 400);

    const nueva = { ...actual, ...p.data, actualizado: new Date().toISOString() };

    const img = await readImage(fd.get('foto'), false);
    if (img.error) return json({ error: img.error }, 400);
    if (!img.vacia) {
      const imgKey = `artistas/img/${actual.id}-${randomId(4).toLowerCase()}.${img.ext}`;
      await putImage(env.R2_BUCKET, imgKey, img);
      if (actual.fotoKey) await env.R2_BUCKET.delete(actual.fotoKey);
      nueva.foto = `/api/img/${imgKey}`;
      nueva.fotoKey = imgKey;
    }

    await env.R2_BUCKET.put(`artistas/datos/${actual.id}.json`, JSON.stringify(nueva), {
      httpMetadata: { contentType: 'application/json' }
    });
    return json({ ok: true, artista: publicArtista(nueva) });
  } catch (e) {
    return json({ error: 'Error del servidor: ' + e.message }, 500);
  }
}
