/* liquidacion.js */
import { apiFetch } from "./utils/api.js";
import { getToken } from "./utils/auth.js";

let pendingData = null;

// Inicialización
// En liquidacion.js, modifica la función DOMContentLoaded:
document.addEventListener("DOMContentLoaded", async () => {
    const dateElement = document.getElementById("currentDate");
    const today = new Date();
    dateElement.textContent = today.toLocaleDateString('es-CO', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });

    // ✅ Cargar comisiones PRIMERO
    await loadSavedCommissions();
    
    // ✅ Luego cargar datos pendientes (que también llama updateSummary)
    await loadPendingData();

    // Event listeners
    document.getElementById("initialCash").addEventListener("input", updateSummary);
    document.getElementById("paymentsCommission").addEventListener("input", updateSummary);
    document.getElementById("salesCommission").addEventListener("input", updateSummary);
});

// Cargar datos pendientes de liquidación
async function loadPendingData() {
    try {
        const token = getToken();
        const response = await apiFetch("/liquidation/pending", "GET", null, token);
        
        pendingData = response;

        // Mostrar datos
        displayPendingData();
        updateSummary();

        // Ocultar loading y mostrar contenido
        document.getElementById("loadingContainer").style.display = "none";
        document.getElementById("mainContent").style.display = "block";

    } catch (error) {
        console.error("Error al cargar datos:", error);
        document.getElementById("loadingContainer").innerHTML = `
            <div style="color: var(--danger);">
                <i class="fas fa-exclamation-circle" style="font-size: 48px;"></i>
                <p>Error al cargar los datos</p>
                <p style="font-size: 14px;">${error.message}</p>
            </div>
        `;
    }
}

// Cargar comisiones guardadas
async function loadSavedCommissions() {
    try {
        const token = getToken();
        
        // Cargar comisión de abonos
        try {
            const paymentsComm = await apiFetch("/commission", "GET", null, token);
            document.getElementById("paymentsCommission").value = paymentsComm.percentage || 0;
        } catch (e) {
            console.log("No hay comisión de abonos guardada");
        }

        // Cargar comisión de ventas
        try {
            const salesComm = await apiFetch("/sales-commission", "GET", null, token);
            document.getElementById("salesCommission").value = salesComm.percentage || 0;
        } catch (e) {
            console.log("No hay comisión de ventas guardada");
        }

    } catch (error) {
        console.error("Error al cargar comisiones:", error);
    }
}

// Mostrar datos pendientes
// Mostrar datos pendientes
function displayPendingData() {
    if (!pendingData) return;

    const { sales, payments, inventory, clientTracking } = pendingData;

    // Abonos
    document.getElementById("paymentsCount").textContent = payments.count;
    document.getElementById("paymentsTotal").textContent = `$${payments.total.toLocaleString('es-CO')}`;
    
    // Detalles de abonos
    const paymentsDetailsHTML = payments.data.map(p => `
        <div class="detail-item">
            <span>${p.clientName}</span>
            <strong>$${p.amount.toLocaleString('es-CO')}</strong>
        </div>
    `).join('');
    document.getElementById("paymentsDetails").innerHTML = paymentsDetailsHTML || '<p style="padding: 10px; color: var(--medium-gray);">No hay abonos pendientes</p>';

    // Ventas
    document.getElementById("salesCount").textContent = sales.count;
    document.getElementById("salesTotal").textContent = `$${sales.total.toLocaleString('es-CO')}`;
    
    // Detalles de ventas
    const salesDetailsHTML = sales.data.map(s => `
        <div class="detail-item">
            <span>${s.clientName} - ${s.productName}</span>
            <strong>$${s.price.toLocaleString('es-CO')}</strong>
        </div>
    `).join('');
    document.getElementById("salesDetails").innerHTML = salesDetailsHTML || '<p style="padding: 10px; color: var(--medium-gray);">No hay ventas pendientes</p>';

    // ✅ NUEVO: Seguimiento de clientes mejorado
    if (clientTracking) {
        document.getElementById("totalActiveClients").textContent = clientTracking.totalActiveClients;
        document.getElementById("clientsPaidToday").textContent = clientTracking.paidToday;
        document.getElementById("clientsDidNotPay").textContent = clientTracking.didNotPayToday;
        document.getElementById("effectivenessPercentage").textContent = `${clientTracking.effectivenessPercentage}%`;
        document.getElementById("totalCustomerIncome").textContent = `$${clientTracking.totalIncome.toLocaleString('es-CO')}`;
    }

    // Inventario
    document.getElementById("inventoryCount").textContent = inventory.count;
    document.getElementById("inventoryCost").textContent = `$${inventory.totalCost.toLocaleString('es-CO')}`;
    
    // Detalles de inventario
    const inventoryDetailsHTML = inventory.data.map(p => `
        <div class="detail-item">
            <span>${p.name} - ${p.brand}</span>
            <strong>$${p.costPrice.toLocaleString('es-CO')}</strong>
        </div>
    `).join('');
    document.getElementById("inventoryDetails").innerHTML = inventoryDetailsHTML || '<p style="padding: 10px; color: var(--medium-gray);">No hay productos pendientes</p>';
}

// Actualizar resumen
// Actualizar resumen
function updateSummary() {
    if (!pendingData) return;

    const initialCash = parseFloat(document.getElementById("initialCash").value) || 0;
    const paymentsCommission = parseFloat(document.getElementById("paymentsCommission").value) || 0;
    // ✅ Ya no necesitamos salesCommission para cálculos

    const { sales, payments, inventory } = pendingData;

    // ✅ CAMBIO: Solo calcular comisión para abonos
    const paymentsAfterComm = payments.total - (payments.total * (paymentsCommission / 100));
    const paymentsCommAmount = payments.total - paymentsAfterComm;

    // Las ventas ya NO generan comisión ni ingresos
    const salesAfterComm = 0;  // ← Ya no aplica
    const salesCommAmount = 0;  // ← Ya no aplica

    // Actualizar campos de comisión
    document.getElementById("paymentsAfterCommission").textContent = `$${paymentsAfterComm.toLocaleString('es-CO')}`;
    document.getElementById("paymentsCommissionAmount").textContent = `Comisión: $${paymentsCommAmount.toLocaleString('es-CO')}`;

    // ✅ Mostrar ventas SIN comisión (solo informativo)
    document.getElementById("salesAfterCommission").textContent = `$${sales.total.toLocaleString('es-CO')}`;
    document.getElementById("salesCommissionAmount").textContent = `Sin comisión (solo informativo)`;

    // ✅ CAMBIO: Calcular totales - Las ventas NO cuentan como ingreso
    const totalIncome = paymentsAfterComm;  // ← SOLO ABONOS
    const totalExpenses = inventory.totalCost;
    const finalCash = initialCash + totalIncome - totalExpenses;

    // Actualizar resumen
    document.getElementById("summaryInitial").textContent = `$${initialCash.toLocaleString('es-CO')}`;
    document.getElementById("summaryIncome").textContent = `$${totalIncome.toLocaleString('es-CO')}`;
    document.getElementById("summaryExpenses").textContent = `$${totalExpenses.toLocaleString('es-CO')}`;
    document.getElementById("summaryFinal").textContent = `$${finalCash.toLocaleString('es-CO')}`;
}

// Toggle detalles
window.toggleDetails = function(id) {
    const element = document.getElementById(id);
    const icon = element.previousElementSibling.querySelector('i');
    
    element.classList.toggle('open');
    
    if (element.classList.contains('open')) {
        icon.style.transform = 'rotate(180deg)';
    } else {
        icon.style.transform = 'rotate(0deg)';
    }
};

// Liquidar día
window.liquidateDay = async function() {
    const initialCash = parseFloat(document.getElementById("initialCash").value);
    const paymentsCommission = parseFloat(document.getElementById("paymentsCommission").value) || 0;
    const salesCommission = parseFloat(document.getElementById("salesCommission").value) || 0;
    const notes = document.getElementById("notes").value.trim();

    // Validaciones
    if (isNaN(initialCash) || initialCash < 0) {
        alert("Por favor ingresa un valor válido para la caja inicial");
        document.getElementById("initialCash").focus();
        return;
    }

    if (!pendingData || (pendingData.payments.count === 0 && pendingData.sales.count === 0)) {
        if (!confirm("No hay abonos ni ventas pendientes. ¿Deseas continuar con la liquidación?")) {
            return;
        }
    }

    if (!confirm("¿Estás seguro de liquidar el día? Esta acción marcará todos los datos actuales como procesados.")) {
        return;
    }

    try {
        const token = getToken();
        
        const liquidationData = {
            initialCash,
            paymentsCommission,
            salesCommission,
            notes
        };

        const response = await apiFetch("/liquidation/create", "POST", liquidationData, token);

        // Mostrar mensaje de éxito
        alert(`¡Liquidación completada exitosamente!\n\nCaja Final: $${response.liquidation.finalCash.toLocaleString('es-CO')}`);

        // Redirigir al historial
        window.location.href = "historial-liquidaciones.html";

    } catch (error) {
        console.error("Error al liquidar día:", error);
        alert("Error al procesar la liquidación: " + error.message);
    }
};