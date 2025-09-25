import { apiFetch } from "../utils/api.js";
import { setToken } from "../utils/auth.js";
import "../keepAlive.js";

async function handleLogin(event) {
  event.preventDefault();

  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value.trim();

  try {
    const response = await apiFetch("/auth/login", "POST", { username, password });
    setToken(response.token);

    const payload = JSON.parse(atob(response.token.split(".")[1]));
    if (payload.tipo === 3) {
      window.location.href = "superAdmin.html";
      return;
    }
    window.location.href = "categories.html";
  } catch (error) {
    alert(`Error al iniciar sesión: ${error.message}`);
    console.error("Error en el login", error);
  }
}

document.getElementById("loginForm").addEventListener("submit", handleLogin);