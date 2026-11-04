import { json, sha256hex, esAdmin, requireBucket } from '../../_lib/util.js';

const ID_OK = /^[A-Z2-9]{10}$/;
const UMBRAL_REPORTES = 3; // con 3 reportes distintos la foto pasa a "revisión" y se oculta

async function cargar(env, id) {
  const obj = await env.R2_BUCKET.get(`fotos/datos/${id}.json`);
  if (!obj) return null;
  try { return await obj.json(); } catch { return null; }
}
// Huella anónima (IP + navegador + foto): evita contar dos veces a la misma persona sin guardar su IP
async function huellaDe(request, id, sal) {
  const ip = request.headers.get('CF-Connecting-IP') || 'local';
  const ua = request.headers.get('User-Agent') || '';
  return (await sha256hex(`${sal}|${ip}|${ua}|${id}`)).slice(0, 16);
}
const guardar = (env, f) => env.R2_BUCKET.put(`fotos/datos/${f.id}.json`, JSON.stringify(f), { httpMetadata: { contentType: 'application/json' } });

// POST { accion: "like" | "unlike" | "reportar" } (público)  |  { accion: "aprobar" } (administrador)
export async function onRequestPost({ request, env, params }) {
  try {
    const err = requireBucket(env); if (err) return err;
    const id = String(params.id || '');
    if (!ID_OK.test(id)) return json({ error: 'Identificador no válido.' }, 400);
    const body = await request.json().catch(() => ({}));
    const f = await cargar(env, id);
    if (!f) return json({ error: 'La fotografía no existe.' }, 404);

    if (body.accion === 'aprobar') {
      const a = await esAdmin(request, env); if (a.error) return a.error;
      f.estado = 'publicada'; f.reportes = 0; f.reportantes = [];
      await guardar(env, f);
      return json({ ok: true, estado: f.estado });
    }

    if (body.accion === 'like' || body.accion === 'unlike') {
      if (f.estado !== 'publicada') return json({ error: 'La fotografía no está disponible.' }, 404);
      const huella = await huellaDe(request, id, 'like');
      f.votantes = f.votantes || [];
      const i = f.votantes.indexOf(huella);
      if (body.accion === 'like' && i < 0) f.votantes.push(huella);
      if (body.accion === 'unlike' && i >= 0) f.votantes.splice(i, 1);
      await guardar(env, f);
      return json({ ok: true, megusta: f.votantes.length });
    }

    if (body.accion === 'reportar') {
      const huella = await huellaDe(request, id, 'rep');
      f.reportantes = f.reportantes || [];
      if (!f.reportantes.includes(huella)) {
        f.reportantes.push(huella);
        f.reportes = f.reportantes.length;
        if (f.reportes >= UMBRAL_REPORTES && f.estado === 'publicada') f.estado = 'revision';
        await guardar(env, f);
      }
      return json({ ok: true });
    }
    return json({ error: 'Acción no válida.' }, 400);
  } catch (e) {
    return json({ error: 'Error del servidor: ' + e.message }, 500);
  }
}

// DELETE: el administrador (X-Admin-Key) o el autor con su clave de retiro (X-Foto-Key)
export async function onRequestDelete({ request, env, params }) {
  try {
    const err = requireBucket(env); if (err) return err;
    const id = String(params.id || '');
    if (!ID_OK.test(id)) return json({ error: 'Identificador no válido.' }, 400);
    const f = await cargar(env, id);
    if (!f) return json({ error: 'La fotografía no existe.' }, 404);

    let permitido = false;
    if (request.headers.get('X-Admin-Key')) {
      const a = await esAdmin(request, env); if (a.error) return a.error;
      permitido = true;
    } else {
      const k = (request.headers.get('X-Foto-Key') || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      permitido = k.length === 12 && (await sha256hex(k)) === f.claveHash;
    }
    if (!permitido) return json({ error: 'Clave incorrecta.' }, 401);

    if (f.imgKey) await env.R2_BUCKET.delete(f.imgKey);
    await env.R2_BUCKET.delete(`fotos/datos/${id}.json`);
    return json({ ok: true });
  } catch (e) {
    return json({ error: 'Error del servidor: ' + e.message }, 500);
  }
}
