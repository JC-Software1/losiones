/* Transición zoom entre páginas.
   - Navegadores con View Transitions: el CSS de css/transicion-zoom.css hace todo.
   - Sin soporte: este archivo añade el zoom de respaldo (html.vt-fallback).
   - En ambos casos, si la navegación sale desde un modal abierto (ej. menú de
     navegación), el modal se cierra con su animación antes de saltar de página. */
(function () {
  var DURACION = 350;            // igual que --zoom-salida
  var CIERRE_MODAL = 300;        // un poco más que la salida del modal animado
  var NATIVA = 'PageSwapEvent' in window;

  if (!NATIVA) document.documentElement.classList.add('vt-fallback');

  function navegar(href) {
    if (!NATIVA) document.body.classList.add('saliendo');
    setTimeout(function () { location.href = href; }, NATIVA ? 0 : DURACION);
  }

  function cerrarModalAbierto() {
    var dlg = document.querySelector('dialog[open]');
    if (!dlg) return false;
    if (window.ModalAnimado && dlg._maCerrar) window.ModalAnimado.cerrar(dlg);
    else { dlg.classList.remove('abierto'); dlg.close(); }
    return true;
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    if (e.defaultPrevented || e.button !== 0) return;
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    if (a.hasAttribute('download') || a.target === '_blank') return;

    var href = a.getAttribute('href');
    if (!href || href === '#' || href.startsWith('#') || href.startsWith('javascript:')) return;
    if (a.origin !== location.origin) return;
    if (a.pathname === location.pathname && a.search === location.search) return;

    // Navegación desde dentro de un modal abierto (menú de 3 toques, etc.):
    // se cierra el modal y, en navegadores sin View Transitions, el zoom de
    // salida se solapa con ese cierre para que no se sienta lento.
    if (cerrarModalAbierto()) {
      e.preventDefault();
      if (!NATIVA) document.body.classList.add('saliendo');
      setTimeout(function () { location.href = a.href; }, CIERRE_MODAL);
      return;
    }

    // Sin View Transitions: respaldo con zoom manual
    if (!NATIVA) {
      e.preventDefault();
      navegar(a.href);
    }
    // Con View Transitions no hacemos nada: el navegador transiciona solo
  });

  // Al volver con el botón "atrás", quitar el estado de salida
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) document.body.classList.remove('saliendo');
  });
})();
