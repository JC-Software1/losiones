import { apiFetch } from "../utils/api.js";
import { setToken, getToken, isAuthenticated, getUserInfo } from "../utils/auth.js";

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

    loadUsers();
});

async function loadUsers() {
    try {
        console.log("Cargando usuarios...");
        
        const users = await apiFetch("/auth/users", "GET");
        const tbody = document.querySelector("#usersTable tbody");
        tbody.innerHTML = "";

        users.forEach(u => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${u._id}</td>
                <td>${u.name || 'Sin nombre'}</td>
                <td>${u.username}</td>
                <td>
                    <button data-id="${u._id}" class="block" ${u.bloqueado ? 'disabled' : ''}>
                        ${u.bloqueado ? 'Bloqueado' : 'Bloquear'}
                    </button>
                    <button data-id="${u._id}" class="unblock" ${!u.bloqueado ? 'disabled' : ''}>
                        ${u.bloqueado ? 'Desbloquear' : 'Desbloqueado'}
                    </button>
                    <button data-id="${u._id}" class="inspect">Inspeccionar</button>
                </td>`;
            tbody.appendChild(tr);
        });

        tbody.addEventListener("click", handleUserAction);
    } catch (err) {
        console.error("Error cargando usuarios:", err);
        alert(`Error cargando usuarios: ${err.message}`);
    }
}

async function handleUserAction(e) {
    const id = e.target.dataset.id;
    if (!id) return;

    try {
        if (e.target.classList.contains("block")) {
            await apiFetch(`/auth/users/${id}/block`, "PUT");
            alert("Usuario bloqueado exitosamente");
            loadUsers(); // Recargar la tabla
        }
        
        if (e.target.classList.contains("unblock")) {
            await apiFetch(`/auth/users/${id}/unblock`, "PUT");
            alert("Usuario desbloqueado exitosamente");
            loadUsers(); // Recargar la tabla
        }
        
        if (e.target.classList.contains("inspect")) {
            const { token } = await apiFetch(`/auth/login-as/${id}`, "POST");
            setToken(token);
            alert("Iniciando sesión como el usuario seleccionado...");
            window.location.href = "categories.html";
        }
    } catch (err) {
        console.error("Error en acción de usuario:", err);
        alert(`Error: ${err.message}`);
    }
}