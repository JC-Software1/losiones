import { apiFetch } from "../utils/api.js";
import { setToken, getUserInfo } from "../utils/auth.js";
import "../keepAlive.js";

// Función para mostrar modal de bloqueo
function mostrarModalBloqueo() {
    // Crear overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(10px);
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.3s ease;
    `;

    // Crear modal
    const modal = document.createElement('div');
    modal.style.cssText = `
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 24px;
        padding: 40px;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        text-align: center;
        animation: slideUp 0.4s ease;
        position: relative;
    `;

    modal.innerHTML = `
        <div style="
            width: 80px;
            height: 80px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px;
            font-size: 48px;
        ">
            🔒
        </div>
        
        <h2 style="
            color: white;
            font-size: 28px;
            font-weight: 800;
            margin-bottom: 16px;
            text-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
        ">
            Cuenta Suspendida
        </h2>
        
        <p style="
            color: rgba(255, 255, 255, 0.95);
            font-size: 18px;
            line-height: 1.6;
            margin-bottom: 32px;
            font-weight: 500;
        ">
            Su cuenta ha sido suspendida temporalmente.<br>
            Para más información, comuníquese con soporte:
        </p>
        
        <button id="contactarSoporteBtn" style="
            background: white;
            color: #667eea;
            border: none;
            border-radius: 16px;
            padding: 18px 40px;
            font-size: 18px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
            display: flex;
            align-items: center;
            gap: 12px;
            margin: 0 auto;
        ">
            <span style="font-size: 24px;">📱</span>
            Contactar por WhatsApp
        </button>

        <div style="
            margin-top: 24px;
            padding-top: 24px;
            border-top: 1px solid rgba(255, 255, 255, 0.2);
        ">
            <p style="
                color: rgba(255, 255, 255, 0.8);
                font-size: 16px;
                font-weight: 600;
            ">
                📞 3016726199
            </p>
        </div>
    `;

    // Agregar estilos de animación
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes slideUp {
            from { 
                opacity: 0;
                transform: translateY(30px) scale(0.9);
            }
            to { 
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }

        #contactarSoporteBtn:hover {
            transform: translateY(-3px);
            box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25);
            background: #f8f9fa;
        }

        #contactarSoporteBtn:active {
            transform: translateY(-1px);
        }
    `;
    document.head.appendChild(style);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Evento para el botón de WhatsApp
    document.getElementById('contactarSoporteBtn').addEventListener('click', () => {
        const telefono = '573016726199';
        const mensaje = encodeURIComponent('Hola, mi cuenta ha sido suspendida y necesito información sobre cómo reactivarla.');
        const urlWhatsApp = `https://wa.me/${telefono}?text=${mensaje}`;
        window.open(urlWhatsApp, '_blank');
    });

    // Prevenir cierre del modal haciendo click fuera
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            e.preventDefault();
            e.stopPropagation();
        }
    });
}

// Función para verificar bloqueo de usuario y vendedores
// Función para verificar bloqueo de usuario y su administrador
async function verificarBloqueosCompletos(username) {
    try {
        // Verificar si el usuario principal está bloqueado
        const responsePrincipal = await fetch('https://losiones-fjt0.onrender.com/api/auth/verificar-bloqueo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });

        const dataPrincipal = await responsePrincipal.json();

        if (dataPrincipal.bloqueado) {
            return { bloqueado: true, tipo: 'principal' };
        }

        // Verificar si su administrador está bloqueado
        const responseAdmin = await fetch(`https://losiones-fjt0.onrender.com/api/auth/verificar-admin-bloqueado/${username}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (responseAdmin.ok) {
            const adminData = await responseAdmin.json();
            if (adminData.adminBloqueado) {
                return { bloqueado: true, tipo: 'administrador' };
            }
        }

        return { bloqueado: false };
    } catch (error) {
        console.error('Error verificando bloqueos:', error);
        return { bloqueado: false };
    }
}

async function handleLogin(event) {
    event.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!username || !password) {
        showNotification("Por favor, completa todos los campos.", "warning");
        return;
    }

    try {
        // PRIMERO: Verificar si el usuario o su jefe están bloqueados
        const verificacionBloqueo = await verificarBloqueosCompletos(username);

        if (verificacionBloqueo.bloqueado) {
            mostrarModalBloqueo();
            return;
        }

        // Si no está bloqueado, proceder con el login normal
        console.log("Iniciando sesión...");

        const response = await apiFetch("/auth/login", "POST", { username, password });

        // Guardar el token
        setToken(response.token);

        // Obtener información del usuario del token
        const userInfo = getUserInfo();

        console.log("Usuario logueado:", userInfo);

        // Redirigir según el tipo de usuario
        if (userInfo.tipo === 3) {
            console.log("Redirigiendo a super admin...");
            window.location.href = "superAdmin.html";
        } else if (userInfo.tipo === 2) {
            console.log("Redirigiendo a gestor de vendedores...");
            window.location.href = "gestorVendedores.html";
        } else {
            console.log("Redirigiendo a categorías...");
            window.location.href = "categories.html";
        }
    } catch (error) {
        console.error("Error en el login:", error);

        // Si el error es de cuenta bloqueada
        if (error.message.includes('bloqueado') || error.message.includes('suspendida')) {
            mostrarModalBloqueo();
        } else {
            showNotification(`Error al iniciar sesión: ${error.message}`, "error");
        }
    }
}

document.getElementById("loginForm").addEventListener("submit", handleLogin);