import { apiFetch } from "./utils/api.js";
import { getToken } from "./utils/auth.js";
import { setupInfiniteScroll } from "./utils/infiniteScroll.js";
import "./authCheck.js";
import "./keepAlive.js";

let allSales = [];


document.addEventListener("DOMContentLoaded", async () => {
    // Referencias DOM
    const paymentsList = document.getElementById("paymentsList");
    const searchInput = document.getElementById("searchInput");
    const dateFilter = document.getElementById("dateFilter");
    const clearFiltersBtn = document.getElementById("clearFilters");
    const emptyState = document.getElementById("emptyState");

    // Referencias de estadísticas
    const totalPaymentsElement = document.getElementById("totalPayments");
    const totalPaymentCountElement = document.getElementById("totalPaymentCount");
    const averagePaymentElement = document.getElementById("averagePayment");
    const initialPaymentsElement = document.getElementById("initialPayments");

    let currentPage = 1;
    let hasMoreData = true;
    let isLoadingMore = false;
    let observerInstance = null;
    let allPayments = [];
    let filteredPayments = [];

    try {
        const token = getToken();
        if (!token) {
            window.location.href = "login.html";
            return;
        }

        await loadData(true);
        setupEventListeners();

    } catch (error) {
        console.error("Error al inicializar abonos:", error);
        showError("No se pudieron cargar los abonos, vuelva a intentarlo.");
    }

    async function loadData(reset = false) {
        try {
            if (reset) {
                currentPage = 1;
                hasMoreData = true;
                showLoading();
            }

            const token = getToken();
            const search = searchInput.value.trim();
            const dateVal = dateFilter.value;

            let url = `/sales/payments?page=${currentPage}&limit=20`;
            if (search) url += `&search=${encodeURIComponent(search)}`;
            if (dateVal) {
                url += `&dateFrom=${dateVal}T00:00:00.000Z&dateTo=${dateVal}T23:59:59.999Z`;
            }

            const res = await apiFetch(url, "GET", null, token);
            const items = res.items || [];
            hasMoreData = res.hasMore;

            if (reset) {
                allPayments = items;
            } else {
                allPayments = [...allPayments, ...items];
            }
            filteredPayments = [...allPayments];

            if (reset && allPayments.length === 0) {
                showEmptyState();
            } else {
                hideEmptyState();
                displayPayments(filteredPayments, reset);

                if (res.stats && reset) {
                    updateStatisticsFromServer(res.stats);
                } else if (reset) {
                    updateStatisticsLocal(filteredPayments);
                }

                ensureSentinel();
            }

        } catch (error) {
            console.error('❌ Error al cargar abonos:', error);
            if (reset) showError("Error al cargar los datos: " + error.message);
        }
    }

    function ensureSentinel() {
        let sentinel = document.getElementById("scrollSentinel");
        if (!sentinel) {
            sentinel = document.createElement("div");
            sentinel.id = "scrollSentinel";
            sentinel.className = "scroll-sentinel";
            sentinel.innerHTML = `
                <div class="scroll-spinner"></div>
                <div class="scroll-end-msg ${hasMoreData ? '' : 'visible'}">
                    ${hasMoreData ? '' : 'No hay más abonos'}
                </div>
            `;
            paymentsList.parentNode.appendChild(sentinel);
        } else {
            const msg = sentinel.querySelector(".scroll-end-msg");
            if (msg) {
                msg.textContent = hasMoreData ? '' : 'No hay más abonos';
                msg.classList.toggle('visible', !hasMoreData);
            }
        }

        if (!observerInstance) {
            observerInstance = setupInfiniteScroll({
                container: paymentsList,
                sentinel,
                fetchMore: async () => {
                    if (!hasMoreData || isLoadingMore) return;
                    currentPage++;
                    sentinel.classList.add("loading");
                    await loadData(false);
                    sentinel.classList.remove("loading");
                },
                hasMore: () => hasMoreData,
                getLoading: () => isLoadingMore,
                setLoading: (v) => { isLoadingMore = v; }
            });
        }
    }

    function displayPayments(payments, reset = false) {
        if (reset) {
            paymentsList.innerHTML = "";
        }

        if (payments.length === 0 && reset) {
            showEmptyState();
            return;
        }

        hideEmptyState();

        // Si no es reset, renderizamos solo los nuevos elementos (desde el offset)
        const startIndex = reset ? 0 : paymentsList.children.length;
        const newPayments = payments.slice(startIndex);

        newPayments.forEach((payment, index) => {
            const card = createPaymentCard(payment);
            card.classList.add("fade-in-up");
            card.style.animationDelay = `${(index % 20) * 0.03}s`;
            paymentsList.appendChild(card);
        });
    }

    function createPaymentCard(payment) {
        const card = document.createElement("div");
        card.classList.add("sale-card");
        card.setAttribute("data-payment-id", payment._id);

        const paymentDateObj = new Date(payment.date);
        const localPaymentDate = new Date(paymentDateObj.getTime() + paymentDateObj.getTimezoneOffset() * 60000);

        const paymentDate = localPaymentDate.toLocaleDateString('es-CO', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });

        const paymentTime = localPaymentDate.toLocaleTimeString('es-CO', {
            hour: '2-digit',
            minute: '2-digit'
        });

        const saleDateObj = new Date(payment.saleDate);
        const localSaleDate = new Date(saleDateObj.getTime() + saleDateObj.getTimezoneOffset() * 60000);

        const saleDate = localSaleDate.toLocaleDateString('es-CO', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });

        const statusClass = payment.isCompleted ? "completed" : "pending";

        const initialPaymentBadge = payment.isInitialPayment
            ? `<div class="status-badge" style="background: var(--green-700); color: #fff; margin-top: 4px;">Seña/Pago Inicial</div>`
            : '';

        const esTransferencia = payment.metodoPago === 'transferencia';
        const metodoBadge = `
            <div class="status-badge" style="background: ${esTransferencia ? '#26221c' : '#3f9e70'}; color: #fff; margin-top: 4px;">
                <i class="fas fa-${esTransferencia ? 'exchange-alt' : 'money-bill-wave'}"></i>
                ${esTransferencia ? 'Transferencia' : 'Efectivo'}
            </div>`;

        let settlementInfo = '';
        if (payment.settlementDate) {
            const settlementDate = new Date(payment.settlementDate).toLocaleDateString('es-CO', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
            settlementInfo = `
            <div class="detail-group">
                <span class="detail-label">Liquidado el:</span>
                <span class="detail-value">${settlementDate}</span>
            </div>
        `;
        }

        card.innerHTML = `
        <div class="sale-header">
            <div class="sale-info">
                <h3>${payment.clientName}</h3>
                <p><i class="fas fa-box"></i> ${payment.productName}</p>
                <p><i class="fas fa-map-marker-alt"></i> ${payment.clientAddress || 'Sin dirección'}</p>
            </div>
            <div class="sale-amount">
                <div class="debt-amount">$${payment.amount.toLocaleString('es-CO')}</div>
                <div class="status-badge ${statusClass}">${payment.isCompleted ? 'Completado' : 'Pendiente'}</div>
                ${initialPaymentBadge}
                ${metodoBadge}
            </div>
        </div>

        <div class="payment-details">
            <div class="detail-row">
                <div class="detail-group">
                    <span class="detail-label">Precio total del producto:</span>
                    <span class="detail-value">$${(payment.totalPrice || 0).toLocaleString('es-CO')}</span>
                </div>
                <div class="detail-group">
                    <span class="detail-label">Total pagado hasta ahora:</span>
                    <span class="detail-value">$${(payment.totalPaid || 0).toLocaleString('es-CO')}</span>
                </div>
            </div>
            
            <div class="detail-row">
                <div class="detail-group">
                    <span class="detail-label">Saldo restante:</span>
                    <span class="detail-value remaining">$${(payment.remainingAmount || 0).toLocaleString('es-CO')}</span>
                </div>
                <div class="detail-group">
                    <span class="detail-label">Modalidad de pago:</span>
                    <span class="detail-value">${payment.installments || 'No especificado'}</span>
                </div>
            </div>

            <div class="detail-row">
                <div class="detail-group">
                    <span class="detail-label">Método de pago:</span>
                    <span class="detail-value">
                        <i class="fas fa-${esTransferencia ? 'exchange-alt' : 'money-bill-wave'}"></i>
                        ${esTransferencia ? 'Transferencia' : 'Efectivo'}
                    </span>
                </div>
            </div>

            ${settlementInfo}
        </div>

        <div class="progress-bar">
            <div class="progress-fill" style="width: ${payment.progressPercentage || 0}%"></div>
        </div>
        <div class="progress-text">${(payment.progressPercentage || 0).toFixed(0)}% pagado</div>

        <div class="payment-info">
            <div class="payment-date">
                <div class="date-icon">
                    <i class="fas fa-calendar-alt"></i>
                </div>
                <div>
                    <div class="detail-group">
                        <span class="detail-label">${payment.isInitialPayment ? 'Fecha de la seña/pago inicial:' : 'Fecha del abono:'}</span>
                        <span class="detail-value">${paymentDate} a las ${paymentTime}</span>
                    </div>
                    <div class="detail-group">
                        <span class="detail-label">Venta realizada el:</span>
                        <span class="detail-value">${saleDate}</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="credit-status">
            <div class="status-indicator ${statusClass}"></div>
            <span>${payment.isCompleted ? 'Crédito completado' : 'Crédito pendiente'}</span>
        </div>

        <div class="sale-actions">
            <button class="btn btn-danger btn-sm btn-delete" data-payment-id="${payment._id}" data-sale-id="${payment.saleId}">
                <i class="fas fa-trash"></i> Eliminar ${payment.isInitialPayment ? 'pago inicial' : 'abono'}
            </button>
        </div>
    `;

        const deleteBtn = card.querySelector(".btn-delete");
        deleteBtn.addEventListener("click", () => deletePayment(payment._id, payment.saleId, card));

        return card;
    }

    function updateStatisticsFromServer(stats) {
        totalPaymentsElement.textContent = `$${stats.totalAmount.toLocaleString('es-CO')}`;
        totalPaymentCountElement.textContent = stats.count;
        averagePaymentElement.textContent = `$${stats.averageAmount.toLocaleString('es-CO')}`;
        initialPaymentsElement.textContent = `$${stats.totalInitialPayments.toLocaleString('es-CO')}`;

        const cashElement = document.getElementById('cashPayments');
        const transferElement = document.getElementById('transferPayments');
        if (cashElement) cashElement.textContent = `$${stats.totalEfectivo.toLocaleString('es-CO')}`;
        if (transferElement) transferElement.textContent = `$${stats.totalTransferencia.toLocaleString('es-CO')}`;
    }

    function updateStatisticsLocal(payments) {
        const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
        const averageAmount = payments.length > 0 ? totalAmount / payments.length : 0;
        const totalEfectivo = payments.filter(p => p.metodoPago !== 'transferencia').reduce((sum, p) => sum + p.amount, 0);
        const totalTransferencia = payments.filter(p => p.metodoPago === 'transferencia').reduce((sum, p) => sum + p.amount, 0);
        const totalInitialPayments = payments.filter(p => p.isInitialPayment).reduce((sum, p) => sum + p.amount, 0);

        totalPaymentsElement.textContent = `$${totalAmount.toLocaleString('es-CO')}`;
        totalPaymentCountElement.textContent = payments.length;
        averagePaymentElement.textContent = `$${Math.round(averageAmount).toLocaleString('es-CO')}`;
        initialPaymentsElement.textContent = `$${totalInitialPayments.toLocaleString('es-CO')}`;

        const cashElement = document.getElementById('cashPayments');
        const transferElement = document.getElementById('transferPayments');
        if (cashElement) cashElement.textContent = `$${Math.round(totalEfectivo).toLocaleString('es-CO')}`;
        if (transferElement) transferElement.textContent = `$${Math.round(totalTransferencia).toLocaleString('es-CO')}`;
    }

    function applyFilters() {
        const searchText = searchInput.value.trim();
        const dateValue = dateFilter.value;

        if (searchText || dateValue) {
            clearFiltersBtn.classList.remove("hidden");
        } else {
            clearFiltersBtn.classList.add("hidden");
        }

        loadData(true);
    }

    function clearFilters() {
        searchInput.value = "";
        dateFilter.value = "";
        clearFiltersBtn.classList.add("hidden");
        loadData(true);
    }

    function setupEventListeners() {
        let debounceTimer;
        searchInput.addEventListener("input", () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(applyFilters, 300);
        });
        dateFilter.addEventListener("change", applyFilters);
        clearFiltersBtn.addEventListener("click", clearFilters);
    }

    async function deletePayment(paymentId, saleId, cardElement) {
        if (!await showConfirm("¿Estás seguro de que deseas eliminar este abono? Esta acción no se puede deshacer.")) {
            return;
        }

        try {
            const token = getToken();
            cardElement.classList.add("deleting");

            await apiFetch(`/sales/${saleId}/payment/${paymentId}`, "DELETE", null, token);

            setTimeout(() => {
                allPayments = allPayments.filter(p => p._id !== paymentId);
                displayPayments(allPayments, true);
                updateStatisticsLocal(allPayments);
                showNotification("Abono eliminado correctamente.", "error");
            }, 300);

        } catch (error) {
            console.error("Error al eliminar abono:", error);
            cardElement.classList.remove("deleting");
            showNotification("No se pudo eliminar el abono: " + error.message, "error");
        }
    }

    function showLoading() {
        paymentsList.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
            </div>
        `;
        emptyState.classList.add("hidden");
    }

    function showEmptyState() {
        paymentsList.innerHTML = "";
        emptyState.classList.remove("hidden");

        totalPaymentsElement.textContent = "$0";
        totalPaymentCountElement.textContent = "0";
        averagePaymentElement.textContent = "$0";
        initialPaymentsElement.textContent = "$0";
    }

    function hideEmptyState() {
        emptyState.classList.add("hidden");
    }

    function showError(message) {
        paymentsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error al cargar datos</h3>
                <p>${message}</p>
                <button class="btn btn-primary" onclick="window.location.reload()">
                    <i class="fas fa-refresh"></i> Reintentar
                </button>
            </div>
        `;
        emptyState.classList.add("hidden");
    }

    if (!document.getElementById('commissionModalStyles')) {
        const styles = document.createElement('style');
        styles.id = 'commissionModalStyles';
        styles.innerHTML = `
            @keyframes slideIn {
                from { transform: translateY(-20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
        `;
        document.head.appendChild(styles);
    }
});