// Guardar token en localStorage
export function setToken(token) {
    localStorage.setItem("authToken", token);
}

// Obtener token del localStorage
export function getToken() {
    return localStorage.getItem("authToken");
}

// Eliminar token del localStorage
export function removeToken() {
    localStorage.removeItem("authToken");
}

// Verificar si hay un token válido
export function isAuthenticated() {
    const token = getToken();
    if (!token) return false;
    
    try {
        // Decodificar el payload del JWT para verificar si ha expirado
        const payload = JSON.parse(atob(token.split(".")[1]));
        const now = Date.now() / 1000;
        
        if (payload.exp < now) {
            removeToken();
            return false;
        }
        
        return true;
    } catch (error) {
        removeToken();
        return false;
    }
}

// Obtener información del usuario del token
export function getUserInfo() {
    const token = getToken();
    if (!token) return null;
    
    try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        return {
            id: payload.id,
            username: payload.username,
            tipo: payload.tipo
        };
    } catch (error) {
        return null;
    }
}