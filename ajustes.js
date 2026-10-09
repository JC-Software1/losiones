import { showNotification } from './utils/notifications.js';
import { apiFetch } from './utils/api.js';

document.addEventListener('DOMContentLoaded', () => {
    loadSettings();

    document.getElementById('enableBilling').addEventListener('change', (e) => {
        const configDiv = document.getElementById('billingConfig');
        if (configDiv) {
            configDiv.style.display = e.target.checked ? 'block' : 'none';
        }
    });
});

async function loadSettings() {
    try {
        const token = localStorage.getItem('token');
        const config = await apiFetch('/auth/config/matias', 'GET', null, token);
        
        if (config) {
            const enabled = config.activo || false;
            document.getElementById('enableBilling').checked = enabled;
            
            const configDiv = document.getElementById('billingConfig');
            if (configDiv) configDiv.style.display = enabled ? 'block' : 'none';

            if (document.getElementById('apiToken')) document.getElementById('apiToken').value = config.token || '';
            // Si el html original usa establecimiento y puntoEmision, lo mapeamos
            if (document.getElementById('establecimiento')) document.getElementById('establecimiento').value = config.prefix || 'FEV';
            if (document.getElementById('puntoEmision')) document.getElementById('puntoEmision').value = config.resolutionNumber || '18760000001';
            
            localStorage.setItem('facturacionElectronicaActiva', enabled);
        }
    } catch (error) {
        console.error('Error al cargar ajustes:', error);
    }
}

window.saveSettings = async function() {
    const btn = document.querySelector('.btn');
    if (btn) btn.disabled = true;

    try {
        const enabled = document.getElementById('enableBilling').checked;
        const token = document.getElementById('apiToken') ? document.getElementById('apiToken').value.trim() : '';
        const prefix = document.getElementById('establecimiento') ? document.getElementById('establecimiento').value.trim() : 'FEV';
        const resolutionNumber = document.getElementById('puntoEmision') ? document.getElementById('puntoEmision').value.trim() : '18760000001';

        if (enabled && !token) {
            showNotification('Debe ingresar un token de API para activar la facturación', 'error');
            return;
        }

        const payload = {
            activo: enabled,
            token: token,
            prefix: prefix || 'FEV',
            resolutionNumber: resolutionNumber || '18760000001'
        };

        const jwtToken = localStorage.getItem('token');
        await apiFetch('/auth/config/matias', 'PUT', payload, jwtToken);

        localStorage.setItem('facturacionElectronicaActiva', enabled);
        showNotification('Ajustes guardados correctamente', 'success');
    } catch (error) {
        console.error('Error al guardar ajustes:', error);
        showNotification('Error al guardar los ajustes', 'error');
    } finally {
        if (btn) btn.disabled = false;
    }
};
