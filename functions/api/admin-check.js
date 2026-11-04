import { json, esAdmin } from '../_lib/util.js';

// Comprueba la clave de administrador (header X-Admin-Key)
export async function onRequestGet({ request, env }) {
  const a = await esAdmin(request, env);
  return a.error || json({ ok: true });
}
