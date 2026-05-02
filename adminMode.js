/* ============================================================
   SISTEMA DE MODO ADMINISTRADOR GLOBAL v2.0 (Persistente)
   - Detecta enlace de administrador desde el servidor
   - Sincroniza estado con la base de datos
   - Muestra banner informativo en todas las páginas
   - Compatible con todas las rutas del backend de forma automática
   ============================================================ */

(function() {
    'use strict';

    const API_URL = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
        ? 'http://localhost:5000/api/auth'
        : `${window.location.origin}/api/auth`;

    function getToken() {
        return localStorage.getItem('token');
    }

    function isAdminMode() {
        const adminMode = sessionStorage.getItem('adminMode');
        const vendedorId = sessionStorage.getItem('vendedorId');
        return adminMode === 'true' && vendedorId;
    }

    function getVendedorName() {
        return sessionStorage.getItem('vendedorName');
    }

    function showAdminBanner() {
        if (document.getElementById('adminModeBanner')) return;

        const vendedorName = getVendedorName();
        const banner = document.createElement('div');
        banner.id = 'adminModeBanner';
        banner.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
            color: white;
            padding: 12px 20px;
            text-align: center;
            z-index: 10000;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-weight: 600;
            font-size: 14px;
        `;
        
        banner.innerHTML = `
            <div style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 10px;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
                <span>MODO ADMINISTRADOR - Viendo datos de: ${vendedorName}</span>
            </div>
            <button onclick="window.exitAdminMode()" style="
                background: rgba(255,255,255,0.2);
                border: 1px solid rgba(255,255,255,0.3);
                color: white;
                padding: 6px 16px;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 600;
                font-size: 13px;
                transition: all 0.3s;
            " onmouseover="this.style.background='rgba(255,255,255,0.3)'" 
               onmouseout="this.style.background='rgba(255,255,255,0.2)'">
                Salir
            </button>
        `;
        
        document.body.insertBefore(banner, document.body.firstChild);
        
        const container = document.querySelector('.container');
        if (container) {
            container.style.paddingTop = '70px';
        }
    }

    window.exitAdminMode = async function() {
        try {
            const token = getToken();
            if (token) {
                await fetch(`${API_URL}/link-vendedor`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            }
        } catch (error) {
            console.error("Error al desenlazar en servidor:", error);
        }

        sessionStorage.removeItem('adminMode');
        sessionStorage.removeItem('vendedorId');
        sessionStorage.removeItem('vendedorName');
        window.location.href = 'GestorVendedores.html';
    };

    // SINCRONIZACIÓN CON EL SERVIDOR
    async function syncWithServer() {
        const token = getToken();
        if (!token) return;

        try {
            const response = await fetch(`${API_URL}/mis-permisos`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) return;

            const data = await response.json();
            
            // Si el servidor dice que estamos enlazados
            if (data.linkedVendedor) {
                sessionStorage.setItem('adminMode', 'true');
                sessionStorage.setItem('vendedorId', data.linkedVendedor._id);
                sessionStorage.setItem('vendedorName', data.linkedVendedor.name);
                showAdminBanner();
            } else {
                // Si no hay enlace en servidor pero sí en sesión, limpiar sesión (salvo que acabemos de iniciarla)
                if (isAdminMode()) {
                    // Solo limpiar si no estamos en GestorVendedores (donde se inicia el proceso)
                    if (!window.location.href.includes('GestorVendedores.html')) {
                        console.log("Sincronización: Limpiando modo admin (no enlazado en servidor)");
                        sessionStorage.removeItem('adminMode');
                        sessionStorage.removeItem('vendedorId');
                        sessionStorage.removeItem('vendedorName');
                        window.location.reload();
                    }
                }
            }
        } catch (error) {
            console.error("Error sync adminMode:", error);
        }
    }

    // Inicializar
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            syncWithServer();
        });
    } else {
        syncWithServer();
    }

    window.adminModeUtils = {
        isActive: isAdminMode,
        getVendedorId: () => sessionStorage.getItem('vendedorId'),
        getVendedorName: getVendedorName,
        exit: window.exitAdminMode,
        refresh: syncWithServer
    };

    console.log('✅ Sistema de modo administrador v2.0 inicializado');
})();