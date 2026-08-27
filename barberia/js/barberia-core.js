/**
 * barberia-core.js
 * Shared auth guard, API helper, sidebar, toast, and utilities
 * for all barbería pages.
 */

const API_BASE = "https://losiones-fjt0.onrender.com/api";

// ── Auth ─────────────────────────────────────────────────────────────────────

export function getToken() {
    return localStorage.getItem("token");
}

export function getUserInfo() {
    const token = getToken();
    if (!token) return null;
    try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        return payload;
    } catch { return null; }
}

export function requireAuth() {
    const user = getUserInfo();
    if (!user || user.tipo !== 5) {
        window.location.href = "../index.html";
    }
    return user;
}

export function logout() {
    localStorage.removeItem("token");
    window.location.href = "../index.html";
}

// ── API helper ────────────────────────────────────────────────────────────────

export async function api(path, method = "GET", body = null) {
    const opts = {
        method,
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${getToken()}`
        }
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${API_BASE}/barberia${path}`, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error en la petición");
    return data;
}

// ── Toast ─────────────────────────────────────────────────────────────────────

let toastContainer;

function ensureToastContainer() {
    if (!toastContainer) {
        toastContainer = document.createElement("div");
        toastContainer.className = "toast-container";
        document.body.appendChild(toastContainer);
    }
}

export function toast(message, type = "success", duration = 3000) {
    ensureToastContainer();
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    const icon = type === "success" ? "✓" : "✕";
    el.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    toastContainer.appendChild(el);
    setTimeout(() => {
        el.classList.add("out");
        el.addEventListener("animationend", () => el.remove(), { once: true });
    }, duration);
}

// ── Modal helper ──────────────────────────────────────────────────────────────

export function openModal(id) {
    document.getElementById(id)?.classList.add("open");
}
export function closeModal(id) {
    document.getElementById(id)?.classList.remove("open");
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

export function initSidebar(activeHref) {
    // Mark active link
    document.querySelectorAll(".sidebar-nav a").forEach(a => {
        if (a.getAttribute("href") === activeHref) a.classList.add("active");
    });

    // Logout
    document.getElementById("btnLogout")?.addEventListener("click", logout);

    // Mobile hamburger
    const sidebar = document.querySelector(".sidebar");
    const overlay = document.querySelector(".sidebar-overlay");
    const hamburger = document.querySelector(".btn-hamburger");

    hamburger?.addEventListener("click", () => {
        sidebar.classList.toggle("open");
        overlay.classList.toggle("open");
    });
    overlay?.addEventListener("click", () => {
        sidebar.classList.remove("open");
        overlay.classList.remove("open");
    });
}

// ── Live clock ───────────────────────────────────────────────────────────────

export function startClock(el) {
    if (!el) return;
    function tick() {
        const now = new Date();
        const opts = { weekday: "long", day: "numeric", month: "long" };
        el.textContent = now.toLocaleDateString("es-CO", opts);
    }
    tick();
    setInterval(tick, 60000);
}

// ── Formatters ────────────────────────────────────────────────────────────────

export function formatMoney(n) {
    return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n);
}

export function formatDate(d) {
    return new Date(d).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function todayISO() {
    return new Date().toISOString().split("T")[0];
}

// ── Sidebar HTML (injected) ───────────────────────────────────────────────────

export function renderSidebarHTML(prefix = "") {
    return `
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-brand">
        <div class="brand-name">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44l-1.37-5.47A2.5 2.5 0 0 1 8 10.9V7.5A2.5 2.5 0 0 1 9.5 5"/>
            <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44l1.37-5.47A2.5 2.5 0 0 0 16 10.9V7.5A2.5 2.5 0 0 0 14.5 5"/>
          </svg>
          Barbería
        </div>
        <div class="brand-sub">Control de caja</div>
      </div>
      <nav class="sidebar-nav">
        <span class="sidebar-section-label">Principal</span>
        <a href="${prefix}index.html">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/>
            <rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>
          </svg>
          Dashboard
        </a>
        <a href="${prefix}caja.html">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/>
            <path d="M16 10a4 4 0 0 1-8 0"/>
          </svg>
          Nueva venta
        </a>
        <span class="sidebar-section-label">Gestión</span>
        <a href="${prefix}barberos.html">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          Barberos
        </a>
        <a href="${prefix}servicios.html">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/>
            <circle cx="12" cy="13" r="3"/>
          </svg>
          Servicios
        </a>
        <a href="${prefix}inventario.html">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
            <path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>
          </svg>
          Inventario
        </a>
        <a href="${prefix}reportes.html">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>
          </svg>
          Reportes
        </a>
      </nav>
      <div class="sidebar-footer">
        <button id="btnLogout">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>
          </svg>
          Cerrar sesión
        </button>
      </div>
    </aside>
    <div class="sidebar-overlay" id="sidebarOverlay"></div>
    `;
}
