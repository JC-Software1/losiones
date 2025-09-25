import { apiFetch } from "../utils/api.js";
import { setToken, getUserInfo } from "../utils/auth.js";
import "../keepAlive.js";

async function handleLogin(event) {
    event.preventDefault();

    const username = document.getElementById("loginUsername").value.trim();
    const password = document.getElementById("loginPassword").value.trim();

    if (!username || !password) {
        alert("Por favor, completa todos los campos.");
        return;
    }

    try {
        console.log("Iniciando sesión...");
        
        const response = await apiFetch("/auth/login", "POST", { username, password });
        
        // Guardar el token
        setToken(response.token);

        // Obtener información del usuario del token
        const userInfo = getUserInfo();
        
        console.log("Usuario logueado:", userInfo);

        // Redirigir según el tipo de usuario
        if (userInfo.tipo === 3) {
            console.log("Redirigiendo a super admin...");
            window.location.href = "superAdmin.html";
        } else {
            console.log("Redirigiendo a categorías...");
            window.location.href = "categories.html";
        }
    } catch (error) {
        console.error("Error en el login:", error);
        alert(`Error al iniciar sesión: ${error.message}`);
    }
}

document.getElementById("loginForm").addEventListener("submit", handleLogin);