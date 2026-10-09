import { showNotification } from './utils/notifications.js';

document.addEventListener('DOMContentLoaded', () => {
    // Check if user is admin or superadmin
    const userType = localStorage.getItem('userType');
    if (userType !== '2' && userType !== '3') {
        window.location.href = 'index.html';
        return;
    }

    loadSettings();

    document.getElementById('enableBilling').addEventListener('change', (e) => {
        const configDiv = document.getElementById('billingConfig');
        configDiv.style.display = e.target.checked ? 'block' : 'none';
    });
});

function loadSettings() {
    const enabled = localStorage.getItem('facturacionElectronicaActiva') === 'true';
    document.getElementById('enableBilling').checked = enabled;
    
    if (enabled) {
        document.getElementById('billingConfig').style.display = 'block';
    }

    document.getElementById('apiToken').value = localStorage.getItem('matiasApiKey') || '';
    document.getElementById('establecimiento').value = localStorage.getItem('matiasEstablecimiento') || '';
    document.getElementById('puntoEmision').value = localStorage.getItem('matiasPuntoEmision') || '';
}

window.saveSettings = function() {
    const enabled = document.getElementById('enableBilling').checked;
    const token = document.getElementById('apiToken').value.trim();
    const establecimiento = document.getElementById('establecimiento').value.trim();
    const puntoEmision = document.getElementById('puntoEmision').value.trim();

    if (enabled && !token) {
        showNotification('Debe ingresar un token de API para activar la facturación', 'error');
        return;
    }

    localStorage.setItem('facturacionElectronicaActiva', enabled);
    localStorage.setItem('matiasApiKey', token);
    localStorage.setItem('matiasEstablecimiento', establecimiento);
    localStorage.setItem('matiasPuntoEmision', puntoEmision);

    showNotification('Ajustes guardados correctamente', 'success');
};
