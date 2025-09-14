/**
 * CoinLoader - Sistema de animación de carga automático
 * Versión 1.1 - Modificado para ignorar requests del bot
 * 
 * Este script crea y gestiona una animación de carga de monedas
 * que se muestra automáticamente durante operaciones AJAX, fetch
 * o durante la carga de la página.
 * 
 * Auto-inyección: Este script se auto-inyecta en todas las páginas
 * de tu aplicación cuando se incluye como un script global.
 */

(function() {
  // Crear elementos del loader
  function createLoader() {
    // Contenedor principal
    const loaderContainer = document.createElement('div');
    loaderContainer.className = 'coin-loader-container hidden';
    
    // Contenedor de monedas
    const coinLoader = document.createElement('div');
    coinLoader.className = 'coin-loader';
    
    // Crear 4 monedas
    for (let i = 0; i < 4; i++) {
      const coin = document.createElement('div');
      coin.className = 'coin';
      coin.textContent = '$';
      coinLoader.appendChild(coin);
    }
    
    // Texto de carga
    const loadingText = document.createElement('div');
    loadingText.className = 'loading-text';
    loadingText.textContent = 'Procesando su solicitud...';
    
    // SVG de alcancía decorativa
    const piggyBank = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    piggyBank.setAttribute('class', 'piggy-bank');
    piggyBank.setAttribute('width', '80');
    piggyBank.setAttribute('height', '60');
    piggyBank.setAttribute('viewBox', '0 0 80 60');
    
    const paths = [
      { tag: 'path', attrs: { fill: '#F8C9DB', d: 'M65,26c0-12.15-10.77-22-24.06-22S16.88,13.85,16.88,26c0,12.15,10.77,22,24.06,22S65,38.15,65,26z' }},
      { tag: 'ellipse', attrs: { fill: '#F06292', cx: '25', cy: '22', rx: '3', ry: '4' }},
      { tag: 'rect', attrs: { x: '12', y: '20', fill: '#F8C9DB', width: '8', height: '12', rx: '4', ry: '4' }},
      { tag: 'rect', attrs: { x: '65', y: '20', fill: '#F8C9DB', width: '8', height: '12', rx: '4', ry: '4' }},
      { tag: 'rect', attrs: { x: '40', y: '42', fill: '#F06292', width: '6', height: '8', rx: '2', ry: '2' }},
      { tag: 'circle', attrs: { fill: '#424242', cx: '53', cy: '23', r: '2' }}
    ];
    
    paths.forEach(item => {
      const el = document.createElementNS('http://www.w3.org/2000/svg', item.tag);
      for (const [key, value] of Object.entries(item.attrs)) {
        el.setAttribute(key, value);
      }
      piggyBank.appendChild(el);
    });
    
    // Añadir todos los elementos al contenedor
    loaderContainer.appendChild(coinLoader);
    loaderContainer.appendChild(loadingText);
    loaderContainer.appendChild(piggyBank);
    
    // Añadir el contenedor al body
    document.body.appendChild(loaderContainer);
    
    return {
      container: loaderContainer,
      textElement: loadingText
    };
  }
  
  // Crear y añadir estilos CSS
  function addStyles() {
    const styleEl = document.createElement('style');
    styleEl.textContent = `
      .coin-loader-container {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        background-color: rgb(46, 45, 45);
        z-index: 9999;
      }
      
      .coin-loader {
        display: flex;
        position: relative;
        width: 200px;
        height: 100px;
        justify-content: center;
      }
      
      .coin {
        position: absolute;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: linear-gradient(45deg, #FFD700, #FFC107);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        display: flex;
        justify-content: center;
        align-items: center;
        font-weight: bold;
        color: #8B4513;
        font-size: 20px;
        border: 2px solid #E6B800;
        animation: coinJump 1.5s infinite ease-in-out;
      }
      
      .coin:nth-child(1) {
        animation-delay: 0s;
      }
      
      .coin:nth-child(2) {
        animation-delay: 0.3s;
      }
      
      .coin:nth-child(3) {
        animation-delay: 0.6s;
      }
      
      .coin:nth-child(4) {
        animation-delay: 0.9s;
      }
      
      @keyframes coinJump {
        0%, 100% {
          transform: translateY(0) scale(1) rotateY(0deg);
        }
        25% {
          transform: translateY(-40px) scale(1.1) rotateY(90deg);
        }
        50% {
          transform: translateY(0) scale(1) rotateY(180deg);
        }
        75% {
          transform: translateY(-20px) scale(1.05) rotateY(270deg);
        }
      }
      
      .loading-text {
        margin-top: 40px;
        font-size: 18px;
        color:rgb(255, 255, 255);
        font-weight: bold;
        text-align: center;
        opacity: 0;
        animation: fadeInOut 2s infinite;
      }
      
      @keyframes fadeInOut {
        0%, 100% {
          opacity: 0.3;
        }
        50% {
          opacity: 1;
        }
      }
      
      .piggy-bank {
        position: absolute;
        bottom: 20px;
        right: 20px;
        animation: bounce 3s infinite ease-in-out;
        opacity: 0.7;
      }
      
      @keyframes bounce {
        0%, 100% {
          transform: translateY(0);
        }
        50% {
          transform: translateY(-10px);
        }
      }
      
      .hidden {
        display: none !important;
      }
    `;
    document.head.appendChild(styleEl);
  }
  
  // Función para mostrar el loader
  function showLoader() {
    if (window.coinLoader) {
      window.coinLoader.container.classList.remove('hidden');
    }
  }
  
  // Función para ocultar el loader
  function hideLoader() {
    if (window.coinLoader) {
      window.coinLoader.container.classList.add('hidden');
    }
  }
  
  // Función para verificar si una request es del bot keepAlive
  function isBotRequest(url, body) {
    // Verificar si la URL contiene el endpoint de tu API
    if (url && url.includes('losiones-1.onrender.com/api')) {
      
      // Si es un POST a /auth/login, verificar si es el bot
      if (url.includes('/auth/login')) {
        try {
          const parsedBody = typeof body === 'string' ? JSON.parse(body) : body;
          if (parsedBody && parsedBody.email === 'bot@keepalive.com') {
            return true;
          }
        } catch (e) {
          // Si hay error al parsear, no es problema
        }
      }
      
      // Si es un POST a /sales/new, verificar si el cliente es "BOT CLIENT"
      if (url.includes('/sales/new')) {
        try {
          const parsedBody = typeof body === 'string' ? JSON.parse(body) : body;
          if (parsedBody && parsedBody.clientName === 'BOT CLIENT') {
            return true;
          }
        } catch (e) {
          // Si hay error al parsear, no es problema
        }
      }
      
      // Si es un DELETE a /sales/, podría ser el bot limpiando
      // Verificamos el stack trace para ver si viene de keepAlive
      const stack = new Error().stack;
      if (url.includes('/sales/') && url.match(/\/sales\/[a-f0-9]{24}$/) && stack.includes('mantenerActivoRender')) {
        return true;
      }
    }
    
    return false;
  }
  
  // Textos rotativos para el loader
  const loadingTexts = [
    "Procesando su solicitud...",
    "Un momento por favor...",
    "Casi listo..."
  ];
  
  // Función para cambiar el texto del loader
  function rotateLoadingText() {
    if (window.coinLoader) {
      const randomIndex = Math.floor(Math.random() * loadingTexts.length);
      window.coinLoader.textElement.textContent = loadingTexts[randomIndex];
    }
  }

  // Inicializar el loader cuando el DOM esté listo
  function init() {
    addStyles();
    window.coinLoader = createLoader();
    
    // Cambiar el texto cada 2 segundos
    setInterval(rotateLoadingText, 2000);
    
    // Interceptar fetch para mostrar/ocultar el loader automáticamente
    const originalFetch = window.fetch;
    window.fetch = function(url, options = {}) {
      
      // Verificar si es una request del bot
      if (isBotRequest(url, options.body)) {
        // Si es del bot, no mostrar loader y llamar fetch original
        return originalFetch.apply(this, arguments);
      }
      
      // Si no es del bot, mostrar loader
      showLoader();
      return originalFetch.apply(this, arguments)
        .then(response => {
          hideLoader();
          return response;
        })
        .catch(error => {
          hideLoader();
          throw error;
        });
    };
    
    // Interceptar XMLHttpRequest para mostrar/ocultar el loader automáticamente
    const originalXhrOpen = XMLHttpRequest.prototype.open;
    const originalXhrSend = XMLHttpRequest.prototype.send;
    
    XMLHttpRequest.prototype.open = function(method, url) {
      this._url = url; // Guardar la URL para verificar después
      return originalXhrOpen.apply(this, arguments);
    };
    
    XMLHttpRequest.prototype.send = function(data) {
      const xhr = this;
      
      // Verificar si es una request del bot
      if (isBotRequest(xhr._url, data)) {
        // Si es del bot, no mostrar loader
        return originalXhrSend.apply(xhr, arguments);
      }
      
      // Si no es del bot, mostrar loader
      showLoader();
      
      // Interceptar cuando la solicitud se complete
      function handleLoadEnd() {
        hideLoader();
        xhr.removeEventListener('loadend', handleLoadEnd);
      }
      
      xhr.addEventListener('loadend', handleLoadEnd);
      
      return originalXhrSend.apply(xhr, arguments);
    };
  }
  
  // Verificar si el DOM ya está cargado
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  // Mostrar loader durante la carga inicial de la página
  showLoader();
  window.addEventListener('load', function() {
    // Ocultar loader cuando la página termine de cargar
    hideLoader();
  });
  
  // Exponer la API pública
  window.CoinLoader = {
    show: showLoader,
    hide: hideLoader,
    setTexts: function(texts) {
      if (Array.isArray(texts) && texts.length > 0) {
        loadingTexts.length = 0;
        texts.forEach(text => loadingTexts.push(text));
      }
    }
  };
})();