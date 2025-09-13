document.addEventListener("DOMContentLoaded", () => {
    const saleDetailsContainer = document.getElementById("saleDetails");
    const paymentsContainer = document.getElementById("paymentsDetails");
    const paymentStatusContainer = document.getElementById("paymentStatus");
    const sale = JSON.parse(localStorage.getItem("saleDetails"));

    if (!sale) {
        saleDetailsContainer.innerHTML = `
            <div class="detail-card" style="grid-column: 1 / -1;">
                <p class="detail-value">No hay detalles disponibles.</p>
            </div>`;
        return;
    }

    // Calcular el total abonado
    const totalPaid = sale.totalPaid || sale.payments.reduce((sum, payment) => sum + payment.amount, 0) || 0;
    const remainingDebt = sale.price - totalPaid;
    const paymentPercentage = (totalPaid / sale.price) * 100;

    // Formato para moneda colombiana
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(value);
    };

    // Generar tarjetas de detalles
    saleDetailsContainer.innerHTML = `
        <div class="detail-card">
            <span class="detail-label">ID de Venta</span>
            <span class="detail-value">${sale._id}</span>
        </div>
        <div class="detail-card">
            <span class="detail-label">Cliente</span>
            <span class="detail-value">${sale.clientName}</span>
        </div>
        <div class="detail-card">
            <span class="detail-label">Producto</span>
            <span class="detail-value">${sale.productName}</span>
        </div>
        <div class="detail-card">
            <span class="detail-label">Fecha de Venta</span>
            <span class="detail-value">${formatDate(sale.saleDate)}</span>
        </div>
        <div class="detail-card">
            <span class="detail-label">Precio Total</span>
            <span class="detail-value price-value">${formatCurrency(sale.price)}</span>
        </div>
        <div class="detail-card">
            <span class="detail-label">Cuotas Establecidas</span>
            <span class="detail-value">${sale.installments}</span>
        </div>
        <div class="detail-card">
            <span class="detail-label">Total Abonado</span>
            <span class="detail-value paid-value">${formatCurrency(totalPaid)}</span>
        </div>
        <div class="detail-card">
            <span class="detail-label">Deuda Restante</span>
            <span class="detail-value debt-value">${formatCurrency(remainingDebt)}</span>
        </div>
        <div class="detail-card">
            <span class="detail-label">Dirección de Entrega</span>
            <span class="detail-value">${sale.clientAddress || 'No disponible'}</span>
        </div>
    `;

    // Definir el estado del pago
    let paymentStatusHTML = '';
    if (remainingDebt <= 0) {
        paymentStatusHTML = `<div class="payment-status status-paid">✓ PAGADO EN SU TOTALIDAD</div>`;
    } else if (totalPaid <= 0) {
        paymentStatusHTML = `<div class="payment-status status-pending">⚠ PENDIENTE DE PAGO</div>`;
    } else {
        paymentStatusHTML = `
            <div class="payment-status status-partial">
                ⚠ PAGO PARCIAL (${paymentPercentage.toFixed(1)}% completado)
            </div>`;
    }
    paymentStatusContainer.innerHTML = paymentStatusHTML;

    // Mostrar el historial de abonos
    if (sale.payments && sale.payments.length > 0) {
        let paymentsHTML = `
            <h2>Historial de Abonos</h2>
            <table class="payments-table">
                <thead>
                    <tr>
                        <th>Fecha de Abono</th>
                        <th>Monto</th>
                    </tr>
                </thead>
                <tbody>
        `;

        // Ordenar los pagos por fecha (más recientes primero)
        const sortedPayments = [...sale.payments].sort((a, b) => 
            new Date(b.date) - new Date(a.date)
        );

        sortedPayments.forEach(payment => {
            paymentsHTML += `
                <tr>
                    <td>${formatDate(payment.date)}</td>
                    <td class="payment-amount">${formatCurrency(payment.amount)}</td>
                </tr>
            `;
        });

        paymentsHTML += `
                </tbody>
            </table>
        `;
        
        paymentsContainer.innerHTML = paymentsHTML;
    } else {
        paymentsContainer.innerHTML = `
            <h2>Historial de Abonos</h2>
            <p style="text-align: center; margin: 2rem 0; color: var(--text-secondary);">
                No hay abonos registrados para esta venta.
            </p>`;
    }
});

// Formatear fechas en formato local
function formatDate(dateString) {
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    
    function formatDate(dateString) {
    const date = new Date(dateString);
    const offset = date.getTimezoneOffset() * 60000;
    const localDate = new Date(date.getTime() - offset);
    
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    
    return localDate.toLocaleDateString('es-CO', options);
}
}

function goBack() {
    window.location.href = "categories.html";
}