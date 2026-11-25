/* =========================================================
   🛰️ Service Worker — JC-C (PWA)
   - Estáticos (HTML/CSS/JS/iconos): caché primero + actualizar
   - Navegaciones: red primero, fallback a caché (offline)
   - API (cross-origin): SIEMPRE red (la app maneja offline
     con localStorage vía utils/offline.js)
   - CDNs (fonts/libs): caché primero + actualizar
   ========================================================= */
const VERSION = "jc-c-v1";
const STATIC_CACHE = `${VERSION}-static`;
const PAGE_CACHE = `${VERSION}-pages`;

// Núcleo precacheado: con visitar la app una vez online basta
const PRECACHE = [
    "./",
    "index.html",
    "categories.html",
    "productos.html",
    "inventario.html",
    "vendidos.html",
    "gastos.html",
    "liquidados.html",
    "historial-liquidaciones.html",
    "abonos.html",
    "liquidacion.html",
    "saleDetails.html",
    "manifest.json",
    "icons/icon-192.png",
    "icons/icon-512.png",
    "icons/apple-touch-icon.png",
    // CSS (todos)
    "css/app-theme.css",
    "css/dashboard.css",
    "css/elegante.css",
    "css/jc-ia.css",
    "css/media.css",
    "css/navigation.css",
    "css/notifications.css",
    "css/pagination.css",
    "css/styles.css",
    "css/transicion-zoom.css",
    // JS núcleo
    "loader.js",
    "adminMode.js",
    "main.js",
    "keepAlive.js",
    "authCheck.js",
    "utils/api.js",
    "utils/auth.js",
    "utils/offline.js",
    "utils/notifications.js",
    "utils/navigation.js",
    "utils/modalAnimado.js",
    "utils/selectAnimado.js",
    "utils/transicion-zoom.js",
    "utils/barcodeScanner.js",
    "utils/invoiceGenerator.js",
    "utils/infiniteScroll.js",
    "utils/jc-ia.js",
    "utils/auth.js",
    // JS de páginas clave
    "dashboard/categories.js",
    "productos.js",
    "inventario.js"
];

const CDN_HOSTS = [
    "cdnjs.cloudflare.com",
    "cdn.jsdelivr.net",
    "fonts.googleapis.com",
    "fonts.gstatic.com"
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) =>
                Promise.all(
                    PRECACHE.map((url) =>
                        cache.add(new Request(url, { cache: "reload" })).catch(() => {
                            console.warn("[SW] No se pudo precachear:", url);
                        })
                    )
                )
            )
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) =>
                Promise.all(
                    keys
                        .filter((key) => key !== STATIC_CACHE && key !== PAGE_CACHE)
                        .map((key) => caches.delete(key))
                )
            )
            .then(() => self.clients.claim())
    );
});

async function staleWhileRevalidate(request, cacheName = STATIC_CACHE) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    const networkPromise = fetch(request)
        .then((response) => {
            if (response && (response.ok || response.type === "opaque")) {
                cache.put(request, response.clone());
            }
            return response;
        })
        .catch(() => null);

    if (cached) {
        // Hay caché: servirla ya y actualizar en segundo plano
        networkPromise.catch(() => {});
        return cached;
    }
    const response = await networkPromise;
    return response || new Response("", { status: 504, statusText: "Offline" });
}

async function networkFirstNavigation(request) {
    try {
        const response = await fetch(request);
        const cache = await caches.open(PAGE_CACHE);
        cache.put(request, response.clone());
        return response;
    } catch {
        const cached = await caches.match(request);
        if (cached) return cached;
        // Fallback: shell mínimo para no quedarse en blanco
        const shell = (await caches.match("index.html")) || (await caches.match("./"));
        if (shell) return shell;
        return new Response(
            "<!doctype html><meta charset='utf-8'><title>Sin conexión</title><body style='font-family:sans-serif;padding:40px;text-align:center'><h2>📡 Sin conexión</h2><p>Esta página no está en caché. Conéctate a internet una vez para guardarla.</p></body>",
            { headers: { "Content-Type": "text/html; charset=utf-8" } }
        );
    }
}

self.addEventListener("fetch", (event) => {
    const { request } = event;
    if (request.method !== "GET") return; // POST/PUT/DELETE → red siempre

    const url = new URL(request.url);

    // API u otro origen que no sea CDN → solo red
    // (utils/offline.js se encarga del fallback con localStorage)
    if (url.origin !== self.location.origin) {
        if (CDN_HOSTS.includes(url.hostname)) {
            event.respondWith(staleWhileRevalidate(request));
        }
        return;
    }

    // Navegaciones (HTML): red primero, fallback caché
    if (request.mode === "navigate") {
        event.respondWith(networkFirstNavigation(request));
        return;
    }

    // Estáticos same-origin: caché primero + actualizar en segundo plano
    event.respondWith(staleWhileRevalidate(request));
});
