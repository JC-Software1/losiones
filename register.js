import { apiFetch } from "../utils/api.js";

async function handleRegister(event) {
    event.preventDefault(); //Evitar recargar la página

    const name = document.getElementById("registerName").value.trim();
    const username = document.getElementById("registerUsername").value.trim();
    const password = document.getElementById("registerPassword").value.trim();

  try {
    //Llamar a la API
    const response = await apiFetch("/auth/register", "POST", {
        name,
        username,
        password,
        tipo: document.getElementById("registerTipo").value
    });

    alert("Registro exitoso, de click en aceptar");
    window.location.href = "index.html";
    }  catch (error) {
        alert(`Error en el registro: ${error.message}`);
        console.error("Error en registro:", error);
    }
}

document
    .getElementById("registerForm")
    .addEventListener("submit", handleRegister);