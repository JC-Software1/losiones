// superAdmin.js
import { apiFetch } from "../utils/api.js";
import { setToken, getToken, isAuthenticated, getUserInfo, logout } from "../utils/auth.js";

let allUsers = [];

/* ------------------- Sticky header & layout padding ------------------- */
function enableStickyHeader() {
  const header = document.querySelector(".header");
  const container = document.querySelector(".admin-container");
  if (!header || !container) return;

  try { if ("scrollRestoration" in history) history.scrollRestoration = "manual"; } catch (e) {}

  function applyHeaderStyles() {
    header.style.transition = "none";
    header.style.willChange = "auto";

    const headerHeight = header.getBoundingClientRect().height;

    header.style.position = "fixed";
    header.style.top = "0";
    header.style.left = "50%";
    header.style.transform = "translateX(-50%)";
    header.style.width = "calc(100% - 40px)";
    header.style.maxWidth = "1600px";
    header.style.zIndex = "2000";

    const computed = window.getComputedStyle(container);
    const currentPaddingTop = parseFloat(computed.paddingTop) || 0;
    if (!container.dataset.basePaddingTop) container.dataset.basePaddingTop = currentPaddingTop;

    container.style.paddingTop = `${parseFloat(container.dataset.basePaddingTop) + headerHeight + 12}px`;

    setTimeout(() => { header.style.transition = ""; }, 60);
  }

  applyHeaderStyles();
  window.addEventListener("resize", applyHeaderStyles);
  window.addEventListener("load", applyHeaderStyles);
  window.scrollTo(0, 0);
}

/* ------------------- Layout controls (Compact / Masonry / List) ------------------- */
function injectCardLayoutStyles() {
  const css = `
  #usersGrid.grid-compact {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 20px;
    align-items: start;
  }
  #usersGrid.grid-compact .user-card{ padding:20px; min-height:140px; }

  #usersGrid.grid-masonry { column-width: 360px; column-gap: 20px; }
  #usersGrid.grid-masonry .user-card { display:inline-block; width:100%; margin:0 0 20px; break-inside: avoid; }

  #usersGrid.grid-list { display:flex; flex-direction:column; gap:14px; }
  #usersGrid.grid-list .user-card { display:grid; grid-template-columns: 84px 1fr auto; gap:16px; align-items:center; min-height:84px; padding:18px; }

  .layout-toggle { display:inline-flex; gap:8px; align-items:center; border-radius:999px; padding:6px; background: rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.04); }
  .layout-toggle button { background:transparent; border:none; padding:6px 10px; border-radius:8px; cursor:pointer; font-weight:700; color: white; opacity:0.85;}
  .layout-toggle button[aria-pressed="true"]{ background: linear-gradient(90deg,#667eea,#764ba2); color:white; opacity:1; box-shadow:0 10px 30px rgba(118,75,162,0.12); }

  @media (max-width:520px){
    #usersGrid.grid-compact{ grid-template-columns: repeat(auto-fit, minmax(200px,1fr)); }
    #usersGrid.grid-masonry{ column-width: 220px; }
    #usersGrid.grid-list .user-card{ grid-template-columns: 64px 1fr auto; }
  }
  `;
  if (!document.getElementById("injected-usersgrid-styles")) {
    const style = document.createElement("style");
    style.id = "injected-usersgrid-styles";
    style.appendChild(document.createTextNode(css));
    document.head.appendChild(style);
  }
}

function addLayoutControls() {
  const headerActions = document.querySelector(".header-actions");
  if (!headerActions || document.getElementById("layoutControls")) return;

  const wrapper = document.createElement("div");
  wrapper.id = "layoutControls";
  wrapper.className = "layout-toggle";
  wrapper.style.marginRight = "8px";

  const btnCompact = document.createElement("button");
  btnCompact.textContent = "Compact";
  btnCompact.dataset.layout = "grid-compact";
  btnCompact.setAttribute("aria-pressed", "false");

  const btnMasonry = document.createElement("button");
  btnMasonry.textContent = "Masonry";
  btnMasonry.dataset.layout = "grid-masonry";
  btnMasonry.setAttribute("aria-pressed", "false");

  const btnList = document.createElement("button");
  btnList.textContent = "Lista";
  btnList.dataset.layout = "grid-list";
  btnList.setAttribute("aria-pressed", "false");

  [btnCompact, btnMasonry, btnList].forEach(b => {
    b.addEventListener("click", (e) => {
      const layout = e.currentTarget.dataset.layout;
      toggleLayout(layout);
      [btnCompact, btnMasonry, btnList].forEach(x => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
    });
    wrapper.appendChild(b);
  });

  headerActions.insertBefore(wrapper, headerActions.firstChild);

  const saved = localStorage.getItem("usersGridLayout") || "grid-compact";
  const btnToPress = wrapper.querySelector(`button[data-layout="${saved}"]`);
  if (btnToPress) btnToPress.click();
}

function toggleLayout(layoutClass) {
  const grid = document.getElementById("usersGrid");
  const container = document.querySelector(".admin-container");
  const header = document.querySelector(".header");
  if (!grid || !container || !header) return;

  grid.classList.remove("grid-compact", "grid-masonry", "grid-list");
  grid.classList.add(layoutClass);
  localStorage.setItem("usersGridLayout", layoutClass);

  const headerHeight = header.getBoundingClientRect().height;
  const base = parseFloat(container.dataset.basePaddingTop || window.getComputedStyle(container).paddingTop || 0) || 0;
  container.style.paddingTop = `${base + headerHeight + 12}px`;

  if (window.pageYOffset < 50) window.scrollTo(0, 0);
}

/* ------------------- UI helpers ------------------- */
function showLoading() {
  const grid = document.getElementById("usersGrid");
  grid.innerHTML = `<div class="loading">🔄 Cargando usuarios...</div>`;
}

function renderEmpty() {
  const grid = document.getElementById("usersGrid");
  grid.innerHTML = `<div style="text-align:center;padding:40px;color:rgba(255,255,255,0.85)">No hay usuarios registrados</div>`;
}

/* ------------------- Create user card ------------------- */
function createUserCard(user) {
  const div = document.createElement("div");
  div.className = "user-card";
  div.dataset.userId = user._id;

  const userTypeText = user.tipo === 3 ? 'Super Admin' : user.tipo === 2 ? 'Admin' : 'Usuario';
  const userTypeClass = user.tipo === 3 ? 'type-superadmin' : user.tipo === 2 ? 'type-admin' : 'type-user';
  const statusClass = user.bloqueado ? 'status-blocked' : 'status-active';
  const statusText = user.bloqueado ? '🔒 Bloqueado' : '✅ Activo';
  const firstLetter = (user.name || user.username || 'U').charAt(0).toUpperCase();

  // Formatear fecha de pago
  let fechaPagoDisplay = 'No establecida';
  let diasRestantes = null;
  if (user.fechaPago) {
    const fechaPago = new Date(user.fechaPago);
    const hoy = new Date();
    diasRestantes = Math.ceil((fechaPago - hoy) / (1000 * 60 * 60 * 24));
    
    fechaPagoDisplay = fechaPago.toLocaleDateString('es-ES', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    if (diasRestantes <= 0) {
      fechaPagoDisplay += ' <span style="color:#dc3545;font-weight:700">(VENCIDO)</span>';
    } else if (diasRestantes <= 5) {
      fechaPagoDisplay += ` <span style="color:#ffc107;font-weight:700">(${diasRestantes} días)</span>`;
    }
  }

  div.innerHTML = `
    <div class="user-header">
      <div class="user-avatar">${firstLetter}</div>
      <div class="user-main-info">
        <h3>${user.name || 'Sin nombre'}</h3>
        <div class="user-username">${user.username || ''}</div>
      </div>
      <div class="user-badges">
        <div class="user-status ${statusClass}">${statusText}</div>
        <div class="user-type ${userTypeClass}">${userTypeText}</div>
      </div>
    </div>

    <div class="user-details">
      <div class="detail-item">
        <div class="detail-label">Fecha de Pago</div>
        <div class="detail-value">${fechaPagoDisplay}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">ID de Sistema</div>
        <div class="detail-value" style="font-family:monospace;font-size:12px">${user._id}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Fecha de Registro</div>
        <div class="detail-value">${user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'No disponible'}</div>
      </div>
      <div style="grid-column: 1 / -1; height: 0"></div>
    </div>

    <div class="user-actions">
      <button class="btn-sm btn-edit" data-action="edit" data-id="${user._id}">✏️ Editar</button>
      <button class="btn-sm btn-inspect" data-action="fecha-pago" data-id="${user._id}">📅 Fecha Pago</button>
      <button class="btn-sm ${user.bloqueado ? 'btn-unblock' : 'btn-block'}" data-action="${user.bloqueado ? 'unblock' : 'block'}" data-id="${user._id}" ${user.tipo === 3 ? 'disabled title="No se puede bloquear a un super admin"' : ''}>
        ${user.bloqueado ? '🔓 Desbloquear' : '🔒 Bloquear'}
      </button>
      <button class="btn-sm btn-inspect" data-action="inspect" data-id="${user._id}">🔍 Inspeccionar</button>
      <button class="btn-sm btn-delete" data-action="delete" data-id="${user._id}" ${user.tipo === 3 ? 'disabled title="No se puede eliminar a un super admin"' : ''}>🗑️ Eliminar</button>
    </div>
  `;

  return div;
}

/* ------------------- Stats update ------------------- */
function updateStats() {
  const total = allUsers.length;
  const active = allUsers.filter(u => !u.bloqueado).length;
  const blocked = allUsers.filter(u => u.bloqueado).length;
  const admins = allUsers.filter(u => u.tipo === 2 || u.tipo === 3).length;

  const elTotal = document.getElementById("totalUsers");
  const elActive = document.getElementById("activeUsers");
  const elBlocked = document.getElementById("blockedUsers");
  const elAdmins = document.getElementById("adminUsers");

  if (elTotal) elTotal.textContent = total;
  if (elActive) elActive.textContent = active;
  if (elBlocked) elBlocked.textContent = blocked;
  if (elAdmins) elAdmins.textContent = admins;
}

/* ------------------- Load & render users ------------------- */
async function loadUsers() {
  const grid = document.getElementById("usersGrid");
  showLoading();
  try {
    const users = await apiFetch("/auth/users", "GET");
    allUsers = Array.isArray(users) ? users : [];
    if (allUsers.length === 0) {
      renderEmpty();
    } else {
      grid.innerHTML = "";
      allUsers.sort((a, b) => (b.tipo - a.tipo));
      allUsers.forEach(u => {
        const card = createUserCard(u);
        grid.appendChild(card);
      });
    }
    updateStats();
  } catch (err) {
    console.error("Error cargando usuarios:", err);
    grid.innerHTML = `<div style="text-align:center;padding:40px;color:rgba(255,255,255,0.85)">❌ Error cargando usuarios: ${err.message || err}</div>`;
  } finally {
    const saved = localStorage.getItem("usersGridLayout") || "grid-compact";
    document.getElementById("usersGrid").classList.add(saved);
  }
}

/* ------------------- Event delegation for user actions ------------------- */
function attachUsersGridHandlers() {
  const grid = document.getElementById("usersGrid");
  if (!grid) return;

  grid.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    const action = btn.dataset.action;
    const userId = btn.dataset.id;
    const user = allUsers.find(u => u._id === userId);

    if (!action || !user) return;

    // NUEVA FUNCIONALIDAD: Establecer fecha de pago
    if (action === "fecha-pago") {
      const fechaActual = user.fechaPago ? new Date(user.fechaPago).toISOString().split('T')[0] : '';
      const nuevaFecha = prompt(`Establecer fecha de pago para ${user.username}\n(Formato: YYYY-MM-DD)`, fechaActual);
      
      if (!nuevaFecha) return;
      
      try {
        await apiFetch(`/auth/users/${userId}/fecha-pago`, "PUT", { fechaPago: nuevaFecha });
        alert("Fecha de pago actualizada exitosamente");
        await loadUsers();
      } catch (err) {
        console.error(err);
        alert(`Error: ${err.message || err}`);
      }
      return;
    }

    if (action === "edit") {
      openEditModalFor(user);
      return;
    }

    if (action === "block" || action === "unblock") {
      const willBlock = action === "block";
      const confirmMsg = willBlock ? `¿Estás seguro de bloquear a ${user.username}?` : `¿Estás seguro de desbloquear a ${user.username}?`;
      if (!confirm(confirmMsg)) return;
      try {
        await apiFetch(`/auth/users/${userId}/${willBlock ? 'block' : 'unblock'}`, "PUT");
        alert(`Usuario ${willBlock ? 'bloqueado' : 'desbloqueado'} exitosamente`);
        await loadUsers();
      } catch (err) {
        console.error(err);
        alert(`Error: ${err.message || err}`);
      }
      return;
    }

    if (action === "inspect") {
      if (!confirm(`¿Quieres iniciar sesión como ${user.username}?`)) return;
      try {
        const { token } = await apiFetch(`/auth/login-as/${userId}`, "POST");
        setToken(token);
        alert("Iniciando sesión como el usuario seleccionado...");
        window.location.href = "categories.html";
      } catch (err) {
        console.error(err);
        alert(`Error: ${err.message || err}`);
      }
      return;
    }

    if (action === "delete") {
      if (user.tipo === 3) {
        alert("No se puede eliminar a un super administrador.");
        return;
      }
      const confirmDelete = confirm(`⚠️ ¿Deseas ELIMINAR permanentemente a ${user.username}? Esta acción NO se puede deshacer.`);
      if (!confirmDelete) return;
      const finalConfirm = prompt(`Para confirmar, escribe exactamente: ${user.username}`);
      if (finalConfirm !== user.username) {
        alert("Eliminación cancelada. El nombre no coincide.");
        return;
      }
      try {
        await apiFetch(`/auth/users/${userId}`, "DELETE");
        alert("Usuario eliminado exitosamente");
        await loadUsers();
      } catch (err) {
        console.error(err);
        alert(`Error: ${err.message || err}`);
      }
      return;
    }
  });
}

/* ------------------- Modal helpers ------------------- */
function openEditModalFor(user) {
  const modal = document.getElementById("editModal");
  if (!modal) return;
  document.getElementById("editUserId").value = user._id;
  document.getElementById("editName").value = user.name || '';
  document.getElementById("editUsername").value = user.username || '';
  document.getElementById("editPassword").value = '';
  document.getElementById("editTipo").value = user.tipo || 1;
  modal.style.display = "block";
  recalcPadding();
}

function openAddModal() {
  const modal = document.getElementById("addModal");
  if (!modal) return;
  document.getElementById("addForm").reset();
  modal.style.display = "block";
  recalcPadding();
}

function closeEditModal() {
  const modal = document.getElementById("editModal");
  if (!modal) return;
  modal.style.display = "none";
  recalcPadding();
}

function closeAddModal() {
  const modal = document.getElementById("addModal");
  if (!modal) return;
  modal.style.display = "none";
  recalcPadding();
}

function recalcPadding() {
  const header = document.querySelector(".header");
  const container = document.querySelector(".admin-container");
  if (!header || !container) return;
  const headerHeight = header.getBoundingClientRect().height;
  const base = parseFloat(container.dataset.basePaddingTop || window.getComputedStyle(container).paddingTop || 0) || 0;
  container.style.paddingTop = `${base + headerHeight + 12}px`;
}

/* ------------------- Form handlers ------------------- */
async function handleEditUser(event) {
  event.preventDefault();
  const userId = document.getElementById("editUserId").value;
  const name = document.getElementById("editName").value.trim();
  const username = document.getElementById("editUsername").value.trim();
  const password = document.getElementById("editPassword").value.trim();
  const tipo = parseInt(document.getElementById("editTipo").value, 10);

  if (!name || !username) {
    alert("Por favor completa los campos obligatorios.");
    return;
  }

  try {
    const body = { name, username, tipo };
    if (password) body.password = password;
    await apiFetch(`/auth/users/${userId}`, "PUT", body);
    alert("Usuario actualizado exitosamente");
    closeEditModal();
    await loadUsers();
  } catch (err) {
    console.error(err);
    alert(`Error: ${err.message || err}`);
  }
}

async function handleAddUser(event) {
  event.preventDefault();
  const name = document.getElementById("addName").value.trim();
  const username = document.getElementById("addUsername").value.trim();
  const password = document.getElementById("addPassword").value.trim();
  const tipo = parseInt(document.getElementById("addTipo").value, 10);

  if (!name || !username || !password) {
    alert("Por favor, completa todos los campos.");
    return;
  }
  if (password.length < 6) {
    alert("La contraseña debe tener al menos 6 caracteres.");
    return;
  }

  try {
    await apiFetch("/auth/register", "POST", { name, username, password, tipo });
    alert("Usuario creado exitosamente");
    closeAddModal();
    await loadUsers();
  } catch (err) {
    console.error(err);
    alert(`Error: ${err.message || err}`);
  }
}

/* ------------------- Scroll to top ------------------- */
function setupScrollToTop() {
  const btn = document.getElementById("scrollToTop");
  window.addEventListener("scroll", () => {
    if (window.pageYOffset > 300) btn.classList.add("show"); else btn.classList.remove("show");
  });
  btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}

/* ------------------- Setup event listeners ------------------- */
function setupEventListeners() {
  const logoutBtn = document.getElementById("logoutBtn");
  const addUserBtn = document.getElementById("addUserBtn");

  logoutBtn.addEventListener("click", () => {
    if (!confirm("¿Estás seguro de que quieres cerrar sesión?")) return;
    logout();
  });

  addUserBtn.addEventListener("click", () => openAddModal());

  document.getElementById("closeModal").addEventListener("click", closeEditModal);
  document.getElementById("closeAddModal").addEventListener("click", closeAddModal);
  document.getElementById("cancelEdit").addEventListener("click", closeEditModal);
  document.getElementById("cancelAdd").addEventListener("click", closeAddModal);

  document.getElementById("editForm").addEventListener("submit", handleEditUser);
  document.getElementById("addForm").addEventListener("submit", handleAddUser);

  window.addEventListener("click", (e) => {
    if (e.target.classList && e.target.classList.contains("modal")) {
      closeEditModal();
      closeAddModal();
    }
  });

  const modals = document.querySelectorAll(".modal");
  modals.forEach(mod => {
    mod.addEventListener("transitionend", recalcPadding);
    mod.addEventListener("animationend", recalcPadding);
  });

  attachUsersGridHandlers();
  injectCardLayoutStyles();
  addLayoutControls();
  setupScrollToTop();

  const grid = document.getElementById("usersGrid");
  const container = document.querySelector(".admin-container");
  const header = document.querySelector(".header");
  if (grid && container && header) {
    const mo = new MutationObserver(() => recalcPadding());
    mo.observe(grid, { childList: true, subtree: true });
  }
}

/* ------------------- Initial auth check & boot ------------------- */
document.addEventListener("DOMContentLoaded", async () => {
  enableStickyHeader();

  if (!isAuthenticated()) {
    alert("Sesión expirada. Redirigiendo al login...");
    window.location.href = "index.html";
    return;
  }

  const userInfo = getUserInfo();
  if (!userInfo || userInfo.tipo !== 3) {
    alert("Acceso denegado. Solo super administradores pueden acceder.");
    window.location.href = "index.html";
    return;
  }

  const userInfoEl = document.getElementById("userInfo");
  if (userInfoEl) {
    userInfoEl.textContent = `Logueado como: ${userInfo.username} (Super Admin) • ${new Date().toLocaleDateString()}`;
  }

  setupEventListeners();
  await loadUsers();
});

window.openAddModal = openAddModal;
window.openEditModalFor = (idOrUser) => {
  if (typeof idOrUser === "string") {
    const u = allUsers.find(x => x._id === idOrUser);
    if (u) openEditModalFor(u);
  } else if (typeof idOrUser === "object" && idOrUser !== null) {
    openEditModalFor(idOrUser);
  }
};