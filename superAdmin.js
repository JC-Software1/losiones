import { apiFetch } from "../utils/api.js";
import { setToken, getToken, isAuthenticated, getUserInfo, logout } from "../utils/auth.js";

let allUsers = [];

// Verificar autenticación al cargar la página
document.addEventListener("DOMContentLoaded", () => {
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

    // Mostrar información del usuario
    document.getElementById("userInfo").textContent = 
        `Logueado como: ${userInfo.username} (Super Admin) • ${new Date().toLocaleDateString()}`;

    // Configurar event listeners
    setupEventListeners();
    
    // Cargar usuarios
    loadUsers();
});

function setupEventListeners() {
    // Botón de logout
    document.getElementById("logoutBtn").addEventListener("click", () => {
        if (confirm("¿Estás seguro de que quieres cerrar sesión?")) {
            logout();
        }
    });

    // Botón agregar usuario
    document.getElementById("addUserBtn").addEventListener("click", () => {
        openAddModal();
    });

    // Modales
    document.getElementById("closeModal").addEventListener("click", closeEditModal);
    document.getElementById("closeAddModal").addEventListener("click", closeAddModal);
    document.getElementById("cancelEdit").addEventListener("click", closeEditModal);
    document.getElementById("cancelAdd").addEventListener("click", closeAddModal);

    // Formularios
    document.getElementById("editForm").addEventListener("submit", handleEditUser);
    document.getElementById("addForm").addEventListener("submit", handleAddUser);

    // Cerrar modales al hacer click fuera
    window.addEventListener("click", (e) => {
        if (e.target.classList.contains("modal")) {
            closeEditModal();
            closeAddModal();
        }
    });
}

async function loadUsers() {
    try {
        console.log("Cargando usuarios...");
        
        const users = await apiFetch("/auth/users", "GET");
        allUsers = users;
        
        renderUsers(users);
        updateUserCount(users.length);
    } catch (err) {
        console.error("Error cargando usuarios:", err);
        alert(`Error cargando usuarios: ${err.message}`);
    }
}

function renderUsers(users) {
    const grid = document.getElementById("usersGrid");
    grid.innerHTML = "";

    if (users.length === 0) {
        grid.innerHTML = '<div style="text-align: center; padding: 40px; color: #7f8c8d;">No hay usuarios registrados</div>';
        return;
    }

    users.forEach(user => {
        const userCard = createUserCard(user);
        grid.appendChild(userCard);
    });
}

function createUserCard(user) {
    const div = document.createElement("div");
    div.className = "user-card";
    
    const userTypeText = user.tipo === 3 ? 'Super Admin' : user.tipo === 2 ? 'Admin' : 'Usuario';
    const userTypeClass = user.tipo === 3 ? 'type-superadmin' : user.tipo === 2 ? 'type-admin' : 'type-user';
    const statusClass = user.bloqueado ? 'status-blocked' : 'status-active';
    const statusText = user.bloqueado ? '🔒 Bloqueado' : '✅ Activo';
    
    const firstLetter = (user.name || user.username || 'U').charAt(0).toUpperCase();
    
    div.innerHTML = `
        <div class="user-header">
            <div class="user-avatar">${firstLetter}</div>
            <div>
                <div class="user-status ${statusClass}">${statusText}</div>
                <div class="user-type ${userTypeClass}">${userTypeText}</div>
            </div>
        </div>
        
        <div class="user-info-grid">
            <div class="user-field">
                <div class="field-label">Nombre Completo</div>
                <div class="field-value">${user.name || 'Sin nombre'}</div>
            </div>
            
            <div class="user-field">
                <div class="field-label">Usuario</div>
                <div class="field-value">${user.username}</div>
            </div>
            
            <div class="user-field">
                <div class="field-label">ID de Sistema</div>
                <div class="field-value" style="font-family: monospace; font-size: 12px;">${user._id}</div>
            </div>
            
            <div class="user-field">
                <div class="field-label">Fecha de Registro</div>
                <div class="field-value">${user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'No disponible'}</div>
            </div>
        </div>
        
        <div class="user-actions">
            <button class="btn-sm btn-edit" onclick="editUser('${user._id}')">
                ✏️ Editar
            </button>
            <button class="btn-sm ${user.bloqueado ? 'btn-unblock' : 'btn-block'}" 
                    onclick="toggleUserBlock('${user._id}', ${user.bloqueado})"
                    ${user.tipo === 3 ? 'disabled title="No se puede bloquear a un super admin"' : ''}>
                ${user.bloqueado ? '🔓 Desbloquear' : '🔒 Bloquear'}
            </button>
            <button class="btn-sm btn-inspect" onclick="inspectUser('${user._id}')">
                🔍 Inspeccionar
            </button>
        </div>
    `;
    
    return div;
}

function updateUserCount(count) {
    const activeUsers = allUsers.filter(u => !u.bloqueado).length;
    const blockedUsers = allUsers.filter(u => u.bloqueado).length;
    
    document.getElementById("userCount").innerHTML = `
        <span style="color: #2ecc71;">✅ ${activeUsers} activos</span> • 
        <span style="color: #e74c3c;">🔒 ${blockedUsers} bloqueados</span> • 
        <span style="color: #3498db;">📊 ${count} total</span>
    `;
}

// Funciones globales (llamadas desde onclick)
window.editUser = function(userId) {
    const user = allUsers.find(u => u._id === userId);
    if (!user) return;
    
    document.getElementById("editUserId").value = user._id;
    document.getElementById("editName").value = user.name || '';
    document.getElementById("editUsername").value = user.username;
    document.getElementById("editPassword").value = '';
    document.getElementById("editTipo").value = user.tipo;
    
    document.getElementById("editModal").style.display = "block";
};

window.toggleUserBlock = async function(userId, isBlocked) {
    const user = allUsers.find(u => u._id === userId);
    if (!user) return;
    
    const action = isBlocked ? 'desbloquear' : 'bloquear';
    const endpoint = isBlocked ? 'unblock' : 'block';
    
    if (!confirm(`¿Estás seguro de que quieres ${action} a ${user.username}?`)) return;
    
    try {
        await apiFetch(`/auth/users/${userId}/${endpoint}`, "PUT");
        alert(`Usuario ${action}do exitosamente`);
        loadUsers(); // Recargar usuarios
    } catch (err) {
        console.error(`Error al ${action} usuario:`, err);
        alert(`Error: ${err.message}`);
    }
};

window.inspectUser = async function(userId) {
    const user = allUsers.find(u => u._id === userId);
    if (!user) return;
    
    if (!confirm(`¿Quieres iniciar sesión como ${user.username}?`)) return;
    
    try {
        const { token } = await apiFetch(`/auth/login-as/${userId}`, "POST");
        setToken(token);
        alert("Iniciando sesión como el usuario seleccionado...");
        window.location.href = "categories.html";
    } catch (err) {
        console.error("Error al inspeccionar usuario:", err);
        alert(`Error: ${err.message}`);
    }
};

function openAddModal() {
    document.getElementById("addForm").reset();
    document.getElementById("addModal").style.display = "block";
}

function closeEditModal() {
    document.getElementById("editModal").style.display = "none";
}

function closeAddModal() {
    document.getElementById("addModal").style.display = "none";
}

async function handleEditUser(event) {
    event.preventDefault();
    
    const userId = document.getElementById("editUserId").value;
    const name = document.getElementById("editName").value.trim();
    const username = document.getElementById("editUsername").value.trim();
    const password = document.getElementById("editPassword").value.trim();
    const tipo = parseInt(document.getElementById("editTipo").value);
    
    if (!name || !username) {
        alert("Por favor, completa todos los campos obligatorios.");
        return;
    }
    
    try {
        const updateData = { name, username, tipo };
        if (password) {
            updateData.password = password;
        }
        
        await apiFetch(`/auth/users/${userId}`, "PUT", updateData);
        
        alert("Usuario actualizado exitosamente");
        closeEditModal();
        loadUsers();
    } catch (err) {
        console.error("Error al actualizar usuario:", err);
        alert(`Error: ${err.message}`);
    }
}

async function handleAddUser(event) {
    event.preventDefault();
    
    const name = document.getElementById("addName").value.trim();
    const username = document.getElementById("addUsername").value.trim();
    const password = document.getElementById("addPassword").value.trim();
    const tipo = parseInt(document.getElementById("addTipo").value);
    
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
        loadUsers();
    } catch (err) {
        console.error("Error al crear usuario:", err);
        alert(`Error: ${err.message}`);
    }
}