import { apiFetch } from "./api.js";
import { getToken } from "./auth.js";
import { showNotification } from "./notifications.js";

// ═══════════════════════════════════════════════════════════════
// JC-IA: Asistente Inteligente de Inventario (Voz y Texto)
// ═══════════════════════════════════════════════════════════════

let iaConversation = [];           // Historial de la conversación
let iaPendingProducts = [];        // Productos estructurados pendientes de confirmación
let recognition = null;            // Instancia de SpeechRecognition
let isSpeechListening = false;     // Estado de escucha
let refreshProductsCallback = null;// Callback para recargar tabla
let speechSilenceTimer = null;     // Temporizador para auto-enviar al parar de hablar
let isProcessing = false;          // Bandera de procesamiento activo

// Limpiar cualquier residuo de JSON o etiquetas para que nunca se muestren en el chat
function cleanVisibleText(text) {
    if (!text) return "";
    return text
        .replace(/<ia_action>[\s\S]*?(?:<\/ia_action>|$)/gi, "")
        .replace(/```(?:json)?\s*\{[\s\S]*?\}\s*```/gi, "")
        .replace(/```[\s\S]*/gi, "")
        .replace(/\{[\s\r\n]*"action"\s*:[\s\S]*/gi, "")
        .trim();
}

// ─── Inicializar el Asistente JC-IA ───
export function initJCIA(onProductsCreated) {
    refreshProductsCallback = onProductsCreated;

    // Conectar botones de apertura
    const btnHeader = document.getElementById("btnOpenJCIA");
    const btnBanner = document.getElementById("btnJCIAForm");
    const modal = document.getElementById("iaModal");

    if (btnHeader) {
        btnHeader.addEventListener("click", () => openIAModal());
    }
    if (btnBanner) {
        btnBanner.addEventListener("click", () => openIAModal());
    }

    if (!modal) return;

    // Botones de cierre
    const closeBtns = modal.querySelectorAll("[data-ia-close]");
    closeBtns.forEach(b => b.addEventListener("click", () => closeIAModal()));

    // Cerrar al dar click fuera
    modal.addEventListener("click", (e) => {
        if (e.target === modal) closeIAModal();
    });

    // Cerrar con Escape
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && modal.classList.contains("ia-visible")) {
            closeIAModal();
        }
    });

    // Botón de Enviar texto
    const btnSend = document.getElementById("iaSendBtn");
    const input = document.getElementById("iaInput");

    if (btnSend) {
        btnSend.addEventListener("click", () => sendCurrentMessage());
    }

    if (input) {
        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendCurrentMessage();
            }
        });
    }

    // Botón de micrófono manual
    const btnMic = document.getElementById("iaMicBtn");
    if (btnMic) {
        btnMic.addEventListener("click", () => toggleSpeechListening());
    }

    const btnToggleBanner = document.getElementById("iaToggleMicBanner");
    if (btnToggleBanner) {
        btnToggleBanner.addEventListener("click", () => toggleSpeechListening());
    }

    // Configurar reconocimiento de voz
    setupSpeechRecognition();
}

// ─── Configurar SpeechRecognition del Navegador ───
function setupSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        console.warn("[JC-IA] Web Speech API no está soportada en este navegador.");
        updateListeningUI(false, "Voz no disponible (usa texto)");
        return;
    }

    try {
        recognition = new SpeechRecognition();
        recognition.lang = "es-CO"; // Español Colombia
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            isSpeechListening = true;
            updateListeningUI(true, "JC-IA te está escuchando... ¡Habla ahora!");
        };

        recognition.onresult = (event) => {
            let interimTranscript = "";
            let finalTranscript = "";

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            const interimBox = document.getElementById("iaInterimBox");
            const input = document.getElementById("iaInput");

            if (interimTranscript) {
                clearTimeout(speechSilenceTimer);
                if (interimBox) {
                    interimBox.textContent = `Escuchando: "${interimTranscript}"`;
                    interimBox.classList.add("visible");
                }
            } else if (interimBox && !finalTranscript) {
                interimBox.classList.remove("visible");
            }

            if (finalTranscript) {
                if (interimBox) interimBox.classList.remove("visible");
                if (input) {
                    input.value = (input.value ? input.value + " " : "") + finalTranscript.trim();
                }

                // Pausa natural (1.6s) para auto-enviar mensaje
                clearTimeout(speechSilenceTimer);
                speechSilenceTimer = setTimeout(() => {
                    if (input && input.value.trim() && !isProcessing) {
                        sendCurrentMessage();
                    }
                }, 1600);
            }
        };

        recognition.onerror = (event) => {
            if (event.error === "aborted" || event.error === "no-speech") {
                return;
            }
            console.warn("[JC-IA] Error en reconocimiento de voz:", event.error);
            if (event.error === "not-allowed") {
                updateListeningUI(false, "Permiso de micrófono denegado");
            } else {
                updateListeningUI(false, "Micrófono en pausa");
            }
        };

        recognition.onend = () => {
            // Si el modal sigue abierto y no estábamos procesando, reiniciar escucha suavemente
            const modal = document.getElementById("iaModal");
            if (modal && modal.classList.contains("ia-visible") && isSpeechListening && !isProcessing) {
                try {
                    recognition.start();
                } catch (e) {
                    isSpeechListening = false;
                    updateListeningUI(false, "Micrófono en pausa (haz clic para hablar)");
                }
            } else {
                isSpeechListening = false;
                updateListeningUI(false, "Micrófono en pausa (haz clic para hablar)");
            }
        };

    } catch (err) {
        console.error("[JC-IA] Error inicializando SpeechRecognition:", err);
    }
}

// ─── Activar / Desactivar Escucha de Voz ───
function toggleSpeechListening() {
    if (!recognition) {
        setupSpeechRecognition();
        if (!recognition) {
            alert("Tu navegador no soporta entrada de voz directa. Puedes escribir en el chat.");
            return;
        }
    }

    if (isSpeechListening) {
        stopSpeechListening();
    } else {
        startSpeechListening();
    }
}

function startSpeechListening() {
    if (!recognition || isProcessing || isSpeechListening) return;
    try {
        isSpeechListening = true;
        recognition.start();
    } catch (e) {
        if (!String(e.message).includes("already started")) {
            console.log("[JC-IA] Info Speech start:", e.message);
        }
    }
}

function stopSpeechListening() {
    isSpeechListening = false;
    if (recognition) {
        try {
            recognition.stop();
        } catch (e) {}
    }
    updateListeningUI(false, "Micrófono pausado");
}

// ─── Actualizar la Interfaz de Escucha ───
function updateListeningUI(listening, statusText) {
    const banner = document.getElementById("iaListeningBanner");
    const statusLabel = document.getElementById("iaListeningStatusText");
    const statusDot = document.getElementById("iaStatusDot");
    const btnMic = document.getElementById("iaMicBtn");
    const interimBox = document.getElementById("iaInterimBox");

    if (banner) {
        if (listening) {
            banner.classList.remove("inactive");
        } else {
            banner.classList.add("inactive");
        }
    }

    if (statusLabel && statusText) {
        statusLabel.textContent = statusText;
    }

    if (statusDot) {
        if (listening) {
            statusDot.classList.add("listening");
        } else {
            statusDot.classList.remove("listening");
        }
    }

    if (btnMic) {
        if (listening) {
            btnMic.classList.add("active");
            btnMic.title = "Pausar micrófono";
        } else {
            btnMic.classList.remove("active");
            btnMic.title = "Activar micrófono para hablar";
        }
    }

    if (!listening && interimBox) {
        interimBox.classList.remove("visible");
    }
}

// ─── Abrir Modal de JC-IA ───
export function openIAModal() {
    const modal = document.getElementById("iaModal");
    if (!modal) return;

    modal.classList.add("ia-visible");
    document.body.style.overflow = "hidden";

    // Si la conversación está vacía, inicializar con bienvenida amigable
    const chatContainer = document.getElementById("iaChatMessages");
    if (chatContainer && chatContainer.children.length === 0) {
        iaConversation = [];
        iaPendingProducts = [];

        addIAMessage(
            "¡Hola! 👋 Soy <strong>JC-IA</strong>, tu asistente de inventario.<br><br>" +
            "Dime qué productos deseas agregar y yo me encargo de todo. Por ejemplo, puedes decirme:<br><br>" +
            "<em>«Agregar 3 camisas marca Adidas, me cuestan 5 mil y las vendo a 10 mil cada una»</em><br><br>" +
            "¡Te estoy escuchando! ¿Qué vamos a registrar hoy? 😊",
            "ia",
            true // Con animación de escritura
        );
    }

    // Iniciar escucha por voz automáticamente
    setTimeout(() => {
        startSpeechListening();
        const input = document.getElementById("iaInput");
        if (input) input.focus();
    }, 400);
}

// ─── Cerrar Modal ───
export function closeIAModal() {
    const modal = document.getElementById("iaModal");
    if (!modal) return;

    stopSpeechListening();
    modal.classList.remove("ia-visible");
    document.body.style.overflow = "";
}

// ─── Enviar Mensaje Actual ───
async function sendCurrentMessage() {
    const input = document.getElementById("iaInput");
    if (!input || !input.value.trim() || isProcessing) return;

    const userText = input.value.trim();
    input.value = "";

    // Detener escucha temporalmente mientras la IA responde
    stopSpeechListening();

    // Mostrar mensaje del usuario en pantalla
    addIAMessage(userText, "user", false);

    // Bloquear controles mientras procesa
    setProcessingState(true);

    // Indicador de "JC-IA está pensando..."
    const typingId = showTypingIndicator();

    // Guardar en historial
    iaConversation.push({ role: "user", content: userText });

    try {
        const token = getToken();
        const data = await apiFetch("/ia/chat", "POST", {
            messages: iaConversation
        }, token);

        removeTypingIndicator(typingId);

        const aiResponseText = cleanVisibleText(data.response) || "No pude generar una respuesta.";
        const actionData = data.action;

        // Agregar al historial de IA
        iaConversation.push({ role: "assistant", content: aiResponseText });

        if (actionData && actionData.action === "confirm") {
            // Guardar productos para confirmación
            iaPendingProducts = actionData.products || [];
            showConfirmationCard(aiResponseText, iaPendingProducts);
        } else if (actionData && actionData.action === "create") {
            // El usuario confirmó la creación
            const productsToCreate = actionData.products && actionData.products.length > 0 
                ? actionData.products 
                : iaPendingProducts;

            await executeProductsCreation(productsToCreate);
            showSuccessCard(aiResponseText);
            iaPendingProducts = [];
        } else {
            // Mensaje conversacional o pregunta aclaratoria
            addIAMessage(aiResponseText, "ia", true, () => {
                // Al terminar de escribir, reanudar escucha de voz automáticamente
                setTimeout(() => {
                    const modal = document.getElementById("iaModal");
                    if (modal && modal.classList.contains("ia-visible")) {
                        startSpeechListening();
                    }
                }, 300);
            });
        }

    } catch (error) {
        removeTypingIndicator(typingId);
        console.error("[JC-IA] Error en llamada API:", error);
        const errMsg = error && error.message ? error.message : "";
        const isKeyIssue = errMsg.includes("claves") || errMsg.includes("Gemini") || errMsg.includes("leaked") || errMsg.includes("límite");

        const displayMsg = isKeyIssue
            ? `⚠️ ${errMsg}`
            : "😅 Disculpa, tuve un pequeño tropiezo de conexión con la IA. ¿Me repites lo que deseas registrar?";

        addIAMessage(
            displayMsg,
            "ia",
            true,
            () => startSpeechListening()
        );
    } finally {
        setProcessingState(false);
    }
}

// ─── Ejecutar Creación de Productos en el Backend ───
async function executeProductsCreation(products) {
    if (!products || products.length === 0) return;

    const token = getToken();
    const adminMode = sessionStorage.getItem("adminMode") === "true";
    const vendedorId = sessionStorage.getItem("vendedorId");

    let endpoint = "/products/new";
    if (adminMode && vendedorId) {
        endpoint = `/products/vendedor/${vendedorId}/new`;
    }

    let successCount = 0;
    for (const p of products) {
        try {
            await apiFetch(endpoint, "POST", {
                name: p.name || "Producto sin nombre",
                brand: p.brand || "",
                costPrice: parseFloat(p.costPrice) || 0,
                salePrice: parseFloat(p.salePrice) || 0,
                stock: parseInt(p.stock) || 1,
                size: p.size || null,
                category: p.category || ""
            }, token);
            successCount++;
        } catch (err) {
            console.error("[JC-IA] Error guardando producto:", p.name, err);
        }
    }

    if (successCount > 0) {
        showNotification(`¡${successCount} producto(s) creado(s) con éxito en tu inventario!`, "success");
    }

    // Refrescar productos en la vista principal
    if (refreshProductsCallback && typeof refreshProductsCallback === "function") {
        try {
            await refreshProductsCallback();
        } catch (e) {
            console.warn("[JC-IA] Error refrescando lista de productos:", e);
        }
    }
}

// ─── Mostrar Mensaje con Tarjeta de Confirmación ───
function showConfirmationCard(messageText, products) {
    const chatContainer = document.getElementById("iaChatMessages");
    if (!chatContainer) return;

    const wrapper = document.createElement("div");
    wrapper.className = "ia-message ia-message-ia";

    const avatar = document.createElement("div");
    avatar.className = "ia-msg-avatar";
    avatar.innerHTML = '<i class="fas fa-robot"></i>';

    const bubble = document.createElement("div");
    bubble.className = "ia-bubble";

    // Texto con efecto de escritura
    const textDiv = document.createElement("div");
    textDiv.className = "ia-bubble-text";
    bubble.appendChild(textDiv);

    // Contenedor de tarjetas de productos
    const cardsContainer = document.createElement("div");
    cardsContainer.className = "ia-product-cards";
    cardsContainer.style.display = "none";

    products.forEach(p => {
        const card = document.createElement("div");
        card.className = "ia-product-card";
        card.innerHTML = `
            <div class="ia-card-header">
                <i class="fas fa-box-open"></i>
                <strong>${escapeHtml(p.name)}</strong>
                ${p.brand ? `<span class="ia-card-brand">${escapeHtml(p.brand)}</span>` : ""}
            </div>
            <div class="ia-card-details">
                <span><i class="fas fa-cubes"></i> <strong>${p.stock || 1}</strong> unidad(es)</span>
                ${p.size ? `<span><i class="fas fa-ruler-combined"></i> Talla: <strong>${escapeHtml(p.size)}</strong></span>` : ""}
                ${p.category ? `<span><i class="fas fa-folder"></i> ${escapeHtml(p.category)}</span>` : ""}
            </div>
            <div class="ia-card-prices">
                <div class="ia-card-price">
                    <span class="ia-price-label">Precio Costo</span>
                    <span class="ia-price-value">$${Number(p.costPrice || 0).toLocaleString("es-CO")}</span>
                </div>
                <div class="ia-card-price">
                    <span class="ia-price-label">Precio Venta</span>
                    <span class="ia-price-value ia-price-sale">$${Number(p.salePrice || 0).toLocaleString("es-CO")}</span>
                </div>
            </div>
        `;
        cardsContainer.appendChild(card);
    });
    bubble.appendChild(cardsContainer);

    // Botones de acción rápida (Sí / Agregar otro / Modificar)
    const actionsDiv = document.createElement("div");
    actionsDiv.className = "ia-confirm-actions";
    actionsDiv.style.display = "none";
    actionsDiv.innerHTML = `
        <button type="button" class="ia-btn-confirm" id="btnIaConfirmYes">
            <i class="fas fa-check-circle"></i> ${products.length > 1 ? `Sí, crear los ${products.length} productos` : 'Sí, crear producto'}
        </button>
        <button type="button" class="ia-btn-other" id="btnIaConfirmOther">
            <i class="fas fa-plus"></i> Agregar otro
        </button>
        <button type="button" class="ia-btn-cancel" id="btnIaConfirmNo">
            <i class="fas fa-times-circle"></i> Modificar
        </button>
    `;
    bubble.appendChild(actionsDiv);

    wrapper.appendChild(avatar);
    wrapper.appendChild(bubble);
    chatContainer.appendChild(wrapper);
    scrollToBottom();

    // Animación de escritura para el mensaje
    typeWriter(textDiv, messageText, 18, () => {
        cardsContainer.style.display = "flex";
        actionsDiv.style.display = "flex";
        scrollToBottom();

        // Conectar botones
        const btnYes = actionsDiv.querySelector("#btnIaConfirmYes");
        const btnOther = actionsDiv.querySelector("#btnIaConfirmOther");
        const btnNo = actionsDiv.querySelector("#btnIaConfirmNo");

        if (btnYes) {
            btnYes.addEventListener("click", () => {
                actionsDiv.remove();
                const input = document.getElementById("iaInput");
                if (input) input.value = "Sí, confirmo la creación";
                sendCurrentMessage();
            });
        }

        if (btnOther) {
            btnOther.addEventListener("click", () => {
                actionsDiv.remove();
                const input = document.getElementById("iaInput");
                if (input) input.value = "Quiero agregar otro producto";
                sendCurrentMessage();
            });
        }

        if (btnNo) {
            btnNo.addEventListener("click", () => {
                actionsDiv.remove();
                const input = document.getElementById("iaInput");
                if (input) input.value = "No, quiero corregir algo";
                sendCurrentMessage();
            });
        }

        // Reanudar escucha de voz para que el usuario pueda decir "sí" con la voz
        setTimeout(() => {
            const modal = document.getElementById("iaModal");
            if (modal && modal.classList.contains("ia-visible")) {
                startSpeechListening();
            }
        }, 300);
    });
}

// ─── Mostrar Mensaje de Éxito 🎉 ───
function showSuccessCard(messageText) {
    const chatContainer = document.getElementById("iaChatMessages");
    if (!chatContainer) return;

    const wrapper = document.createElement("div");
    wrapper.className = "ia-message ia-message-ia";

    const avatar = document.createElement("div");
    avatar.className = "ia-msg-avatar";
    avatar.style.background = "#27ae60";
    avatar.innerHTML = '<i class="fas fa-check-double"></i>';

    const bubble = document.createElement("div");
    bubble.className = "ia-bubble";
    bubble.style.borderColor = "#27ae60";

    const textDiv = document.createElement("div");
    textDiv.className = "ia-bubble-text";
    bubble.appendChild(textDiv);

    wrapper.appendChild(avatar);
    wrapper.appendChild(bubble);
    chatContainer.appendChild(wrapper);
    scrollToBottom();

    typeWriter(textDiv, messageText, 18, () => {
        scrollToBottom();
        // Reanudar escucha para registrar más productos
        setTimeout(() => {
            const modal = document.getElementById("iaModal");
            if (modal && modal.classList.contains("ia-visible")) {
                startSpeechListening();
            }
        }, 400);
    });
}

// ─── Agregar Mensaje al Chat ───
function addIAMessage(text, sender = "ia", animate = false, callback = null) {
    const chatContainer = document.getElementById("iaChatMessages");
    if (!chatContainer) return;

    const wrapper = document.createElement("div");
    wrapper.className = `ia-message ia-message-${sender}`;

    const avatar = document.createElement("div");
    avatar.className = "ia-msg-avatar";
    avatar.innerHTML = sender === "ia" ? '<i class="fas fa-robot"></i>' : '<i class="fas fa-user"></i>';

    const bubble = document.createElement("div");
    bubble.className = "ia-bubble";

    const textDiv = document.createElement("div");
    textDiv.className = "ia-bubble-text";
    bubble.appendChild(textDiv);

    wrapper.appendChild(avatar);
    wrapper.appendChild(bubble);
    chatContainer.appendChild(wrapper);
    scrollToBottom();

    if (animate && sender === "ia") {
        typeWriter(textDiv, text, 18, callback);
    } else {
        textDiv.innerHTML = text;
        if (callback) callback();
    }
}

// ─── Animación de Escritura (Typewriter) ───
function typeWriter(element, htmlContent, speed = 18, onComplete = null) {
    // Si no hay contenido, salir
    if (!htmlContent) {
        if (onComplete) onComplete();
        return;
    }

    // Usar un contenedor temporal para extraer los caracteres visibles
    const temp = document.createElement("div");
    temp.innerHTML = htmlContent;
    const fullText = temp.textContent || temp.innerText || "";

    element.innerHTML = "";
    const cursor = document.createElement("span");
    cursor.className = "ia-cursor";
    cursor.textContent = "▋";
    element.appendChild(cursor);

    let charIndex = 0;

    function step() {
        if (charIndex < fullText.length) {
            // Avanzar en texto plano preservando el HTML parcial
            charIndex++;
            const partialHtml = buildPartialHtml(htmlContent, charIndex);
            element.innerHTML = partialHtml;
            element.appendChild(cursor);
            scrollToBottom();

            // Pequeña variación natural en la velocidad de escritura
            const delay = speed + (Math.random() * 12);
            setTimeout(step, delay);
        } else {
            // Finalizado: colocar todo el HTML limpio y retirar cursor
            element.innerHTML = htmlContent;
            cursor.remove();
            scrollToBottom();
            if (onComplete) onComplete();
        }
    }

    step();
}

// Reconstruir HTML hasta cierto número de caracteres visibles
function buildPartialHtml(fullHtml, visibleChars) {
    let result = "";
    let count = 0;
    let inTag = false;

    for (let i = 0; i < fullHtml.length; i++) {
        const char = fullHtml[i];
        if (char === "<") {
            inTag = true;
            result += char;
            continue;
        }
        if (char === ">") {
            inTag = false;
            result += char;
            continue;
        }

        if (inTag) {
            result += char;
        } else {
            result += char;
            count++;
            if (count >= visibleChars) {
                break;
            }
        }
    }
    return result;
}

// ─── Indicador de que JC-IA está pensando ───
function showTypingIndicator() {
    const chatContainer = document.getElementById("iaChatMessages");
    if (!chatContainer) return null;

    const id = "ia-typing-indicator";
    const wrapper = document.createElement("div");
    wrapper.className = "ia-message ia-message-ia";
    wrapper.id = id;

    wrapper.innerHTML = `
        <div class="ia-msg-avatar">
            <i class="fas fa-robot"></i>
        </div>
        <div class="ia-bubble">
            <div class="ia-typing-container">
                <div class="ia-typing-dots">
                    <span></span><span></span><span></span>
                </div>
                <div class="ia-typing-text">JC-IA está escuchando y pensando...</div>
            </div>
        </div>
    `;

    chatContainer.appendChild(wrapper);
    scrollToBottom();
    return id;
}

function removeTypingIndicator(id) {
    if (!id) return;
    const el = document.getElementById(id);
    if (el) el.remove();
}

// ─── Estado de Procesamiento ───
function setProcessingState(processing) {
    isProcessing = processing;
    const input = document.getElementById("iaInput");
    const btnSend = document.getElementById("iaSendBtn");

    if (input) input.disabled = processing;
    if (btnSend) btnSend.disabled = processing;
}

// ─── Scroll suave al fondo del chat ───
function scrollToBottom() {
    const chatContainer = document.getElementById("iaChatMessages");
    if (chatContainer) {
        requestAnimationFrame(() => {
            chatContainer.scrollTop = chatContainer.scrollHeight;
        });
    }
}

// ─── Escapar caracteres HTML ───
function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}
