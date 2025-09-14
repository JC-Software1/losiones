import { apiFetch } from "./utils/api.js";
import { getToken } from "./utils/auth.js";
import "./keepAlive.js";

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
    const todayPaymentsElement = document.getElementById("todayPayments");

    // Variables globales
    let allSales = [];
    let allPayments = [];
    let filteredPayments = [];

    // Configuración del menú
    setupMenu();

    // Inicialización
    try {
        const token = getToken();
        if (!token) {
            window.location.href = "login.html";
            return;
        }

        await loadData();
        setupEventListeners();

    } catch (error) {
        console.error("Error al inicializar abonos:", error);
        showError("No se pudieron cargar los abonos, vuelva a intentarlo.");
    }

    // ========== FUNCIONES PRINCIPALES ==========

    async function loadData() {
        try {
            showLoading();
            const token = getToken();
            
            // Cargar todas las ventas (incluyendo liquidadas para historial completo)
            allSales = await apiFetch("/sales/all", "GET", null, token);
            
            // Extraer todos los pagos
            allPayments = extractAllPayments(allSales);
            filteredPayments = [...allPayments];

            if (allPayments.length === 0) {
                showEmptyState();
            } else {
                displayPayments(filteredPayments);
                updateStatistics(filteredPayments);
            }

        } catch (error) {
            showError("Error al cargar los datos: " + error.message);
        }
    }

    function extractAllPayments(sales) {
        let payments = [];
        
        sales.forEach(sale => {
            if (sale.payments && sale.payments.length > 0) {
                sale.payments.forEach(payment => {
                    // Calcular métricas del crédito
                    const totalPaid = sale.payments.reduce((sum, p) => sum + p.amount, 0);
                    const remainingAmount = Math.max(0, sale.price - totalPaid);
                    const progressPercentage = Math.min(100, (totalPaid / sale.price) * 100);
                    const isCompleted = totalPaid >= sale.price;
                    
                    payments.push({
                        ...payment,
                        clientName: sale.clientName,
                        clientAddress: sale.clientAddress || 'Sin dirección',
                        productName: sale.productName,
                        saleId: sale._id,
                        saleDate: sale.saleDate,
                        totalPrice: sale.price,
                        totalPaid,
                        remainingAmount,
                        progressPercentage,
                        isCompleted,
                        isSettled: sale.settled || false,
                        settlementDate: sale.settledDate,
                        installments: sale.installments || 'No especificado'
                    });
                });
            }
        });
        
        // Ordenar por fecha descendente (más recientes primero)
        return payments.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    function displayPayments(payments) {
        paymentsList.innerHTML = "";
        
        if (payments.length === 0) {
            showEmptyState();
            return;
        }

        hideEmptyState();

        payments.forEach(payment => {
            const card = createPaymentCard(payment);
            paymentsList.appendChild(card);
        });
    }

    function createPaymentCard(payment) {
        const card = document.createElement("div");
        card.classList.add("sale-card");
        card.setAttribute("data-payment-id", payment._id);

        const paymentDate = new Date(payment.date).toLocaleDateString('es-CO', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        
        const paymentTime = new Date(payment.date).toLocaleTimeString('es-CO', {
            hour: '2-digit',
            minute: '2-digit'
        });

        const saleDate = new Date(payment.saleDate).toLocaleDateString('es-CO', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });

        const statusClass = payment.isCompleted ? "completed" : "pending";
        const statusText = payment.isCompleted ? "Crédito completado" : "Crédito pendiente";
        
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
                    <p><i class="fas fa-map-marker-alt"></i> ${payment.clientAddress}</p>
                </div>
                <div class="sale-amount">
                    <div class="debt-amount">$${payment.amount.toLocaleString('es-CO')}</div>
                    <div class="status-badge ${statusClass}">${payment.isCompleted ? 'Completado' : 'Pendiente'}</div>
                </div>
            </div>

            <div class="payment-details">
                <div class="detail-row">
                    <div class="detail-group">
                        <span class="detail-label">Precio total del producto:</span>
                        <span class="detail-value">$${payment.totalPrice.toLocaleString('es-CO')}</span>
                    </div>
                    <div class="detail-group">
                        <span class="detail-label">Total pagado hasta ahora:</span>
                        <span class="detail-value">$${payment.totalPaid.toLocaleString('es-CO')}</span>
                    </div>
                </div>
                
                <div class="detail-row">
                    <div class="detail-group">
                        <span class="detail-label">Saldo restante:</span>
                        <span class="detail-value remaining">$${payment.remainingAmount.toLocaleString('es-CO')}</span>
                    </div>
                    <div class="detail-group">
                        <span class="detail-label">Modalidad de pago:</span>
                        <span class="detail-value">${payment.installments}</span>
                    </div>
                </div>

                ${settlementInfo}
            </div>

            <div class="progress-bar">
                <div class="progress-fill" style="width: ${payment.progressPercentage}%"></div>
            </div>
            <div class="progress-text">${payment.progressPercentage.toFixed(0)}% pagado</div>

            <div class="payment-info">
                <div class="payment-date">
                    <div class="date-icon">
                        <i class="fas fa-calendar-alt"></i>
                    </div>
                    <div>
                        <div class="detail-group">
                            <span class="detail-label">Fecha del abono:</span>
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
                <span>${statusText}</span>
            </div>

            <div class="sale-actions">
                <button class="btn btn-danger btn-sm btn-delete" data-payment-id="${payment._id}" data-sale-id="${payment.saleId}">
                    <i class="fas fa-trash"></i> Eliminar abono
                </button>
            </div>
        `;

        // Agregar evento de eliminación
        const deleteBtn = card.querySelector(".btn-delete");
        deleteBtn.addEventListener("click", () => deletePayment(payment._id, payment.saleId, card));

        return card;
    }

    function updateStatistics(payments) {
        const stats = calculateStatistics(payments);
        
        // Actualizar elementos del DOM
        totalPaymentsElement.textContent = `$${stats.totalAmount.toLocaleString('es-CO')}`;
        totalPaymentCountElement.textContent = stats.count;
        averagePaymentElement.textContent = `$${stats.averageAmount.toLocaleString('es-CO')}`;
        todayPaymentsElement.textContent = `$${stats.todayAmount.toLocaleString('es-CO')}`;
    }

    function calculateStatistics(payments) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayPayments = payments.filter(payment => {
            const paymentDate = new Date(payment.date);
            paymentDate.setHours(0, 0, 0, 0);
            return paymentDate.getTime() === today.getTime();
        });

        const totalAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);
        const todayAmount = todayPayments.reduce((sum, payment) => sum + payment.amount, 0);
        const averageAmount = payments.length > 0 ? totalAmount / payments.length : 0;

        return {
            totalAmount,
            count: payments.length,
            averageAmount: Math.round(averageAmount),
            todayAmount,
            todayCount: todayPayments.length
        };
    }

    async function deletePayment(paymentId, saleId, cardElement) {
        if (!confirm("¿Estás seguro de que deseas eliminar este abono? Esta acción no se puede deshacer.")) {
            return;
        }

        try {
            const token = getToken();
            
            // Animación de eliminación
            cardElement.classList.add("deleting");
            
            // Llamada a la API
            await apiFetch(`/sales/${saleId}/payment/${paymentId}`, "DELETE", null, token);

            setTimeout(() => {
                // Actualizar datos locales
                allPayments = allPayments.filter(p => p._id !== paymentId);
                applyFilters();
                
                alert("Abono eliminado correctamente.");
            }, 300);

        } catch (error) {
            console.error("Error al eliminar abono:", error);
            cardElement.classList.remove("deleting");
            alert("No se pudo eliminar el abono: " + error.message);
        }
    }

    function applyFilters() {
        const searchText = searchInput.value.toLowerCase().trim();
        const dateValue = dateFilter.value;
        
        // Mostrar/ocultar botón de limpiar filtros
        if (searchText || dateValue) {
            clearFiltersBtn.classList.remove("hidden");
        } else {
            clearFiltersBtn.classList.add("hidden");
        }
        
        filteredPayments = [...allPayments];
        
        // Filtro por texto
        if (searchText) {
            filteredPayments = filteredPayments.filter(payment => 
                payment.clientName.toLowerCase().includes(searchText) ||
                payment.productName.toLowerCase().includes(searchText) ||
                payment.clientAddress.toLowerCase().includes(searchText)
            );
        }
        
        // Filtro por fecha
        if (dateValue) {
            const selectedDate = new Date(dateValue);
            selectedDate.setHours(0, 0, 0, 0);
            
            filteredPayments = filteredPayments.filter(payment => {
                const paymentDate = new Date(payment.date);
                paymentDate.setHours(0, 0, 0, 0);
                return paymentDate.getTime() === selectedDate.getTime();
            });
        }
        
        displayPayments(filteredPayments);
        updateStatistics(filteredPayments);
    }

    function clearFilters() {
        searchInput.value = "";
        dateFilter.value = "";
        clearFiltersBtn.classList.add("hidden");
        filteredPayments = [...allPayments];
        displayPayments(filteredPayments);
        updateStatistics(filteredPayments);
    }

    function setupEventListeners() {
        searchInput.addEventListener("input", applyFilters);
        dateFilter.addEventListener("input", applyFilters);
        clearFiltersBtn.addEventListener("click", clearFilters);
    }

    function setupMenu() {
        const menuToggle = document.getElementById("menuToggle");
        const menuItems = document.getElementById("menuItems");
        const backdrop = document.getElementById("backdrop");
        const menuClose = document.getElementById("menuClose");

        if (menuToggle && menuItems && backdrop) {
            menuToggle.addEventListener("click", () => {
                menuItems.classList.toggle("show");
                backdrop.classList.toggle("show");
                menuToggle.classList.toggle("open");
            });

            backdrop.addEventListener("click", closeMenu);
            menuClose.addEventListener("click", closeMenu);

            function closeMenu() {
                menuItems.classList.remove("show");
                backdrop.classList.remove("show");
                menuToggle.classList.remove("open");
            }
        }
    }

    // ========== FUNCIONES DE UI ==========

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
        
        // Resetear estadísticas
        totalPaymentsElement.textContent = "$0";
        totalPaymentCountElement.textContent = "0";
        averagePaymentElement.textContent = "$0";
        todayPaymentsElement.textContent = "$0";
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

    // ========== FUNCIONES ADICIONALES DE ANÁLISIS ==========

    function getTopPayingClients(payments, limit = 5) {
        const clientTotals = {};
        
        payments.forEach(payment => {
            if (!clientTotals[payment.clientName]) {
                clientTotals[payment.clientName] = 0;
            }
            clientTotals[payment.clientName] += payment.amount;
        });

        return Object.entries(clientTotals)
            .sort(([,a], [,b]) => b - a)
            .slice(0, limit)
            .map(([name, total]) => ({ name, total }));
    }

    function getPaymentTrendsByMonth(payments) {
        const trends = {};
        
        payments.forEach(payment => {
            const date = new Date(payment.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            if (!trends[monthKey]) {
                trends[monthKey] = { total: 0, count: 0 };
            }
            
            trends[monthKey].total += payment.amount;
            trends[monthKey].count += 1;
        });

        return trends;
    }

    function getAveragePaymentsByDayOfWeek(payments) {
        const dayTotals = Array(7).fill(0).map(() => ({ total: 0, count: 0 }));
        const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        
        payments.forEach(payment => {
            const dayOfWeek = new Date(payment.date).getDay();
            dayTotals[dayOfWeek].total += payment.amount;
            dayTotals[dayOfWeek].count += 1;
        });

        return dayTotals.map((day, index) => ({
            day: dayNames[index],
            average: day.count > 0 ? day.total / day.count : 0,
            count: day.count
        }));
    }

    // Exponer funciones útiles para debugging o uso externo
    window.abonosAnalytics = {
        getTopPayingClients: () => getTopPayingClients(filteredPayments),
        getPaymentTrends: () => getPaymentTrendsByMonth(filteredPayments),
        getDayOfWeekAnalysis: () => getAveragePaymentsByDayOfWeek(filteredPayments),
        getCurrentStats: () => calculateStatistics(filteredPayments),
        getAllPayments: () => filteredPayments
    };
});