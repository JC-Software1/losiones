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
    // Event listeners (updateSummary se llamará después de cargar la caja inicial)
const initialCashInput = document.getElementById("initialCash");

// ✅ Llamar updateSummary después de prellenar
setTimeout(() => updateSummary(), 100);
    document.getElementById("paymentsCommission").addEventListener("input", updateSummary);
    document.getElementById("salesCommission").addEventListener("input", updateSummary);
});

// Cargar datos pendientes de liquidación
// Cargar datos pendientes de liquidación
async function loadPendingData() {
    try {
        const token = getToken();

        /* ===== NUEVO: elegir ruta según modo admin ===== */
        const vendedorId = window.adminModeUtils?.isActive()
                         ? window.adminModeUtils.getVendedorId()
                         : null;
        const endPoint = vendedorId
                       ? `/liquidation/vendedor/${vendedorId}/pending`
                       : '/liquidation/pending';
        /* =============================================== */

        const response = await apiFetch(endPoint, "GET", null, token);

        pendingData = response;

        // Cargar última liquidación para obtener caja final
        await loadLastLiquidation();

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
// Cargar comisiones guardadas (ADMIN-SAFE)
async function loadSavedCommissions() {
    try {
        const token = getToken();
        const vendedorId = window.adminModeUtils?.isActive()
                         ? window.adminModeUtils.getVendedorId()
                         : null;

        // Comisión de abonos
        try {
            const endPoint = vendedorId
                           ? `/commission/vendedor/${vendedorId}`
                           : '/commission';
            const paymentsComm = await apiFetch(endPoint, 'GET', null, token);
            document.getElementById('paymentsCommission').value = paymentsComm.percentage || 0;
        } catch (e) {
            console.log('No hay comisión de abonos guardada');
        }

        // Comisión de ventas
        try {
            const endPoint = vendedorId
                           ? `/sales-commission/vendedor/${vendedorId}`
                           : '/sales-commission';
            const salesComm = await apiFetch(endPoint, 'GET', null, token);
            document.getElementById('salesCommission').value = salesComm.percentage || 0;
        } catch (e) {
            console.log('No hay comisión de ventas guardada');
        }

    } catch (error) {
        console.error('Error al cargar comisiones:', error);
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
    // ✅ NUEVO: Mostrar total de señas
document.getElementById("initialPaymentsTotal").textContent = `$${(payments.totalInitialPayments || 0).toLocaleString('es-CO')}`;
    
    // Detalles de abonos
// Detalles de abonos
const paymentsDetailsHTML = payments.data.map(p => {
    const badge = p.isInitialPayment 
        ? '<span style="background: #9b59b6; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; margin-left: 8px;">Seña</span>' 
        : '';
    
    return `
        <div class="detail-item">
            <span>${p.clientName}${badge}</span>
            <strong>$${p.amount.toLocaleString('es-CO')}</strong>
        </div>
    `;
}).join('');
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

    // Gastos
document.getElementById("expensesCount").textContent = pendingData.expenses?.count || 0;
document.getElementById("expensesTotal").textContent = `$${(pendingData.expenses?.total || 0).toLocaleString('es-CO')}`;

// Detalles de gastos
const expensesDetailsHTML = (pendingData.expenses?.data || []).map(expense => {
    const expenseDate = new Date(expense.date);
    const localDate = new Date(expenseDate.getTime() + expenseDate.getTimezoneOffset() * 60000);
    const formattedDate = localDate.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
    
    return expense.items.map(item => `
        <div class="detail-item">
            <span>${item.description} <small style="color: var(--medium-gray);">(${formattedDate})</small></span>
            <strong>$${item.amount.toLocaleString('es-CO')}</strong>
        </div>
    `).join('');
}).join('');

document.getElementById("expensesDetails").innerHTML = expensesDetailsHTML || '<p style="padding: 10px; color: var(--medium-gray);">No hay gastos pendientes</p>';

}

function updateSummary() {
    if (!pendingData) return;

    const initialCash = parseFloat(document.getElementById("initialCash").value) || 0;
    const paymentsCommission = parseFloat(document.getElementById("paymentsCommission").value) || 0;

    const { sales, payments, inventory } = pendingData;

    // ✅ Separar señas de abonos regulares
    const initialPayments = payments.totalInitialPayments || 0;
    const regularPayments = payments.total - initialPayments;

    // ✅ Calcular comisión SOLO sobre abonos regulares (sin señas)
    const paymentsCommAmount = Math.round(regularPayments * (paymentsCommission / 100));
    const paymentsAfterComm = Math.round(regularPayments - paymentsCommAmount);

    // Calcular comisión para ventas (SOLO INFORMATIVO)
    const salesCommission = parseFloat(document.getElementById("salesCommission").value) || 0;
    const salesAfterComm = Math.round(sales.total - (sales.total * (salesCommission / 100)));
    const salesCommAmount = sales.total - salesAfterComm;

    // Actualizar campos de comisión de abonos
    document.getElementById("paymentsAfterCommission").textContent = `$${paymentsAfterComm.toLocaleString('es-CO')}`;
    document.getElementById("paymentsCommissionAmount").textContent = `Comisión: $${paymentsCommAmount.toLocaleString('es-CO')} (sobre $${regularPayments.toLocaleString('es-CO')})`;

    // Actualizar campos de comisión de ventas (INFORMATIVO)
    document.getElementById("salesAfterCommission").textContent = `$${salesAfterComm.toLocaleString('es-CO')}`;
    document.getElementById("salesCommissionAmount").textContent = `Comisión: $${salesCommAmount.toLocaleString('es-CO')} (no se suma a ingresos)`;

    // ✅ INGRESOS = abonos después de comisión + señas completas
    const totalIncome = Math.round(paymentsAfterComm + initialPayments);
    
    const expensesTotal = pendingData.expenses?.total || 0;
    const totalExpenses = Math.round(inventory.totalCost + expensesTotal);
    const finalCash = Math.round(initialCash + totalIncome - totalExpenses);

    // Actualizar resumen
    document.getElementById("summaryInitial").textContent = `$${initialCash.toLocaleString('es-CO')}`;
    document.getElementById("summaryIncome").textContent = `$${totalIncome.toLocaleString('es-CO')}`;
    document.getElementById("summaryExpenses").textContent = `$${totalExpenses.toLocaleString('es-CO')}`;
    document.getElementById("summaryFinal").textContent = `$${finalCash.toLocaleString('es-CO')}`;
}

/* ---------- Control de Caja ---------- */
const modal = document.getElementById('modalControlCaja');
const btnAbrir = document.getElementById('btnControlCaja');
const btnCerrar = document.getElementById('cerrarModal');
const cajaActualTxt = document.getElementById('cajaActual');
const inputValor = document.getElementById('valorMovimiento');

function refrescarCajaActual() {
  // Tomamos la caja que ya está pintada en el resumen
  const texto = document.getElementById('summaryFinal').textContent;
  cajaActualTxt.textContent = texto;
}

btnAbrir.onclick = () => { modal.style.display = 'block'; refrescarCajaActual(); };
btnCerrar.onclick = () => { modal.style.display = 'none'; };
window.onclick = e => { if (e.target === modal) modal.style.display = 'none'; };

async function enviarMovimiento(tipo) {
  const valor = parseInt(inputValor.value);
  if (!valor || valor <= 0) return alert('Ingresa un valor válido');

  const token = getToken();
  const vendedorId = window.adminModeUtils?.isActive()
                   ? window.adminModeUtils.getVendedorId()
                   : null;
  const body = { tipo, valor, vendedorId };

  try {
    const endpoint = '/cash-movement';
    const res = await apiFetch(endpoint, 'POST', body, token);

    // Actualizamos la caja inicial con el nuevo valor
    document.getElementById('initialCash').value = res.newCash;
    updateSummary();               // Recalcula todo
    refrescarCajaActual();         // Actualiza modal
    inputValor.value = '';
    alert(`Movimiento registrado: ${tipo} $${valor.toLocaleString('es-CO')}`);
  } catch (e) {
    alert('Error: ' + e.message);
  }
}

document.getElementById('btnIngresar').onclick = () => enviarMovimiento('INGRESO');
document.getElementById('btnRetirar').onclick = () => enviarMovimiento('RETIRO');
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
// Validaciones
if (isNaN(initialCash)) {
    alert("Error: La caja inicial no tiene un valor válido");
    return;
}

// Permitir caja inicial negativa pero advertir al usuario
if (initialCash < 0) {
    if (!confirm(`La caja inicial es negativa ($${initialCash.toLocaleString('es-CO')}). ¿Deseas continuar con la liquidación?`)) {
        return;
    }
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

        // Detectar modo admin
const vendedorId = window.adminModeUtils?.isActive()
                 ? window.adminModeUtils.getVendedorId()
                 : null;

const endpoint = vendedorId
               ? `/liquidation/vendedor/${vendedorId}/new`
               : '/liquidation/new';

const response = await apiFetch(endpoint, "POST", liquidationData, token);

        // Mostrar mensaje de éxito
        alert(`¡Liquidación completada exitosamente!\n\nCaja Final: $${response.liquidation.finalCash.toLocaleString('es-CO')}`);

        // Redirigir al historial
        window.location.href = "historial-liquidaciones.html";

    } catch (error) {
        console.error("Error al liquidar día:", error);
        alert("Error al procesar la liquidación: " + error.message);
    }
};


// Cargar última liquidación para prellenar caja inicial
// Cargar última liquidación para prellenar caja inicial
async function loadLastLiquidation() {
    try {
        const token = getToken();

        /* ===== NUEVO: elegir ruta según modo admin ===== */
        const vendedorId = window.adminModeUtils?.isActive()
                         ? window.adminModeUtils.getVendedorId()
                         : null;
        const endPoint = vendedorId
                       ? `/liquidation/vendedor/${vendedorId}/history`
                       : '/liquidation/history';
        /* =============================================== */

        const liquidations = await apiFetch(endPoint, "GET", null, token);

        if (liquidations && liquidations.length > 0) {
            const lastLiquidation = liquidations[0];
            document.getElementById("initialCash").value = lastLiquidation.finalCash;
            console.log('✅ Caja inicial prellenada con caja final anterior:', lastLiquidation.finalCash);
        } else {
            console.log('ℹ️ No hay liquidaciones previas, caja inicial en 0');
            document.getElementById("initialCash").value = 0;
        }
    } catch (error) {
        console.log('ℹ️ No se pudo cargar liquidación anterior:', error.message);
        document.getElementById("initialCash").value = 0;
    }
}

