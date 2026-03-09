/**
 * Global Navigation System with Triple-Tap Gesture
 */

(function () {
    'use strict';

    // Configuration
    const TAP_THRESHOLD = 300; // ms between taps
    const TAP_COUNT_TARGET = 3;
    let lastTapTime = 0;
    let tapCount = 0;

    function init() {
        injectStyles();
        document.addEventListener('click', handleGlobalClick);
        document.addEventListener('touchstart', handleGlobalTouch, { passive: true });
        console.log('🎯 Global Navigation System Initialized (Triple-tap to open)');
    }

    function injectStyles() {
        if (document.getElementById('nav-global-styles')) return;
        const link = document.createElement('link');
        link.id = 'nav-global-styles';
        link.rel = 'stylesheet';
        link.href = 'css/navigation.css';
        document.head.appendChild(link);
    }

    function handleGlobalClick(e) {
        // Ignore if clicking oninteractive elements that aren't the backdrop
        if (e.target.closest('button, a, input, select, textarea') && !e.target.closest('.nav-modal-overlay')) return;

        processTap();
    }

    function handleGlobalTouch(e) {
        // Optional: specific touch logic if needed, but click usually handles it for mobile too
    }

    function processTap() {
        const currentTime = new Date().getTime();
        const tapGap = currentTime - lastTapTime;

        if (tapGap < TAP_THRESHOLD) {
            tapCount++;
        } else {
            tapCount = 1;
        }

        lastTapTime = currentTime;

        if (tapCount >= TAP_COUNT_TARGET) {
            openNavigation();
            tapCount = 0; // Reset
        }
    }

    function openNavigation() {
        if (document.getElementById('globalNavModal')) {
            const modal = document.getElementById('globalNavModal');
            modal.classList.add('show');
            return;
        }

        const isAdmin = localStorage.getItem('userType') === '2' || localStorage.getItem('userType') === '3';
        const isSuperAdmin = localStorage.getItem('userType') === '3';
        const currentPath = window.location.pathname.split('/').pop() || 'index.html';

        const overlay = document.createElement('div');
        overlay.id = 'globalNavModal';
        overlay.className = 'nav-modal-overlay';

        const navItems = [
            { href: 'categories.html', icon: 'fas fa-shopping-cart', text: 'Ventas' },
            { href: 'abonos.html', icon: 'fas fa-receipt', text: 'Abonos' },
            { href: 'vendidos.html', icon: 'fas fa-tags', text: 'Vendidos' },
            { href: 'historial.html', icon: 'fas fa-history', text: 'Historial' },
            { href: 'inventario.html', icon: 'fas fa-warehouse', text: 'Inventario' },
            { href: 'productos.html', icon: 'fas fa-box', text: 'Productos' },
            { href: 'liquidados.html', icon: 'fas fa-check-double', text: 'Liquidados' },
            { href: 'gastos.html', icon: 'fas fa-wallet', text: 'Gastos' },
            { href: 'liquidacion.html', icon: 'fas fa-cash-register', text: 'Liquidación' },
            { href: 'historial-liquidaciones.html', icon: 'fas fa-list-alt', text: 'His. Liq.' }
        ];

        const adminItems = [
            { href: 'admin.html', icon: 'fas fa-user-cog', text: 'Admin' },
            { href: 'GestorVendedores.html', icon: 'fas fa-users-cog', text: 'Vendedores' },
            { href: 'inspeccion-liquidacion.html', icon: 'fas fa-search-dollar', text: 'Inspección' },
            { href: 'saleDetails.html', icon: 'fas fa-info-circle', text: 'Detalles' },
            { href: 'fix-liquidations.html', icon: 'fas fa-tools', text: 'Fix Liq.' }
        ];

        let navHtml = '';

        // Filter out current page and "Recibos" (already absent from arrays)
        navItems.forEach(item => {
            if (item.href !== currentPath) {
                navHtml += `
                    <a href="${item.href}" class="nav-item">
                        <i class="${item.icon}"></i>
                        <span>${item.text}</span>
                    </a>`;
            }
        });

        if (isAdmin) {
            adminItems.forEach(item => {
                if (item.href !== currentPath) {
                    navHtml += `
                        <a href="${item.href}" class="nav-item admin-exclusive">
                            <i class="${item.icon}"></i>
                            <span>${item.text}</span>
                        </a>`;
                }
            });
        }

        if (isSuperAdmin && currentPath !== 'superAdmin.html') {
            navHtml += `
                <a href="superAdmin.html" class="nav-item admin-exclusive">
                    <i class="fas fa-user-shield"></i>
                    <span>Super Admin</span>
                </a>`;
        }

        overlay.innerHTML = `
            <div class="nav-modal-content">
                <div class="nav-header">
                    <h2>Navegación Global</h2>
                    <p>Selecciona un destino</p>
                </div>
                <div class="nav-grid">
                    ${navHtml}
                    <a href="#" class="nav-item logout" onclick="handleLogout(event)">
                        <i class="fas fa-sign-out-alt"></i>
                        <span>Salir</span>
                    </a>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Animation
        setTimeout(() => overlay.classList.add('show'), 10);

        // Close logic
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeNavigation();
        });

        // Prevention of multiple initializations
        window.handleLogout = async function (e) {
            e.preventDefault();
            if (typeof window.showConfirm === 'function') {
                if (await window.showConfirm('¿Estás seguro de que deseas cerrar sesión?')) {
                    performLogout();
                }
            } else if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
                performLogout();
            }
        };
    }

    function closeNavigation() {
        const modal = document.getElementById('globalNavModal');
        if (modal) {
            modal.classList.remove('show');
        }
    }

    function performLogout() {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = 'index.html';
    }

    // Export close function to window for programmatic use
    window.closeGlobalNav = closeNavigation;

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
