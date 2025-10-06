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
// GASTOS
if (url.includes('/api/expenses') && !url.includes('/vendedor/')) {
    const baseUrl = url.split('/api/expenses')[0];
    const pathAfter = url.split('/api/expenses')[1] || '';
    const method = options?.method || 'GET';
    
    // GET: Redirigir a /vendedor/:id
    if (method === 'GET' && (!pathAfter || pathAfter === '' || pathAfter === '/')) {
        url = `${baseUrl}/api/expenses/vendedor/${vendedorId}`;
        console.log('📊 Redirigiendo gastos del vendedor (GET):', url);
    }
    // POST: Redirigir a /vendedor/:id/new
    else if (method === 'POST' && (!pathAfter || pathAfter === '' || pathAfter === '/')) {
        url = `${baseUrl}/api/expenses/vendedor/${vendedorId}/new`;
        console.log('📊 Redirigiendo creación de gasto (POST):', url);
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
// VENTAS
if (url.includes('/api/sales') && !url.includes('/vendedor/')) {
    const baseUrl = url.split('/api/sales')[0];
    const pathAfter = url.split('/api/sales')[1] || '';
    
    // Manejar específicamente el endpoint de ventas liquidadas
    if (pathAfter === '/settled' || pathAfter.startsWith('/settled')) {
        url = `${baseUrl}/api/sales/vendedor/${vendedorId}/settled`;
        console.log('✅ Redirigiendo ventas liquidadas del vendedor:', url);
    }
    // Otras rutas de ventas (excepto /new y /payment)
    else if (!url.includes('/new') && !url.includes('/payment')) {
        if (!pathAfter || pathAfter === '' || pathAfter === '/') {
            url = `${baseUrl}/api/sales/vendedor/${vendedorId}`;
            console.log('📄 Redirigiendo ventas del vendedor:', url);
        }
    }
}

            // LIQUIDACIONES
if (url.includes('/api/liquidation') && !url.includes('/vendedor/')) {
    const baseUrl = url.split('/api/liquidation')[0];
    const pathAfter = url.split('/api/liquidation')[1] || '';
    
    // GET: Redirigir rutas de consulta
    if (!pathAfter || pathAfter === '' || pathAfter === '/' || 
        pathAfter === '/history' || pathAfter === '/pending') {
        
        if (pathAfter === '/history') {
            url = `${baseUrl}/api/liquidation/vendedor/${vendedorId}/history`;
            console.log('📊 Redirigiendo historial de liquidaciones:', url);
        } else if (pathAfter === '/pending') {
            url = `${baseUrl}/api/liquidation/vendedor/${vendedorId}/pending`;
            console.log('📊 Redirigiendo liquidaciones pendientes:', url);
        }
    }
    // POST: Redirigir creación (ya lo tienes en liquidacion.js pero por si acaso)
    else if (pathAfter === '/new' || pathAfter === '/create') {
        url = `${baseUrl}/api/liquidation/vendedor/${vendedorId}/new`;
        console.log('📊 Redirigiendo creación de liquidación:', url);
    }
}

if (url.includes('/api/receipts') && !url.includes('userId=')) {
    const baseUrl = url.split('/api/receipts')[0];
    const pathAfter = url.split('/api/receipts')[1] || '';
    
    // Solo interceptar GET (lectura de recibos)
    const method = options?.method || 'GET';
    if (method === 'GET' && (!pathAfter || pathAfter === '' || pathAfter === '/')) {
        // Agregar userId como query parameter
        url = `${baseUrl}/api/receipts?userId=${vendedorId}`;
        console.log('🧾 Redirigiendo recibos del vendedor:', url);
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