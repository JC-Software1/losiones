/* ============================================================
   SISTEMA DE MODO ADMINISTRADOR GLOBAL
   - Detecta automáticamente si estás en modo admin
   - Redirige peticiones al vendedor seleccionado
   - Muestra banner informativo en todas las páginas
   - Compatible con tipo 2 (admin) y tipo 3 (superadmin)
   ============================================================ */

(function() {
    'use strict';

    function isAdminMode() {
        const adminMode = sessionStorage.getItem('adminMode');
        const vendedorId = sessionStorage.getItem('vendedorId');
        return adminMode === 'true' && vendedorId;
    }

    function getVendedorId() {
        return sessionStorage.getItem('vendedorId');
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

    window.exitAdminMode = function() {
        sessionStorage.removeItem('adminMode');
        sessionStorage.removeItem('vendedorId');
        sessionStorage.removeItem('vendedorName');
        window.location.href = 'GestorVendedores.html';
    };

    // INTERCEPTOR DE FETCH
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
        let [url, options] = args;

        if (isAdminMode() && typeof url === 'string') {
            const vendedorId = getVendedorId();

            // GASTOS
            if (url.includes('/api/expenses') && !url.includes('/vendedor/')) {
                const baseUrl = url.split('/api/expenses')[0];
                const pathAfter = url.split('/api/expenses')[1] || '';
                
                // Solo redirigir GET sin parámetros o rutas específicas
                if (!pathAfter || pathAfter === '' || pathAfter === '/') {
                    url = `${baseUrl}/api/expenses/vendedor/${vendedorId}`;
                    console.log('📊 Redirigiendo gastos del vendedor:', url);
                }
            }

            // PRODUCTOS
            if (url.includes('/api/products') && !url.includes('/vendedor/')) {
                const baseUrl = url.split('/api/products')[0];
                const pathAfter = url.split('/api/products')[1] || '';
                
                if (!pathAfter || pathAfter === '' || pathAfter === '/' || pathAfter === '/last') {
                    url = `${baseUrl}/api/products/vendedor/${vendedorId}`;
                    console.log('📦 Redirigiendo productos del vendedor:', url);
                }
            }

            // LIQUIDACIONES
            if (url.includes('/api/liquidations') && !url.includes('/vendedor/')) {
                const baseUrl = url.split('/api/liquidations')[0];
                const pathAfter = url.split('/api/liquidations')[1] || '';
                
                if (pathAfter === '/pending' || pathAfter === '/history' || !pathAfter || pathAfter === '/') {
                    // Construir nueva URL con parámetro
                    if (pathAfter === '/pending') {
                        url = `${baseUrl}/api/liquidations/vendedor/${vendedorId}/pending`;
                    } else if (pathAfter === '/history') {
                        url = `${baseUrl}/api/liquidations/vendedor/${vendedorId}/history`;
                    } else {
                        url = `${baseUrl}/api/liquidations/vendedor/${vendedorId}`;
                    }
                    console.log('💰 Redirigiendo liquidaciones del vendedor:', url);
                }
            }

            // VENTAS
            if (url.includes('/api/sales') && !url.includes('/vendedor/')) {
                if (!url.includes('/new') && !url.includes('/payment')) {
                    const baseUrl = url.split('/api/sales')[0];
                    const pathAfter = url.split('/api/sales')[1] || '';
                    
                    if (!pathAfter || pathAfter === '' || pathAfter === '/' || pathAfter === '/settled') {
                        url = `${baseUrl}/api/sales/vendedor/${vendedorId}`;
                        console.log('🔄 Redirigiendo ventas del vendedor:', url);
                    }
                }
            }
        }

        return originalFetch(url, options);
    };

    // Inicializar
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

    window.adminModeUtils = {
        isActive: isAdminMode,
        getVendedorId: getVendedorId,
        getVendedorName: getVendedorName,
        exit: window.exitAdminMode
    };

    console.log('✅ Sistema de modo administrador inicializado');
})();