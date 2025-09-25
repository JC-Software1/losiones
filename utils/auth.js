// Obtener el token del localStorage
export function getToken() {
    return localStorage.getItem("token");
}

// Guardar el token en localStorage
export function setToken(token) {
    localStorage.setItem("token", token);
}

//Eliminar el token del localStorage (Cierre de sesión)
export function clearToken() {
    localStorage.removeItem("token");
}
