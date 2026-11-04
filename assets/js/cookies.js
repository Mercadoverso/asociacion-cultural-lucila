/**
 * ASOCIACIÓN CULTURAL DE MÚSICOS Y ARTISTAS LUCILA — cookies.js
 * v6.0 · Usa el diseño del sitio (.cookie-banner / .cookie-modal de components.css).
 *
 * Cualquier elemento con data-cookie-action="accept|reject|config|save|close" funciona
 * (banner, pie de página, otras páginas). También <a href="#cookie-preferences">.
 * Si el HTML no incluye <dialog id="cookie-modal">, el script lo crea con las mismas clases.
 * API: window.LucilaCookies.open() / .close() / .get() / .reset()
 */
(() => {
  'use strict';

  if (window.LucilaCookies) return;

  const STORAGE_KEY = 'cc_lucila_consent_v1';
  const COOKIE_NAME = 'cookie_consent';
  const MAX_DAYS = 365;
  const VERSION = 1;

  const OPTIONS = [
    { key: 'essential',   title: 'Esenciales',   locked: true,
      desc: 'Necesarias para el funcionamiento del sitio (seguridad, formularios). Siempre activas.' },
    { key: 'analytics',   title: 'Analíticas',   locked: false,
      desc: 'Nos ayudan a entender, de forma agregada, cómo se usa el sitio para mejorarlo.' },
    { key: 'preferences', title: 'Preferencias', locked: false,
      desc: 'Recuerdan tus elecciones y ajustes de visualización.' },
    { key: 'marketing',   title: 'Marketing',    locked: false,
      desc: 'Permiten mostrar contenido o difusión de terceros según tus intereses.' }
  ];

  /* Estilos mínimos de seguridad (el diseño viene de components.css) */
  const injectStyles = () => {
    if (document.getElementById('cc-cookie-fixes')) return;
    const s = document.createElement('style');
    s.id = 'cc-cookie-fixes';
    s.textContent = `
#cookie-banner[hidden]{display:none!important}
/* components.css fija display:flex en .cookie-modal: un <dialog> cerrado quedaría visible y taparía los botones */
.cookie-modal:not([open]){display:none!important}
.cookie-modal__intro{margin:0;font-family:var(--serif-body,'Cormorant Garamond',serif);font-size:1rem;line-height:1.5;color:var(--tinta-suave,#5A4632)}
.cookie-modal__intro a{color:var(--rojo-oxido,#7A2E1E);text-decoration:underline;text-underline-offset:2px}
.cookie-modal__footer .btn{cursor:pointer}
html.cc-lock{overflow:hidden}
`;
    document.head.appendChild(s);
  };

  /* ---------------- Persistencia ---------------- */
  const setCookie = (name, value, days) => {
    try {
      const d = new Date(Date.now() + days * 864e5);
      const secure = location.protocol === 'https:' ? '; Secure' : '';
      document.cookie = `${name}=${encodeURIComponent(value)}; expires=${d.toUTCString()}; path=/; SameSite=Lax${secure}`;
    } catch (_) {}
  };

  const readCookie = (name) => {
    const m = document.cookie.split('; ').find((r) => r.startsWith(name + '='));
    if (!m) return null;
    try { return JSON.parse(decodeURIComponent(m.split('=').slice(1).join('='))); }
    catch (_) { return null; }
  };

  const read = () => {
    try {
      const v = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (v) return v;
    } catch (_) {}
    return readCookie(COOKIE_NAME);
  };

  const save = (c) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(c)); } catch (_) {}
    setCookie(COOKIE_NAME, JSON.stringify(c), MAX_DAYS);
    try { document.dispatchEvent(new CustomEvent('cookieConsentChanged', { detail: c })); } catch (_) {}
  };

  /* ---------------- Banner ---------------- */
  const getBanner = () => document.getElementById('cookie-banner');

  const showBanner = () => {
    const b = getBanner();
    if (!b) return;
    b.hidden = false;
    b.removeAttribute('hidden');
    b.style.removeProperty('display');
  };

  const hideBanner = () => {
    const b = getBanner();
    if (!b) return;
    b.hidden = true;
    b.setAttribute('hidden', '');
  };

  /* ---------------- Modal ---------------- */
  let modal = null;
  let lastFocus = null;

  const buildModal = () => {
    const el = document.createElement('dialog');
    el.id = 'cookie-modal';
    el.className = 'cookie-modal';
    el.setAttribute('aria-labelledby', 'cookie-modal-title');

    const rows = OPTIONS.map((o) => `
        <div class="cookie-option">
          <div>
            <strong>${o.title}</strong>
            <p>${o.desc}</p>
          </div>
          ${o.locked
            ? '<span class="cookie-toggle--always-on">Siempre activas</span>'
            : `<label class="cookie-toggle">
                 <input type="checkbox" data-cookie-category="${o.key}" aria-label="Cookies ${o.title.toLowerCase()}" />
                 <span class="cookie-toggle__slider"></span>
               </label>`}
        </div>`).join('');

    el.innerHTML = `
      <form class="cookie-modal__form" method="dialog" novalidate>
        <header class="cookie-modal__header">
          <h3 id="cookie-modal-title">Preferencias de cookies</h3>
          <button type="button" class="cookie-modal__close" data-cookie-action="close" aria-label="Cerrar">
            <i class="fas fa-times" aria-hidden="true"></i>
          </button>
        </header>
        <div class="cookie-modal__body">
          <p class="cookie-modal__intro">Elige qué cookies permites. Puedes cambiar tu decisión cuando quieras desde el pie de página.
            Más información en la <a href="pages/cookies.html">Política de Cookies</a>.</p>
          ${rows}
        </div>
        <footer class="cookie-modal__footer">
          <button type="button" class="btn btn-outline" data-cookie-action="reject">Solo esenciales</button>
          <button type="button" class="btn btn-outline" data-cookie-action="save">Guardar selección</button>
          <button type="button" class="btn" data-cookie-action="accept">Aceptar todas</button>
        </footer>
      </form>`;
    document.body.appendChild(el);
    return el;
  };

  const wireModal = (el) => {
    if (el.__ccWired) return;
    el.__ccWired = true;
    // Enter dentro del formulario no debe cerrar el diálogo sin guardar
    el.addEventListener('submit', (e) => e.preventDefault());
    // Clic en el fondo (backdrop): el objetivo es el propio <dialog>
    let downOnBackdrop = false;
    el.addEventListener('mousedown', (e) => { downOnBackdrop = (e.target === el); });
    el.addEventListener('click', (e) => { if (e.target === el && downOnBackdrop) closeModal(); });
    // Cierre nativo (ESC o close()): liberar scroll y devolver el foco
    el.addEventListener('close', onClosed);
    el.addEventListener('cancel', () => { /* ESC nativo: el evento 'close' hace el resto */ });
  };

  const ensureModal = () => {
    if (modal && document.body.contains(modal)) return modal;
    injectStyles();
    modal = document.getElementById('cookie-modal') || buildModal();
    wireModal(modal);
    return modal;
  };

  const onClosed = () => {
    document.documentElement.classList.remove('cc-lock');
    if (lastFocus && typeof lastFocus.focus === 'function') {
      try { lastFocus.focus({ preventScroll: true }); } catch (_) {}
    }
    lastFocus = null;
  };

  const getSelected = () => {
    const c = { essential: true };
    if (!modal) return c;
    modal.querySelectorAll('input[data-cookie-category]').forEach((cb) => {
      c[cb.dataset.cookieCategory] = cb.checked;
    });
    c.essential = true;
    return c;
  };

  const openModal = () => {
    ensureModal();
    const cur = read();
    modal.querySelectorAll('input[data-cookie-category]').forEach((cb) => {
      cb.checked = cur ? !!cur[cb.dataset.cookieCategory] : false;
    });
    if (modal.open) return;
    lastFocus = document.activeElement;
    document.documentElement.classList.add('cc-lock');
    try {
      if (typeof modal.showModal === 'function') modal.showModal();
      else modal.setAttribute('open', '');
    } catch (_) {
      modal.setAttribute('open', '');
    }
  };

  const closeModal = () => {
    if (!modal || !modal.open) return;
    try {
      if (typeof modal.close === 'function') modal.close();
      else { modal.removeAttribute('open'); onClosed(); }
    } catch (_) {
      modal.removeAttribute('open');
      onClosed();
    }
    // Garantiza el cierre aunque el navegador no emita 'close'
    if (modal.open) { modal.removeAttribute('open'); onClosed(); }
  };

  const apply = (c) => {
    save({
      essential: true,
      analytics: !!c.analytics,
      preferences: !!c.preferences,
      marketing: !!c.marketing,
      timestamp: new Date().toISOString(),
      version: VERSION
    });
    hideBanner();
    closeModal();
  };

  /* ---------------- Acciones ---------------- */
  const run = (action) => {
    switch (action) {
      case 'accept': apply({ analytics: true,  preferences: true,  marketing: true  }); break;
      case 'reject': apply({ analytics: false, preferences: false, marketing: false }); break;
      case 'config': openModal(); break;
      case 'save':   ensureModal(); apply(getSelected()); break;
      case 'close':  closeModal(); break;
    }
  };

  // Captura en window: corre antes que cualquier otro script que intercepte el clic.
  window.addEventListener('click', (e) => {
    const t = e.target instanceof Element
      ? e.target.closest('[data-cookie-action],[data-cookie-settings],a[href="#cookie-preferences"]')
      : null;
    if (!t) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    run(t.dataset.cookieAction || 'config');
  }, true);

  // Respaldo de ESC para navegadores sin <dialog> nativo
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && modal.open && typeof modal.showModal !== 'function') closeModal();
  });

  /* ---------------- Inicio ---------------- */
  const init = () => {
    injectStyles();
    if (!read()) showBanner(); else hideBanner();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.LucilaCookies = {
    open: openModal,
    close: closeModal,
    get: read,
    reset: () => {
      try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
      setCookie(COOKIE_NAME, '', -1);
      showBanner();
    }
  };
})();
