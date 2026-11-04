import { json, clean, randomId, readImage, putImage, listJson, requireBucket, MAX_BYTES } from '../_lib/util.js';

export async function onRequestGet({ env }) {
  const err = requireBucket(env); if (err) return err;
  const eventos = await listJson(env.R2_BUCKET, 'eventos/datos/', 60);
  return json({ eventos });
}

export async function onRequestPost({ request, env }) {
  try {
    const err = requireBucket(env); if (err) return err;
    if (Number(request.headers.get('content-length') || 0) > MAX_BYTES + 200000) {
      return json({ error: 'El envío es demasiado grande (máx. 5 MB).' }, 413);
    }
    const fd = await request.formData();

    if (clean(fd.get('web'), 50)) return json({ ok: true }); // honeypot anti-spam

    const titulo = clean(fd.get('titulo'), 100);
    const fecha = clean(fd.get('fecha'), 10);
    const lugar = clean(fd.get('lugar'), 120);
    const organizador = clean(fd.get('organizador'), 100);
    const contacto = clean(fd.get('contacto'), 120);
    const descripcion = clean(fd.get('descripcion'), 300, true);

    if (!titulo || !lugar || !organizador || !contacto) return json({ error: 'Completa todos los campos obligatorios.' }, 400);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || isNaN(Date.parse(fecha))) return json({ error: 'La fecha no es válida.' }, 400);

    const img = await readImage(fd.get('evento'));
    if (img.error) return json({ error: img.error }, 400);

    const id = randomId(10);
    const imgKey = `eventos/img/${id}.${img.ext}`;
    await putImage(env.R2_BUCKET, imgKey, img);

    const evento = {
      id, titulo, fecha, lugar, organizador, contacto, descripcion,
      imagen: `/api/img/${imgKey}`,
      creado: new Date().toISOString()
    };
    await env.R2_BUCKET.put(`eventos/datos/${id}.json`, JSON.stringify(evento), {
      httpMetadata: { contentType: 'application/json' }
    });
    return json({ ok: true, evento });
  } catch (e) {
    return json({ error: 'Error del servidor: ' + e.message }, 500);
  }
}
