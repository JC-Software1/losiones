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

// Cerrar sesión (limpiar token y redirigir)
export function logout() {
    removeToken();
    window.location.href = "index.html";
}

// ======================================
// NUEVO: SISTEMA DE CIERRE AUTOMÁTICO
// ======================================

let inactivityTimer = null;
const INACTIVITY_TIME = 20 * 60 * 1000; // 20 minutos en milisegundos

// Función para cerrar sesión por inactividad
function logoutByInactivity() {
    console.log("Sesión cerrada por inactividad");
    removeToken();
    window.location.href = "index.html";
}

// Reiniciar el temporizador de inactividad
function resetInactivityTimer() {
    // Limpiar el temporizador anterior
    if (inactivityTimer) {
        clearTimeout(inactivityTimer);
    }
    
    // Crear nuevo temporizador
    inactivityTimer = setTimeout(logoutByInactivity, INACTIVITY_TIME);
}

// Iniciar el monitoreo de inactividad
export function startInactivityMonitor() {
    // Verificar que hay una sesión activa
    if (!isAuthenticated()) {
        return;
    }
    
    // Lista de eventos que se consideran "actividad"
    const events = [
        'mousedown',
        'mousemove',
        'keypress',
        'scroll',
        'touchstart',
        'click'
    ];
    
    // Agregar listeners para todos los eventos
    events.forEach(event => {
        document.addEventListener(event, resetInactivityTimer, true);
    });
    
    // Iniciar el temporizador por primera vez
    resetInactivityTimer();
}

// Detener el monitoreo de inactividad (útil al cerrar sesión manualmente)
export function stopInactivityMonitor() {
    if (inactivityTimer) {
        clearTimeout(inactivityTimer);
        inactivityTimer = null;
    }
    
    const events = [
        'mousedown',
        'mousemove',
        'keypress',
        'scroll',
        'touchstart',
        'click'
    ];
    
    events.forEach(event => {
        document.removeEventListener(event, resetInactivityTimer, true);
    });
}