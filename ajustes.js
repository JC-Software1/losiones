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
            if (document.getElementById('matiasEnvironment')) document.getElementById('matiasEnvironment').value = config.environment || 'sandbox';
            if (document.getElementById('matiasNit')) document.getElementById('matiasNit').value = config.nit || '';
            if (document.getElementById('matiasDv')) document.getElementById('matiasDv').value = config.dv || '';
            if (document.getElementById('matiasNombreEmpresa')) document.getElementById('matiasNombreEmpresa').value = config.razonSocial || '';
            if (document.getElementById('matiasResolutionNumber')) document.getElementById('matiasResolutionNumber').value = config.resolutionNumber || '';
            if (document.getElementById('matiasPrefix')) document.getElementById('matiasPrefix').value = config.prefix || 'FEV';
            if (document.getElementById('matiasFrom')) document.getElementById('matiasFrom').value = config.from || '';
            if (document.getElementById('matiasTo')) document.getElementById('matiasTo').value = config.to || '';
            if (document.getElementById('matiasCurrentNumber')) document.getElementById('matiasCurrentNumber').value = config.currentNumber || '';
            
            localStorage.setItem('facturacionElectronicaActiva', enabled);
        }
    } catch (error) {
        console.error('Error al cargar ajustes:', error);
    }
}

window.saveSettings = async function() {
    const btn = document.querySelector('.btn-save');
    if (btn) btn.disabled = true;

    try {
        const enabled = document.getElementById('enableBilling').checked;
        const token = document.getElementById('apiToken') ? document.getElementById('apiToken').value.trim() : '';

        if (enabled && !token) {
            showNotification('Debe ingresar un token de API para activar la facturación', 'error');
            return;
        }

        const payload = {
            activo: enabled,
            token: token,
            environment: document.getElementById('matiasEnvironment') ? document.getElementById('matiasEnvironment').value : 'sandbox',
            nit: document.getElementById('matiasNit') ? document.getElementById('matiasNit').value.trim() : '',
            dv: document.getElementById('matiasDv') ? document.getElementById('matiasDv').value.trim() : '',
            razonSocial: document.getElementById('matiasNombreEmpresa') ? document.getElementById('matiasNombreEmpresa').value.trim() : '',
            resolutionNumber: document.getElementById('matiasResolutionNumber') ? document.getElementById('matiasResolutionNumber').value.trim() : '',
            prefix: document.getElementById('matiasPrefix') ? document.getElementById('matiasPrefix').value.trim() : 'FEV',
            from: document.getElementById('matiasFrom') ? parseInt(document.getElementById('matiasFrom').value) || 1 : 1,
            to: document.getElementById('matiasTo') ? parseInt(document.getElementById('matiasTo').value) || 1000 : 1000,
            currentNumber: document.getElementById('matiasCurrentNumber') ? parseInt(document.getElementById('matiasCurrentNumber').value) || 1 : 1
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
