/* Registro Fotográfico · Asociación Cultural Lucila
   Construye la sección #registro (galería polaroid colaborativa) y la inserta antes de #contacto. */
(function () {
  'use strict';
  const contacto = document.getElementById('contacto');
  if (!contacto || document.getElementById('registro')) return;

  const CATS = [['conciertos', 'Conciertos'], ['ensayos', 'Ensayos'], ['talleres', 'Talleres'], ['estudio', 'Estudio de grabación'], ['exposiciones', 'Exposiciones'], ['comunidad', 'Comunidad']];
  const ROLES = { socio: 'Socio/a', amigo: 'Amigo/a', visitante: 'Visitante' };
  const ROT = [-1.4, 0.9, -0.6, 1.2, -1, 0.5];
  const PAGINA = 12, MAX_ENTRADA = 15 * 1024 * 1024;

  /* ---------------- utilidades ---------------- */
  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, txt) => { const n = document.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; };
  const ico = (c) => { const i = el('i', c); i.setAttribute('aria-hidden', 'true'); return i; };
  const catNombre = (k) => (CATS.find(c => c[0] === k) || [k, k])[1];
  const fmtFecha = (f) => { const d = new Date(f + 'T12:00:00'); return isNaN(d) ? f : d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' }); };
  const leerAdmin = () => { try { return sessionStorage.getItem('lucilaAdmin') || ''; } catch (e) { return ''; } };

  async function api(url, opts) {
    let res;
    try { res = await fetch(url, opts); } catch (e) { throw new Error('No hay conexión con el servidor.'); }
    const txt = await res.text();
    let data = null; try { data = JSON.parse(txt); } catch (e) {}
    if (!data) throw new Error('La API no respondió (' + res.status + '). En local usa: npx wrangler pages dev . --r2 R2_BUCKET');
    if (!res.ok) { const er = new Error(data.error || ('Error ' + res.status)); er.status = res.status; throw er; }
    return data;
  }

  async function copiar(t) {
    try { await navigator.clipboard.writeText(t); return true; }
    catch (e) {
      try { const ta = el('textarea'); ta.value = t; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); return ok; }
      catch (e2) { return false; }
    }
  }

  /* ---------------- estilos ---------------- */
  const css = `
  #registro,.rf-overlay{--ink:#14110F;--cream:#FAF3E8;--gold:#E8B84A;--lucila:#D62E1F;--f-display:'Outfit','Helvetica Neue',Arial,sans-serif;--f-body:'Inter','Helvetica Neue',Arial,sans-serif;--f-nota:'Cormorant Garamond',Georgia,serif;font-family:var(--f-body);color:var(--ink)}
  #registro{position:relative;padding:6rem 0 5rem;background-color:#E7DCC8;background-image:radial-gradient(rgba(20,17,15,.08) 1px,transparent 1px);background-size:22px 22px;border-top:1px solid rgba(20,17,15,.15)}
  #registro *,.rf-overlay *{box-sizing:border-box;border-radius:0}
  #registro button,#registro select,#registro input,.rf-overlay button,.rf-overlay select,.rf-overlay input,.rf-overlay textarea{font-family:var(--f-body)}
  .rf-head{text-align:center;max-width:860px;margin:0 auto 3rem}
  .rf-eyebrow{display:inline-block;font:500 .75rem var(--f-display);letter-spacing:.32em;text-transform:uppercase;color:var(--lucila);padding-bottom:.6rem;margin-bottom:1.2rem;border-bottom:1px solid var(--gold)}
  .rf-title{font:300 clamp(3rem,8.5vw,7rem)/.92 var(--f-display);letter-spacing:-.025em;text-transform:uppercase;margin:0 0 1.4rem;color:var(--ink)}
  .rf-lead{font-size:clamp(1.05rem,1.8vw,1.3rem);font-weight:300;line-height:1.6;margin:0 auto;max-width:52ch;color:#3a332e}
  .rf-stats{display:flex;justify-content:center;gap:clamp(1.5rem,5vw,4rem);margin-top:2.2rem;flex-wrap:wrap}
  .rf-stat strong{display:block;font:200 clamp(2.4rem,5vw,3.6rem)/1 var(--f-display);color:var(--ink)}
  .rf-stat span{font-size:.7rem;letter-spacing:.2em;text-transform:uppercase;color:#5a5047}
  .rf-admin{margin:0 auto 1.5rem;max-width:760px;background:var(--ink);color:var(--cream);padding:.7rem 1rem;font-size:.85rem;text-align:center}
  .rf-toolbar{display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap;margin-bottom:2.5rem;padding:1rem 0;border-top:1px solid rgba(20,17,15,.25);border-bottom:1px solid rgba(20,17,15,.25)}
  .rf-chips{display:flex;gap:.5rem;flex-wrap:wrap}
  .rf-chip,.rf-select{background:transparent;border:1px solid var(--ink);color:var(--ink);padding:.55rem 1rem;font-size:.7rem;font-weight:500;letter-spacing:.14em;text-transform:uppercase;cursor:pointer;transition:background-color .2s,color .2s}
  .rf-chip:hover{background:rgba(20,17,15,.08)}
  .rf-chip[aria-pressed="true"]{background:var(--ink);color:var(--cream)}
  .rf-chip small{opacity:.6;margin-left:.35rem;font-size:.9em}
  .rf-tools{display:flex;gap:.6rem;align-items:center;flex-wrap:wrap}
  .rf-select{padding-right:.6rem;background:#fff}
  .rf-cta{display:inline-flex;align-items:center;gap:.6rem;background:var(--lucila);color:#fff;border:1px solid var(--lucila);padding:.8rem 1.4rem;font:500 .75rem var(--f-display);letter-spacing:.2em;text-transform:uppercase;cursor:pointer;transition:background-color .2s,color .2s}
  .rf-cta:hover{background:var(--ink);border-color:var(--ink)}
  .rf-ghost{background:transparent;border:1px solid var(--ink);color:var(--ink);padding:.8rem 1.6rem;font:500 .75rem var(--f-display);letter-spacing:.2em;text-transform:uppercase;cursor:pointer}
  .rf-ghost:hover{background:var(--ink);color:var(--cream)}
  .rf-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}
  .rf-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:3rem 2.2rem;padding:.8rem}
  .rf-more{text-align:center;margin-top:3rem}
  .rf-empty{grid-column:1/-1;text-align:center;padding:3rem 1rem;font-size:1.1rem;font-weight:300;color:#3a332e}
  /* Polaroid */
  .rf-pol{position:relative;background:#fff;padding:14px 14px 0;box-shadow:0 2px 3px rgba(20,17,15,.2),0 16px 32px rgba(20,17,15,.2)}
  .rf-pol__photo{display:block;width:100%;aspect-ratio:4/5;border:0;padding:0;background:#d9d1c4;overflow:hidden;cursor:zoom-in;position:relative}
  .rf-pol__photo img{width:100%;height:100%;object-fit:cover;display:block;filter:contrast(1.03) saturate(.95)}
  .rf-pol__ph{display:flex;flex-direction:column;gap:.6rem;align-items:center;justify-content:center;height:100%;color:#6a6055;font-size:.8rem;letter-spacing:.14em;text-transform:uppercase}
  .rf-pol__ph i{font-size:2rem}
  .rf-pol__body{padding:11px 2px 10px}
  .rf-pol__nota{font:italic 500 1.15rem/1.2 var(--f-nota);min-height:1.2em;margin:0 0 .45rem;color:#2a2420;word-break:break-word}
  .rf-pol__meta{font-size:.74rem;line-height:1.45;color:#4a423b;font-weight:400}
  .rf-pol__meta strong{font-weight:600;color:var(--ink)}
  .rf-tag{display:inline-block;margin-top:.35rem;font-size:.62rem;font-weight:500;letter-spacing:.16em;text-transform:uppercase;color:var(--lucila);border-bottom:1px solid var(--gold)}
  .rf-pol__actions{position:relative;display:flex;align-items:center;gap:.35rem;flex-wrap:wrap;margin-top:.6rem;padding-top:.55rem;border-top:1px solid rgba(20,17,15,.14)}
  .rf-act{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;min-width:32px;height:32px;padding:0 .55rem;background:#fff;border:1px solid rgba(20,17,15,.3);color:var(--ink);font-size:.66rem;font-weight:500;letter-spacing:.14em;text-transform:uppercase;text-decoration:none;cursor:pointer;transition:border-color .2s,color .2s,background-color .2s}
  .rf-act:hover{border-color:var(--lucila);color:var(--lucila)}
  .rf-act--main{flex:1 1 auto}
  .rf-like{gap:.4rem;letter-spacing:.04em;font-size:.72rem}
  .rf-like--on{color:var(--lucila);border-color:var(--lucila)}
  .rf-like--pop i{animation:rfPop .35s ease}
  @keyframes rfPop{0%{transform:scale(1)}45%{transform:scale(1.4)}100%{transform:scale(1)}}
  .rf-act--ok{background:var(--ink);color:var(--cream);border-color:var(--ink)}
  .rf-act--ok:hover{background:#2b2420;color:var(--cream);border-color:#2b2420}
  .rf-act--danger{color:#fff;background:var(--lucila);border-color:var(--lucila)}
  .rf-act--danger:hover{background:var(--ink);color:#fff;border-color:var(--ink)}
  .rf-badge{position:absolute;top:-12px;left:10px;z-index:2;background:var(--lucila);color:#fff;font-size:.62rem;font-weight:500;letter-spacing:.16em;text-transform:uppercase;padding:.3rem .65rem}
  .rf-pop{position:absolute;bottom:calc(100% + 8px);left:0;right:0;z-index:6;display:none;grid-template-columns:repeat(3,1fr);gap:.4rem;padding:.6rem;background:#fff;border:1px solid var(--ink);box-shadow:0 12px 30px rgba(20,17,15,.3)}
  .rf-pop.on{display:grid}
  .rf-pop a,.rf-pop button{display:flex;flex-direction:column;align-items:center;gap:.35rem;padding:.6rem .2rem;background:#fff;border:1px solid rgba(20,17,15,.25);color:var(--ink);font-size:.62rem;font-weight:500;letter-spacing:.08em;text-transform:uppercase;text-decoration:none;cursor:pointer}
  .rf-pop a:hover,.rf-pop button:hover{border-color:var(--lucila);color:var(--lucila)}
  .rf-pop i{font-size:1.1rem}
  /* Superposiciones */
  .rf-overlay{position:fixed;inset:0;z-index:9000;display:none;overflow:auto;padding:4vh 16px;background:rgba(14,10,8,.88)}
  .rf-overlay.on{display:block}
  .rf-panel{position:relative;max-width:980px;margin:0 auto;background:var(--cream);padding:2.4rem;border:1px solid var(--ink)}
  .rf-close{position:absolute;top:10px;right:10px;width:40px;height:40px;background:transparent;border:1px solid var(--ink);font-size:1.4rem;line-height:1;cursor:pointer;color:var(--ink)}
  .rf-close:hover{background:var(--ink);color:var(--cream)}
  .rf-cols{display:grid;grid-template-columns:1fr;gap:2.5rem}
  @media(min-width:860px){.rf-cols{grid-template-columns:1.15fr .85fr}.rf-prev{position:sticky;top:1rem;align-self:start}}
  .rf-panel h3{font:300 2rem/1.05 var(--f-display);letter-spacing:-.01em;margin:0 0 .5rem}
  .rf-hint{font-size:.9rem;font-weight:300;color:#4a423b;margin:0 0 1.4rem;line-height:1.5}
  .rf-row{display:grid;grid-template-columns:1fr 1fr;gap:.9rem}
  @media(max-width:520px){.rf-row{grid-template-columns:1fr}}
  .rf-f{margin-bottom:.9rem}
  .rf-f label{display:block;margin-bottom:.35rem;font-size:.7rem;font-weight:500;letter-spacing:.14em;text-transform:uppercase}
  .rf-f input[type=text],.rf-f input[type=date],.rf-f input[type=tel],.rf-f select,.rf-f textarea{width:100%;padding:.7rem .8rem;background:#fff;border:1px solid var(--ink);font-size:.95rem;font-weight:300;color:var(--ink)}
  .rf-f textarea{resize:vertical}
  .rf-f input:focus,.rf-f select:focus,.rf-f textarea:focus{outline:none;border-color:var(--lucila)}
  .rf-f small{display:block;margin-top:.3rem;font-size:.75rem;color:#6a6055;font-weight:300}
  .rf-drop{display:flex;align-items:center;gap:1rem;margin-bottom:1.1rem;padding:1rem;border:1px dashed var(--ink);background:#fff}
  .rf-check{display:flex;gap:.7rem;align-items:flex-start;margin:1rem 0 1.2rem;font-size:.82rem;line-height:1.45;font-weight:300}
  .rf-check input{margin-top:.2rem;width:16px;height:16px;flex-shrink:0;accent-color:var(--lucila)}
  .rf-check a{color:var(--lucila)}
  .rf-msg{margin:.9rem 0 0;font-size:.9rem;font-weight:500;min-height:1.2em}
  .rf-prev-label{font-size:.7rem;font-weight:500;letter-spacing:.2em;text-transform:uppercase;color:#6a6055;margin:0 0 1.2rem}
  .rf-ok{text-align:center;max-width:560px;margin:0 auto}
  .rf-key{margin:1.2rem 0;padding:1rem;border:1px dashed var(--lucila);background:#fff;font:500 1.5rem var(--f-display);letter-spacing:.12em;user-select:all}
  .rf-lb{background:rgba(14,10,8,.94)}
  .rf-lb__stage{max-width:560px;margin:2vh auto}
  .rf-lb .rf-pol__photo{aspect-ratio:auto;cursor:default;background:#111;max-height:62vh}
  .rf-lb .rf-pol__photo img{height:auto;max-height:62vh;object-fit:contain}
    .rf-nav{position:fixed;top:50%;transform:translateY(-50%);width:48px;height:48px;background:rgba(250,243,232,.12);border:1px solid rgba(250,243,232,.5);color:var(--cream);font-size:1.1rem;cursor:pointer;z-index:2}
  .rf-nav:hover{background:var(--cream);color:var(--ink)}
  .rf-nav--p{left:12px}.rf-nav--n{right:12px}
  .rf-lb .rf-close{position:fixed;top:12px;right:12px;border-color:rgba(250,243,232,.6);color:var(--cream)}
  .rf-count{text-align:center;color:rgba(250,243,232,.7);font-size:.72rem;letter-spacing:.2em;text-transform:uppercase;margin-top:1rem}
  .rf-actions{display:flex;justify-content:center;align-items:center;gap:1rem;flex-wrap:wrap;margin-top:2.2rem}
  .rf-toggle{display:inline-flex;align-items:center;gap:.8rem;background:transparent;color:var(--ink);border:1px solid var(--ink);padding:.8rem 1.4rem;font:500 .75rem var(--f-display);letter-spacing:.2em;text-transform:uppercase;cursor:pointer;transition:background-color .2s,color .2s}
  .rf-toggle:hover,.rf-toggle[aria-expanded="true"]{background:var(--ink);color:var(--cream)}
  .rf-toggle i{font-size:.7rem;transition:transform .25s}
  .rf-toggle[aria-expanded="true"] i{transform:rotate(180deg)}
  @keyframes rfLatido{
    0%{transform:scale(1);box-shadow:0 0 0 0 var(--pulso);background-color:transparent}
    14%{transform:scale(1.05);background-color:var(--flash)}
    28%{transform:scale(1);background-color:transparent}
    42%{transform:scale(1.05);box-shadow:0 0 0 14px transparent;background-color:var(--flash)}
    70%,100%{transform:scale(1);box-shadow:0 0 0 0 transparent;background-color:transparent}
  }
  .rf-toggle[aria-expanded="false"]{--pulso:rgba(214,46,31,.55);--flash:rgba(214,46,31,.14);animation:rfLatido 2.4s ease-in-out infinite}
  .rf-toggle[aria-expanded="false"]:hover,.rf-toggle[aria-expanded="false"]:focus-visible{animation-play-state:paused}
  #registro.is-collapsed{padding:4.5rem 0}
  #registro.is-collapsed .rf-head{margin-bottom:0}
  #registro.is-collapsed .rf-cuerpo{display:none}
  #registro:not(.is-collapsed) .rf-cuerpo{animation:rfIn .35s ease backwards}
  @keyframes rfIn{from{opacity:0}to{opacity:1}}
  @media(prefers-reduced-motion:reduce){.rf-pol,.rf-toggle i{transition:none}#registro .rf-cuerpo{animation:none!important}.rf-toggle{animation:none!important}.rf-like--pop i{animation:none}}
  `;
  const st = el('style'); st.id = 'registro-estilos'; st.textContent = css; document.head.appendChild(st);

  /* ---------------- estructura ---------------- */
  const sec = document.createElement('section');
  sec.id = 'registro'; sec.className = 'section is-collapsed'; sec.setAttribute('aria-labelledby', 'registro-title');
  sec.innerHTML = `
  <div class="container">
    <header class="rf-head">
      <span class="rf-eyebrow">Memoria viva</span>
      <h2 id="registro-title" class="rf-title">Registro Fotográfico</h2>
      <p class="rf-lead">La memoria de nuestra comunidad, escrita con luz. Socios, amigos y visitantes comparten los instantes que hacen vivir la música y el arte en el Valle de Aconcagua.</p>
      <div class="rf-stats" id="rf-stats"></div>
      <div class="rf-actions">
        <button type="button" class="rf-toggle" id="rf-toggle" aria-expanded="false" aria-controls="rf-cuerpo"></button>
        <button type="button" class="rf-cta" id="rf-abrir"></button>
      </div>
    </header>
    <div id="rf-admin"></div>
    <div class="rf-cuerpo" id="rf-cuerpo">
    <div class="rf-toolbar">
      <div class="rf-chips" id="rf-chips" role="group" aria-label="Filtrar por categoría"></div>
      <div class="rf-tools">
        <label class="rf-sr" for="rf-anio">Año</label>
        <select class="rf-select" id="rf-anio"></select>
        <label class="rf-sr" for="rf-orden">Ordenar</label>
        <select class="rf-select" id="rf-orden"><option value="fecha">Más recientes</option><option value="likes">Más me gusta</option></select>
      </div>
    </div>
    <div class="rf-grid" id="rf-grid" aria-live="polite"></div>
    <div class="rf-more"><button type="button" class="rf-ghost" id="rf-mas" hidden>Ver más fotografías</button></div>
    </div>
  </div>`;
  contacto.parentNode.insertBefore(sec, contacto);
  const cta = $('rf-abrir'); cta.append(ico('fas fa-camera'), el('span', null, 'Subir fotografía'));

  const modal = el('div', 'rf-overlay'); modal.id = 'rf-modal';
  modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true'); modal.setAttribute('aria-labelledby', 'rf-modal-title');
  modal.innerHTML = `
  <div class="rf-panel">
    <button type="button" class="rf-close" id="rf-modal-x" aria-label="Cerrar">&times;</button>
    <div class="rf-cols" id="rf-step-form">
      <form id="rf-form" novalidate>
        <h3 id="rf-modal-title">Sube tu fotografía</h3>
        <p class="rf-hint">Comparte un momento de nuestra comunidad. El equipo la revisa antes de publicarla.</p>
        <div class="rf-drop">
          <button type="button" class="rf-ghost" id="rf-pick">Seleccionar fotografía</button>
          <span id="rf-file-name" style="font-size:.85rem;font-weight:300">JPG, PNG o WebP</span>
          <input type="file" id="rf-file" accept="image/jpeg,image/png,image/webp" hidden>
        </div>
        <div class="rf-row">
          <div class="rf-f"><label for="rf-nombre">Tu nombre *</label><input type="text" id="rf-nombre" maxlength="60" autocomplete="name"></div>
          <div class="rf-f"><label for="rf-rol">Eres *</label><select id="rf-rol"><option value="socio">Socio/a</option><option value="amigo">Amigo/a</option><option value="visitante" selected>Visitante</option></select></div>
        </div>
        <div class="rf-row">
          <div class="rf-f"><label for="rf-fecha">Fecha de la foto *</label><input type="date" id="rf-fecha"></div>
          <div class="rf-f"><label for="rf-cat">Categoría *</label><select id="rf-cat"></select></div>
        </div>
        <div class="rf-f"><label for="rf-lugar">Lugar o evento *</label><input type="text" id="rf-lugar" maxlength="100" placeholder="Ej. Teatro Municipal de Los Andes"></div>
        <div class="rf-f"><label for="rf-nota">Nota al pie de la foto</label><textarea id="rf-nota" rows="2" maxlength="140" placeholder="Una frase corta que acompañe la imagen"></textarea><small id="rf-count">0 / 140</small></div>
        <div class="rf-f"><label for="rf-wsp">WhatsApp (opcional)</label><input type="tel" id="rf-wsp" maxlength="30" placeholder="+56 9 1234 5678" autocomplete="tel"><small>Si lo ingresas, se mostrará un botón para que te contacten.</small></div>
        <input type="text" id="rf-web" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;opacity:0">
        <label class="rf-check"><input type="checkbox" id="rf-consent"><span>Soy autor/a de esta fotografía (o tengo permiso) y las personas que aparecen aceptan su difusión. Autorizo su publicación en este sitio según la <a href="pages/privacidad.html">Política de Privacidad</a>.</span></label>
        <button type="submit" class="rf-cta" id="rf-enviar">Enviar fotografía</button>
        <p class="rf-msg" id="rf-msg" role="status" aria-live="polite"></p>
      </form>
      <aside class="rf-prev"><p class="rf-prev-label">Así se verá</p><div id="rf-preview"></div></aside>
    </div>
    <div class="rf-ok" id="rf-step-ok" hidden>
      <h3>¡Gracias por compartir!</h3>
      <p class="rf-hint" id="rf-ok-txt"></p>
      <p class="rf-hint"><strong>Guarda esta clave.</strong> Es la única forma de retirar tu fotografía del sitio si cambias de opinión.</p>
      <div class="rf-key" id="rf-key"></div>
      <button type="button" class="rf-ghost" id="rf-copy-key">Copiar clave</button>
    </div>
  </div>`;
  document.body.appendChild(modal);

  const lb = el('div', 'rf-overlay rf-lb'); lb.id = 'rf-lb';
  lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'Fotografía ampliada');
  lb.innerHTML = `<button type="button" class="rf-close" id="rf-lb-x" aria-label="Cerrar">&times;</button>
    <button type="button" class="rf-nav rf-nav--p" id="rf-lb-p" aria-label="Anterior"><i class="fas fa-chevron-left" aria-hidden="true"></i></button>
    <button type="button" class="rf-nav rf-nav--n" id="rf-lb-n" aria-label="Siguiente"><i class="fas fa-chevron-right" aria-hidden="true"></i></button>
    <div class="rf-lb__stage" id="rf-lb-stage"></div><div class="rf-count" id="rf-lb-count"></div>`;
  document.body.appendChild(lb);

  // Enlaces de navegación y pie
  const nav = $('navLinks');
  if (nav && !nav.querySelector('a[href="#registro"]')) {
    const li = el('li'); const a = el('a', null, 'Registro'); a.href = '#registro'; li.appendChild(a);
    const c = nav.querySelector('a[href="#contacto"]'); nav.insertBefore(li, c ? c.parentNode : null);
  }
  const fe = document.querySelector('.footer a[href="#eventos"]');
  if (fe && fe.parentNode.tagName === 'LI') {
    const li = el('li'); const a = el('a', null, 'Registro fotográfico'); a.href = '#registro'; li.appendChild(a);
    fe.parentNode.parentNode.insertBefore(li, fe.parentNode.nextSibling);
  }

  /* ---------------- estado ---------------- */
  let fotos = [], lista = [], orden = 'fecha', filtroCat = 'todas', filtroAnio = 'todos', visibles = PAGINA, actual = -1, adminKey = leerAdmin();
  const publicadas = () => fotos.filter(f => !f.estado || f.estado === 'publicada');

  /* ---- despliegue de la sección ---- */
  const tg = $('rf-toggle');
  function pintarToggle() {
    const abierto = !sec.classList.contains('is-collapsed');
    const n = publicadas().length;
    tg.setAttribute('aria-expanded', String(abierto));
    tg.textContent = '';
    tg.append(el('span', null, abierto ? 'Ocultar el registro' : 'Ver el registro' + (n ? ' (' + n + ')' : '')), ico('fas fa-chevron-down'));
  }
  function setAbierto(abrir, scroll) {
    sec.classList.toggle('is-collapsed', !abrir);
    pintarToggle();
    if (!abrir && scroll && sec.getBoundingClientRect().top < 0) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  tg.addEventListener('click', () => setAbierto(sec.classList.contains('is-collapsed'), true));
  window.addEventListener('lucila-expandir', (e) => { if (e.detail === 'registro') setAbierto(true, false); });
  pintarToggle();

  function filtradas() {
    const r = fotos.filter(f => (filtroCat === 'todas' || f.categoria === filtroCat) && (filtroAnio === 'todos' || f.fecha.slice(0, 4) === filtroAnio));
    if (orden === 'likes') r.sort((a, b) => (b.megusta || 0) - (a.megusta || 0));
    return r;
  }

  /* ---------------- polaroid ---------------- */
  function popoverCompartir(f, cont) {
    const url = location.origin + '/f/' + f.id;
    const texto = (f.nota ? '“' + f.nota + '” — ' : '') + 'Foto de ' + f.nombre + ' · ' + f.lugar + ' (' + fmtFecha(f.fecha) + ')';
    const enc = encodeURIComponent;
    const pop = el('div', 'rf-pop');
    [['WhatsApp', 'fab fa-whatsapp', 'https://wa.me/?text=' + enc(texto + '\n' + url)],
     ['Facebook', 'fab fa-facebook-f', 'https://www.facebook.com/sharer/sharer.php?u=' + enc(url)],
     ['X', 'fab fa-x-twitter', 'https://twitter.com/intent/tweet?text=' + enc(texto) + '&url=' + enc(url)],
     ['Telegram', 'fab fa-telegram', 'https://t.me/share/url?url=' + enc(url) + '&text=' + enc(texto)],
     ['Correo', 'fas fa-envelope', 'mailto:?subject=' + enc('Registro Fotográfico Lucila') + '&body=' + enc(texto + '\n' + url)]
    ].forEach(([n, ic, href]) => {
      const a = el('a'); a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.append(ico(ic), el('span', null, n)); pop.appendChild(a);
    });
    const cp = el('button'); cp.type = 'button';
    const lbl = el('span', null, 'Copiar vínculo'); cp.append(ico('fas fa-link'), lbl);
    cp.addEventListener('click', async () => {
      const ok = await copiar(url); lbl.textContent = ok ? '¡Copiado!' : 'Copia manual';
      if (!ok) window.prompt('Copia este vínculo:', url);
      setTimeout(() => { lbl.textContent = 'Copiar vínculo'; }, 2000);
    });
    pop.appendChild(cp);
    cont.appendChild(pop);
    return { pop, url, texto };
  }

  /* ---- me gusta ---- */
  const LK = 'lucilaLikes';
  const leerLikes = () => { try { return new Set(JSON.parse(localStorage.getItem(LK) || '[]')); } catch (e) { return new Set(); } };
  const guardarLikes = (s) => { try { localStorage.setItem(LK, JSON.stringify([...s].slice(-500))); } catch (e) {} };
  const likes = leerLikes();
  function pintarLike(b, f) {
    const on = likes.has(f.id), n = f.megusta || 0;
    b.setAttribute('aria-pressed', String(on));
    b.setAttribute('aria-label', (on ? 'Quitar me gusta. ' : 'Me gusta. ') + n + (n === 1 ? ' persona' : ' personas'));
    b.title = on ? 'Quitar me gusta' : 'Me gusta';
    b.classList.toggle('rf-like--on', on);
    b.textContent = ''; b.append(ico((on ? 'fas' : 'far') + ' fa-heart'), el('span', null, String(n)));
  }
  const sincronizarLikes = (f) => document.querySelectorAll('.rf-like[data-id="' + f.id + '"]').forEach(b => pintarLike(b, f));
  function botonLike(f) {
    const b = el('button', 'rf-act rf-like'); b.type = 'button'; b.dataset.id = f.id; pintarLike(b, f);
    b.addEventListener('click', async () => {
      const ya = likes.has(f.id);
      const aplicar = (suma) => { if (suma) { likes.add(f.id); f.megusta = (f.megusta || 0) + 1; } else { likes.delete(f.id); f.megusta = Math.max(0, (f.megusta || 0) - 1); } guardarLikes(likes); sincronizarLikes(f); };
      aplicar(!ya);
      if (!ya) { b.classList.add('rf-like--pop'); setTimeout(() => b.classList.remove('rf-like--pop'), 400); }
      try {
        const r = await api('/api/fotos/' + f.id, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accion: ya ? 'unlike' : 'like' }) });
        f.megusta = r.megusta; sincronizarLikes(f);
      } catch (e) { aplicar(ya); }
    });
    return b;
  }

  function acciones(f) {
    const box = el('div', 'rf-pol__actions');
    const share = el('button', 'rf-act rf-act--main'); share.type = 'button';
    share.setAttribute('aria-expanded', 'false');
    share.append(ico('fas fa-share-alt'), el('span', null, 'Compartir'));
    const { pop, url, texto } = popoverCompartir(f, box);
    share.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (window.matchMedia('(pointer: coarse)').matches && navigator.share) {
        try { await navigator.share({ title: 'Registro Fotográfico Lucila', text: texto, url }); return; }
        catch (err) { if (err && err.name === 'AbortError') return; }
      }
      document.querySelectorAll('.rf-pop.on').forEach(p => { if (p !== pop) p.classList.remove('on'); });
      share.setAttribute('aria-expanded', String(pop.classList.toggle('on')));
    });
    box.insertBefore(share, pop);
    if (!f.estado || f.estado === 'publicada') box.appendChild(botonLike(f));

    if (f.whatsapp) {
      const w = el('a', 'rf-act'); w.title = 'Escribir a ' + f.nombre; w.setAttribute('aria-label', 'Escribir por WhatsApp a ' + f.nombre);
      w.href = 'https://wa.me/' + f.whatsapp + '?text=' + encodeURIComponent('Hola ' + f.nombre + ', vi tu fotografía en el Registro Fotográfico de Lucila.');
      w.target = '_blank'; w.rel = 'noopener noreferrer'; w.appendChild(ico('fab fa-whatsapp')); box.appendChild(w);
    }
    if (adminKey) {
      if (f.estado && f.estado !== 'publicada') {
        const ap = el('button', 'rf-act rf-act--ok'); ap.type = 'button'; ap.append(ico('fas fa-check'), el('span', null, 'Aprobar'));
        ap.addEventListener('click', async () => {
          try { await api('/api/fotos/' + f.id, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey }, body: JSON.stringify({ accion: 'aprobar' }) }); await cargar(); }
          catch (e) { alert(e.message); }
        });
        box.appendChild(ap);
      }
      const del = el('button', 'rf-act rf-act--danger'); del.type = 'button'; del.title = 'Eliminar'; del.setAttribute('aria-label', 'Eliminar fotografía'); del.appendChild(ico('fas fa-trash'));
      del.addEventListener('click', async () => {
        if (!confirm('¿Eliminar esta fotografía definitivamente?')) return;
        try { await api('/api/fotos/' + f.id, { method: 'DELETE', headers: { 'X-Admin-Key': adminKey } }); cerrarLB(); await cargar(); }
        catch (e) { alert(e.message); }
      });
      box.appendChild(del);
    } else {
      const rep = el('button', 'rf-act'); rep.type = 'button'; rep.title = 'Reportar'; rep.setAttribute('aria-label', 'Reportar fotografía'); rep.appendChild(ico('fas fa-flag'));
      rep.addEventListener('click', async () => {
        if (!confirm('¿Reportar esta fotografía como inapropiada? El equipo la revisará.')) return;
        try { await api('/api/fotos/' + f.id, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accion: 'reportar' }) }); alert('Gracias. El equipo revisará la fotografía.'); }
        catch (e) { alert(e.message); }
      });
      const own = el('button', 'rf-act'); own.type = 'button'; own.title = 'Retirar mi foto'; own.setAttribute('aria-label', 'Retirar mi fotografía con mi clave'); own.appendChild(ico('fas fa-trash'));
      own.addEventListener('click', async () => {
        const k = window.prompt('Para retirar tu fotografía, ingresa la clave que recibiste al subirla:');
        if (!k) return;
        try { await api('/api/fotos/' + f.id, { method: 'DELETE', headers: { 'X-Foto-Key': k } }); cerrarLB(); alert('Tu fotografía fue retirada.'); await cargar(); }
        catch (e) { alert(e.message); }
      });
      box.append(rep, own);
    }
    return box;
  }

  function polaroid(f, o) {
    o = o || {};
    const art = el('article', 'rf-pol');
    if (o.id) art.id = o.id;
    if (f.estado && f.estado !== 'publicada') art.appendChild(el('span', 'rf-badge', f.estado === 'pendiente' ? 'Pendiente' : 'En revisión · ' + (f.reportes || 0) + ' reportes'));
    const ph = el('button', 'rf-pol__photo'); ph.type = 'button';
    if (f.imagen) {
      const img = el('img'); img.src = f.imagen; img.loading = 'lazy';
      img.alt = 'Fotografía de ' + f.nombre + (f.nota ? ': ' + f.nota : ' en ' + f.lugar);
      ph.appendChild(img);
    } else {
      const p = el('div', 'rf-pol__ph'); p.append(ico('fas fa-camera'), el('span', null, 'Tu fotografía')); ph.appendChild(p);
    }
    if (o.onOpen) { ph.setAttribute('aria-label', 'Ampliar fotografía'); ph.addEventListener('click', o.onOpen); } else { ph.tabIndex = -1; }
    const body = el('div', 'rf-pol__body');
    body.appendChild(el('p', 'rf-pol__nota', f.nota || (o.preview ? 'Tu nota aparecerá aquí…' : '')));
    const meta = el('div', 'rf-pol__meta');
    const l1 = el('div'); l1.appendChild(el('strong', null, f.nombre || 'Tu nombre')); l1.appendChild(document.createTextNode(' · ' + (ROLES[f.rol] || 'Visitante')));
    const l2 = el('div', null, (f.fecha ? fmtFecha(f.fecha) : 'Fecha') + ' · ' + (f.lugar || 'Lugar o evento'));
    meta.append(l1, l2);
    if (f.categoria) meta.appendChild(el('span', 'rf-tag', catNombre(f.categoria)));
    body.appendChild(meta);
    if (!o.preview) body.appendChild(acciones(f));
    art.append(ph, body);
    return art;
  }

  /* ---------------- render ---------------- */
  function renderStats() {
    const p = publicadas(); const box = $('rf-stats'); box.textContent = '';
    if (!p.length) return;
    const autores = new Set(p.map(f => f.nombre.trim().toLowerCase())).size;
    const anios = p.map(f => +f.fecha.slice(0, 4)); const desde = Math.min.apply(null, anios);
    [[p.length, p.length === 1 ? 'Fotografía' : 'Fotografías'], [autores, autores === 1 ? 'Autor' : 'Autores'], [desde, 'Registro desde']].forEach(([n, l]) => {
      const s = el('div', 'rf-stat'); s.append(el('strong', null, String(n)), el('span', null, l)); box.appendChild(s);
    });
  }

  function renderFiltros() {
    const chips = $('rf-chips'); chips.textContent = '';
    const cuenta = {}; fotos.forEach(f => { cuenta[f.categoria] = (cuenta[f.categoria] || 0) + 1; });
    const mk = (k, n, c) => {
      const b = el('button', 'rf-chip'); b.type = 'button'; b.setAttribute('aria-pressed', String(filtroCat === k));
      b.append(document.createTextNode(n)); if (c != null) b.appendChild(el('small', null, String(c)));
      b.addEventListener('click', () => { filtroCat = k; visibles = PAGINA; render(); });
      chips.appendChild(b);
    };
    mk('todas', 'Todas', fotos.length);
    CATS.forEach(([k, n]) => { if (cuenta[k]) mk(k, n, cuenta[k]); });
    const sel = $('rf-anio'); const anios = [...new Set(fotos.map(f => f.fecha.slice(0, 4)))].sort().reverse();
    sel.textContent = '';
    const o0 = el('option', null, 'Todos los años'); o0.value = 'todos'; sel.appendChild(o0);
    anios.forEach(a => { const o = el('option', null, a); o.value = a; sel.appendChild(o); });
    sel.value = anios.includes(filtroAnio) ? filtroAnio : 'todos'; filtroAnio = sel.value;
  }

  function renderAdmin() {
    const box = $('rf-admin'); box.textContent = '';
    if (!adminKey) return;
    const pend = fotos.filter(f => f.estado && f.estado !== 'publicada').length;
    box.appendChild(el('div', 'rf-admin', 'Modo administrador · ' + pend + ' fotografía(s) esperando revisión'));
  }

  function render() {
    renderStats(); renderFiltros(); renderAdmin(); pintarToggle();
    lista = filtradas();
    const grid = $('rf-grid'); grid.textContent = '';
    if (!lista.length) {
      const e = el('div', 'rf-empty', fotos.length ? 'No hay fotografías con estos filtros.' : 'Aún no hay fotografías. ¡Sé quien inaugure nuestro registro!');
      grid.appendChild(e);
    }
    lista.slice(0, visibles).forEach((f, i) => {
      grid.appendChild(polaroid(f, { rot: ROT[i % ROT.length], id: 'foto-' + f.id, onOpen: () => abrirLB(i) }));
    });
    $('rf-mas').hidden = lista.length <= visibles;
  }

  async function cargar() {
    try {
      const h = adminKey ? { 'X-Admin-Key': adminKey } : {};
      const r = await api('/api/fotos', { headers: h });
      fotos = r.fotos.sort((a, b) => (b.fecha + b.creado).localeCompare(a.fecha + a.creado));
      render(); abrirDesdeHash();
    } catch (e) {
      if (e.status === 401 && adminKey) { adminKey = ''; try { sessionStorage.removeItem('lucilaAdmin'); } catch (x) {} return cargar(); }
      const grid = $('rf-grid'); grid.textContent = '';
      grid.appendChild(el('div', 'rf-empty', 'El registro fotográfico no está disponible por ahora.'));
      console.warn('Registro fotográfico:', e.message);
    }
  }

  /* ---------------- ampliar (lightbox) ---------------- */
  function pintarLB() {
    const f = lista[actual]; if (!f) return;
    const stage = $('rf-lb-stage'); stage.textContent = '';
    stage.appendChild(polaroid(f, { rot: 0 }));
    $('rf-lb-count').textContent = (actual + 1) + ' / ' + lista.length;
    history.replaceState(null, '', '#foto-' + f.id);
  }
  function abrirLB(i) { actual = i; lb.classList.add('on'); document.body.style.overflow = 'hidden'; pintarLB(); $('rf-lb-x').focus(); }
  function cerrarLB() {
    if (!lb.classList.contains('on')) return;
    lb.classList.remove('on'); document.body.style.overflow = '';
    if (/^#foto-/.test(location.hash)) history.replaceState(null, '', '#registro');
  }
  function mover(d) { if (!lista.length) return; actual = (actual + d + lista.length) % lista.length; pintarLB(); }
  $('rf-lb-x').addEventListener('click', cerrarLB);
  $('rf-lb-p').addEventListener('click', () => mover(-1));
  $('rf-lb-n').addEventListener('click', () => mover(1));
  lb.addEventListener('click', (e) => { if (e.target === lb) cerrarLB(); });

  function abrirDesdeHash() {
    const m = /^#foto-([A-Z2-9]{10})$/.exec(location.hash); if (!m) return;
    setAbierto(true, false);
    let i = lista.findIndex(f => f.id === m[1]);
    if (i < 0) { filtroCat = 'todas'; filtroAnio = 'todos'; render(); i = lista.findIndex(f => f.id === m[1]); }
    if (i >= 0) abrirLB(i);
  }
  window.addEventListener('hashchange', abrirDesdeHash);

  /* ---------------- subir fotografía ---------------- */
  const form = $('rf-form');
  let blob = null, urlPrev = '';
  const hoy = new Date(); const hoyISO = hoy.getFullYear() + '-' + String(hoy.getMonth() + 1).padStart(2, '0') + '-' + String(hoy.getDate()).padStart(2, '0');
  $('rf-fecha').max = hoyISO;
  CATS.forEach(([k, n]) => { const o = el('option', null, n); o.value = k; $('rf-cat').appendChild(o); });

  function pintarPreview() {
    const box = $('rf-preview'); box.textContent = '';
    box.appendChild(polaroid({
      nombre: $('rf-nombre').value.trim(), rol: $('rf-rol').value, fecha: $('rf-fecha').value,
      lugar: $('rf-lugar').value.trim(), nota: $('rf-nota').value.trim(), categoria: $('rf-cat').value, imagen: urlPrev
    }, { preview: true, rot: -1 }));
    $('rf-count').textContent = $('rf-nota').value.length + ' / 140';
  }
  ['rf-nombre', 'rf-rol', 'rf-fecha', 'rf-lugar', 'rf-nota', 'rf-cat'].forEach(id => $(id).addEventListener('input', pintarPreview));

  async function comprimir(file) {
    let bmp;
    try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
    catch (e) {
      bmp = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('No se pudo leer la imagen.')); i.src = URL.createObjectURL(file); });
    }
    const w0 = bmp.width || bmp.naturalWidth, h0 = bmp.height || bmp.naturalHeight, k = Math.min(1, 1600 / Math.max(w0, h0));
    const c = document.createElement('canvas'); c.width = Math.round(w0 * k); c.height = Math.round(h0 * k);
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(bmp, 0, 0, c.width, c.height);
    // Al volver a dibujar la imagen se eliminan los metadatos (incluida la ubicación GPS)
    return new Promise((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error('No se pudo procesar la imagen.')), 'image/jpeg', 0.86));
  }

  $('rf-pick').addEventListener('click', () => $('rf-file').click());
  $('rf-file').addEventListener('change', async () => {
    const f = $('rf-file').files[0]; const msg = $('rf-msg'); msg.textContent = '';
    if (!f) return;
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { msg.style.color = '#b42318'; msg.textContent = 'Usa una imagen JPG, PNG o WebP.'; return; }
    if (f.size > MAX_ENTRADA) { msg.style.color = '#b42318'; msg.textContent = 'La imagen es muy pesada (máx. 15 MB).'; return; }
    try {
      $('rf-file-name').textContent = 'Procesando…';
      blob = await comprimir(f);
      if (urlPrev) URL.revokeObjectURL(urlPrev);
      urlPrev = URL.createObjectURL(blob);
      $('rf-file-name').textContent = f.name; pintarPreview();
    } catch (e) { blob = null; $('rf-file-name').textContent = 'JPG, PNG o WebP'; msg.style.color = '#b42318'; msg.textContent = e.message; }
  });

  function abrirModal() {
    form.reset(); blob = null; if (urlPrev) { URL.revokeObjectURL(urlPrev); urlPrev = ''; }
    $('rf-file-name').textContent = 'JPG, PNG o WebP'; $('rf-msg').textContent = '';
    $('rf-step-form').hidden = false; $('rf-step-ok').hidden = true;
    pintarPreview(); modal.classList.add('on'); document.body.style.overflow = 'hidden'; $('rf-nombre').focus();
  }
  function cerrarModal() { modal.classList.remove('on'); if (!lb.classList.contains('on')) document.body.style.overflow = ''; }
  cta.addEventListener('click', abrirModal);
  $('rf-modal-x').addEventListener('click', cerrarModal);
  modal.addEventListener('mousedown', (e) => { if (e.target === modal) cerrarModal(); });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = $('rf-msg'), btn = $('rf-enviar');
    const falla = (t) => { msg.style.color = '#b42318'; msg.textContent = t; };
    const v = (id) => $(id).value.trim();
    if (!blob) return falla('Selecciona una fotografía.');
    if (v('rf-nombre').length < 2) return falla('Escribe tu nombre.');
    if (!v('rf-fecha')) return falla('Indica la fecha de la fotografía.');
    if (!v('rf-lugar')) return falla('Indica el lugar o evento.');
    if (!$('rf-consent').checked) return falla('Debes confirmar la autorización para publicar.');
    const fd = new FormData();
    fd.append('nombre', v('rf-nombre')); fd.append('rol', $('rf-rol').value); fd.append('fecha', v('rf-fecha'));
    fd.append('categoria', $('rf-cat').value); fd.append('lugar', v('rf-lugar')); fd.append('nota', v('rf-nota'));
    fd.append('whatsapp', v('rf-wsp')); fd.append('consentimiento', '1'); fd.append('web', $('rf-web').value);
    fd.append('foto', blob, 'foto.jpg');
    btn.disabled = true; const original = btn.textContent; btn.textContent = 'Subiendo…'; msg.textContent = '';
    try {
      const r = await api('/api/fotos', { method: 'POST', body: fd });
      $('rf-ok-txt').textContent = r.estado === 'publicada' ? 'Tu fotografía ya está publicada en el registro.' : 'Recibimos tu fotografía. Aparecerá en el registro apenas el equipo la revise.';
      $('rf-key').textContent = r.clave || '—';
      $('rf-step-form').hidden = true; $('rf-step-ok').hidden = false;
      cargar();
    } catch (err) { falla(err.message); }
    finally { btn.disabled = false; btn.textContent = original; }
  });
  $('rf-copy-key').addEventListener('click', async () => { $('rf-copy-key').textContent = (await copiar($('rf-key').textContent)) ? '¡Copiada!' : 'Selecciona y copia'; });

  /* ---------------- eventos globales ---------------- */
  $('rf-orden').addEventListener('change', (e) => { orden = e.target.value; visibles = PAGINA; render(); });
  $('rf-anio').addEventListener('change', (e) => { filtroAnio = e.target.value; visibles = PAGINA; render(); });
  $('rf-mas').addEventListener('click', () => { visibles += PAGINA; render(); });
  document.addEventListener('click', (e) => { if (!e.target.closest('.rf-pol__actions')) document.querySelectorAll('.rf-pop.on').forEach(p => p.classList.remove('on')); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { cerrarLB(); cerrarModal(); }
    if (lb.classList.contains('on')) { if (e.key === 'ArrowLeft') mover(-1); if (e.key === 'ArrowRight') mover(1); }
  });
  window.addEventListener('lucila-admin', () => { adminKey = leerAdmin(); if (adminKey) setAbierto(true, false); cargar(); });

  if (adminKey) setAbierto(true, false);
  cargar();
})();
