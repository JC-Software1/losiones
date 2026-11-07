import { getToken } from './auth.js';

const API_URL = 'https://losiones-fjt0.onrender.com/api/auth';

// Cache de permisos del usuario
let permisosUsuario = null;
let tipoUsuario = null;

// Cargar permisos del usuario actual
export async function cargarPermisos() {
    try {
        const token = getToken();
        if (!token) {
            console.error('No hay token disponible');
            return null;
        }

        const response = await fetch(`${API_URL}/mis-permisos`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Error al cargar permisos');
        }

        const data = await response.json();
        permisosUsuario = data.permisosDetallados || {};
        tipoUsuario = data.tipo;

        console.log('Permisos cargados:', permisosUsuario);
        return data;
    } catch (error) {
        console.error('Error cargando permisos:', error);
        return null;
    }
}

// Verificar si el usuario tiene un permiso específico
export function tienePermiso(permiso) {
    // Admin y jefes tienen todos los permisos
    if (tipoUsuario === 2 || tipoUsuario === 3) {
        return true;
    }

    // Verificar si el permiso existe en los permisos del usuario
    return permisosUsuario && permisosUsuario[permiso] === true;
}

// Ocultar elementos que requieren permisos
export function aplicarRestricciones() {
    // Productos
    if (!tienePermiso('crearProductos')) {
        ocultarElemento('#btnAddProduct', 'button');
        ocultarElemento('[data-action="create-product"]');
    }
    
    if (!tienePermiso('editarProductos')) {
        ocultarElemento('.btn-edit-product');
        deshabilitarElemento('.btn-edit-product');
    }
    
    if (!tienePermiso('eliminarProductos')) {
        ocultarElemento('.btn-delete-product');
    }
    
    if (!tienePermiso('marcarVendido')) {
        ocultarElemento('.btn-mark-sold');
    }

    // Ventas
    if (!tienePermiso('crearVentas')) {
        ocultarElemento('#btnAddSale', 'button');
        ocultarElemento('[data-action="create-sale"]');
    }
    
    if (!tienePermiso('editarVentas')) {
        ocultarElemento('.btn-edit-sale');
        deshabilitarElemento('.btn-edit-sale');
    }
    
    if (!tienePermiso('eliminarVentas')) {
        ocultarElemento('.btn-delete-sale');
    }
    
    if (!tienePermiso('agregarAbonos')) {
        ocultarElemento('.btn-add-payment');
        ocultarElemento('[data-action="add-payment"]');
    }
    
    if (!tienePermiso('eliminarAbonos')) {
        ocultarElemento('.btn-delete-payment');
    }
    
    if (!tienePermiso('verVentasLiquidadas')) {
        ocultarElemento('#btnVerLiquidadas');
        ocultarElemento('[href*="liquidadas"]');
    }

    // Gastos
    if (!tienePermiso('crearGastos')) {
        ocultarElemento('#btnAddExpense', 'button');
        ocultarElemento('[data-action="create-expense"]');
    }
    
    if (!tienePermiso('editarGastos')) {
        ocultarElemento('.btn-edit-expense');
        deshabilitarElemento('.btn-edit-expense');
    }
    
    if (!tienePermiso('eliminarGastos')) {
        ocultarElemento('.btn-delete-expense');
    }

    // Liquidación
    if (!tienePermiso('realizarLiquidacion')) {
        ocultarElemento('#btnLiquidar');
        ocultarElemento('[data-action="liquidate"]');
    }
    
    if (!tienePermiso('verHistorialLiquidaciones')) {
        ocultarElemento('#btnHistorialLiquidaciones');
    }

    // Reportes
    if (!tienePermiso('verReportes')) {
        ocultarElemento('#btnReportes');
        ocultarElemento('[href*="reportes"]');
    }
    
    if (!tienePermiso('exportarReportes')) {
        ocultarElemento('.btn-export');
        ocultarElemento('[data-action="export"]');
    }
}

// Función auxiliar para ocultar elementos
function ocultarElemento(selector, tipo = 'any') {
    const elementos = document.querySelectorAll(selector);
    elementos.forEach(el => {
        if (tipo === 'any' || el.tagName.toLowerCase() === tipo) {
            el.style.display = 'none';
            el.setAttribute('data-hidden-by-permissions', 'true');
        }
    });
}

// Función auxiliar para deshabilitar elementos
function deshabilitarElemento(selector) {
    const elementos = document.querySelectorAll(selector);
    elementos.forEach(el => {
        el.disabled = true;
        el.style.opacity = '0.5';
        el.style.cursor = 'not-allowed';
        el.setAttribute('data-disabled-by-permissions', 'true');
        el.title = 'No tienes permisos para realizar esta acción';
    });
}

// Interceptar clicks en elementos sin permiso
export function interceptarAccionesSinPermiso() {
    document.addEventListener('click', (e) => {
        const target = e.target.closest('button, a, [data-action]');
        if (!target) return;

        // Verificar si el elemento está deshabilitado por permisos
        if (target.getAttribute('data-disabled-by-permissions') === 'true') {
            e.preventDefault();
            e.stopPropagation();
            mostrarAlertaPermiso();
            return false;
        }

        // Verificar acciones específicas
        const action = target.getAttribute('data-action');
        if (action) {
            const permisoRequerido = mapearAccionAPermiso(action);
            if (permisoRequerido && !tienePermiso(permisoRequerido)) {
                e.preventDefault();
                e.stopPropagation();
                mostrarAlertaPermiso();
                return false;
            }
        }
    }, true);
}

// Mapear acciones a permisos
function mapearAccionAPermiso(action) {
    const mapa = {
        'create-product': 'crearProductos',
        'edit-product': 'editarProductos',
        'delete-product': 'eliminarProductos',
        'mark-sold': 'marcarVendido',
        'create-sale': 'crearVentas',
        'edit-sale': 'editarVentas',
        'delete-sale': 'eliminarVentas',
        'add-payment': 'agregarAbonos',
        'delete-payment': 'eliminarAbonos',
        'create-expense': 'crearGastos',
        'edit-expense': 'editarGastos',
        'delete-expense': 'eliminarGastos',
        'liquidate': 'realizarLiquidacion',
        'export': 'exportarReportes'
    };
    return mapa[action];
}

// Mostrar alerta de permiso denegado
function mostrarAlertaPermiso() {
    // Crear alerta si no existe
    let alerta = document.getElementById('alerta-permiso-denegado');
    if (!alerta) {
        alerta = document.createElement('div');
        alerta.id = 'alerta-permiso-denegado';
        alerta.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #fee2e2;
            border: 2px solid #ef4444;
            color: #991b1b;
            padding: 16px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            display: none;
            align-items: center;
            gap: 12px;
            animation: slideIn 0.3s ease;
            max-width: 400px;
        `;
        alerta.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <div>
                <strong>Permiso Denegado</strong>
                <p style="margin: 4px 0 0 0; font-size: 14px;">No tienes permisos para realizar esta acción. Contacta a tu administrador.</p>
            </div>
        `;
        document.body.appendChild(alerta);
    }

    // Mostrar alerta
    alerta.style.display = 'flex';
    
    // Ocultar después de 4 segundos
    setTimeout(() => {
        alerta.style.display = 'none';
    }, 4000);
}

// Interceptar llamadas fetch para manejar errores 403
export function interceptarFetchPermisos() {
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
        try {
            const response = await originalFetch.apply(this, args);
            
            // Si es error 403 (sin permisos)
            if (response.status === 403) {
                const data = await response.json();
                mostrarAlertaPermiso();
                console.error('Permiso denegado:', data.error);
                throw new Error(data.error || 'No tienes permisos para esta acción');
            }
            
            return response;
        } catch (error) {
            throw error;
        }
    };
}

// Inicializar sistema de permisos
export async function inicializarPermisos() {
    await cargarPermisos();
    
    // Esperar a que el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            aplicarRestricciones();
            interceptarAccionesSinPermiso();
        });
    } else {
        aplicarRestricciones();
        interceptarAccionesSinPermiso();
    }
    
    interceptarFetchPermisos();
}

// Función para verificar permiso antes de ejecutar acción
export function verificarYEjecutar(permiso, callback) {
    if (tienePermiso(permiso)) {
        return callback();
    } else {
        mostrarAlertaPermiso();
        return false;
    }
}

// Exportar permisos para uso en otros módulos
export function obtenerPermisos() {
    return {
        permisos: permisosUsuario,
        tipo: tipoUsuario,
        esAdmin: tipoUsuario === 2 || tipoUsuario === 3
    };
}