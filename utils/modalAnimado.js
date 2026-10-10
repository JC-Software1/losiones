/* Modal que se "dibuja" al abrirse: línea del borde + fondo que se despliega +
   contenido en cascada. Adaptado a la UI del programa (blanco · negro · beige · verde).

   HTML:
     <button data-modal-abrir="mi-modal">Abrir</button>
     <dialog id="mi-modal" data-modal-animado>
       <h2>Título</h2>
       <p>Texto...</p>
       <div class="ma-acciones"><button type="button" data-modal-cerrar>Cerrar</button></div>
     </dialog>

   - Cualquier elemento con data-modal-cerrar dentro del modal lo cierra.
   - data-persistente en el <dialog>: no se cierra al pulsar fuera.
   - API: ModalAnimado.abrir('mi-modal'), ModalAnimado.cerrar('mi-modal')
   - Cada hijo directo del <dialog> aparece en cascada, en el orden del HTML. */
(function () {
  var NS = 'http://www.w3.org/2000/svg';
  var CIERRE = 260;   // ms; un poco más que la salida del CSS
  var uid = 0;
  var abiertos = 0;

  function reducir() {
    return window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  function bloquear(on) {
    abiertos = Math.max(0, abiertos + (on ? 1 : -1));
    document.documentElement.classList.toggle('ma-bloqueado', abiertos > 0);
  }

  function init(dlg) {
    if (dlg._maListo) return;
    dlg._maListo = true;
    dlg.classList.add('ma');
    var id = dlg.id || 'ma' + (++uid);

    // Estructura: dialog > caja > [panel > contenido..., svg]
    var caja = document.createElement('div'); caja.className = 'ma-caja';
    var panel = document.createElement('div'); panel.className = 'ma-panel';
    while (dlg.firstChild) panel.appendChild(dlg.firstChild);
    [].forEach.call(panel.children, function (h, i) {
      h.classList.add('ma-item');
      h.style.setProperty('--i', Math.min(i, 8));
    });

    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'ma-trazo');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    var trazoA = document.createElementNS(NS, 'path');
    var trazoB = document.createElementNS(NS, 'path');
    [trazoA, trazoB].forEach(function (p) { p.setAttribute('pathLength', '1'); svg.appendChild(p); });

    caja.appendChild(panel);
    caja.appendChild(svg);
    dlg.appendChild(caja);

    var titulo = panel.querySelector('h1, h2, h3');
    if (titulo) {
      titulo.id = titulo.id || id + '-titulo';
      dlg.setAttribute('aria-labelledby', titulo.id);
    }

    /* ---------- Trazo del borde ----------
       Dos mitades: salen del centro del borde superior y se unen abajo. */
    function trazar() {
      var w = panel.offsetWidth, h = panel.offsetHeight;
      if (!w || !h) return;
      var radio = parseFloat(getComputedStyle(dlg).getPropertyValue('--ma-radio')) || 18;
      var r = Math.max(0, Math.min(radio, w / 2, h / 2) - 0.75);
      var x0 = 0.75, y0 = 0.75, x1 = w - 0.75, y1 = h - 0.75, cx = w / 2;

      trazoA.setAttribute('d',
        'M' + cx + ',' + y0 + ' H' + (x1 - r) +
        ' A' + r + ',' + r + ' 0 0 1 ' + x1 + ',' + (y0 + r) +
        ' V' + (y1 - r) +
        ' A' + r + ',' + r + ' 0 0 1 ' + (x1 - r) + ',' + y1 + ' H' + cx);
      trazoB.setAttribute('d',
        'M' + cx + ',' + y0 + ' H' + (x0 + r) +
        ' A' + r + ',' + r + ' 0 0 0 ' + x0 + ',' + (y0 + r) +
        ' V' + (y1 - r) +
        ' A' + r + ',' + r + ' 0 0 0 ' + (x0 + r) + ',' + y1 + ' H' + cx);

      svg.setAttribute('width', w);
      svg.setAttribute('height', h);
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    }
    if ('ResizeObserver' in window) new ResizeObserver(trazar).observe(panel);

    /* ---------- Abrir / cerrar ---------- */
    var cerrando = false;

    function abrir() {
      if (dlg.open) return;
      dlg.showModal();                 // ya es visible y medible
      trazar();
      void caja.offsetHeight;          // fija el estado cerrado antes de animar
      dlg.classList.add('abierto');
      bloquear(true);
    }

    function cerrar() {
      if (!dlg.open || cerrando) return;
      cerrando = true;
      dlg.classList.remove('abierto');
      setTimeout(function () { if (dlg.open) dlg.close(); }, reducir() ? 0 : CIERRE);
    }

    dlg.addEventListener('close', function () {
      cerrando = false;
      dlg.classList.remove('abierto');
      bloquear(false);
    });

    // Escape: cierra con animación
    dlg.addEventListener('cancel', function (e) { e.preventDefault(); cerrar(); });

    // Botones de cerrar
    dlg.addEventListener('click', function (e) {
      if (e.target.closest('[data-modal-cerrar]')) cerrar();
    });

    // Pulsar en el velo (fuera del modal)
    var presionoFuera = false;
    dlg.addEventListener('pointerdown', function (e) { presionoFuera = (e.target === dlg); });
    dlg.addEventListener('click', function (e) {
      if (e.target === dlg && presionoFuera && dlg.getAttribute('data-persistente') === null) cerrar();
    });

    // <form method="dialog"> también cierra con animación
    dlg.addEventListener('submit', function (e) {
      if (e.target.method === 'dialog') {
        e.preventDefault();
        dlg.returnValue = (e.submitter && e.submitter.value) || '';
        cerrar();
      }
    });

    dlg._maAbrir = abrir;
    dlg._maCerrar = cerrar;
  }

  function auto() {
    [].forEach.call(document.querySelectorAll('dialog[data-modal-animado]'), init);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto);
  else auto();

  // Botones que abren un modal
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-modal-abrir]');
    if (!b) return;
    var d = document.getElementById(b.getAttribute('data-modal-abrir'));
    if (d) { init(d); d._maAbrir(); }
  });

  window.ModalAnimado = {
    init: init,
    abrir: function (id) { var d = document.getElementById(id); if (d) { init(d); d._maAbrir(); } },
    cerrar: function (idOrEl) {
      var d = typeof idOrEl === 'string' ? document.getElementById(idOrEl) : idOrEl;
      if (d && d._maCerrar) d._maCerrar();
    }
  };
})();
