import { apiFetch } from "../utils/api.js";
import { setToken } from "../utils/auth.js";

async function loadUsers() {
  try {
    const users = await apiFetch("/users", "GET");
    const tbody = document.querySelector("#usersTable tbody");
    tbody.innerHTML = "";

    users.forEach(u => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${u._id}</td>
        <td>${u.name}</td>
        <td>${u.username}</td>
        <td>
          <button data-id="${u._id}" class="block">Bloquear</button>
          <button data-id="${u._id}" class="unblock">Desbloquear</button>
          <button data-id="${u._id}" class="inspect">Inspeccionar</button>
        </td>`;
      tbody.appendChild(tr);
    });

    tbody.addEventListener("click", async e => {
      const id = e.target.dataset.id;
      if (!id) return;

      if (e.target.classList.contains("block")) {
        await apiFetch(`/users/${id}/block`, "PUT");
        alert("Usuario bloqueado");
      }
      if (e.target.classList.contains("unblock")) {
        await apiFetch(`/users/${id}/unblock`, "PUT");
        alert("Usuario desbloqueado");
      }
      if (e.target.classList.contains("inspect")) {
        const { token } = await apiFetch(`/auth/login-as/${id}`, "POST");
        setToken(token);
        location.href = "categories.html";
      }
    });
  } catch (err) {
    console.error(err);
    alert("Error cargando usuarios");
  }
}

loadUsers();