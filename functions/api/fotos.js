import { json, clean, randomId, sha256hex, readImage, putImage, listJson, esAdmin, requireBucket, MAX_BYTES } from '../_lib/util.js';

const CATEGORIAS = ['conciertos', 'ensayos', 'talleres', 'estudio', 'exposiciones', 'comunidad'];
const ROLES = ['socio', 'amigo', 'visitante'];

function pubFoto(f, admin) {
  const o = {
    id: f.id, nombre: f.nombre, rol: f.rol, lugar: f.lugar, fecha: f.fecha, nota: f.nota,
    categoria: f.categoria, whatsapp: f.whatsapp, imagen: f.imagen, creado: f.creado,
    megusta: (f.votantes || []).length
  };
  if (admin) { o.estado = f.estado; o.reportes = f.reportes || 0; }
  return o;
}

// Público: solo fotos publicadas. Administrador (header X-Admin-Key): todas, incluidas pendientes y en revisión.
export async function onRequestGet({ request, env }) {
  const err = requireBucket(env); if (err) return err;
  let admin = false;
  if (request.headers.get('X-Admin-Key')) {
    const a = await esAdmin(request, env);
    if (a.error) return a.error;
    admin = true;
  }
  const lista = await listJson(env.R2_BUCKET, 'fotos/datos/', 300);
  const visibles = admin ? lista : lista.filter(f => f.estado === 'publicada');
  return json({ fotos: visibles.map(f => pubFoto(f, admin)) });
}

// Subida de una fotografía. Queda "pendiente" hasta que el equipo la apruebe
// (o se publica al tiro si defines FOTOS_AUTO_APROBAR=1).
export async function onRequestPost({ request, env }) {
  try {
    const err = requireBucket(env); if (err) return err;
    if (Number(request.headers.get('content-length') || 0) > MAX_BYTES + 200000) {
      return json({ error: 'El envío es demasiado grande (máx. 5 MB).' }, 413);
    }
    const fd = await request.formData();
    if (clean(fd.get('web'), 50)) return json({ ok: true, estado: 'pendiente', clave: '' }); // honeypot

    const nombre = clean(fd.get('nombre'), 60);
    const rol = ROLES.includes(fd.get('rol')) ? fd.get('rol') : 'visitante';
    const categoria = CATEGORIAS.includes(fd.get('categoria')) ? fd.get('categoria') : '';
    const lugar = clean(fd.get('lugar'), 100);
    const nota = clean(fd.get('nota'), 140);
    const fecha = clean(fd.get('fecha'), 10);
    const wsp = clean(fd.get('whatsapp'), 30).replace(/[^\d]/g, '');

    if (nombre.length < 2 || !lugar || !categoria) return json({ error: 'Completa nombre, categoría y lugar o evento.' }, 400);
    const t = Date.parse(fecha);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || isNaN(t) || t > Date.now() + 86400000 || t < Date.parse('1950-01-01')) {
      return json({ error: 'La fecha de la fotografía no es válida.' }, 400);
    }
    if (wsp && (wsp.length < 8 || wsp.length > 15)) return json({ error: 'El WhatsApp no es válido (incluye código de país).' }, 400);
    if (fd.get('consentimiento') !== '1') return json({ error: 'Debes confirmar que eres autor/a o tienes permiso para publicar.' }, 400);

    const img = await readImage(fd.get('foto'));
    if (img.error) return json({ error: img.error }, 400);

    const id = randomId(10);
    const secret = randomId(12);
    const imgKey = `fotos/img/${id}.${img.ext}`;
    await putImage(env.R2_BUCKET, imgKey, img);

    const estado = env.FOTOS_AUTO_APROBAR === '1' ? 'publicada' : 'pendiente';
    const foto = {
      id, nombre, rol, categoria, lugar, nota, fecha, whatsapp: wsp,
      imagen: `/api/img/${imgKey}`, imgKey, estado,
      reportes: 0, reportantes: [], votantes: [],
      claveHash: await sha256hex(secret),
      creado: new Date().toISOString()
    };
    await env.R2_BUCKET.put(`fotos/datos/${id}.json`, JSON.stringify(foto), { httpMetadata: { contentType: 'application/json' } });

    const clave = `${secret.slice(0, 4)}-${secret.slice(4, 8)}-${secret.slice(8, 12)}`;
    return json({ ok: true, estado, clave, foto: pubFoto(foto, false) });
  } catch (e) {
    return json({ error: 'Error del servidor: ' + e.message }, 500);
  }
}
