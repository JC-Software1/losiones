import { apiFetch } from "./utils/api.js";
import { getToken } from "./utils/auth.js";
import "./authCheck.js";
import "./keepAlive.js";

// ✅ fuera de loadData, ya declarado
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
    const initialPaymentsElement = document.getElementById("initialPayments"); // Cambiado

    // Variables globales

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

            // ✅ CORRECCIÓN: Usar endpoint que respeta permisos de usuario
            const endpoint = '/sales'; // Este endpoint ya filtra por usuario automáticamente

            try {
                // Cargar ventas activas
                const activeSales = await apiFetch(endpoint, "GET", null, token);

                // Cargar ventas liquidadas
                const settledSales = await apiFetch('/sales/settled', "GET", null, token);

                // Combinar ambas
                const combined = [...activeSales, ...settledSales];
                const seenIds = new Set();
                allSales = combined.filter(sale => {
                    if (seenIds.has(sale._id)) return false;
                    seenIds.add(sale._id);
                    return true;
                });

                console.log('✅ Ventas activas:', activeSales.length);
                console.log('✅ Ventas liquidadas:', settledSales.length);
                console.log('✅ Total ventas del usuario:', allSales.length);

            } catch (error) {
                console.error('❌ Error al cargar ventas:', error);
                throw error;
            }

            allPayments = extractAllPayments(allSales);
            filteredPayments = [...allPayments];

            if (allPayments.length === 0) {
                showEmptyState();
            } else {
                displayPayments(filteredPayments);
                updateStatistics(filteredPayments, allSales);
            }

        } catch (error) {
            console.error('❌ Error completo:', error);
            showError("Error al cargar los datos: " + error.message);
        }
    }

    function extractAllPayments(sales) {
        let payments = [];

        sales.forEach(sale => {
            if (sale.payments && sale.payments.length > 0) {
                sale.payments.forEach((payment, index) => {
                    const totalPaid = sale.payments.reduce((sum, p) => sum + p.amount, 0);
                    const remainingAmount = Math.max(0, sale.price - totalPaid);
                    const progressPercentage = Math.min(100, (totalPaid / sale.price) * 100);
                    const isCompleted = totalPaid >= sale.price;

                    // 🔥 Identificar si es el pago inicial (primer pago Y coincide con advancePayment)
                    const isInitialPayment = index === 0 && sale.advancePayment > 0 && payment.amount === sale.advancePayment;

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
                        installments: sale.installments || 'No especificado',
                        isInitialPayment: isInitialPayment  // 🔥 Nueva propiedad
                    });
                });
            }
        });

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

        // 🔥 Ajustar fecha para zona horaria local
        const paymentDateObj = new Date(payment.date);
        // Compensar diferencia de zona horaria
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

        // 🔥 Ajustar fecha de venta para zona horaria local
        const saleDateObj = new Date(payment.saleDate);
        const localSaleDate = new Date(saleDateObj.getTime() + saleDateObj.getTimezoneOffset() * 60000);

        const saleDate = localSaleDate.toLocaleDateString('es-CO', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });

        const statusClass = payment.isCompleted ? "completed" : "pending";

        // 🔥 Agregar badge si es pago inicial
        const initialPaymentBadge = payment.isInitialPayment
            ? `<div class="status-badge" style="background: #9b59b6; margin-top: 4px;">Seña/Pago Inicial</div>`
            : '';

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
                ${initialPaymentBadge}
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

    function updateStatistics(payments, sales) {
        const stats = calculateStatistics(payments, sales);

        // Actualizar todos los valores
        totalPaymentsElement.textContent = `$${stats.totalAmount.toLocaleString('es-CO')}`;
        totalPaymentCountElement.textContent = stats.count;
        averagePaymentElement.textContent = `$${stats.averageAmount.toLocaleString('es-CO')}`;
        initialPaymentsElement.textContent = `$${stats.totalInitialPayments.toLocaleString('es-CO')}`;

        console.log('✅ Estadísticas actualizadas - Total mostrado:', stats.totalAmount);
    }

    function calculateStatistics(payments, sales) {
        console.log('🔍 calculateStatistics recibió:');
        console.log('   - payments:', payments.length);
        console.log('   - sales:', sales.length);

        const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
        const averageAmount = payments.length > 0 ? totalAmount / payments.length : 0;

        // 🔥 Calcular pagos iniciales solo de las ventas que tienen pagos filtrados
        const saleIds = [...new Set(payments.map(p => p.saleId))];
        const relevantSales = sales.filter(s => saleIds.includes(s._id));
        const totalInitialPayments = relevantSales.reduce((sum, s) => sum + (s.advancePayment || 0), 0);

        console.log('   - Ventas relevantes:', relevantSales.length);
        console.log('   - Total pagos iniciales:', totalInitialPayments);

        return {
            totalAmount,
            count: payments.length,
            averageAmount: Math.round(averageAmount),
            totalInitialPayments: Math.round(totalInitialPayments),
        };
    }

    function showCommissionModal(totalAbonado) {
        // Crear modal dinámicamente
        const modal = document.createElement('div');
        modal.id = 'commissionModal';
        modal.className = 'modal show';
        modal.style.zIndex = '10000';

        modal.innerHTML = `
            <div class="modal-content" style="max-width: 450px;">
                <div class="modal-header">
                    <h3 class="modal-title">
                        <i class="fas fa-percentage"></i> Calcular Comisión del Cobrador
                    </h3>
                    <button class="modal-close" onclick="closeCommissionModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div style="padding: 20px 0;">
                    <div class="form-group">
                        <label for="commissionPercentage" style="font-size: 16px; margin-bottom: 10px; display: block;">
                            ¿Qué porcentaje pagas al cobrador por abono?
                        </label>
                        <input 
                            type="number" 
                            id="commissionPercentage" 
                            placeholder="Ej: 10" 
                            min="0" 
                            max="100" 
                            step="0.1"
                            style="width: 100%; padding: 12px; font-size: 18px; text-align: center; border: 2px solid var(--accent); border-radius: var(--radius);"
                        >
                        <small style="display: block; text-align: center; color: var(--medium-gray); margin-top: 8px;">
                            Ingresa solo el número (sin el símbolo %)
                        </small>
                    </div>

                    <div style="margin-top: 30px; padding: 20px; background: var(--light-gray); border-radius: var(--radius); text-align: center;">
                        <div style="font-size: 14px; color: var(--medium-gray); margin-bottom: 8px;">
                            Total Abonado
                        </div>
                        <div style="font-size: 28px; font-weight: 700; color: var(--primary); margin-bottom: 20px;">
                            ${totalAbonado.toLocaleString('es-CO')}
                        </div>

                        <div id="commissionResult" style="display: none; margin-top: 20px; padding: 20px; background: linear-gradient(135deg, var(--success), #2ecc71); border-radius: var(--radius); color: white;">
                            <div style="font-size: 14px; margin-bottom: 8px; opacity: 0.9;">
                                Comisión del Cobrador
                            </div>
                            <div id="commissionAmount" style="font-size: 32px; font-weight: 700;">
                                $0
                            </div>
                            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.3);">
                                <div style="font-size: 14px; opacity: 0.9; margin-bottom: 4px;">
                                    Tu ganancia neta
                                </div>
                                <div id="netAmount" style="font-size: 24px; font-weight: 600;">
                                    $0
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="button-group" style="margin-top: 20px;">
                    <button class="btn btn-primary" onclick="calculateCommission(${totalAbonado})">
                        <i class="fas fa-calculator"></i> Calcular
                    </button>
                    <button class="btn btn-success" onclick="saveCommissionPercentage()" style="display: none;" id="saveCommissionBtn">
                        <i class="fas fa-save"></i> Guardar
                    </button>
                    <button class="btn btn-secondary" onclick="closeCommissionModal()">
                        <i class="fas fa-times"></i> Cerrar
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Cargar porcentaje guardado si existe
        loadSavedCommission();

        document.getElementById('commissionPercentage').focus();

        // Permitir calcular con Enter
        document.getElementById('commissionPercentage').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                calculateCommission(totalAbonado);
            }
        });
    }

    window.calculateCommission = function (totalAbonado) {
        const percentage = parseFloat(document.getElementById('commissionPercentage').value);

        if (isNaN(percentage) || percentage < 0 || percentage > 100) {
            showNotification('Por favor ingresa un porcentaje válido entre 0 y 100', 'warning');
            return;
        }

        const commissionAmount = (totalAbonado * percentage) / 100;
        const netAmount = totalAbonado - commissionAmount;

        const resultDiv = document.getElementById('commissionResult');
        const commissionAmountDiv = document.getElementById('commissionAmount');
        const netAmountDiv = document.getElementById('netAmount');

        commissionAmountDiv.textContent = `${Math.round(commissionAmount).toLocaleString('es-CO')}`;
        netAmountDiv.textContent = `${Math.round(netAmount).toLocaleString('es-CO')}`;

        resultDiv.style.display = 'block';
        resultDiv.style.animation = 'slideIn 0.3s ease';

        // Mostrar botón de guardar después de calcular
        document.getElementById('saveCommissionBtn').style.display = 'inline-flex';
    };

    async function loadSavedCommission() {
        try {
            const token = getToken();
            const response = await apiFetch("/commission", "GET", null, token);

            if (response && response.percentage !== undefined) {
                document.getElementById('commissionPercentage').value = response.percentage;
                console.log('✅ Porcentaje de comisión cargado:', response.percentage + '%');
            }
        } catch (error) {
            console.log('ℹ️ No hay porcentaje de comisión guardado');
        }
    }

    window.saveCommissionPercentage = async function () {
        const percentage = parseFloat(document.getElementById('commissionPercentage').value);

        if (isNaN(percentage) || percentage < 0 || percentage > 100) {
            showNotification('Por favor ingresa un porcentaje válido entre 0 y 100', 'warning');
            return;
        }

        try {
            const token = getToken();
            await apiFetch("/commission", "POST", { percentage }, token);

            // Mostrar mensaje de éxito
            const saveBtn = document.getElementById('saveCommissionBtn');
            const originalText = saveBtn.innerHTML;
            saveBtn.innerHTML = '<i class="fas fa-check"></i> ¡Guardado!';
            saveBtn.style.background = '#27ae60';

            setTimeout(() => {
                saveBtn.innerHTML = originalText;
                saveBtn.style.background = '';
            }, 2000);

            console.log('✅ Porcentaje de comisión guardado:', percentage + '%');
        } catch (error) {
            console.error('❌ Error al guardar comisión:', error);
            showNotification('No se pudo guardar el porcentaje de comisión: ' + error.message, 'error');
        }
    };

    window.closeCommissionModal = function () {
        const modal = document.getElementById('commissionModal');
        if (modal) {
            modal.style.animation = 'fadeOut 0.2s ease';
            setTimeout(() => modal.remove(), 200);
        }
    };

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
                applyFilters();
                showNotification("Abono eliminado correctamente.", "error");
            }, 300);

        } catch (error) {
            console.error("Error al eliminar abono:", error);
            cardElement.classList.remove("deleting");
            showNotification("No se pudo eliminar el abono: " + error.message, "error");
        }
    }

    function applyFilters() {
        const searchText = searchInput.value.toLowerCase().trim();
        const dateValue = dateFilter.value;

        if (searchText || dateValue) {
            clearFiltersBtn.classList.remove("hidden");
        } else {
            clearFiltersBtn.classList.add("hidden");
        }

        filteredPayments = [...allPayments];

        if (searchText) {
            filteredPayments = filteredPayments.filter(payment =>
                payment.clientName.toLowerCase().includes(searchText) ||
                payment.productName.toLowerCase().includes(searchText) ||
                payment.clientAddress.toLowerCase().includes(searchText)
            );
        }

        if (dateValue) {
            // 🔥 Parsear la fecha seleccionada correctamente
            const [year, month, day] = dateValue.split('-').map(Number);
            const selectedDateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            filteredPayments = filteredPayments.filter(payment => {
                // 🔥 Usar parseDateLocal para interpretar correctamente la fecha del pago
                const paymentDateObj = parseDateLocal(payment.date);
                const paymentYear = paymentDateObj.getFullYear();
                const paymentMonth = paymentDateObj.getMonth() + 1;
                const paymentDay = paymentDateObj.getDate();
                const paymentDateStr = `${paymentYear}-${String(paymentMonth).padStart(2, '0')}-${String(paymentDay).padStart(2, '0')}`;

                return paymentDateStr === selectedDateStr;
            });
        }

        // Actualizar lista y estadísticas con los filtros aplicados
        displayPayments(filteredPayments);

        // Recalcular estadísticas SOLO con las ventas que tienen pagos en el rango filtrado
        updateStatistics(filteredPayments, extractSalesFromPayments(filteredPayments));
    }

    // 🔥 Agregar esta función helper si no existe
    function parseDateLocal(dateString) {
        if (!dateString) return new Date(NaN);

        // Si es formato solo fecha "YYYY-MM-DD"
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            const [y, m, d] = dateString.split('-').map(Number);
            return new Date(y, m - 1, d);
        }

        // Si tiene timezone (ISO con Z o offset)
        const date = new Date(dateString);
        if (!isNaN(date)) {
            // Ajustar a zona local
            return new Date(date.getTime() + date.getTimezoneOffset() * 60000);
        }

        return new Date(dateString);
    }
    function extractSalesFromPayments(payments) {
        if (!payments || payments.length === 0) return [];

        const saleIds = [...new Set(payments.map(p => p.saleId))];
        console.log('🔍 saleIds desde abonos filtrados:', saleIds);
        console.log('📦 allSales disponibles:', allSales.map(s => s._id));

        const filtered = allSales.filter(sale => saleIds.includes(sale._id));
        console.log('✅ ventas encontradas:', filtered.length);
        return filtered;
    }

    function clearFilters() {
        searchInput.value = "";
        dateFilter.value = "";
        clearFiltersBtn.classList.add("hidden");
        filteredPayments = [...allPayments];
        displayPayments(filteredPayments);
        updateStatistics(filteredPayments, allSales);
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

    // Estilos para animaciones
    if (!document.getElementById('commissionModalStyles')) {
        const styles = document.createElement('style');
        styles.id = 'commissionModalStyles';
        styles.innerHTML = `
            @keyframes slideIn {
                from { transform: translateY(-20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
        `;
        document.head.appendChild(styles);
    }
});