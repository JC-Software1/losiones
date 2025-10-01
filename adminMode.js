/* ============================================================
   SISTEMA DE MODO ADMINISTRADOR GLOBAL
   - Detecta automáticamente si estás en modo admin
   - Redirige peticiones de ventas al vendedor seleccionado
   - Muestra banner informativo en todas las páginas
   - Compatible con tipo 2 (admin) y tipo 3 (superadmin)
   ============================================================ */

(function() {
    'use strict';

    // Verificar si estamos en modo administrador
    function isAdminMode() {
        const adminMode = sessionStorage.getItem('adminMode');
        const vendedorId = sessionStorage.getItem('vendedorId');
        return adminMode === 'true' && vendedorId;
    }

    // Obtener ID del vendedor actual
    function getVendedorId() {
        return sessionStorage.getItem('vendedorId');
    }

    // Obtener nombre del vendedor actual
    function getVendedorName() {
        return sessionStorage.getItem('vendedorName');
    }

    // Mostrar banner de modo administrador en todas las páginas
    function showAdminBanner() {
        // Evitar duplicados
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
        
        // Ajustar padding del contenido principal
        const container = document.querySelector('.container');
        if (container) {
            container.style.paddingTop = '70px';
        }
    }

    // Función global para salir del modo admin
    window.exitAdminMode = function() {
        sessionStorage.removeItem('adminMode');
        sessionStorage.removeItem('vendedorId');
        sessionStorage.removeItem('vendedorName');
        window.location.href = 'GestorVendedores.html';
    };

    // Interceptor de fetch para redirigir peticiones
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
        let [url, options] = args;

        // Si estamos en modo admin y es una petición de ventas
        if (isAdminMode() && typeof url === 'string') {
            const vendedorId = getVendedorId();

            // Redirigir peticiones de ventas al vendedor
            if (url.includes('/api/sales') && !url.includes('/vendedor/')) {
                // Excluir peticiones que ya son específicas de vendedor o nuevas ventas
                if (!url.includes('/new') && !url.includes('/payment')) {
                    // Convertir la URL para usar el endpoint del vendedor
                    const baseUrl = url.split('/api/sales')[0];
                    const pathAfterSales = url.split('/api/sales')[1] || '';
                    
                    // Si es GET sin parámetros adicionales, redirigir al vendedor
                    if (!pathAfterSales || pathAfterSales === '' || pathAfterSales === '/') {
                        url = `${baseUrl}/api/sales/vendedor/${vendedorId}`;
                        console.log('🔄 Redirigiendo a ventas del vendedor:', url);
                    }
                }
            }
        }

        return originalFetch(url, options);
    };

    // Inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            if (isAdminMode()) {
                showAdminBanner();
            }
        });
    } else {
        if (isAdminMode()) {
            showAdminBanner();
        }
    }

    // Exportar funciones útiles
    window.adminModeUtils = {
        isActive: isAdminMode,
        getVendedorId: getVendedorId,
        getVendedorName: getVendedorName,
        exit: window.exitAdminMode
    };

    console.log('✅ Sistema de modo administrador inicializado');
})();