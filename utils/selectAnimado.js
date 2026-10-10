/* Convierte <select data-animado> en un menú cuyo panel se "arma" al abrirse:
   se dibujan las líneas del borde, se despliega el fondo y aparecen las opciones.
   El <select> original sigue existiendo (oculto y sincronizado): formularios,
   .value y el evento 'change' funcionan igual.

   Opciones en el <select>:
     data-direccion="abajo|arriba|derecha|izquierda"  fuerza la dirección
     (sin esto, elige sola según el espacio disponible)
   Opción en un contenedor (modal, panel con scroll...):
     data-sa-limite   usa ese contenedor, en vez de la ventana, para medir el espacio */
(function () {
  var uid = 0;
  var NS = 'http://www.w3.org/2000/svg';

  function crear(tag, clase) {
    var e = document.createElement(tag);
    e.className = clase;
    return e;
  }

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

    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'sa-trazo');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    var g = document.createElementNS(NS, 'g');
    var trazoA = document.createElementNS(NS, 'path');
    var trazoB = document.createElementNS(NS, 'path');
    [trazoA, trazoB].forEach(function (p) { p.setAttribute('pathLength', '1'); g.appendChild(p); });
    svg.appendChild(g);
    panel.appendChild(lista);
    panel.appendChild(svg);

    if (sel.id) {
      var lb = document.querySelector('label[for="' + sel.id + '"]');
      if (lb) {
        lb.id = lb.id || id + '-lbl';
        btn.setAttribute('aria-labelledby', lb.id + ' ' + btn.id);
        lista.setAttribute('aria-labelledby', lb.id);
        lb.addEventListener('click', function (e) { e.preventDefault(); btn.focus(); });
      }
    }

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
        var h = lista.offsetHeight;
        if (panel.offsetWidth && h) trazar(panel.offsetWidth, panel.offsetHeight, wrap.dataset.dir || 'abajo');
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

    function trazar(w, h, dir) {
      var horiz = dir === 'derecha' || dir === 'izquierda';
      var lw = horiz ? h : w, lh = horiz ? w : h;
      var radio = parseFloat(getComputedStyle(wrap).getPropertyValue('--sa-radio')) || 10;
      var r = Math.max(0, Math.min(radio, lw / 2, lh / 2) - 0.5);
      var x0 = 0.5, y0 = 0.5, x1 = lw - 0.5, y1 = lh - 0.5, cx = lw / 2;

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

      var giro = '';
      if (dir === 'arriba') giro = 'rotate(180 ' + (w / 2) + ' ' + (h / 2) + ')';
      else if (dir === 'derecha') giro = 'translate(0 ' + h + ') rotate(-90)';
      else if (dir === 'izquierda') giro = 'translate(' + w + ' 0) rotate(90)';
      g.setAttribute('transform', giro);

      svg.setAttribute('width', w);
      svg.setAttribute('height', h);
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    }

    function posicionar() {
      lista.style.maxHeight = '';
      var lim = wrap.closest('[data-sa-limite]');
      var caja = lim ? lim.getBoundingClientRect() : { top: 0, bottom: window.innerHeight };
      var r = btn.getBoundingClientRect();
      var alto = lista.offsetHeight;
      var abajo = caja.bottom - r.bottom - 12;
      var arriba = r.top - caja.top - 12;
      var dir = sel.dataset.direccion ||
                ((abajo >= alto || abajo >= arriba) ? 'abajo' : 'arriba');
      wrap.dataset.dir = dir;

      if (dir === 'abajo' || dir === 'arriba') {
        var esp = dir === 'abajo' ? abajo : arriba;
        lista.style.maxHeight = Math.max(120, Math.min(300, esp)) + 'px';
      } else {
        wrap.dataset.alin = (caja.bottom - r.top - 12 >= alto) ? 'ini' : 'fin';
      }
      trazar(panel.offsetWidth, panel.offsetHeight, dir);
      void lista.offsetHeight;
    }

    function fuera(e) { if (!wrap.contains(e.target)) cerrar(false); }
    function alRedimensionar() { if (window.innerWidth !== anchoAlAbrir) cerrar(false); }

    function abrir() {
      if (btn.disabled || wrap.classList.contains('abierto')) return;
      [].forEach.call(document.querySelectorAll('.sa.abierto'), function (w) {
        if (w._saCerrar) w._saCerrar(false);
      });
      posicionar();
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
    if (sel.form) sel.form.addEventListener('reset', function () { setTimeout(function () { construir(); }, 0); });

    var mo = new MutationObserver(function () { construir(); });
    mo.observe(sel, { childList: true, subtree: false, attributes: true, attributeFilter: ['disabled'] });

    wrap._saConstruir = construir;
  }

  function auto() {
    [].forEach.call(document.querySelectorAll('select[data-animado]:not([multiple])'), init);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto);
  else auto();

  window.SelectAnimado = { init: init, auto: auto };
})();
