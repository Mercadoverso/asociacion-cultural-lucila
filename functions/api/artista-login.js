import { json, cargarArtistaConClave, publicArtista, requireBucket } from '../_lib/util.js';

// Verifica la clave única y devuelve los datos del perfil para editarlos
export async function onRequestPost({ request, env }) {
  try {
    const err = requireBucket(env); if (err) return err;
    const body = await request.json().catch(() => ({}));
    const artista = await cargarArtistaConClave(env.R2_BUCKET, body.clave);
    if (!artista) return json({ error: 'Clave incorrecta.' }, 401);
    return json({ ok: true, artista: publicArtista(artista) });
  } catch (e) {
    return json({ error: 'Error del servidor: ' + e.message }, 500);
  }
}
