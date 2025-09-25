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

    // Calcular totales
    const totalPaid = sale.totalPaid || (sale.payments || []).reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
    const remainingDebt = (sale.price || 0) - totalPaid;
    const paymentPercentage = (totalPaid / (sale.price || 1)) * 100;

    // Formato de moneda
    const formatCurrency = (value) =>
        new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);

    // Escapar HTML
    const escapeHtml = (str) => {
        if (!str) return '';
        return str.replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
    };

    // Definir estado y clases
    const statusClass = remainingDebt <= 0 ? 'badge-paid' : totalPaid <= 0 ? 'badge-pending' : 'badge-partial';
    const statusText  = remainingDebt <= 0 ? 'Pagado' : totalPaid <= 0 ? 'Pendiente' : 'Parcial';

    // ---------- Tarjeta de cliente ----------
    saleDetailsContainer.innerHTML = `
        <section class="customer-card">
            <div class="customer-header">
                <img src="https://i.pravatar.cc/100?u=${encodeURIComponent(sale.clientName)}" alt="Avatar" class="avatar">
                <div>
                    <h2 class="customer-name">${escapeHtml(sale.clientName)}</h2>
                    <p class="customer-id">#${sale._id.slice(-6)}</p>
                </div>
                <div class="customer-badge ${statusClass}">${statusText}</div>
            </div>
            <div class="customer-body">
                <div class="info-group">
                    <i class="fas fa-phone"></i>
                    <span class="label">Teléfono</span>
                    <span class="value">${escapeHtml(sale.clientPhone || 'No registrado')}</span>
                </div>
                <div class="info-group">
                    <i class="fas fa-map-marker-alt"></i>
                    <span class="label">Dirección</span>
                    <span class="value">${escapeHtml(sale.clientAddress || 'No registrada')}</span>
                </div>
                <div class="info-group">
                    <i class="fas fa-calendar-check"></i>
                    <span class="label">Días de pago</span>
                    <span class="value">${escapeHtml(sale.paymentDays || 'No definidos')}</span>
                </div>
                <div class="info-group">
                    <i class="fas fa-coins"></i>
                    <span class="label">Cuotas</span>
                    <span class="value">${escapeHtml(sale.installments || '')}</span>
                </div>
            </div>
        </section>

        <section class="days-ribbon">
            <h3>Calendario de pagos <small>(clic para marcar como pagado)</small></h3>
            <div id="daysRibbon" class="days-container"></div>
        </section>
    `;

    // ---------- Estado de pago ----------
    let paymentStatusHTML = '';
    if (remainingDebt <= 0) {
        paymentStatusHTML = `<div class="payment-status status-paid">✓ PAGADO EN SU TOTALIDAD</div>`;
    } else if (totalPaid <= 0) {
        paymentStatusHTML = `<div class="payment-status status-pending">⚠ PENDIENTE DE PAGO</div>`;
    } else {
        paymentStatusHTML = `
            <div class="payment-status status-partial" style="--progress-width: ${paymentPercentage.toFixed(1)}%">
                ⚠ PAGO PARCIAL (${paymentPercentage.toFixed(1)}% completado)
            </div>`;
    }
    paymentStatusContainer.innerHTML = paymentStatusHTML;

    // ---------- Historial de abonos ----------
    if (sale.payments && sale.payments.length > 0) {
        const sorted = [...sale.payments].sort((a, b) => new Date(b.date) - new Date(a.date));
        paymentsContainer.innerHTML = `
            <h2>Historial de Abonos</h2>
            <table class="payments-table">
                <thead>
                    <tr><th>Fecha de Abono</th><th>Monto</th></tr>
                </thead>
                <tbody>
                    ${sorted.map(p => `
                        <tr>
                            <td>${formatDate(p.date)}</td>
                            <td class="payment-amount">${formatCurrency(p.amount)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } else {
        paymentsContainer.innerHTML = `
            <h2>Historial de Abonos</h2>
            <p style="text-align:center; margin:2rem 0; color:var(--secondary-color);">
                No hay abonos registrados para esta venta.
            </p>`;
    }

    // ---------- Cinta de días ----------
    renderDaysRibbon(sale.paymentDays, sale.payments);

    // ---------- Funciones auxiliares ----------
    function formatDate(dateString) {
        const date = new Date(dateString);
        const offset = date.getTimezoneOffset() * 60000;
        const localDate = new Date(date.getTime() - offset);
        return localDate.toLocaleDateString('es-CO', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function renderDaysRibbon(paymentDaysStr, payments) {
        const container = document.getElementById('daysRibbon');
        container.innerHTML = '';
        if (!paymentDaysStr) return;

        const dias = paymentDaysStr.split(',').map(d => parseInt(d.trim())).filter(n => !isNaN(n));
        const pagados = new Set(payments.map(p => new Date(p.date).getDate()));
        const hoy = new Date().getDate();

        dias.forEach((dia, i) => {
            const box = document.createElement('div');
            box.className = 'day-box';
            box.textContent = dia;
            box.style.animationDelay = `${i * 50}ms`;

            if (pagados.has(dia)) box.classList.add('paid');
            else box.classList.add('pending');

            if (dia === hoy) box.classList.add('today');

            box.addEventListener('click', () => {
                if (box.classList.contains('pending')) {
                    box.classList.remove('pending');
                    box.classList.add('paid');
                    // Aquí puedes llamar a tu API para registrar un abono
                }
            });

            container.appendChild(box);
        });
    }
});

function goBack() {
    window.location.href = "categories.html";
}
