import { json, esAdmin, requireBucket } from '../../_lib/util.js';

// Elimina un evento (y su afiche). Solo administrador.
export async function onRequestDelete({ request, env, params }) {
  try {
    const err = requireBucket(env); if (err) return err;
    const a = await esAdmin(request, env);
    if (a.error) return a.error;

    const id = String(params.id || '');
    if (!/^[A-Z2-9]{10}$/.test(id)) return json({ error: 'Identificador no válido.' }, 400);

    const key = `eventos/datos/${id}.json`;
    const obj = await env.R2_BUCKET.get(key);
    if (!obj) return json({ error: 'El evento no existe.' }, 404);

    let ev = {};
    try { ev = await obj.json(); } catch {}
    const m = /^\/api\/img\/(eventos\/img\/[A-Za-z0-9._-]+)$/.exec(ev.imagen || '');
    if (m) await env.R2_BUCKET.delete(m[1]);
    await env.R2_BUCKET.delete(key);
    return json({ ok: true });
  } catch (e) {
    return json({ error: 'Error del servidor: ' + e.message }, 500);
  }
}
