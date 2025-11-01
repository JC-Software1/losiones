import { apiFetch } from "./utils/api.js";
import { getToken } from "./utils/auth.js";
import "./authCheck.js";

document.addEventListener("DOMContentLoaded", async () => {
    const liquidationId = sessionStorage.getItem('inspectLiquidationId');
    
    if (!liquidationId) {
        alert("No se especificó una liquidación para inspeccionar");
        window.location.href = "historial-liquidaciones.html";
        return;
    }

    try {
        const token = getToken();
        const liquidation = await apiFetch(`/liquidation/${liquidationId}`, "GET", null, token);
        
        displayLiquidation(liquidation);
        
        sessionStorage.removeItem('inspectLiquidationId');
        
    } catch (error) {
        console.error("Error al cargar liquidación:", error);
        alert("Error al cargar la liquidación: " + error.message);
        window.location.href = "historial-liquidaciones.html";
    }
});

function displayLiquidation(liq) {
    // Fecha
    document.getElementById("currentDate").textContent = new Date(liq.liquidationDate).toLocaleDateString('es-CO', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // ✅ Recalcular con la misma lógica que liquidacion.js
    const initialPayments = liq.payments.totalInitialPayments || 0;
    const regularPayments = liq.payments.total - initialPayments;
    const paymentsCommission = liq.payments.commissionPercentage || 0;
    const paymentsCommAmount = Math.round(regularPayments * (paymentsCommission / 100));
    const paymentsAfterComm = Math.round(regularPayments - paymentsCommAmount);
    
    // Comisión de ventas (informativa)
    const salesCommission = liq.sales.commissionPercentage || 0;
    const salesAfterComm = Math.round(liq.sales.total - (liq.sales.total * (salesCommission / 100)));
    const salesCommAmount = liq.sales.total - salesAfterComm;
    
    // Total ingresos recalculado
    const realTotalIncome = Math.round(paymentsAfterComm + initialPayments);

    // Configuración inicial
    document.getElementById("initialCash").textContent = `$${liq.initialCash.toLocaleString('es-CO')}`;
    document.getElementById("paymentsCommission").textContent = `${paymentsCommission}%`;
    document.getElementById("salesCommission").textContent = `${salesCommission}%`;

    // Abonos
    document.getElementById("paymentsCount").textContent = liq.payments.count;
    document.getElementById("paymentsTotal").textContent = `$${liq.payments.total.toLocaleString('es-CO')}`;
    document.getElementById("initialPaymentsTotal").textContent = `$${initialPayments.toLocaleString('es-CO')}`;
    document.getElementById("paymentsAfterCommission").textContent = `$${paymentsAfterComm.toLocaleString('es-CO')}`;
    document.getElementById("paymentsCommissionAmount").textContent = `Comisión: $${paymentsCommAmount.toLocaleString('es-CO')} (sobre $${regularPayments.toLocaleString('es-CO')})`;

    // ✅ Detalles de abonos CON BADGES DE SEÑAS
    const paymentsDetailsHTML = (liq.liquidatedPayments || []).map(p => {
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
    document.getElementById("paymentsDetails").innerHTML = paymentsDetailsHTML || '<p style="padding: 10px; color: var(--medium-gray);">No hay abonos</p>';

    // Ventas
    document.getElementById("salesCount").textContent = liq.sales.count;
    document.getElementById("salesTotal").textContent = `$${liq.sales.total.toLocaleString('es-CO')}`;
    document.getElementById("salesAfterCommission").textContent = `$${salesAfterComm.toLocaleString('es-CO')}`;
    document.getElementById("salesCommissionAmount").textContent = `Comisión: $${salesCommAmount.toLocaleString('es-CO')} (no se suma a ingresos)`;

    // Detalles de ventas
    const salesDetailsHTML = (liq.liquidatedSales || []).map(s => `
        <div class="detail-item">
            <span>${s.clientName}${s.productName ? ' - ' + s.productName : ''}</span>
            <strong>$${s.amount.toLocaleString('es-CO')}</strong>
        </div>
    `).join('');
    document.getElementById("salesDetails").innerHTML = salesDetailsHTML || '<p style="padding: 10px; color: var(--medium-gray);">No hay ventas</p>';

    // Seguimiento de clientes
    if (liq.clientTracking) {
        document.getElementById("totalActiveClients").textContent = liq.clientTracking.totalActiveClients || 0;
        document.getElementById("clientsPaidToday").textContent = liq.clientTracking.paidToday || 0;
        document.getElementById("clientsDidNotPay").textContent = liq.clientTracking.didNotPayToday || 0;
        document.getElementById("effectivenessPercentage").textContent = `${liq.clientTracking.effectivenessPercentage || 0}%`;
    }

    // Inventario
    document.getElementById("inventoryCount").textContent = liq.inventory.productCount;
    document.getElementById("inventoryCost").textContent = `$${liq.inventory.totalCost.toLocaleString('es-CO')}`;

    // Detalles de inventario
    const inventoryDetailsHTML = (liq.liquidatedProducts || []).map(p => `
        <div class="detail-item">
            <span>${p.name}${p.brand ? ' - ' + p.brand : ''}</span>
            <strong>$${p.costPrice.toLocaleString('es-CO')}</strong>
        </div>
    `).join('');
    document.getElementById("inventoryDetails").innerHTML = inventoryDetailsHTML || '<p style="padding: 10px; color: var(--medium-gray);">No hay productos</p>';

// ✅ CALCULAR EL TOTAL DESDE liquidatedExpenses
let expensesTotal = 0;
let expensesCount = 0;

if (liq.liquidatedExpenses && liq.liquidatedExpenses.length > 0) {
    liq.liquidatedExpenses.forEach(expense => {
        if (expense.items && expense.items.length > 0) {
            expense.items.forEach(item => {
                expensesTotal += item.amount;
                expensesCount++;
            });
        }
    });
}
    document.getElementById("expensesCount").textContent = expensesCount;
    document.getElementById("expensesTotal").textContent = `$${expensesTotal.toLocaleString('es-CO')}`;

    // ✅ Detalles de gastos - ARREGLADO
    let expensesDetailsHTML = '';
    
    if (liq.liquidatedExpenses && liq.liquidatedExpenses.length > 0) {
        expensesDetailsHTML = liq.liquidatedExpenses.map(expense => {
            if (!expense.items || expense.items.length === 0) return '';
            
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
    }
    
    document.getElementById("expensesDetails").innerHTML = expensesDetailsHTML || '<p style="padding: 10px; color: var(--medium-gray);">No hay gastos</p>';

    // ✅ Resumen final con valores recalculados
    const totalExpensesCalc = liq.inventory.totalCost + expensesTotal;
    const realFinalCash = Math.round(liq.initialCash + realTotalIncome - totalExpensesCalc);
    
    document.getElementById("summaryInitial").textContent = `$${liq.initialCash.toLocaleString('es-CO')}`;
    document.getElementById("summaryIncome").textContent = `$${realTotalIncome.toLocaleString('es-CO')}`;
    document.getElementById("summaryExpenses").textContent = `$${totalExpensesCalc.toLocaleString('es-CO')}`;
    document.getElementById("summaryFinal").textContent = `$${realFinalCash.toLocaleString('es-CO')}`;

    // Notas
    document.getElementById("notesContent").textContent = liq.notes || "Sin notas";

    // Mostrar contenido
    document.getElementById("loadingContainer").style.display = "none";
    document.getElementById("mainContent").style.display = "block";
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