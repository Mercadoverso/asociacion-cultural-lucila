// Utilidades compartidas por las Pages Functions (no crea rutas: no exporta onRequest*)
export const MAX_BYTES = 5 * 1024 * 1024;
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 caracteres, sin I/O/0/1

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

export function clean(v, max, multiline = false) {
  const re = multiline ? /[\u0000-\u0009\u000b-\u001f\u007f]/g : /[\u0000-\u001f\u007f]/g;
  return String(v ?? '').replace(re, ' ').trim().slice(0, max);
}

export function randomId(n) {
  const b = crypto.getRandomValues(new Uint8Array(n));
  return Array.from(b, x => ALFABETO[x & 31]).join('');
}

export async function sha256hex(txt) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt));
  return Array.from(new Uint8Array(h), x => x.toString(16).padStart(2, '0')).join('');
}

function safeEq(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

// Detecta el tipo real de la imagen por sus primeros bytes (no confía en lo que dice el navegador)
function sniffImage(buf) {
  const u = new Uint8Array(buf, 0, Math.min(12, buf.byteLength));
  if (u[0] === 0xff && u[1] === 0xd8 && u[2] === 0xff) return { type: 'image/jpeg', ext: 'jpg' };
  if (u[0] === 0x89 && u[1] === 0x50 && u[2] === 0x4e && u[3] === 0x47) return { type: 'image/png', ext: 'png' };
  if (u[0] === 0x52 && u[1] === 0x49 && u[2] === 0x46 && u[3] === 0x46 &&
      u[8] === 0x57 && u[9] === 0x45 && u[10] === 0x42 && u[11] === 0x50) return { type: 'image/webp', ext: 'webp' };
  return null;
}

export async function readImage(file, requerida = true) {
  if (!file || typeof file === 'string' || !file.size) {
    return requerida ? { error: 'Debes adjuntar una imagen.' } : { vacia: true };
  }
  if (file.size > MAX_BYTES) return { error: 'La imagen supera los 5 MB.' };
  const buf = await file.arrayBuffer();
  const t = sniffImage(buf);
  if (!t) return { error: 'Formato no válido. Usa JPG, PNG o WebP.' };
  return { buf, ...t };
}

export async function putImage(bucket, key, img) {
  await bucket.put(key, img.buf, { httpMetadata: { contentType: img.type } });
}

export async function listJson(bucket, prefix, limit = 60) {
  const objs = [];
  let cursor;
  do {
    const r = await bucket.list({ prefix, cursor, limit: 1000 });
    objs.push(...r.objects.filter(o => o.key.endsWith('.json')));
    cursor = r.truncated ? r.cursor : undefined;
  } while (cursor && objs.length < 2000);
  objs.sort((a, b) => b.uploaded - a.uploaded);
  const items = await Promise.all(objs.slice(0, limit).map(async o => {
    const x = await bucket.get(o.key);
    if (!x) return null;
    try { return await x.json(); } catch { return null; }
  }));
  return items.filter(Boolean).sort((a, b) => String(b.creado).localeCompare(String(a.creado)));
}

export function requireBucket(env) {
  return env.R2_BUCKET ? null : json({ error: 'Falta el binding R2_BUCKET en Cloudflare Pages.' }, 500);
}

/* ---------- Artistas ---------- */
export function publicArtista(a) {
  const { claveHash, ...pub } = a;
  return pub;
}

function normalizarSocial(v, base) {
  v = clean(v, 200);
  if (!v) return { ok: '' };
  if (/^@?[\w.\-]{1,40}$/.test(v)) return { ok: base + v.replace(/^@/, '') };
  try {
    const u = new URL(/^https?:\/\//i.test(v) ? v : 'https://' + v);
    if (!['http:', 'https:'].includes(u.protocol) || !u.hostname.includes('.')) throw 0;
    return { ok: u.toString() };
  } catch { return { error: true }; }
}

export function parseArtista(fd) {
  const nombre = clean(fd.get('nombre'), 80);
  const especialidad = clean(fd.get('especialidad'), 80);
  if (!nombre || !especialidad) return { error: 'Nombre artístico y especialidad son obligatorios.' };

  const ig = normalizarSocial(fd.get('instagram'), 'https://instagram.com/');
  if (ig.error) return { error: 'El enlace de Instagram no es válido.' };
  const fb = normalizarSocial(fd.get('facebook'), 'https://facebook.com/');
  if (fb.error) return { error: 'El enlace de Facebook no es válido.' };

  const wsp = clean(fd.get('whatsapp'), 30).replace(/[^\d]/g, '');
  if (wsp && (wsp.length < 8 || wsp.length > 15)) return { error: 'El número de WhatsApp no es válido (incluye código de país).' };

  const correo = clean(fd.get('correo'), 120).toLowerCase();
  if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return { error: 'El correo de contacto no es válido.' };

  return { data: { nombre, especialidad, instagram: ig.ok, facebook: fb.ok, whatsapp: wsp, correo } };
}

// La clave tiene el formato LUC-XXXXXX-XXXXXXXXXXXX. Se guarda solo su hash.
export function parseClave(raw) {
  const s = clean(raw, 60).toUpperCase().replace(/\s+/g, '');
  const m = /^LUC-([A-Z2-9]{6})-([A-Z2-9]{12})$/.exec(s);
  return m ? { id: m[1], secret: m[2] } : null;
}

export async function cargarArtistaConClave(bucket, claveRaw) {
  const k = parseClave(claveRaw);
  if (!k) return null;
  const obj = await bucket.get(`artistas/datos/${k.id}.json`);
  if (!obj) return null;
  let data;
  try { data = await obj.json(); } catch { return null; }
  const h = await sha256hex(k.secret);
  return safeEq(h, data.claveHash) ? data : null;
}

/* ---------- Administrador ---------- */
// La clave de administrador vive en el secreto ADMIN_KEY de Cloudflare (nunca en el código).
export async function esAdmin(request, env) {
  if (!env.ADMIN_KEY) return { error: json({ error: 'Falta configurar el secreto ADMIN_KEY en Cloudflare.' }, 500) };
  const dada = request.headers.get('X-Admin-Key') || '';
  const ok = safeEq(await sha256hex(dada), await sha256hex(String(env.ADMIN_KEY)));
  return ok ? { ok: true } : { error: json({ error: 'Clave de administrador incorrecta.' }, 401) };
}
