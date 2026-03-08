/**
 * Sistema de Notificaciones Premium v1.0
 */

export function showNotification(message, type = 'info', title = '') {
    // Asegurar que existe el contenedor
    let container = document.querySelector('.notification-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'notification-container';
        document.body.appendChild(container);
    }

    // Crear la notificación
    const notification = document.createElement('div');
    notification.className = `premium-notification ${type}`;

    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-times-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };

    const titles = {
        success: '¡Éxito!',
        error: 'Error',
        warning: 'Atención',
        info: 'Información'
    };

    const displayTitle = title || titles[type];

    notification.innerHTML = `
        <div class="notification-icon">
            <i class="${icons[type]}"></i>
        </div>
        <div class="notification-content">
            <div class="notification-title">${displayTitle}</div>
            <div class="notification-message">${message}</div>
        </div>
        <div class="notification-progress">
            <div class="notification-progress-bar"></div>
        </div>
    `;

    container.appendChild(notification);

    // Animación de entrada
    setTimeout(() => {
        notification.classList.add('show');
        const progressBar = notification.querySelector('.notification-progress-bar');
        progressBar.style.transition = 'width 4s linear';
        progressBar.style.width = '100%';
    }, 10);

    // Auto-eliminar
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
            if (container.children.length === 0) {
                container.remove();
            }
        }, 500);
    }, 4000);
}

export function showConfirm(message, title = '¿Estás seguro?') {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'confirm-overlay';

        overlay.innerHTML = `
            <div class="confirm-box">
                <div class="confirm-icon">
                    <i class="fas fa-question-circle"></i>
                </div>
                <div class="confirm-title">${title}</div>
                <div class="confirm-message">${message}</div>
                <div class="confirm-buttons">
                    <button class="btn-confirm cancel">Cancelar</button>
                    <button class="btn-confirm accept">Confirmar</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Forzar reflow para animación
        overlay.offsetHeight;
        overlay.classList.add('show');

        const btnCancel = overlay.querySelector('.cancel');
        const btnAccept = overlay.querySelector('.accept');

        const close = (result) => {
            overlay.classList.remove('show');
            setTimeout(() => {
                overlay.remove();
                resolve(result);
            }, 300);
        };

        btnCancel.onclick = () => close(false);
        btnAccept.onclick = () => close(true);

        overlay.onclick = (e) => {
            if (e.target === overlay) close(false);
        };
    });
}

// Hacerla disponible globalmente
window.showNotification = showNotification;
window.showConfirm = showConfirm;
