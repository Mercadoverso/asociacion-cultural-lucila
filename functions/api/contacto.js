export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    // Leer los datos del formulario (FormData)
    const formData = await request.formData();
    const nombre = formData.get('nombre');
    const correo = formData.get('correo');
    const tipo = formData.get('tipo');
    const mensaje = formData.get('mensaje');
    const privacidad = formData.get('privacidad');
    const web = formData.get('web'); // Honeypot anti-spam

    // Validaciones
    if (web) return new Response(JSON.stringify({ ok: true }), { status: 200 });
    if (!nombre || !correo || !mensaje || !privacidad) {
      return new Response(JSON.stringify({ error: 'Faltan campos obligatorios.' }), { status: 400 });
    }

    // Guardar en R2 (usando la vinculación R2_BUCKET)
    const id = Date.now().toString();
    const registro = { id, nombre, correo, tipo, mensaje, fecha: new Date().toISOString() };
    
    await env.R2_BUCKET.put(`contactos/${id}.json`, JSON.stringify(registro), {
      httpMetadata: { contentType: 'application/json' }
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}