import { isAuthenticated, startInactivityMonitor } from "./auth.js";

// Verificar autenticación e iniciar monitoreo de inactividad
function initAuthProtection() {
    if (!isAuthenticated()) {
        window.location.href = "index.html";
    } else {
        startInactivityMonitor();
    }
}

// Ejecutar automáticamente al cargar el módulo
initAuthProtection();

export { initAuthProtection };