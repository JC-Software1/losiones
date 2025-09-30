import { apiFetch } from "./utils/api.js";
import { getToken } from "./utils/auth.js";

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
        
        // Limpiar sessionStorage
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

    // Configuración inicial
    document.getElementById("initialCash").textContent = `$${liq.initialCash.toLocaleString('es-CO')}`;
    document.getElementById("paymentsCommission").textContent = `${liq.payments.commissionPercentage}%`;
    document.getElementById("salesCommission").textContent = `${liq.sales.commissionPercentage}%`;

    // Abonos
    document.getElementById("paymentsCount").textContent = liq.payments.count;
    document.getElementById("paymentsTotal").textContent = `$${liq.payments.total.toLocaleString('es-CO')}`;
    document.getElementById("initialPaymentsTotal").textContent = `$${(liq.payments.totalInitialPayments || 0).toLocaleString('es-CO')}`;
    document.getElementById("paymentsAfterCommission").textContent = `$${liq.payments.afterCommission.toLocaleString('es-CO')}`;
    const paymentsComm = liq.payments.total - liq.payments.afterCommission;
    document.getElementById("paymentsCommissionAmount").textContent = `Comisión: $${paymentsComm.toLocaleString('es-CO')}`;

    // Detalles de abonos
    const paymentsDetailsHTML = liq.liquidatedPayments.map(p => `
        <div class="detail-item">
            <span>${p.clientName}</span>
            <strong>$${p.amount.toLocaleString('es-CO')}</strong>
        </div>
    `).join('');
    document.getElementById("paymentsDetails").innerHTML = paymentsDetailsHTML || '<p style="padding: 10px; color: var(--medium-gray);">No hay abonos</p>';

    // Ventas
    document.getElementById("salesCount").textContent = liq.sales.count;
    document.getElementById("salesTotal").textContent = `$${liq.sales.total.toLocaleString('es-CO')}`;

    // Detalles de ventas
    const salesDetailsHTML = liq.liquidatedSales.map(s => `
        <div class="detail-item">
            <span>${s.clientName}</span>
            <strong>$${s.amount.toLocaleString('es-CO')}</strong>
        </div>
    `).join('');
    document.getElementById("salesDetails").innerHTML = salesDetailsHTML || '<p style="padding: 10px; color: var(--medium-gray);">No hay ventas</p>';

    // Inventario
    document.getElementById("inventoryCount").textContent = liq.inventory.productCount;
    document.getElementById("inventoryCost").textContent = `$${liq.inventory.totalCost.toLocaleString('es-CO')}`;

    // Detalles de inventario
    const inventoryDetailsHTML = liq.liquidatedProducts.map(p => `
        <div class="detail-item">
            <span>${p.name}</span>
            <strong>$${p.costPrice.toLocaleString('es-CO')}</strong>
        </div>
    `).join('');
    document.getElementById("inventoryDetails").innerHTML = inventoryDetailsHTML || '<p style="padding: 10px; color: var(--medium-gray);">No hay productos</p>';

    // Resumen final
    document.getElementById("summaryInitial").textContent = `$${liq.initialCash.toLocaleString('es-CO')}`;
    document.getElementById("summaryIncome").textContent = `$${liq.totalIncome.toLocaleString('es-CO')}`;
    document.getElementById("summaryExpenses").textContent = `$${liq.totalExpenses.toLocaleString('es-CO')}`;
    document.getElementById("summaryFinal").textContent = `$${liq.finalCash.toLocaleString('es-CO')}`;

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