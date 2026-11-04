/* Secciones plegables: Eventos y Artistas Asociados
   El HTML las entrega contraídas (clase is-collapsed); este script maneja el botón, el contador
   y los casos en que hay que abrirlas solas (enlaces compartidos, publicar, modo administrador). */
(function () {
  'use strict';
  const DEFS = {
    eventos:  { sec: 'eventos',  lista: 'eventos-lista',  cuenta: 'article.event-card[data-real]', ver: 'Ver eventos publicados', ocultar: 'Ocultar eventos' },
    artistas: { sec: 'artistas', lista: 'artistas-lista', cuenta: 'article[data-real]',            ver: 'Ver artistas',           ocultar: 'Ocultar artistas' }
  };
  const fijar = {};

  Object.keys(DEFS).forEach((k) => {
    const d = DEFS[k];
    const btn = document.querySelector('[data-toggle="' + k + '"]');
    const lista = document.getElementById(d.lista);
    const sec = document.getElementById(d.sec);
    if (!btn || !lista || !sec) return;
    const lbl = btn.querySelector('.sec-toggle__label');
    const cnt = btn.querySelector('.sec-toggle__count');

    function pintar() {
      const n = lista.querySelectorAll(d.cuenta).length;
      const abierto = !lista.classList.contains('is-collapsed');
      btn.setAttribute('aria-expanded', String(abierto));
      lbl.textContent = abierto ? d.ocultar : d.ver;
      cnt.textContent = n ? '(' + n + ')' : '';
    }
    function set(abrir, scroll) {
      lista.classList.toggle('is-collapsed', !abrir);
      pintar();
      // Al contraer desde abajo, vuelve al título para no quedar perdido en la página
      if (!abrir && scroll && sec.getBoundingClientRect().top < 0) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    btn.addEventListener('click', () => set(lista.classList.contains('is-collapsed'), true));
    new MutationObserver(pintar).observe(lista, { childList: true });
    fijar[k] = set;
    pintar();
  });

  // Otros scripts piden abrir una sección: new CustomEvent('lucila-expandir', { detail: 'eventos' })
  window.addEventListener('lucila-expandir', (e) => { if (fijar[e.detail]) fijar[e.detail](true, false); });

  // El administrador necesita ver las tarjetas para poder eliminarlas
  function adminActivo() { try { return !!sessionStorage.getItem('lucilaAdmin'); } catch (e) { return false; } }
  window.addEventListener('lucila-admin', () => { if (adminActivo() && fijar.eventos) fijar.eventos(true, false); });
  if (adminActivo() && fijar.eventos) fijar.eventos(true, false);

  // Enlaces compartidos (/#evento-XXXX) abren su sección
  if (/^#evento-/.test(location.hash) && fijar.eventos) fijar.eventos(true, false);
})();
