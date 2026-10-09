/**
 * Utilidad para detectar escaneos de pistolas de códigos de barras (HID)
 * sin necesidad de enfocar campos específicos.
 * 
 * La lógica se basa en detectar una ráfaga de teclas en un corto intervalo 
 * de tiempo, ya que los lectores escriben mucho más rápido que un humano.
 */

let buffer = "";
let lastKeyTime = Date.now();
const SCAN_TIMEOUT = 50; // ms entre teclas para considerarlo escaneo
const MIN_LENGTH = 5;    // Longitud mínima para un código de barras

window.addEventListener('keydown', (e) => {
    // Si la tecla es un "bloqueador" o funcional, ignorar
    if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') {
        return;
    }

    const currentTime = Date.now();
    const diff = currentTime - lastKeyTime;
    lastKeyTime = currentTime;

    // Si el tiempo entre teclas es muy grande, probablemente sea teclado humano
    if (diff > SCAN_TIMEOUT) {
        buffer = "";
    }

    // Si es Enter, verificar si el búfer tiene algo
    if (e.key === 'Enter') {
        if (buffer.length >= MIN_LENGTH) {
            // Prevenir el evento por defecto si detectamos que es un código de barras
            // Esto evita que se envíen formularios accidentalmente
            e.preventDefault();
            const scannedCode = buffer;
            buffer = "";
            
            console.log("🚀 Código de barras detectado:", scannedCode);
            
            // Disparar evento personalizado
            const event = new CustomEvent('barcodeScanned', { 
                detail: { code: scannedCode } 
            });
            window.dispatchEvent(event);
        } else {
            buffer = "";
        }
        return;
    }

    // Solo acumular caracteres alfanuméricos simples (evitar teclas como ArrowUp, etc)
    if (e.key.length === 1) {
        buffer += e.key;
    }
});

console.log("🔌 Lector de códigos de barras global activado");
