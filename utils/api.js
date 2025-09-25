import { getToken } from "./auth.js";

const API_URL = "https://losiones-1.onrender.com/api";

export async function apiFetch(endpoint, method = "GET", body = null, token = null) {
    const headers = { "Content-Type": "application/json" };

    // Si no se proporciona token, intentar obtenerlo del localStorage
    const authToken = token || getToken();
    
    if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
    }

    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : null,
        });

        // Si la respuesta no es JSON válido, manejarlo antes de intentar parsearlo
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            const text = await response.text();
            throw new Error(`Error inesperado: ${text}`);
        }

        const data = await response.json();

        if (!response.ok) {
            // Si es error de autenticación, solo limpiar el token, no redirigir automáticamente
            if (response.status === 401) {
                localStorage.removeItem("authToken");
            }
            throw new Error(data.error || "Error en la solicitud");
        }

        return data;
    } catch (error) {
        console.error("Error en apiFetch:", error.message);
        throw error;
    }
}