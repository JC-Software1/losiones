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

function checkTechSupportAlert() {
    // 1. Verificar si ya fue cerrado
    if (localStorage.getItem('jc_tech_number_dismissed') === 'true') {
        return;
    }

    // 2. Verificar si hay token activo
    const token = localStorage.getItem('authToken');
    if (!token) {
        return;
    }

    // 3. No mostrar en páginas de login o registro
    const path = window.location.pathname.toLowerCase();
    const isLoginPage = path.endsWith('index.html') || 
                         path.endsWith('login.html') || 
                         path.endsWith('register.html') ||
                         path === '/' || 
                         path === '';
    if (isLoginPage) {
        return;
    }

    // 4. Crear estilos CSS de alta calidad (Glassmorphism & Gradients)
    const style = document.createElement('style');
    style.textContent = `
        @keyframes jc-fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes jc-scaleIn {
            from { 
                opacity: 0; 
                transform: translateY(20px) scale(0.95); 
            }
            to { 
                opacity: 1; 
                transform: translateY(0) scale(1); 
            }
        }
        @keyframes jc-pulseGlow {
            0% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.6); }
            70% { box-shadow: 0 0 0 12px rgba(99, 102, 241, 0); }
            100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
        }
        
        #jc-tech-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(15, 23, 42, 0.7);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            z-index: 999999;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            box-sizing: border-box;
            font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            animation: jc-fadeIn 0.3s ease-out forwards;
        }

        #jc-tech-modal {
            background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 24px;
            padding: 40px 30px;
            max-width: 480px;
            width: 100%;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 50px rgba(99, 102, 241, 0.2);
            text-align: center;
            animation: jc-scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
            box-sizing: border-box;
            position: relative;
        }

        .jc-tech-icon {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #6366f1 0%, #4338ca 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px;
            font-size: 36px;
            color: white;
            animation: jc-pulseGlow 2.5s infinite;
        }

        .jc-tech-title {
            color: #ffffff;
            font-size: 26px;
            font-weight: 800;
            margin-bottom: 12px;
            letter-spacing: -0.5px;
        }

        .jc-tech-desc {
            color: #94a3b8;
            font-size: 15px;
            line-height: 1.6;
            margin-bottom: 28px;
        }

        .jc-tech-number-box {
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 16px;
            padding: 16px 20px;
            margin-bottom: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
        }

        .jc-tech-number {
            color: #ffffff;
            font-size: 24px;
            font-weight: 700;
            letter-spacing: 1px;
            font-family: monospace;
        }

        .jc-tech-btn-group {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .jc-tech-btn-whatsapp {
            background: linear-gradient(135deg, #22c55e 0%, #15803d 100%);
            color: white !important;
            border: none;
            border-radius: 14px;
            padding: 14px 24px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            text-decoration: none;
        }

        .jc-tech-btn-whatsapp:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(34, 197, 94, 0.4);
            filter: brightness(1.1);
        }

        .jc-tech-btn-whatsapp:active {
            transform: translateY(0);
        }

        .jc-tech-btn-dismiss {
            background: transparent;
            color: #94a3b8;
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 14px;
            padding: 12px 24px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .jc-tech-btn-dismiss:hover {
            background: rgba(255, 255, 255, 0.05);
            color: white;
            border-color: rgba(255, 255, 255, 0.3);
        }
    `;
    document.head.appendChild(style);

    // 5. Crear estructura del modal
    const overlay = document.createElement('div');
    overlay.id = 'jc-tech-overlay';

    const modal = document.createElement('div');
    modal.id = 'jc-tech-modal';

    modal.innerHTML = `
        <div class="jc-tech-icon">📞</div>
        <h2 class="jc-tech-title">Soporte Técnico JC</h2>
        <p class="jc-tech-desc">
            El servicio técnico de <span style="color: #a5b4fc; font-weight: 700;">JC</span> ha cambiado su número. Por favor, contáctanos a través de nuestra nueva línea oficial:
        </p>
        
        <div class="jc-tech-number-box">
            <span style="font-size: 22px;">📱</span>
            <span class="jc-tech-number">301 672 6199</span>
        </div>
        
        <div class="jc-tech-btn-group">
            <a href="https://wa.me/573016726199?text=Hola%20JC,%20necesito%20soporte%20t%C3%A9cnico" target="_blank" id="jc-tech-btn-wa" class="jc-tech-btn-whatsapp">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.003 5.324 5.328 0 11.859 0c3.161.001 6.136 1.233 8.375 3.474 2.238 2.24 3.468 5.216 3.468 8.381 0 6.533-5.325 11.858-11.857 11.858-2.004-.001-3.974-.509-5.719-1.48L0 24zm6.59-4.846c1.6.95 3.197 1.45 4.887 1.45 5.513 0 10.017-4.505 10.017-10.022s-4.505-10.02-10.017-10.02c-5.514 0-10.022 4.502-10.022 10.02 0 1.902.52 3.705 1.505 5.31l-.995 3.635 3.74-.98-.125-.193zm11.536-7.073c-.3-.149-1.777-.878-2.046-.977-.269-.099-.465-.149-.662.15-.197.297-.767.977-.94.177-.173-.199-.347-.397-.565-.595-.572-.51-1.282-1.096-1.961-1.683-.68-.586-1.3-1.12-1.92-1.758-.172-.18-.328-.359-.496-.538-.28-.299-.18-.46-.08-.559.088-.088.197-.228.297-.34.1-.11.133-.19.2-.32.066-.13.034-.25-.017-.35-.05-.1-.465-1.12-.638-1.54-.168-.41-.35-.35-.51-.36h-.434c-.17 0-.448.06-.682.312-.234.254-.892.874-.892 2.132 0 1.258.916 2.474 1.042 2.64.127.17 1.8 2.748 4.362 3.854.61.263 1.085.42 1.456.538.613.195 1.172.167 1.613.1.492-.074 1.778-.727 2.028-1.43.25-.702.25-1.303.175-1.43-.075-.127-.27-.226-.57-.375z"/>
                </svg>
                Contactar por WhatsApp
            </a>
            <button id="jc-tech-btn-dismiss" class="jc-tech-btn-dismiss">Entendido</button>
        </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // 6. Funciones de cierre
    const closeAlert = () => {
        overlay.style.opacity = '0';
        modal.style.transform = 'translateY(20px) scale(0.95)';
        modal.style.opacity = '0';
        setTimeout(() => {
            overlay.remove();
        }, 300);
        localStorage.setItem('jc_tech_number_dismissed', 'true');
    };

    document.getElementById('jc-tech-btn-dismiss').addEventListener('click', closeAlert);
    document.getElementById('jc-tech-btn-wa').addEventListener('click', closeAlert);
}

// Ejecutar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkTechSupportAlert);
} else {
    checkTechSupportAlert();
}
