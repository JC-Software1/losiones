/* ---------- módulos (sin cambios) ---------- */
import { apiFetch } from "../utils/api.js";
import { getToken } from "../utils/auth.js";
import "../keepAlive.js";

/* ---------- referencias DOM (sin cambios) ---------- */



async function verificarPermisosYOcultarElementos() {
    try {
        const token = getToken();
        const response = await apiFetch('/auth/mis-permisos', 'GET', null, token);
        const { permisosDetallados, tipo } = response;
        
        const btnLiquidacion = document.querySelector('.btn-go-liquidation');
        
        if (!btnLiquidacion) return;
        
        // Admins y jefes: acceso completo
        if (tipo === 2 || tipo === 3) {
            btnLiquidacion.style.display = 'inline-flex';
            return;
        }
        
        // Vendedores sin permiso
        if (!permisosDetallados?.realizarLiquidacion) {
            btnLiquidacion.style.display = 'none';
            
            // Opcional: agregar mensaje informativo
            const mensaje = document.createElement('div');
            mensaje.style.cssText = `
                background: #fff3cd;
                color: #856404;
                padding: 10px 15px;
                border-radius: 8px;
                border-left: 4px solid #ffc107;
                font-size: 13px;
                margin: 10px 0;
                display: flex;
                align-items: center;
                gap: 8px;
            `;
            mensaje.innerHTML = `
                <i class="fas fa-info-circle"></i>
                <span>No tienes permiso para realizar liquidaciones. Contacta a tu supervisor.</span>
            `;
            
            // Insertar después del grid de menú
            const menuGrid = document.querySelector('.menu-grid');
            if (menuGrid) {
                menuGrid.after(mensaje);
            }
        }
        
    } catch (error) {
        console.error('Error verificando permisos:', error);
        // Por seguridad, ocultar si hay error
        const btn = document.querySelector('.btn-go-liquidation');
        if (btn) btn.style.display = 'none';
    }
}

// Verificar si estamos en modo administrador
function verificarModoAdmin() {
    const adminMode = sessionStorage.getItem('adminMode');
    const vendedorId = sessionStorage.getItem('vendedorId');
    const vendedorName = sessionStorage.getItem('vendedorName');
    
    if (adminMode === 'true' && vendedorId) {
        // Mostrar banner de modo administrador
        mostrarBannerAdmin(vendedorName);
        return vendedorId;
    }
    return null;
}

// Mostrar banner indicando que estás en modo administrador
function mostrarBannerAdmin(nombreVendedor) {
    const banner = document.createElement('div');
    banner.id = 'adminModeBanner';
    banner.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
        color: white;
        padding: 12px 20px;
        text-align: center;
        z-index: 10000;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-weight: 600;
        font-size: 14px;
    `;
    
    banner.innerHTML = `
        <div style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 10px;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
            <span>MODO ADMINISTRADOR - Viendo datos de: ${nombreVendedor}</span>
        </div>
        <button onclick="salirModoAdmin()" style="
            background: rgba(255,255,255,0.2);
            border: 1px solid rgba(255,255,255,0.3);
            color: white;
            padding: 6px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
            font-size: 13px;
            transition: all 0.3s;
        " onmouseover="this.style.background='rgba(255,255,255,0.3)'" 
           onmouseout="this.style.background='rgba(255,255,255,0.2)'">
            Salir
        </button>
    `;
    
    document.body.insertBefore(banner, document.body.firstChild);
    
    // Ajustar padding del contenido principal
    const container = document.querySelector('.container');
    if (container) {
        container.style.paddingTop = '70px';
    }
}

// Función global para salir del modo admin
window.salirModoAdmin = function() {
    sessionStorage.removeItem('adminMode');
    sessionStorage.removeItem('vendedorId');
    sessionStorage.removeItem('vendedorName');
    window.location.href = 'GestorVendedores.html';
};


let selectedProducts = []; // productos seleccionados

const form = document.getElementById("salesForm");
const inputId = document.getElementById("saleId");
const inputClient = document.getElementById("clientName");
const inputProduct = document.getElementById("productName");
const inputDate = document.getElementById("saleDate");
const inputPrice = document.getElementById("price");
const inputInstallments = document.getElementById("installments");
const inputAdvance = document.getElementById("advancePayment");
const inputPaymentDate = document.getElementById("paymentDate");

const btnSave = document.getElementById("saveSale");
const btnUpdate = document.getElementById("updateSale");
const btnCancel = document.getElementById("cancelUpdate");
const btnDelete = document.getElementById("deleteSale");
const btnAddPayment = document.getElementById("addPayment");
const list = document.getElementById("salesList");
const searchInput = document.getElementById("searchInput");
const dayFilterInput = document.getElementById("dayFilterInput");
/* ---------- carga de ventas (adaptada al nuevo estilo) ---------- */
async function loadSales(query = "", filterDay = "") {
    try {
        const token = getToken();

        const adminMode = sessionStorage.getItem('adminMode') === 'true';
        const vendedorIdAdmin = sessionStorage.getItem('vendedorId');

        let endpoint = '/sales/all';
        if (adminMode && vendedorIdAdmin) {
            endpoint = `/sales/vendedor/${vendedorIdAdmin}`;
            console.log('🔍 Modo admin activado - Buscando ventas del vendedor:', vendedorIdAdmin);
        }

        const sales = await apiFetch(endpoint, 'GET', null, token);
        console.log('📊 Ventas obtenidas:', sales.length);

        list.innerHTML = '';

        const filteredSales = sales.filter(sale => {
            // ✅ CRÍTICO: Excluir ventas liquidadas
            if (sale.settled === true) {
                return false;
            }

            const clientMatch = sale.clientName.toLowerCase().includes(query.toLowerCase());
            const productMatch = sale.productName.toLowerCase().includes(query.toLowerCase());
            const searchMatch = clientMatch || productMatch;

let dayMatch = true;
if (filterDay) {
    const filterDayNum = parseInt(filterDay);
    const today = new Date().getDate(); // Día actual del mes (1-31)
    
    if (sale.paymentDays) {
        const paymentDaysArray = sale.paymentDays.split(',').map(d => parseInt(d.trim()));
        
        // ✅ Verificar si tiene el día programado
        const hasDayScheduled = paymentDaysArray.includes(filterDayNum);
        
        // ✅ CORREGIDO: Solo mostrar atrasados si el día de pago YA PASÓ
        const hasMissedPayments = paymentDaysArray.some(scheduledDay => {
            // Solo considerar días que YA PASARON (menores al día actual)
            if (scheduledDay < today) {
                // Verificar si existe un pago en ese día específico
                const hasPaymentOnDay = sale.payments.some(payment => {
                    const paymentDate = new Date(payment.date);
                    return paymentDate.getDate() === scheduledDay;
                });
                // Si NO hay pago en ese día QUE YA PASÓ, está atrasado
                return !hasPaymentOnDay;
            }
            return false;
        });
        
        // ✅ Mostrar si: tiene el día programado O tiene días atrasados REALES
        dayMatch = hasDayScheduled || hasMissedPayments;
    } else {
        dayMatch = false;
    }
}
            return searchMatch && dayMatch;
        });

        if (filteredSales.length === 0) {
            const message = filterDay
                ? `<div class="empty-state"><i class="fas fa-calendar-times"></i><h3>No hay préstamos para el día ${filterDay}</h3><p>No se encontraron ventas con pagos programados o atrasados para este día</p></div>`
                : `<div class="empty-state"><i class="fas fa-inbox"></i><h3>No se encontraron ventas activas</h3><p>${adminMode === 'true' ? 'Este vendedor no tiene ventas activas' : 'No tienes ventas activas. Las ventas liquidadas se encuentran en la sección "Liquidados"'}</p></div>`;
            list.innerHTML = message;
            return;
        }

        filteredSales.forEach((sale) => {
            const totalPaid = sale.payments.reduce((sum, p) => sum + p.amount, 0);
            const remainingDebt = sale.price - totalPaid;
            const paymentPercentage = (totalPaid / sale.price) * 100;

            const card = document.createElement('div');
            card.className = 'sale-card';
            card.setAttribute('data-sale-id', sale._id);

            // ✅ NUEVO: Indicador de atraso mejorado
// ✅ NUEVO: Indicador de atraso con días exactos
// ✅ NUEVO: Indicador de atraso con días exactos (basado en día actual)
let statusBadge = '';
if (filterDay) {
    const filterDayNum = parseInt(filterDay);
    const today = new Date().getDate(); // Día actual
    const paymentDaysArray = sale.paymentDays ? sale.paymentDays.split(',').map(d => parseInt(d.trim())) : [];
    
    // Encontrar días que YA PASARON sin pagar
    const missedDays = paymentDaysArray.filter(scheduledDay => {
        // Solo días que YA PASARON (menores al día actual)
        if (scheduledDay < today) {
            const hasPaymentOnDay = sale.payments.some(payment => {
                const paymentDate = new Date(payment.date);
                return paymentDate.getDate() === scheduledDay;
            });
            return !hasPaymentOnDay;
        }
        return false;
    });
    
    if (missedDays.length > 0) {
        // Ordenar los días atrasados y tomar el más antiguo
        const oldestMissedDay = Math.min(...missedDays);
        
        // Calcular días exactos de atraso
        const daysOverdue = filterDayNum - oldestMissedDay;
        
        // Mostrar días específicos que debe y cuántos días lleva atrasado
        const missedDaysText = missedDays.sort((a, b) => a - b).join(', ');
        statusBadge = `<span style="background: #e74c3c; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; margin-left: 8px;">⚠️ DEBE DÍA(S): ${missedDaysText} | ${daysOverdue} día(s) atrasado</span>`;
    }
}

const freq = sale.paymentFrequency || 'mensual';
const daysText = sale.paymentDaysText || sale.paymentDays.join(', ');
const paymentDaysInfo = daysText
    ? `<p><i class="fas fa-calendar-check"></i> ${freq} – ${daysText}${statusBadge}</p>`
    : '';
            card.innerHTML = `
                <div class="sale-header">
                    <div class="sale-info">
                        <h3>${sale.clientName}</h3>
                        <p>${sale.productName}</p>
                        <p><i class="fas fa-map-marker-alt"></i> ${sale.clientAddress || 'Sin dirección'}</p>
                        ${paymentDaysInfo}
                    </div>
                    <div class="sale-amount">
                        <div class="debt-amount">$${remainingDebt.toLocaleString('es-CO')}</div>
                        <div class="progress-text">${paymentPercentage.toFixed(0)}% pagado</div>
                    </div>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${paymentPercentage}%"></div>
                </div>
                <div class="sale-actions">
                    <button class="btn btn-primary btn-sm btn-info"><i class="fas fa-eye"></i> Info</button>
                    <button class="btn btn-warning btn-sm btn-edit"><i class="fas fa-edit"></i> Editar</button>
                    <button class="btn btn-success btn-sm btn-pay"><i class="fas fa-credit-card"></i> Abonar</button>
                    <button class="btn btn-danger btn-sm btn-delete"><i class="fas fa-trash"></i> Eliminar</button>
                </div>
            `;

            card.querySelector('.btn-info').onclick = () => viewSaleDetails(sale);
            card.querySelector('.btn-edit').onclick = () => editSale(sale);
            card.querySelector('.btn-pay').onclick = () => openPaymentModal(sale._id);
            card.querySelector('.btn-delete').onclick = () => deleteSale(sale._id);

            list.appendChild(card);
        });

    } catch (error) {
        console.error('Error al cargar ventas:', error);
        list.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-circle"></i><h3>Error al cargar ventas</h3><p>${error.message}</p></div>`;
    }
}

// ✅ NUEVA FUNCIÓN: Limpiar filtro de día
window.clearDayFilter = function() {
    document.getElementById('dayFilterInput').value = '';
    loadSales(searchInput.value.trim(), '');
};searchInput.addEventListener


/* ---------- detalles ---------- */
function viewSaleDetails(sale) {
    localStorage.setItem("saleDetails", JSON.stringify(sale));
    window.location.href = "saleDetails.html";
}

/* ---------- eliminar ---------- */
async function deleteSale(id) {
    if (!confirm("¿Eliminar esta venta?")) return;
    try {
        const token = getToken();
        await apiFetch(`/sales/${id}`, "DELETE", null, token);
        alert("Venta eliminada correctamente.");
        loadSales();
    } catch (error) {
        console.error("Error al eliminar la venta:", error.message);
        alert("No se pudo eliminar la venta.");
    }
}

/* ---------- editar ---------- */
function editSale(sale) {
    inputId.value         = sale._id;
    inputClient.value     = sale.clientName;
    inputProduct.value    = sale.productName;
    inputDate.value       = new Date(sale.saleDate).toISOString().split('T')[0];
    inputPrice.value      = sale.price;
    inputInstallments.value = sale.installments;
    if (document.getElementById("clientAddress")) {
        document.getElementById("clientAddress").value = sale.clientAddress || '';
    }

    // ✅ NUEVO: Cargar días de pago con el nuevo sistema
    if (sale.paymentDays) {
        loadPaymentDaysFromString(sale.paymentDays);
    } else {
        selectedPaymentPlan = { type: '', days: [] };
        paymentPlanType.value = '';
        paymentDaysContainer.style.display = 'none';
        updateSelectedDaysDisplay();
    }

    document.getElementById("paymentSection").style.display = "block";
    inputPaymentDate.value = new Date().toISOString().split('T')[0];

    btnSave.classList.add("hidden");
    btnUpdate.classList.remove("hidden");
    btnCancel.classList.remove("hidden");
    btnDelete.classList.remove("hidden");
    btnAddPayment.classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
async function loadProductsForSelect() {
    try {
        const token = getToken();
        const products = await apiFetch("/products", "GET", null, token);
        const select = document.getElementById("productName");

        select.innerHTML = '<option value="">Selecciona un producto</option>';

        products.filter(p => !p.sold).forEach(product => {
            const option = document.createElement("option");
            option.value = product.name;
            option.textContent = `${product.name} ($${product.salePrice.toLocaleString()})`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error("Error al cargar productos:", error);
    }
}

/* ---------- guardar nueva (CORREGIDA) ---------- */
async function saveSale() {
    // ---------- Validaciones básicas ----------
    if (!inputDate.value) {
        alert("Por favor selecciona una fecha de venta.");
        inputDate.focus();
        return;
    }

    if (selectedProducts.length === 0) {
        alert("Por favor selecciona al menos un producto.");
        return;
    }

    // ---------- Recolección SEGURA de campos ----------
    const clientName    = String(inputClient.value.trim());
    const productName   = selectedProducts.map(p => p.name).join(', ');
    const saleDate      = inputDate.value; // yyyy-mm-dd
    const price         = Number(inputPrice.value);
    const installments  = String(inputInstallments.value.trim() || "Sin cuotas");
    const advance       = Number(inputAdvance.value)    || 0;
    const address       = String(document.getElementById("clientAddress").value.trim() || "Sin dirección");

    // ---------- Validación FINAL ----------
    if (!clientName || !productName || !saleDate || !price) {
        alert("❗ Faltan datos obligatorios:\nCliente, Producto, Fecha o Precio.");
        return;
    }

    // ---------- Construcción del objeto limpio ----------
    const saleData = {
        clientName,
        productName,
        saleDate,
        price,
        installments,
        advancePayment: advance,
        clientAddress: address,
        // ✅ NUEVO: Guardar plan de pago en campos separados
        ...(collectPaymentPlan() || { 
            paymentFrequency: 'mensual', 
            paymentDays: [], 
            paymentDaysText: '' 
        })
    };

    // ---------- Log para depurar ----------
    console.log("📤 JSON final enviado:", JSON.stringify(saleData, null, 2));

    // ---------- Copia para el recibo ----------
    const receiptData = { ...saleData, products: [...selectedProducts] };

    try {
        const token = getToken();

        /* 🔥 NUEVO: elegir endpoint según modo admin 🔥 */
        const adminMode = sessionStorage.getItem('adminMode') === 'true';
        const vendedorId = sessionStorage.getItem('vendedorId');
        let endpoint = '/sales/new';
        if (adminMode && vendedorId) {
            endpoint = `/sales/vendedor/${vendedorId}/new`; // crea COMO ese vendedor
        }

        await apiFetch(endpoint, 'POST', saleData, token);
        alert('Venta guardada correctamente.');

        // Marcar productos como vendidos
        for (const product of selectedProducts) {
            await apiFetch(`/products/${product._id}/sell`, 'PUT', { soldTo: clientName }, token);
        }

        // Limpiar todo
        form.reset();
        inputDate.value = new Date().toISOString().split('T')[0];
        selectedProducts = [];
        renderSelectedProducts();
        updateTotalPrice();

        // ✅ NUEVO: Limpiar selección de días
        selectedPaymentPlan = { type: '', days: [] };
        paymentPlanType.value = '';
        paymentDaysContainer.style.display = 'none';
        updateSelectedDaysDisplay();

        // Recargar y mostrar recibo
        await loadSales();
        await loadProductsForDropdown();
        showReceiptModal(receiptData);

    } catch (error) {
        console.error('Error al guardar la venta:', error.message);
        alert('No se pudo guardar la venta: ' + error.message);
    }
}

/* ---------- actualizar ---------- */
async function updateSale() {
    const id = inputId.value;
    
    // ---------- Recolección del plan de pago ----------
    const plan = collectPaymentPlan();
    
    const saleData = {
        clientName: inputClient.value.trim(),
        clientAddress: document.getElementById("clientAddress").value.trim(),
        productName: inputProduct.value.trim(),
        saleDate: inputDate.value,
        price: parseFloat(inputPrice.value),
        installments: inputInstallments.value.trim(),
        // ✅ NUEVO: Guardar plan de pago en campos separados
        ...(plan || { 
            paymentFrequency: 'mensual', 
            paymentDays: [], 
            paymentDaysText: '' 
        })
    };
    
    try {
        const token = getToken();
        await apiFetch(`/sales/${id}`, "PUT", saleData, token);
        alert("Venta actualizada correctamente.");
        cancelUpdate();
        loadSales();
    } catch (error) {
        console.error("Error al actualizar la venta:", error.message);
        alert("No se pudo actualizar la venta: " + error.message);
    }
}

/* ---------- agregar pago ---------- */
async function addPayment() {
    const id   = document.getElementById("paymentModal").dataset.saleId;
    const amount = parseFloat(document.getElementById("paymentAmount").value);
    const date = document.getElementById("paymentDate").value;

    if (!id) return alert("No se seleccionó ninguna venta.");
    if (!amount || amount <= 0) return alert("Monto inválido");

    try {
        const token = getToken();
        const response = await apiFetch(`/sales/${id}/payment`, "POST", { amount, date }, token);
        const formattedAmount = amount.toLocaleString('es-CO');
        alert(`Abono de $${formattedAmount} registrado correctamente.`);
        if (response.justSettled || response.settled) {
            alert("¡Venta liquidada automáticamente!");
            if (confirm("¿Deseas ir a la sección de ventas liquidadas?")) {
                window.location.href = "liquidados.html";
                return;
            }
        }
        cancelUpdate();
        loadSales();
    } catch (error) {
        console.error("Error al registrar el abono:", error.message);
        alert("No se pudo registrar el abono: " + error.message);
    }
}

/* ---------- cancelar edición ---------- */
function cancelUpdate() {
    btnSave.classList.remove("hidden");
    btnUpdate.classList.add("hidden");
    btnCancel.classList.add("hidden");
    btnDelete.classList.add("hidden");
    btnAddPayment.classList.add("hidden");
    document.getElementById("paymentSection").style.display = "none";
    
    // ✅ NUEVO: Limpiar selección de días
    selectedPaymentPlan = { type: '', days: [] };
    paymentPlanType.value = '';
    paymentDaysContainer.style.display = 'none';
    updateSelectedDaysDisplay();
    
    form.reset();
}

/* ---------- modal de pago (si lo usás) ---------- */
function openPaymentModal(saleId) {
    // Si usás el modal del HTML nuevo, mostralo acá
    document.getElementById("paymentModal")?.classList.add("show");
    document.getElementById("paymentAmount").value = "";
    document.getElementById("paymentDate").value = new Date().toISOString().split("T")[0];
    document.getElementById("paymentModal").dataset.saleId = saleId;
}

/* ---------- listeners (sin cambios) ---------- */
searchInput.addEventListener("input", () => loadSales(searchInput.value.trim()));
// ✅ NUEVO: Listener para filtro de día
dayFilterInput.addEventListener("change", () => {
    loadSales(searchInput.value.trim(), dayFilterInput.value);
});
btnSave.addEventListener("click", saveSale);
btnUpdate.addEventListener("click", updateSale);
btnCancel.addEventListener("click", cancelUpdate);
btnAddPayment.addEventListener("click", addPayment);

// Al cargar la página
document.addEventListener("DOMContentLoaded", async () => {
    verificarModoAdmin();
    
    // Verificar permisos ANTES de mostrar la interfaz
    await verificarPermisosYOcultarElementos();
    
    const today = new Date().toLocaleDateString('en-CA');
    document.getElementById("saleDate").value = today;
    loadSales();
    loadProductsForSelect();
    loadProductsForDropdown();
    
    loadProductsForDropdown();
    document.addEventListener("click", (e) => {
        const dropdown = document.getElementById("productDropdown");
        const panel = document.getElementById("productDropdownPanel");
        const trigger = document.querySelector(".dropdown-trigger");

        if (!dropdown) return;

        // Si hacen clic en el trigger, abrir/cerrar
        if (trigger.contains(e.target)) {
            panel.classList.toggle("hidden");
            trigger.classList.toggle("active");
        }

        // Si hacen clic fuera, cerrar
        if (!dropdown.contains(e.target)) {
            panel.classList.add("hidden");
            trigger.classList.remove("active");
        }
    });
});

async function loadProductsForDropdown() {
    try {
        const token = getToken();

        // 🔍 Detectar si estás en modo admin
        const adminMode = sessionStorage.getItem('adminMode') === 'true';
        const vendedorId = sessionStorage.getItem('vendedorId'); // ID del vendedor que estás administrando

        // 🔧 Construir endpoint con filtro por usuario
        let endpoint = "/products";
        if (adminMode && vendedorId) {
            endpoint = `/products/vendedor/${vendedorId}`; // Solo productos de ese vendedor
        }

        const products = await apiFetch(endpoint, "GET", null, token);
        const panel = document.getElementById("productDropdownPanel");
        const searchInput = document.getElementById("productSearchInput");
        const listContainer = document.getElementById("productDropdownList");

        // ✅ Filtrar solo productos NO vendidos
        const availableProducts = products.filter(p => !p.sold);

        // Render inicial
        function renderProducts(filtered = availableProducts) {
            listContainer.innerHTML = "";
            if (filtered.length === 0) {
                listContainer.innerHTML = `<div class="dropdown-item disabled">No hay productos disponibles</div>`;
                return;
            }

            filtered.forEach(product => {
                const item = document.createElement("div");
                item.className = "dropdown-item";
                item.innerHTML = `
                    <div class="product-card-dropdown" style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 12px;
                        border-radius: 8px;
                        background: var(--light-gray);
                        transition: background 0.2s ease;
                    " onmouseover="this.style.background='#e9ecef'" onmouseout="this.style.background='var(--light-gray)'">

                        <div class="info" style="flex: 1;">
                            <div class="name" style="font-weight: 600; color: var(--primary); font-size: 14px;">
                                ${product.name}
                            </div>
                            <div class="price" style="font-size: 13px; color: var(--success); margin-top: 2px;">
                                $${product.salePrice.toLocaleString()}
                            </div>
                            <div style="font-size: 11px; color: var(--medium-gray); margin-top: 4px;">
                                <i class="fas fa-tag"></i> ${product.brand}
                                <i class="fas fa-folder" style="margin-left: 8px;"></i> ${product.category}
                                ${product.size ? `<i class="fas fa-ruler" style="margin-left: 8px;"></i> ${product.size}` : ''}
                            </div>
                        </div>

                        <div class="actions">
                            <button class="btn-edit-dropdown" data-id="${product._id}" style="
                                background: var(--accent);
                                color: white;
                                border: none;
                                border-radius: 6px;
                                padding: 6px 8px;
                                font-size: 12px;
                                cursor: pointer;
                                transition: background 0.2s ease;
                            " onmouseover="this.style.background='#2980b9'" onmouseout="this.style.background='var(--accent)'">
                                <i class="fas fa-edit"></i>
                            </button>
                        </div>
                    </div>
                `;

                item.querySelector('.btn-edit-dropdown').addEventListener('click', (e) => {
                    e.stopPropagation();
                    const productId = e.currentTarget.dataset.id;
                    window.location.href = `productos.html?edit=${productId}`;
                });

                item.addEventListener("click", (e) => {
                    if (e.target.closest('.btn-edit-dropdown')) return;
                    selectProduct(product);
                });

                listContainer.appendChild(item);
            });
        }

        // Búsqueda en tiempo real
        searchInput.addEventListener("input", () => {
            const query = searchInput.value.toLowerCase();
            const filtered = availableProducts.filter(p =>
                p.name.toLowerCase().includes(query)
            );
            renderProducts(filtered);
        });

        // Render inicial
        renderProducts();

    } catch (error) {
        console.error("Error al cargar productos para dropdown:", error);
        document.getElementById("productDropdownList").innerHTML =
            `<div class="dropdown-item disabled">Error al cargar productos</div>`;
    }
}

function selectProduct(product) {
    // Evitar duplicados
    if (selectedProducts.find(p => p._id === product._id)) {
        alert("Este producto ya fue seleccionado.");
        return;
    }

    selectedProducts.push(product);
    renderSelectedProducts();
    updateTotalPrice();
}

function renderSelectedProducts() {
    const container = document.getElementById("selectedProducts");
    container.innerHTML = "";

    selectedProducts.forEach((product, index) => {
        const tag = document.createElement("div");
        tag.className = "selected-product-tag";
        tag.innerHTML = `
            ${product.name} (${product.brand}${product.size ? `, ${product.size}` : ''})
            <button class="remove" data-index="${index}">×</button>
        `;

        // Agregar event listener
        tag.querySelector('.remove').addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            removeSelectedProduct(index);
        });
        container.appendChild(tag);
    });
}

function updateTotalPrice() {
    const total = selectedProducts.reduce((sum, p) => sum + p.salePrice, 0);
    document.getElementById("price").value = total;
}

function removeSelectedProduct(index) {
    selectedProducts.splice(index, 1);
    renderSelectedProducts();
    updateTotalPrice();
}

function toggleDropdown() {
    const panel = document.getElementById("productDropdownPanel");
    const trigger = document.querySelector(".dropdown-trigger");
    panel.classList.toggle("hidden");
    trigger.classList.toggle("active");
}

window.editProductFromDropdown = function(productId) {
    window.location.href = `productos.html?edit=${productId}`;
};

document.addEventListener("DOMContentLoaded", () => {

    document.getElementById("productName").addEventListener("change", (e) => {
        const selectedProductName = e.target.value;
        if (!selectedProductName) {
            document.getElementById("price").value = "";
            return;
        }

        // Buscar el producto seleccionado
        const token = getToken();
        apiFetch("/products", "GET", null, token).then(products => {
            const product = products.find(p => p.name === selectedProductName);
            if (product) {
                document.getElementById("price").value = product.salePrice;
            }
        }).catch(error => {
            console.error("Error al cargar productos:", error);
        });
    });

    loadSales();
    if (document.getElementById("paymentSection")) {
        document.getElementById("paymentSection").style.display = "none";
    }

    // Menú nuevo
    const menuToggle = document.getElementById("menuToggle");
    const menuItems  = document.getElementById("menuItems");
    const backdrop   = document.getElementById("backdrop");
    if (menuToggle && menuItems && backdrop) {
        menuToggle.addEventListener("click", () => {
            menuItems.classList.toggle("show");
            backdrop.classList.toggle("show");
        });
        backdrop.addEventListener("click", () => {
            menuItems.classList.remove("show");
            backdrop.classList.remove("show");
        });
    }
});

/* ---------- conectar modal nuevo ---------- */
const modal   = document.getElementById("paymentModal");
const btnConf = document.getElementById("confirmPayment");
const btnCerr = document.getElementById("cancelPayment");
const btnX    = document.getElementById("closePaymentModal");

// abrir modal ya está hecho en openPaymentModal
btnConf.addEventListener("click", () => {
    // usamos la misma lógica que el área "Registrar Abono"
    addPayment();
    modal.classList.remove("show");
});
btnCerr.addEventListener("click", () => modal.classList.remove("show"));
btnX.addEventListener("click",   () => modal.classList.remove("show"));


/* ---------- NUEVO SISTEMA DE SELECCIÃ"N DE DÃAS DE PAGO ---------- */

let selectedPaymentPlan = {
    type: '', // diario, semanal, quincenal, mensual
    days: []  // días seleccionados
};

const paymentPlanType = document.getElementById('paymentPlanType');
const paymentDaysContainer = document.getElementById('paymentDaysContainer');
const paymentDaysSelect = document.getElementById('paymentDaysSelect');
const paymentDaysLabel = document.getElementById('paymentDaysLabel');
const selectedDaysDisplay = document.getElementById('selectedDaysDisplay');

// Opciones para cada tipo de plan
const paymentOptions = {
    diario: ['Todos los días'],
    semanal: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],
    quincenal: ["16 y 01", "17 y 02", "18 y 03", "19 y 04", "20 y 05", "21 y 06", "22 y 07", "23 y 08", "24 y 09", "25 y 10", "26 y 11", "27 y 12", "28 y 13", "29 y 14", "30 y 15"],
    mensual: Array.from({length: 31}, (_, i) => `Día ${i + 1}`)
};

// Listener para cambio de tipo de plan
// Listener para cambio de tipo de plan
paymentPlanType.addEventListener('change', (e) => {
    const planType = e.target.value;
    
    if (!planType) {
        paymentDaysContainer.style.display = 'none';
        selectedPaymentPlan = { type: '', days: [] };
        updateSelectedDaysDisplay();
        return;
    }
    
    selectedPaymentPlan.type = planType;
    selectedPaymentPlan.days = [];
    
    // Actualizar label según el tipo
    const labels = {
        diario: 'Confirmación',
        semanal: 'Selecciona los días de la semana (mantén Ctrl/Cmd presionado)',
        quincenal: 'Selecciona las quincenas (mantén Ctrl/Cmd presionado)',
        mensual: 'Selecciona los días del mes (mantén Ctrl/Cmd presionado)'
    };
    paymentDaysLabel.textContent = labels[planType];
    
    // ✅ NUEVO: Configurar si permite múltiple selección
    if (planType === 'diario') {
        paymentDaysSelect.removeAttribute('multiple');
        paymentDaysSelect.setAttribute('size', '1');
    } else {
        paymentDaysSelect.setAttribute('multiple', 'multiple');
        paymentDaysSelect.setAttribute('size', '7'); // Mostrar más opciones
    }
    
    // Llenar el select con las opciones
    paymentDaysSelect.innerHTML = '';
    const options = paymentOptions[planType];
    
    options.forEach((option, index) => {
        const opt = document.createElement('option');
        opt.value = planType === 'diario' ? 'diario' : 
                    planType === 'semanal' ? option :
                    planType === 'quincenal' ? option :
                    (index + 1).toString(); // Para mensual, usar el número
        opt.textContent = option;
        paymentDaysSelect.appendChild(opt);
    });
    
    // Si es diario, autoseleccionar
    if (planType === 'diario') {
        paymentDaysSelect.options[0].selected = true;
        selectedPaymentPlan.days = ['diario'];
        updateSelectedDaysDisplay();
    }
    
    paymentDaysContainer.style.display = 'block';
});

// Listener para selección de días
paymentDaysSelect.addEventListener('change', () => {
    const selected = Array.from(paymentDaysSelect.selectedOptions).map(opt => opt.value);
    selectedPaymentPlan.days = selected;
    updateSelectedDaysDisplay();
});

// Actualizar visualización de días seleccionados
function updateSelectedDaysDisplay() {
    selectedDaysDisplay.innerHTML = '';
    
    if (selectedPaymentPlan.days.length === 0) {
        return;
    }
    
    // Crear etiquetas visuales
    selectedPaymentPlan.days.forEach(day => {
        const pill = document.createElement('span');
        pill.className = 'day-pill';
        
        let displayText = day;
        if (selectedPaymentPlan.type === 'diario') {
            displayText = '📅 Todos los días';
        } else if (selectedPaymentPlan.type === 'semanal') {
            displayText = day;
        } else if (selectedPaymentPlan.type === 'quincenal') {
            displayText = `Días ${day}`;
        } else if (selectedPaymentPlan.type === 'mensual') {
            displayText = `Día ${day}`;
        }
        
        pill.innerHTML = `
            ${displayText}
            <button class="remove-day" data-day="${day}" type="button">×</button>
        `;
        
        selectedDaysDisplay.appendChild(pill);
    });
    
    // Agregar listeners para remover
    selectedDaysDisplay.querySelectorAll('.remove-day').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const dayToRemove = e.target.dataset.day;
            selectedPaymentPlan.days = selectedPaymentPlan.days.filter(d => d !== dayToRemove);
            
            // Desmarcar en el select
            Array.from(paymentDaysSelect.options).forEach(opt => {
                if (opt.value === dayToRemove) {
                    opt.selected = false;
                }
            });
            
            updateSelectedDaysDisplay();
        });
    });
}

// Función para recolectar días en formato para guardar
function collectPaymentDays() {
    if (!selectedPaymentPlan.type || selectedPaymentPlan.days.length === 0) {
        return '';
    }
    
    // Formato: tipo|dias
    // Ejemplo: "semanal|Lunes,Miércoles,Viernes"
    // Ejemplo: "mensual|1,15,30"
    // Ejemplo: "diario|diario"
    return `${selectedPaymentPlan.type}|${selectedPaymentPlan.days.join(',')}`;
}

function collectPaymentPlan() {
    if (!selectedPaymentPlan.type) return null;
    return {
        paymentFrequency: selectedPaymentPlan.type,
        paymentDays: selectedPaymentPlan.days,
        paymentDaysText: selectedPaymentPlan.days.join(', ')
    };
}

// Función para cargar días desde formato guardado
function loadPaymentDaysFromString(paymentDaysString) {
    if (!paymentDaysString || paymentDaysString === 'Sin días') {
        selectedPaymentPlan = { type: '', days: [] };
        paymentPlanType.value = '';
        paymentDaysContainer.style.display = 'none';
        updateSelectedDaysDisplay();
        return;
    }
    
    const [type, daysStr] = paymentDaysString.split('|');
    
    if (!type || !daysStr) {
        console.warn('Formato de días inválido:', paymentDaysString);
        return;
    }
    
    const days = daysStr.split(',').map(d => d.trim());
    
    selectedPaymentPlan = { type, days };
    paymentPlanType.value = type;
    
    // Disparar el evento change para llenar el select
    paymentPlanType.dispatchEvent(new Event('change'));
    
    // Esperar un momento para que se llene el select
    setTimeout(() => {
        // Seleccionar las opciones correspondientes
        Array.from(paymentDaysSelect.options).forEach(opt => {
            if (days.includes(opt.value)) {
                opt.selected = true;
            }
        });
        
        selectedPaymentPlan.days = days;
        updateSelectedDaysDisplay();
    }, 100);
}

/* =========================================================
   LECTOR DE CÓDIGOS DE BARRAS CORREGIDO
   ========================================================= */

const btnCamera   = document.getElementById('btnBarcodeScanner');
const btnStopScan = document.getElementById('btnStopScan');
const modalScan   = document.getElementById('scannerModal');
const video       = document.getElementById('scannerVideo');

let codeReader = null;
let scanning   = false;
let scanCount  = 0;

// Abrir modal y arrancar cámara
btnCamera.addEventListener('click', startScanner);
btnStopScan.addEventListener('click', stopScanner);

async function startScanner() {
    modalScan.classList.remove('hidden');
    scanning = true;
    scanCount = 0;
    
    // Crear lector sin configuraciones avanzadas para mejor compatibilidad
    codeReader = new ZXing.BrowserBarcodeReader();

    try {
        const devices = await codeReader.listVideoInputDevices();
        console.log("Cámaras disponibles:", devices.map(d => d.label));
        
        // Buscar cámara trasera
        const rearCamera = devices.find(d => {
            const label = d.label.toLowerCase();
            return label.includes('back') || 
                   label.includes('rear') || 
                   label.includes('environment') ||
                   label.includes('camera2') ||
                   (!label.includes('front') && !label.includes('user'));
        }) || devices[0];
        
        if (!rearCamera) {
            throw new Error("No se encontraron cámaras disponibles");
        }
        
        console.log("Usando cámara:", rearCamera.label);

        // Usar el método más simple y compatible
        await codeReader.decodeFromVideoDevice(rearCamera.deviceId, video, (result, err) => {
            if (result && scanning && scanCount === 0) {
                console.log("¡Código detectado!", result.text);
                handleSuccessfulScan(result.text);
            }
            if (err && !(err instanceof ZXing.NotFoundException)) {
                console.debug("Error de escaneo:", err.message);
            }
        });

    } catch (e) {
        console.error("Error al iniciar escáner:", e);
        alert('No se pudo acceder a la cámara: ' + e.message);
        stopScanner();
    }
}

function handleSuccessfulScan(code) {
    if (scanCount > 0) return; // Evitar múltiples lecturas
    scanCount++;
    
    scanning = false;
    
    // Mostrar feedback visual inmediato
    showScanFeedback();
    
    // Procesar código después de un pequeño delay
    setTimeout(() => {
        stopScanner();
        handleBarcode(code);
    }, 500);
}

function showScanFeedback() {
    // Crear efecto visual de éxito más simple
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(39, 174, 96, 0.4);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;
    overlay.innerHTML = `
        <div style="
            background: white;
            border-radius: 50%;
            padding: 20px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            animation: pulse 0.6s ease;
        ">
            <i class="fas fa-check" style="
                font-size: 40px;
                color: #27ae60;
            "></i>
        </div>
    `;
    
    // Agregar animación CSS básica
    if (!document.getElementById('scanFeedbackStyles')) {
        const styles = document.createElement('style');
        styles.id = 'scanFeedbackStyles';
        styles.innerHTML = `
            @keyframes pulse {
                0% { transform: scale(0.8); opacity: 0; }
                50% { transform: scale(1.1); opacity: 1; }
                100% { transform: scale(1); opacity: 1; }
            }
        `;
        document.head.appendChild(styles);
    }
    
    modalScan.appendChild(overlay);
    
    // Remover overlay
    setTimeout(() => {
        if (overlay.parentNode) {
            overlay.remove();
        }
    }, 600);
}

function stopScanner() {
    scanning = false;
    scanCount = 0;
    
    if (codeReader) {
        codeReader.reset();
    }
    
    // Detener stream de video
    if (video.srcObject) {
        video.srcObject.getTracks().forEach(track => {
            track.stop();
        });
        video.srcObject = null;
    }
    
    modalScan.classList.add('hidden');
}

/* ---------------------------------------------------------
   PROCESAMIENTO DE CÓDIGOS MEJORADO
   --------------------------------------------------------- */
async function handleBarcode(raw) {
    console.log("Código raw recibido:", raw);
    console.log("Longitud:", raw.length);
    
    const cleanCode = raw.trim();
    
    // PRIORIDAD 1: Código personalizado (ID|NOMBRE|PRECIO)
    if (cleanCode.includes('|')) {
        console.log("✅ Detectado código PERSONALIZADO");
        await handleCustomBarcode(cleanCode);
        return;
    }
    
    // PRIORIDAD 2: Código estándar (EAN-13, UPC, etc.)
    if (/^\d{8,13}$/.test(cleanCode)) {
        console.log("⚠️ Detectado código ESTÁNDAR EAN/UPC");
        
        // Mostrar mensaje más claro
        const useStandard = confirm(`CÓDIGO ESTÁNDAR DETECTADO
                                   
Código: ${cleanCode}

❌ Este NO es un código generado por tu app.
✅ Los códigos de tu app tienen formato: ID|NOMBRE|PRECIO

¿Quieres buscar este producto en tu inventario?
• SÍ = Buscar producto
• NO = Cancelar`);
        
        if (useStandard) {
            await handleStandardBarcode(cleanCode);
        }
        return;
    }
    
    // CÓDIGO NO RECONOCIDO
    alert(`❌ CÓDIGO NO VÁLIDO: "${cleanCode}"
           
🎯 PARA USAR CÓDIGOS PERSONALIZADOS:
1. Ve a la sección "Productos"
2. Busca tu producto
3. Haz clic en "Ver código de barras"
4. Descarga/imprime ese código
5. Escanea el código impreso

📱 CONSEJOS:
• Buena iluminación
• Código estable y enfocado
• Distancia adecuada (15-20 cm)`);
}

/* ---------------------------------------------------------
   MANEJO DE CÓDIGOS PERSONALIZADOS
   --------------------------------------------------------- */
async function handleCustomBarcode(code) {
    const parts = code.split('|').map(part => part.trim());
    
    if (parts.length < 3) {
        alert(`❌ Código personalizado incompleto.
               
Formato esperado: ID|NOMBRE|PRECIO
Partes encontradas: ${parts.length}
               
Tu código: ${code}`);
        return;
    }
    
    const [id, name, price] = parts;
    const numericPrice = Number(price);
    
    if (isNaN(numericPrice)) {
        alert(`❌ Error: El precio "${price}" no es válido`);
        return;
    }
    
    // Rellenar campos automáticamente
    if (document.getElementById('productName')) {
        document.getElementById('productName').value = name;
    }
    if (document.getElementById('price')) {
        document.getElementById('price').value = numericPrice.toFixed(0);
    }
    
    // Buscar producto completo en BD
    try {
        const token = getToken();
        const products = await apiFetch('/products', 'GET', null, token);
        
        // Buscar por ID completo o parcial
        const found = products.find(p => 
            p._id === id || 
            p._id.includes(id) || 
            p._id.endsWith(id)
        );
        
        if (found) {
            console.log("✅ Producto encontrado en BD:", found.name);
            selectProductFromBarcode(found);
        } else {
            console.warn("⚠️ Producto no encontrado con ID:", id);
            // Aún así mostrar éxito porque los campos se llenaron
        }
    } catch (e) {
        console.warn('Error al consultar producto:', e);
    }
    
    showBarcodeSuccess(`🎉 ¡CÓDIGO LEÍDO EXITOSAMENTE!
                       
📦 Producto: ${name}
💰 Precio: $${numericPrice.toLocaleString('es-CO')}
                       
✅ Datos cargados automáticamente`);
}

async function handleStandardBarcode(code) {
    console.log("Procesando código estándar:", code);
    
    try {
        const token = getToken();
        const products = await apiFetch('/products', 'GET', null, token);
        
        // Intentar buscar por código de barras si tienes ese campo
        let found = products.find(p => p.barcode === code);
        
        if (!found) {
            // Mostrar modal de búsqueda manual
            showProductSearchModal(code, products.filter(p => !p.sold));
            return;
        }
        
        // Si encontró el producto
        if (document.getElementById('productName')) {
            document.getElementById('productName').value = found.name;
        }
        if (document.getElementById('price')) {
            document.getElementById('price').value = found.salePrice;
        }
        selectProductFromBarcode(found);
        
        showBarcodeSuccess(`✅ ¡Producto encontrado!
                           ${found.name}
                           Precio: $${found.salePrice.toLocaleString('es-CO')}`);
        
    } catch (error) {
        console.error('Error al buscar producto:', error);
        alert('Error al buscar el producto en la base de datos');
    }
}

/* ---------------------------------------------------------
   MODAL DE BÚSQUEDA PARA CÓDIGOS ESTÁNDAR
   --------------------------------------------------------- */
function showProductSearchModal(scannedCode, products) {
    const modal = document.createElement('div');
    modal.id = 'productSearchModal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center;
        z-index: 10000;
    `;
    
    modal.innerHTML = `
        <div style="
            background: white; border-radius: 15px; padding: 25px;
            max-width: 500px; width: 90%; max-height: 80%; overflow-y: auto;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        ">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="color: #2c3e50; margin: 0;">Código: ${scannedCode}</h3>
                <button onclick="closeProductSearchModal()" style="
                    background: none; border: none; font-size: 24px; cursor: pointer;
                    color: #7f8c8d; padding: 5px;
                ">×</button>
            </div>
            
            <p style="color: #7f8c8d; margin-bottom: 20px;">
                Este código no está en tu inventario. Selecciona el producto correspondiente:
            </p>
            
            <input type="text" id="productSearchInput" placeholder="Buscar producto..." style="
                width: 100%; padding: 12px; margin-bottom: 15px; 
                border: 1px solid #ddd; border-radius: 8px; font-size: 16px;
            ">
            
            <div id="productSearchResults" style="
                max-height: 250px; overflow-y: auto; border: 1px solid #eee; border-radius: 8px;
            "></div>
            
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
                <h4 style="color: #2c3e50; margin-bottom: 15px;">O ingresar manualmente:</h4>
                <input type="text" id="manualProductName" placeholder="Nombre del producto" style="
                    width: 100%; padding: 10px; margin: 8px 0; border: 1px solid #ddd; border-radius: 5px;
                ">
                <input type="number" id="manualProductPrice" placeholder="Precio" style="
                    width: 100%; padding: 10px; margin: 8px 0; border: 1px solid #ddd; border-radius: 5px;
                ">
                <button onclick="useManualProduct('${scannedCode}')" style="
                    background: #3498db; color: white; border: none; border-radius: 8px;
                    padding: 12px 20px; cursor: pointer; font-weight: 600; margin-top: 10px;
                ">Usar estos datos</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Configurar búsqueda
    const searchInput = document.getElementById('productSearchInput');
    const resultsDiv = document.getElementById('productSearchResults');
    
    function renderSearchResults(filteredProducts) {
        resultsDiv.innerHTML = '';
        if (filteredProducts.length === 0) {
            resultsDiv.innerHTML = '<p style="padding: 20px; text-align: center; color: #666;">No se encontraron productos</p>';
            return;
        }
        
        filteredProducts.slice(0, 10).forEach(product => {
            const item = document.createElement('div');
            item.style.cssText = `
                padding: 12px; border-bottom: 1px solid #eee; cursor: pointer;
                display: flex; justify-content: space-between; align-items: center;
                transition: background 0.2s;
            `;
            item.onmouseover = () => item.style.background = '#f8f9fa';
            item.onmouseout = () => item.style.background = 'white';
            
            item.innerHTML = `
                <div>
                    <div style="font-weight: 600; color: #2c3e50;">${product.name}</div>
                    <div style="color: #666; font-size: 14px; margin-top: 4px;">
                        ${product.brand} - $${product.salePrice.toLocaleString()}
                    </div>
                </div>
                <button onclick="selectSearchedProduct('${product._id}')" style="
                    background: #27ae60; color: white; border: none; border-radius: 6px;
                    padding: 8px 12px; cursor: pointer; font-size: 12px; font-weight: 600;
                ">Seleccionar</button>
            `;
            resultsDiv.appendChild(item);
        });
    }
    
    searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase();
        const filtered = products.filter(p => 
            p.name.toLowerCase().includes(query) ||
            p.brand.toLowerCase().includes(query)
        );
        renderSearchResults(filtered);
    });
    
    // Mostrar productos iniciales
    renderSearchResults(products.slice(0, 10));
}

/* ---------------------------------------------------------
   FUNCIONES AUXILIARES GLOBALES
   --------------------------------------------------------- */
window.closeProductSearchModal = function() {
    const modal = document.getElementById('productSearchModal');
    if (modal) modal.remove();
};

window.selectSearchedProduct = function(productId) {
    const token = getToken();
    apiFetch('/products', 'GET', null, token).then(products => {
        const product = products.find(p => p._id === productId);
        if (product) {
            if (document.getElementById('productName')) {
                document.getElementById('productName').value = product.name;
            }
            if (document.getElementById('price')) {
                document.getElementById('price').value = product.salePrice;
            }
            selectProductFromBarcode(product);
            showBarcodeSuccess(`✅ Producto seleccionado: ${product.name}`);
        }
    }).catch(error => {
        console.error('Error al cargar producto:', error);
        alert('Error al cargar el producto');
    });
    closeProductSearchModal();
};

window.useManualProduct = function(scannedCode) {
    const name = document.getElementById('manualProductName').value.trim();
    const price = parseFloat(document.getElementById('manualProductPrice').value);
    
    if (!name || isNaN(price)) {
        alert('Por favor completa nombre y precio');
        return;
    }
    
    if (document.getElementById('productName')) {
        document.getElementById('productName').value = name;
    }
    if (document.getElementById('price')) {
        document.getElementById('price').value = price;
    }
    
    showBarcodeSuccess(`✅ Producto agregado manualmente:
                       ${name} - $${price.toLocaleString('es-CO')}
                       Código original: ${scannedCode}`);
    closeProductSearchModal();
};

function selectProductFromBarcode(product) {
    if (typeof selectProduct === 'function') {
        selectProduct(product);
    }
}

function showBarcodeSuccess(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #27ae60, #2ecc71);
        color: white; padding: 25px 30px; border-radius: 15px;
        box-shadow: 0 10px 30px rgba(39,174,96,0.4); z-index: 10001;
        max-width: 400px; text-align: center; font-weight: 600;
        font-size: 16px; line-height: 1.4;
    `;
    notification.innerHTML = `
        <i class="fas fa-check-circle" style="font-size: 24px; margin-bottom: 10px; display: block;"></i>
        ${message}
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translate(-50%, -50%) scale(0.9)';
        notification.style.transition = 'all 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3500);
}

/* =========================================================
   FUNCIÓN PARA MOSTRAR RECIBO
   ========================================================= */
function showReceiptModal(saleData) {
    // Crear modal de recibo
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.7); display: flex; justify-content: center; align-items: center;
        z-index: 10000;
    `;
    
    modal.innerHTML = `
        <div style="
            background: white; border-radius: 15px; padding: 30px;
            max-width: 400px; width: 90%; box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        ">
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #27ae60; margin: 0;">
                    <i class="fas fa-check-circle"></i> Venta Guardada
                </h2>
                <p style="color: #666; margin: 10px 0;">Recibo de venta generado</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <p style="margin: 5px 0;"><strong>Cliente:</strong> ${saleData.clientName}</p>
                <p style="margin: 5px 0;"><strong>Producto:</strong> ${saleData.productName}</p>
                <p style="margin: 5px 0;"><strong>Fecha:</strong> ${new Date(saleData.saleDate).toLocaleDateString('es-CO')}</p>
                <p style="margin: 5px 0;"><strong>Total:</strong> $${Number(saleData.price).toLocaleString('es-CO')}</p>
                ${saleData.advancePayment > 0 ? `<p style="margin: 5px 0;"><strong>Anticipo:</strong> $${Number(saleData.advancePayment).toLocaleString('es-CO')}</p>` : ''}
            </div>
            
            <div style="display: flex; gap: 10px;">
                <button onclick="this.closest('.modal').remove(); window.open('recibos.html', '_blank');" 
                        style="flex: 1; background: #3498db; color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer;">
                    <i class="fas fa-file-alt"></i> Ver Recibos
                </button>
                <button onclick="this.closest('.modal').remove()" 
                        style="flex: 1; background: #95a5a6; color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer;">
                    <i class="fas fa-times"></i> Cerrar
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Cerrar al hacer clic fuera
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}