/* =========================================================
   📡 MÓDULO OFFLINE — cola de ventas locales + sync automático
   - Guarda ventas en localStorage cuando no hay red
   - Ajusta stock localmente para que las listas reflejen la venta
   - Sincroniza automáticamente al recuperar conexión (eventos online)
   - Idempotente vía clientRef (evita duplicados en el servidor)
   ========================================================= */
import { apiFetch } from "./api.js";
import { getToken } from "./auth.js";

const PENDING_KEY = "offline_pending_sales";
const PENDING_PRODUCTS_KEY = "offline_pending_products";
const PRODUCT_ID_MAP_KEY = "offline_product_id_map";
const STOCK_KEY = "offline_stock_adjustments";
const SALES_CACHE_KEY = "offline_sales_cache";
const PRODUCTS_CACHE_KEY = "offline_products_cache";

let _isSyncing = false;
let _bound = false;

/* ---------- storage ---------- */
function readJSON(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
}

function writeJSON(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.error("Error guardando en localStorage:", e);
    }
}

/* ---------- utilidades ---------- */
export function isNetworkError(error) {
    if (error && error.offline === true) return true;
    const msg = String((error && (error.message || error)) || "");
    return /failed to fetch|networkerror|network request failed|load failed|internet|conexi[oó]n|ERR_INTERNET|ERR_NETWORK|fetch failed/i.test(msg);
}

export function newClientRef() {
    try {
        if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    } catch { /* fallback */ }
    return `ref_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function notify(message, type = "info") {
    if (typeof window !== "undefined" && typeof window.showNotification === "function") {
        window.showNotification(message, type);
    }
}

/* ---------- cola de ventas pendientes ---------- */
function getPending() { return readJSON(PENDING_KEY, []); }

function setPending(list) {
    writeJSON(PENDING_KEY, list);
    updateBadge();
}

export function getPendingSales() { return getPending(); }

export function getPendingCount() { return getPending().length; }

export function addOfflineSale(saleData, endpoint) {
    const clientRef = saleData.clientRef || newClientRef();
    const payload = { ...saleData, clientRef };
    const item = {
        localId: newClientRef(),
        clientRef,
        endpoint: endpoint || "/sales/new",
        saleData: payload,
        status: "pending",
        error: null,
        createdAt: new Date().toISOString()
    };
    const pending = getPending();
    pending.push(item);
    setPending(pending);

    // Ajustar stock localmente (la venta ya "salió" del inventario)
    const adj = getStockAdjustments();
    (payload.products || []).forEach(p => {
        if (!p.productId) return;
        adj[p.productId] = (adj[p.productId] || 0) + (p.quantity || 1);
    });
    writeJSON(STOCK_KEY, adj);

    return item;
}

export function removeOfflineSale(localId) {
    const pending = getPending();
    const item = pending.find(i => i.localId === localId);
    if (!item) return false;

    // Revertir los ajustes de stock de ESTA venta
    const adj = getStockAdjustments();
    (item.saleData.products || []).forEach(p => {
        if (!p.productId) return;
        adj[p.productId] = (adj[p.productId] || 0) - (p.quantity || 1);
        if (adj[p.productId] <= 0) delete adj[p.productId];
    });
    writeJSON(STOCK_KEY, adj);

    setPending(pending.filter(i => i.localId !== localId));
    return true;
}

function removePendingItem(localId) {
    setPending(getPending().filter(i => i.localId !== localId));
}

function markPendingError(localId, message) {
    setPending(getPending().map(i =>
        i.localId === localId ? { ...i, status: "error", error: message } : i
    ));
}

export function retryFailedSales() {
    const pending = getPending().map(i =>
        i.status === "error" ? { ...i, status: "pending", error: null } : i
    );
    setPending(pending);
    // También reintentar productos locales con error
    setPendingProducts(getPendingProductsRaw().map(i =>
        i.status === "error" ? { ...i, status: "pending", error: null } : i
    ));
    return syncPendingSales();
}

/* ---------- cola de productos locales (producto rápido offline) ---------- */
function getPendingProductsRaw() { return readJSON(PENDING_PRODUCTS_KEY, []); }

function setPendingProducts(list) {
    writeJSON(PENDING_PRODUCTS_KEY, list);
    updateBadge();
}

export function getPendingProducts() { return getPendingProductsRaw(); }

export function getPendingProductsCount() { return getPendingProductsRaw().length; }

/** ¿Hay ventas O productos locales esperando sincronizar? */
export function hasPendingItems() {
    return getPending().length > 0 || getPendingProductsRaw().length > 0;
}

/**
 * Guarda un producto creado sin conexión.
 * @returns objeto producto con _id local (localp_...) listo para seleccionar en la venta
 */
export function addOfflineProduct(productData, endpoint) {
    const localId = `localp_${newClientRef()}`;
    const item = {
        localId,
        endpoint: endpoint || "/products/new",
        productData: { ...productData },
        status: "pending",
        error: null,
        createdAt: new Date().toISOString()
    };
    const list = getPendingProductsRaw();
    list.push(item);
    setPendingProducts(list);
    return { ...productData, _id: localId, _localProduct: true };
}

export function removeOfflineProduct(localId) {
    const list = getPendingProductsRaw();
    const next = list.filter(i => i.localId !== localId);
    if (next.length === list.length) return false;
    setPendingProducts(next);
    return true;
}

function getProductIdMap() { return readJSON(PRODUCT_ID_MAP_KEY, {}); }

function markProductError(localId, message) {
    setPendingProducts(getPendingProductsRaw().map(i =>
        i.localId === localId ? { ...i, status: "error", error: message } : i
    ));
}

function isLocalProductId(id) {
    return String(id || "").startsWith("localp_");
}

/** Reemplaza los IDs locales de productos por sus IDs reales (tras sincronizar) */
function resolveSaleProductIds(saleData) {
    const map = getProductIdMap();
    if (!saleData || !Array.isArray(saleData.products)) return saleData;
    let changed = false;
    const products = saleData.products.map(p => {
        const real = map[p.productId];
        if (real) {
            changed = true;
            return { ...p, productId: real };
        }
        return p;
    });
    return changed ? { ...saleData, products } : saleData;
}

function saleHasUnresolvedLocalProducts(saleData) {
    const map = getProductIdMap();
    return (saleData && saleData.products || []).some(p =>
        isLocalProductId(p.productId) && !map[p.productId]
    );
}

/**
 * Sincroniza la cola de productos locales (antes que las ventas,
 * para poder resolver los IDs de producto de cada venta).
 */
async function syncPendingProducts(token) {
    const queue = getPendingProductsRaw().filter(i => i.status === "pending");
    let synced = 0;
    let failed = 0;
    let networkLost = false;
    const map = getProductIdMap();

    for (const item of queue) {
        try {
            const created = await apiFetch(item.endpoint, "POST", item.productData, token);
            if (created && created._id) {
                map[item.localId] = created._id;
                writeJSON(PRODUCT_ID_MAP_KEY, map);
            }
            setPendingProducts(getPendingProductsRaw().filter(i => i.localId !== item.localId));
            synced++;
        } catch (err) {
            if (isNetworkError(err)) {
                networkLost = true;
                break;
            }
            markProductError(item.localId, String((err && err.message) || err));
            failed++;
        }
    }

    return { synced, failed, networkLost };
}

/* ---------- ajustes de stock locales ---------- */
export function getStockAdjustments() { return readJSON(STOCK_KEY, {}); }

export function applyOfflineStock(products) {
    if (!Array.isArray(products) || products.length === 0) return products;
    const adj = getStockAdjustments();
    if (Object.keys(adj).length === 0) return products;
    return products.map(p => {
        const a = adj[String(p._id)] || 0;
        if (!a) return p;
        const current = p.stock !== undefined ? p.stock : 1;
        const stock = Math.max(0, current - a);
        return { ...p, stock, sold: stock <= 0 ? true : !!p.sold };
    });
}

/* ---------- caché de datos (fallback offline) ---------- */
export function cacheSales(sales) {
    writeJSON(SALES_CACHE_KEY, Array.isArray(sales) ? sales : []);
}

export function getCachedSales() {
    return readJSON(SALES_CACHE_KEY, []);
}

export function cacheProducts(products) {
    if (!Array.isArray(products)) return;
    // Merge por _id para acumular páginas de la paginación
    const existing = readJSON(PRODUCTS_CACHE_KEY, []);
    const map = new Map(existing.map(p => [String(p._id), p]));
    products.forEach(p => { if (p && p._id) map.set(String(p._id), p); });
    writeJSON(PRODUCTS_CACHE_KEY, [...map.values()]);
}

export function getCachedProducts() {
    return readJSON(PRODUCTS_CACHE_KEY, []);
}

/**
 * GET con fallback a caché si falla la red.
 * @returns {{data: Array, offline: boolean}}
 */
export async function fetchWithCache(endpoint, kind, token) {
    try {
        const data = await apiFetch(endpoint, "GET", null, token);
        if (kind === "sales") cacheSales(data);
        else cacheProducts(data);
        return { data, offline: false };
    } catch (error) {
        if (isNetworkError(error)) {
            const data = kind === "sales" ? getCachedSales() : getCachedProducts();
            return { data, offline: true, error };
        }
        throw error;
    }
}

/* ---------- ventas locales → formato de listado ---------- */
export function getLocalSalesForDisplay() {
    return getPending().map(item => {
        const sd = item.saleData;
        const payments = [];
        if (sd.paymentType === "contado") {
            payments.push({ amount: sd.price, date: sd.saleDate, metodoPago: sd.metodoPago || "efectivo" });
        } else if ((sd.advancePayment || 0) > 0) {
            payments.push({ amount: sd.advancePayment, date: sd.saleDate, metodoPago: sd.metodoPago || "efectivo" });
        }
        return {
            ...sd,
            payments,
            settled: false,
            _id: `local_${item.localId}`,
            _local: true,
            _syncStatus: item.status,
            _syncError: item.error
        };
    });
}

/* ---------- sincronización ---------- */
export async function syncPendingSales() {
    const idleResult = {
        synced: 0, failed: 0, productsSynced: 0, productsFailed: 0,
        remaining: getPendingCount(), started: false
    };
    if (_isSyncing) return idleResult;

    const queue = getPending().filter(i => i.status === "pending");
    const hasPendingProducts = getPendingProductsRaw().some(i => i.status === "pending");
    const offline = typeof navigator !== "undefined" && navigator.onLine === false;
    if ((!queue.length && !hasPendingProducts) || offline) {
        return idleResult;
    }

    _isSyncing = true;
    updateBadge();

    let synced = 0;
    let failed = 0;
    const token = getToken();

    // 1️⃣ Productos locales PRIMERO (para poder resolver sus IDs en las ventas)
    const prodResult = await syncPendingProducts(token);
    let productsSynced = prodResult.synced;
    let productsFailed = prodResult.failed;

    // 2️⃣ Ventas locales
    if (!prodResult.networkLost) {
        for (const item of queue) {
            try {
                // Si algún producto de la venta sigue local (falló su creación), marcar error claro
                if (saleHasUnresolvedLocalProducts(item.saleData)) {
                    markPendingError(item.localId, "Producto local pendiente de sincronizar");
                    failed++;
                    continue;
                }
                const payload = resolveSaleProductIds(item.saleData);
                await apiFetch(item.endpoint, "POST", payload, token);
                removePendingItem(item.localId);
                synced++;
                if (typeof document !== "undefined") {
                    document.dispatchEvent(new CustomEvent("offline-sync-progress", {
                        detail: { synced, total: queue.length }
                    }));
                }
            } catch (err) {
                if (isNetworkError(err)) break; // se perdió la red: continuar con los que quedan en la próxima
                markPendingError(item.localId, String((err && err.message) || err));
                failed++;
            }
        }
    }

    _isSyncing = false;
    const remaining = getPendingCount();
    const productsRemaining = getPendingProductsRaw().length;

    // Si ya no queda NADA pendiente, el servidor es la fuente de verdad del stock
    if (remaining === 0 && productsRemaining === 0) {
        writeJSON(STOCK_KEY, {});
    }

    updateBadge();

    const detail = { synced, failed, productsSynced, productsFailed, remaining };
    if (typeof document !== "undefined") {
        document.dispatchEvent(new CustomEvent("offline-sync-complete", { detail }));
    }

    if (productsSynced > 0) notify(`✅ ${productsSynced} producto(s) rápido(s) creado(s) en el servidor`, "success");
    if (synced > 0) notify(`✅ ${synced} venta(s) sincronizada(s) con el servidor`, "success");
    if (failed > 0 || productsFailed > 0) {
        notify(`⚠️ ${failed + productsFailed} elemento(s) con error al sincronizar. Toca el aviso para reintentar.`, "warning");
    }

    return { ...detail, started: true };
}

/* ---------- badge de estado ---------- */
function ensureBadge() {
    if (typeof document === "undefined") return null;
    let el = document.getElementById("offline-badge");
    if (!el) {
        el = document.createElement("div");
        el.id = "offline-badge";
        el.style.cssText = `
            position: fixed; left: 12px; bottom: 12px; z-index: 99999;
            display: none; align-items: center; gap: 8px;
            padding: 10px 14px; border-radius: 999px;
            font-size: 13px; font-weight: 600; cursor: pointer;
            box-shadow: 0 4px 14px rgba(0,0,0,.25);
            transition: background .25s ease, opacity .25s ease;
            user-select: none; font-family: inherit;
        `;
        el.addEventListener("click", async () => {
            const all = [...getPending(), ...getPendingProductsRaw()];
            const hasErrors = all.some(i => i.status === "error");
            const hasWaiting = all.some(i => i.status === "pending");
            if (hasErrors) {
                await retryFailedSales();
            } else if (hasWaiting && typeof navigator !== "undefined" && navigator.onLine !== false) {
                await syncPendingSales();
            }
        });
        document.body.appendChild(el);
    }
    return el;
}

export function updateBadge() {
    if (typeof document === "undefined" || !document.body) return;
    const el = ensureBadge();
    if (!el) return;

    const pending = getPending();
    const pendingProds = getPendingProductsRaw();
    const errors = [...pending, ...pendingProds].filter(i => i.status === "error").length;
    const waiting = [...pending, ...pendingProds].filter(i => i.status === "pending").length;
    const total = errors + waiting;
    const offline = typeof navigator !== "undefined" && navigator.onLine === false;

    if (_isSyncing) {
        el.style.display = "flex";
        el.style.background = "#3498db";
        el.style.color = "#fff";
        el.style.cursor = "default";
        el.innerHTML = `<span>🔄</span> Sincronizando...`;
    } else if (offline && total > 0) {
        el.style.display = "flex";
        el.style.background = "#e67e22";
        el.style.color = "#fff";
        el.style.cursor = "default";
        el.innerHTML = `<span>📡</span> Sin conexión · ${total} local(es)`;
    } else if (errors > 0) {
        el.style.display = "flex";
        el.style.background = "#e74c3c";
        el.style.color = "#fff";
        el.style.cursor = "pointer";
        el.innerHTML = `<span>⚠️</span> ${errors} error(es) al sincronizar · toca para reintentar`;
    } else if (waiting > 0) {
        el.style.display = "flex";
        el.style.background = "#f39c12";
        el.style.color = "#fff";
        el.style.cursor = "pointer";
        el.innerHTML = `<span>⏳</span> ${waiting} por sincronizar`;
    } else {
        el.style.display = "none";
    }
}

/* ---------- inicialización ---------- */
export function initOffline({ onSynced } = {}) {
    updateBadge();
    if (_bound || typeof window === "undefined") return;
    _bound = true;

    const runSync = () => {
        syncPendingSales()
            .then(result => {
                if ((result.synced > 0 || result.productsSynced > 0) && typeof onSynced === "function") {
                    onSynced(result);
                }
            })
            .catch(() => { /* se reintentará */ });
    };

    window.addEventListener("online", () => {
        updateBadge();
        notify("🌐 Conexión restaurada. Sincronizando lo guardado localmente...", "info");
        runSync();
    });

    window.addEventListener("offline", () => {
        updateBadge();
        notify("📡 Sin conexión. Las ventas y productos se guardarán localmente.", "warning");
    });

    // Al cargar la página: si hay pendientes y hay red, sincronizar
    if (hasPendingItems()) {
        const online = typeof navigator === "undefined" || navigator.onLine !== false;
        if (online) {
            setTimeout(runSync, 1500);
        }
    }

    // Red de seguridad: reintentar mientras haya pendientes (cubre
    // eventos "online" perdidos, suspensión del equipo, etc.)
    setInterval(() => {
        if (hasPendingItems() && typeof navigator !== "undefined" && navigator.onLine !== false && !_isSyncing) {
            runSync();
        }
    }, 15000);
}
