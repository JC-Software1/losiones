/* Sistema de "select/panel animado": el panel se arma al abrirse.
   1) Las líneas del borde se dibujan desde el botón hacia el lado opuesto.
   2) El fondo se despliega siguiendo esa dirección.
   3) Las opciones aparecen en cascada.

   Uso:
     - <select data-animado>  => se convierte en un menú animado.
       · El <select> original sigue existiendo (oculto y sincronizado):
         formularios, .value y el evento 'change' funcionan igual.
       · data-direccion="abajo|arriba|derecha|izquierda" fuerza la dirección.
       · data-sa-limite en un contenedor mide el espacio contra ese contenedor.
     - Panel propio (p. ej. el selector de productos):
       · Marca el contenedor con class="sa" y data-sa-panel.
       · Dentro: un botón .sa-btn y un panel .sa-panel.
         El .sa-panel contiene un .sa-list (superficie que se despliega)
         y un <svg class="sa-trazo"> con dos <path>.
     - Los selects múltiples ([multiple]) se dejan intactos. */
(function () {
  var uid = 0;
  var NS = 'http://www.w3.org/2000/svg';

  function crear(tag, clase) {
    var e = document.createElement(tag);
    if (clase) e.className = clase;
    return e;
  }

  function svgConTrazos() {
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'sa-trazo');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    var g = document.createElementNS(NS, 'g');
    var a = document.createElementNS(NS, 'path');
    var b = document.createElementNS(NS, 'path');
    a.setAttribute('pathLength', '1');
    b.setAttribute('pathLength', '1');
    g.appendChild(a);
    g.appendChild(b);
    svg.appendChild(g);
    return { svg: svg, g: g, a: a, b: b };
  }

  /* Dibuja el borde del panel. El cálculo asume apertura "abajo" y luego gira. */
  function dibujarTrazo(ctx, w, h, dir) {
    if (!ctx.g || !w || !h) return;
    var horiz = dir === 'derecha' || dir === 'izquierda';
    var lw = horiz ? h : w, lh = horiz ? w : h;
    var radio = parseFloat(getComputedStyle(ctx.wrap).getPropertyValue('--sa-radio')) || 10;
    var r = Math.max(0, Math.min(radio, lw / 2, lh / 2) - 0.5);
    var x0 = 0.5, y0 = 0.5, x1 = lw - 0.5, y1 = lh - 0.5, cx = lw / 2;

    ctx.a.setAttribute('d',
      'M' + cx + ',' + y0 + ' H' + (x1 - r) +
      ' A' + r + ',' + r + ' 0 0 1 ' + x1 + ',' + (y0 + r) +
      ' V' + (y1 - r) +
      ' A' + r + ',' + r + ' 0 0 1 ' + (x1 - r) + ',' + y1 + ' H' + cx);
    ctx.b.setAttribute('d',
      'M' + cx + ',' + y0 + ' H' + (x0 + r) +
      ' A' + r + ',' + r + ' 0 0 0 ' + x0 + ',' + (y0 + r) +
      ' V' + (y1 - r) +
      ' A' + r + ',' + r + ' 0 0 0 ' + (x0 + r) + ',' + y1 + ' H' + cx);

    var giro = '';
    if (dir === 'arriba') giro = 'rotate(180 ' + (w / 2) + ' ' + (h / 2) + ')';
    else if (dir === 'derecha') giro = 'translate(0 ' + h + ') rotate(-90)';
    else if (dir === 'izquierda') giro = 'translate(' + w + ' 0) rotate(90)';
    ctx.g.setAttribute('transform', giro);

    ctx.svg.setAttribute('width', w);
    ctx.svg.setAttribute('height', h);
    ctx.svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
  }

  /* Elige la dirección según el espacio disponible y dibuja el borde. */
  function ajustarPanel(ctx, lista) {
    if (lista) lista.style.maxHeight = '';
    var wrap = ctx.wrap;
    var btn = ctx.btn;
    var panel = ctx.panel;
    var lim = wrap.closest('[data-sa-limite]');
    var caja = lim ? lim.getBoundingClientRect() : { top: 0, bottom: window.innerHeight };
    var r = btn.getBoundingClientRect();
    var alto = panel.offsetHeight;
    var abajo = caja.bottom - r.bottom - 12;
    var arriba = r.top - caja.top - 12;
    var dir = wrap.dataset.direccion ||
      ((abajo >= alto || abajo >= arriba) ? 'abajo' : 'arriba');
    wrap.dataset.dir = dir;

    if (lista && (dir === 'abajo' || dir === 'arriba')) {
      var esp = dir === 'abajo' ? abajo : arriba;
      lista.style.maxHeight = Math.max(140, Math.min(460, esp)) + 'px';
    } else {
      wrap.dataset.alin = (caja.bottom - r.top - 12 >= alto) ? 'ini' : 'fin';
    }
    dibujarTrazo(ctx, panel.offsetWidth, panel.offsetHeight, dir);
    if (lista) void lista.offsetHeight;
  }

  /* ------------------------------------------------------------------
     Convierte un <select data-animado> en menú animado
     ------------------------------------------------------------------ */
  function init(sel) {
    if (sel.dataset.saListo) return;
    if (sel.multiple) return;
    sel.dataset.saListo = '1';
    var id = 'sa' + (++uid);

    var wrap = crear('div', 'sa');
    var btn = crear('button', 'sa-btn');
    btn.type = 'button';
    btn.id = id + '-btn';
    btn.disabled = sel.disabled;
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', id + '-lista');
    var etiqueta = crear('span', 'sa-label');
    var flecha = crear('span', 'sa-chev');
    flecha.setAttribute('aria-hidden', 'true');
    btn.appendChild(etiqueta);
    btn.appendChild(flecha);

    var panel = crear('div', 'sa-panel');
    var lista = crear('ul', 'sa-list');
    lista.id = id + '-lista';
    lista.tabIndex = -1;
    lista.setAttribute('role', 'listbox');

    var trazos = svgConTrazos();
    panel.appendChild(lista);
    panel.appendChild(trazos.svg);

    if (sel.id) {
      var lb = document.querySelector('label[for="' + sel.id + '"]');
      if (lb) {
        lb.id = lb.id || id + '-lbl';
        btn.setAttribute('aria-labelledby', lb.id + ' ' + btn.id);
        lista.setAttribute('aria-labelledby', lb.id);
        lb.addEventListener('click', function (e) { e.preventDefault(); btn.focus(); });
      }
    }

    var ctx = { wrap: wrap, btn: btn, panel: panel, svg: trazos.svg, g: trazos.g, a: trazos.a, b: trazos.b };
    var items = [];
    var activo = -1;
    var anchoAlAbrir = 0;

    function construir() {
      var idxSeleccionado = sel.selectedIndex;
      items = [];
      lista.innerHTML = '';
      [].forEach.call(sel.options, function (o, i) {
        if (o.disabled && o.value === '') return;
        var li = crear('li', 'sa-op');
        li.id = id + '-op' + i;
        li.setAttribute('role', 'option');
        li.style.setProperty('--i', Math.min(items.length, 8));
        li.dataset.pos = items.length;
        li.textContent = o.textContent;
        if (o.disabled) li.setAttribute('aria-disabled', 'true');
        lista.appendChild(li);
        items.push({ li: li, i: i });
      });
      btn.disabled = sel.disabled;
      lista.scrollTop = 0;
      pintar();
      if (wrap.classList.contains('abierto')) {
        var pos = 0;
        items.forEach(function (it, k) { if (it.i === idxSeleccionado) pos = k; });
        mover(pos);
        ajustarPanel(ctx, lista);
      } else {
        activo = -1;
      }
    }

    function pintar() {
      var o = sel.options[sel.selectedIndex];
      etiqueta.textContent = o ? o.textContent : '';
      etiqueta.classList.toggle('vacio', !o || (o.disabled && o.value === ''));
      items.forEach(function (it) {
        it.li.setAttribute('aria-selected', String(it.i === sel.selectedIndex));
      });
    }

    function mover(pos) {
      if (pos < 0 || pos >= items.length) return;
      items.forEach(function (it) { it.li.classList.remove('activo'); });
      var li = items[pos].li;
      li.classList.add('activo');
      activo = pos;
      lista.setAttribute('aria-activedescendant', li.id);
      var t = li.offsetTop, b = t + li.offsetHeight;
      if (t < lista.scrollTop) lista.scrollTop = t - 6;
      else if (b > lista.scrollTop + lista.clientHeight) lista.scrollTop = b - lista.clientHeight + 6;
    }

    function siguiente(desde, paso) {
      var n = items.length;
      if (!n) return desde;
      for (var k = 1; k <= n; k++) {
        var p = (desde + paso * k + n * 2) % n;
        if (!items[p].li.hasAttribute('aria-disabled')) return p;
      }
      return desde;
    }

    function fuera(e) { if (!wrap.contains(e.target)) cerrar(false); }
    function alRedimensionar() { if (window.innerWidth !== anchoAlAbrir) cerrar(false); }

    function abrir() {
      if (btn.disabled || wrap.classList.contains('abierto')) return;
      [].forEach.call(document.querySelectorAll('.sa.abierto'), function (w) {
        if (w._saCerrar) w._saCerrar(false);
      });
      ajustarPanel(ctx, lista);
      wrap.classList.add('abierto');
      btn.setAttribute('aria-expanded', 'true');
      var pos = 0;
      items.forEach(function (it, k) { if (it.i === sel.selectedIndex) pos = k; });
      mover(pos);
      lista.focus({ preventScroll: true });
      anchoAlAbrir = window.innerWidth;
      document.addEventListener('pointerdown', fuera, true);
      window.addEventListener('resize', alRedimensionar);
    }

    function cerrar(devolverFoco) {
      if (!wrap.classList.contains('abierto')) return;
      wrap.classList.remove('abierto');
      btn.setAttribute('aria-expanded', 'false');
      document.removeEventListener('pointerdown', fuera, true);
      window.removeEventListener('resize', alRedimensionar);
      if (devolverFoco) btn.focus();
    }
    wrap._saCerrar = cerrar;
    wrap._saAbrir = abrir;

    function elegir(pos) {
      var it = items[pos];
      if (!it || it.li.hasAttribute('aria-disabled')) return;
      if (sel.selectedIndex !== it.i) {
        sel.selectedIndex = it.i;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      }
      pintar();
      cerrar(true);
    }

    btn.addEventListener('click', function () {
      wrap.classList.contains('abierto') ? cerrar(false) : abrir();
    });
    btn.addEventListener('keydown', function (e) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].indexOf(e.key) > -1) {
        e.preventDefault();
        abrir();
      }
    });
    btn.addEventListener('keyup', function (e) { if (e.key === ' ') e.preventDefault(); });

    var texto = '', temporizador;
    function buscar(c) {
      clearTimeout(temporizador);
      texto += c.toLowerCase();
      temporizador = setTimeout(function () { texto = ''; }, 600);
      var desde = texto.length === 1 ? activo + 1 : activo;
      for (var k = 0; k < items.length; k++) {
        var p = (desde + k) % items.length;
        if (items[p].li.textContent.toLowerCase().indexOf(texto) === 0 &&
          !items[p].li.hasAttribute('aria-disabled')) { mover(p); return; }
      }
    }

    lista.addEventListener('keydown', function (e) {
      var k = e.key;
      if (k === 'ArrowDown') mover(siguiente(activo, 1));
      else if (k === 'ArrowUp') mover(siguiente(activo, -1));
      else if (k === 'Home') mover(siguiente(-1, 1));
      else if (k === 'End') mover(siguiente(items.length, -1));
      else if (k === 'Enter' || k === ' ') elegir(activo);
      else if (k === 'Escape') cerrar(true);
      else if (k === 'Tab') { cerrar(false); return; }
      else if (k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) buscar(k);
      else return;
      e.preventDefault();
    });

    lista.addEventListener('mousemove', function (e) {
      var li = e.target.closest('.sa-op');
      if (li && !li.hasAttribute('aria-disabled')) mover(+li.dataset.pos);
    });
    lista.addEventListener('click', function (e) {
      var li = e.target.closest('.sa-op');
      if (li) elegir(+li.dataset.pos);
    });

    sel.parentNode.insertBefore(wrap, sel);
    wrap.appendChild(sel);
    wrap.appendChild(btn);
    wrap.appendChild(panel);
    sel.classList.add('sa-native');
    sel.tabIndex = -1;
    sel.setAttribute('aria-hidden', 'true');

    construir();
    sel.addEventListener('change', pintar);
    if (sel.form) sel.form.addEventListener('reset', function () { setTimeout(construir, 0); });

    var mo = new MutationObserver(function () { construir(); });
    mo.observe(sel, { childList: true, subtree: false, attributes: true, attributeFilter: ['disabled'] });

    wrap._saConstruir = construir;
  }

  /* ------------------------------------------------------------------
     Da vida a un panel propio ya presente en el HTML (class="sa" + data-sa-panel)
     Estructura: .sa > .sa-btn  y  .sa > .sa-panel > (.sa-list, svg.sa-trazo)
     ------------------------------------------------------------------ */
  function initPanel(wrap) {
    if (wrap.dataset.saPanelListo) return;
    var btn = wrap.querySelector('.sa-btn');
    var panel = wrap.querySelector('.sa-panel');
    if (!btn || !panel) return;
    wrap.dataset.saPanelListo = '1';

    var lista = panel.querySelector('.sa-list');
    var trazos;
    var svg = panel.querySelector('svg.sa-trazo');
    if (svg) {
      var g = svg.querySelector('g') || svg.appendChild(document.createElementNS(NS, 'g'));
      var ps = svg.querySelectorAll('path');
      var a = ps[0] || g.appendChild(document.createElementNS(NS, 'path'));
      var b = ps[1] || g.appendChild(document.createElementNS(NS, 'path'));
      a.setAttribute('pathLength', '1');
      b.setAttribute('pathLength', '1');
      trazos = { svg: svg, g: g, a: a, b: b };
    } else {
      trazos = svgConTrazos();
      panel.appendChild(trazos.svg);
    }

    var ctx = { wrap: wrap, btn: btn, panel: panel, svg: trazos.svg, g: trazos.g, a: trazos.a, b: trazos.b };
    var anchoAlAbrir = 0;

    function fuera(e) { if (!wrap.contains(e.target)) cerrar(false); }
    function alRedimensionar() { if (window.innerWidth !== anchoAlAbrir) cerrar(false); }

    function abrir() {
      if (wrap.classList.contains('abierto')) return;
      [].forEach.call(document.querySelectorAll('.sa.abierto'), function (w) {
        if (w._saCerrar) w._saCerrar(false);
      });
      ajustarPanel(ctx, lista);
      wrap.classList.add('abierto');
      btn.setAttribute('aria-expanded', 'true');
      anchoAlAbrir = window.innerWidth;
      document.addEventListener('pointerdown', fuera, true);
      window.addEventListener('resize', alRedimensionar);
      var focusable = panel.querySelector('input:not([type="hidden"]), textarea, select');
      if (focusable) setTimeout(function () { focusable.focus({ preventScroll: true }); }, 60);
    }

    function cerrar(devolverFoco) {
      if (!wrap.classList.contains('abierto')) return;
      wrap.classList.remove('abierto');
      btn.setAttribute('aria-expanded', 'false');
      document.removeEventListener('pointerdown', fuera, true);
      window.removeEventListener('resize', alRedimensionar);
      if (devolverFoco) btn.focus();
    }
    wrap._saCerrar = cerrar;
    wrap._saAbrir = abrir;
    wrap._saReajustar = function () { if (wrap.classList.contains('abierto')) ajustarPanel(ctx, lista); };

    btn.addEventListener('click', function () {
      wrap.classList.contains('abierto') ? cerrar(false) : abrir();
    });
    btn.addEventListener('keydown', function (e) {
      if (['ArrowDown', 'Enter', ' '].indexOf(e.key) > -1) {
        e.preventDefault();
        abrir();
      } else if (e.key === 'Escape') {
        cerrar(true);
      }
    });
  }

  function auto() {
    [].forEach.call(document.querySelectorAll('select[data-animado]:not([multiple])'), init);
    [].forEach.call(document.querySelectorAll('.sa[data-sa-panel]'), initPanel);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto);
  else auto();

  window.SelectAnimado = { init: init, initPanel: initPanel, auto: auto };
})();
