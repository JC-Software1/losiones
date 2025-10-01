/* ---------- módulos (sin cambios) ---------- */
import { apiFetch } from "../utils/api.js";
import { getToken } from "../utils/auth.js";
import "../keepAlive.js";

/* ---------- referencias DOM (sin cambios) ---------- */

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
        const sales = await apiFetch("/sales", "GET", null, token);
        list.innerHTML = "";

        const filteredSales = sales.filter(sale => {
            // Filtro por nombre/producto
            const clientMatch = sale.clientName.toLowerCase().includes(query.toLowerCase());
            const productMatch = sale.productName.toLowerCase().includes(query.toLowerCase());
            const searchMatch = clientMatch || productMatch;

            // Filtro por día de pago
            let dayMatch = true;
            if (filterDay) {
                const day = parseInt(filterDay);
                if (sale.paymentDays) {
                    const paymentDaysArray = sale.paymentDays.split(',').map(d => parseInt(d.trim()));
                    dayMatch = paymentDaysArray.includes(day);
                } else {
                    dayMatch = false;
                }
            }

            return searchMatch && dayMatch;
        });

        if (filteredSales.length === 0) {
            const message = filterDay 
                ? `<div class="empty-state">
                    <i class="fas fa-calendar-times"></i>
                    <h3>No hay préstamos para el día ${filterDay}</h3>
                    <p>No se encontraron ventas con pagos programados para este día</p>
                   </div>`
                : `<div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <h3>No se encontraron ventas</h3>
                   </div>`;
            list.innerHTML = message;
            return;
        }

        filteredSales.forEach((sale) => {
            const totalPaid = sale.payments.reduce((sum, p) => sum + p.amount, 0);
            const remainingDebt = sale.price - totalPaid;
            const paymentPercentage = (totalPaid / sale.price) * 100;

            const card = document.createElement("div");
            card.className = "sale-card";
            card.setAttribute("data-sale-id", sale._id);

            // Mostrar días de pago si existen
            const paymentDaysInfo = sale.paymentDays 
                ? `<p><i class="fas fa-calendar-check"></i> Días de pago: ${sale.paymentDays}</p>`
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

            card.querySelector(".btn-info").onclick   = () => viewSaleDetails(sale);
            card.querySelector(".btn-edit").onclick   = () => editSale(sale);
            card.querySelector(".btn-pay").onclick    = () => openPaymentModal(sale._id);
            card.querySelector(".btn-delete").onclick = () => deleteSale(sale._id);

            list.appendChild(card);
        });
    } catch (error) {
        console.error("Error al cargar ventas:", error);
        list.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-circle"></i><h3>Error al cargar ventas</h3><p>${error.message}</p></div>`;
    }
}


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

        selectedDays = sale.paymentDays ? sale.paymentDays.split(',').map(Number) : [];
        renderPills();
        renderCalendar();
    }

    selectedDays = sale.paymentDays ? sale.paymentDays.split(',').map(Number) : [];
    renderPills();
    renderCalendar();

    document.getElementById("paymentSection").style.display = "block";
    inputPaymentDate.value = new Date().toISOString().split('T')[0];

    btnSave.classList.add("hidden");
    btnUpdate.classList.remove("hidden");
    btnCancel.classList.remove("hidden");
    btnDelete.classList.remove("hidden");   // <- ahora sí se ve
    btnAddPayment.classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: 'smooth' }); // ⬅️ lleva al usuario arriba
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
    // 🔥 Validación de fecha
    if (!inputDate.value) {
        alert("Por favor selecciona una fecha de venta.");
        inputDate.focus();
        return;
    }

    // 🔥 Validación de productos seleccionados
    if (selectedProducts.length === 0) {
        alert("Por favor selecciona al menos un producto.");
        return;
    }

    const saleData = {
        clientName: inputClient.value.trim(),
        clientAddress: document.getElementById("clientAddress").value.trim(),
        products: selectedProducts.map(p => ({
            name: p.name,
            brand: p.brand,
            category: p.category,
            size: p.size,
            salePrice: p.salePrice
        })),
        saleDate: inputDate.value,
        price: parseFloat(inputPrice.value),
        installments: inputInstallments.value.trim(),
        advancePayment: parseFloat(inputAdvance.value) || 0,
        paymentDays: collectPaymentDays()
    };

    // 🎯 CAPTURAR DATOS PARA EL RECIBO ANTES DE LIMPIAR
    const receiptData = {
        clientName: inputClient.value.trim(),
        clientAddress: document.getElementById("clientAddress").value.trim(),
        products: [...selectedProducts], // Crear copia de los productos
        productName: selectedProducts.map(p => p.name).join(', '),
        saleDate: inputDate.value,
        price: parseFloat(inputPrice.value),
        installments: inputInstallments.value.trim(),
        advancePayment: parseFloat(inputAdvance.value) || 0,
        paymentDays: collectPaymentDays()
    };

    try {
        const token = getToken();
        await apiFetch("/sales/new", "POST", saleData, token);
        alert("Venta guardada correctamente.");

        // ✅ Marcar productos como vendidos con el nombre del cliente
        try {
            for (const product of selectedProducts) {
                await apiFetch(`/products/${product._id}/sell`, "PUT", { soldTo: inputClient.value.trim() }, token);
            }
        } catch (err) {
            console.warn("No se pudo marcar uno o más productos como vendidos:", err);
        }

        // Limpiar formulario y selección
        form.reset();
        inputDate.value = new Date().toISOString().split('T')[0];
        selectedProducts = [];
        renderSelectedProducts();
        updateTotalPrice();

        // Recargar ventas y productos
        await loadSales();
        await loadProductsForDropdown();

        // 🎯 MOSTRAR MODAL PARA GENERAR RECIBO CON LOS DATOS GUARDADOS
        showReceiptModal(receiptData);

    } catch (error) {
        console.error("Error al guardar la venta:", error.message);
        alert("No se pudo guardar la venta: " + error.message);
    }
}

/* ---------- actualizar ---------- */
async function updateSale() {
    const id = inputId.value;
    const saleData = {
        clientName: inputClient.value.trim(),
        clientAddress: document.getElementById("clientAddress").value.trim(),
        productName: inputProduct.value.trim(),
        saleDate: inputDate.value,
        price: parseFloat(inputPrice.value),
        installments: inputInstallments.value.trim(),
        paymentDays: collectPaymentDays() // ✅ Agregar esta línea
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
    btnDelete.classList.add("hidden");   // <- se oculta de nuevo
    btnAddPayment.classList.add("hidden");
    document.getElementById("paymentSection").style.display = "none";
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
btnSave.addEventListener("click", saveSale);
btnUpdate.addEventListener("click", updateSale);
btnCancel.addEventListener("click", cancelUpdate);
btnAddPayment.addEventListener("click", addPayment);

// Al cargar la página
document.addEventListener("DOMContentLoaded", () => {
    verificarModoAdmin();
    
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
    const token = getToken();
    const products = await apiFetch("/products", "GET", null, token);
    const panel = document.getElementById("productDropdownPanel");
    const searchInput = document.getElementById("productSearchInput");
    const listContainer = document.getElementById("productDropdownList");

    const availableProducts = products.filter(p => !p.sold);

    // Render inicial
    function renderProducts(filtered = availableProducts) {
        listContainer.innerHTML = "";
        if (filtered.length === 0) {
            listContainer.innerHTML = `<div class="dropdown-item disabled">No hay productos</div>`;
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

    searchInput.addEventListener("input", () => {
    const query = searchInput.value.trim();
    const day = dayFilterInput.value;
    loadSales(query, day);
});

dayFilterInput.addEventListener("change", () => {
    const query = searchInput.value.trim();
    const day = dayFilterInput.value;
    loadSales(query, day);
});

// Función para limpiar el filtro de día
function clearDayFilter() {
    dayFilterInput.value = "";
    const query = searchInput.value.trim();
    loadSales(query, "");
}

// Hacer la función global
window.clearDayFilter = clearDayFilter;

    // Render inicial
    renderProducts();
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

/* ---------- Estado ---------- */
let selectedDays = []; // números 1-31

/* ---------- Nodos ---------- */
const btnOpen   = document.getElementById('btnOpenCalendar');
const modalCal  = document.getElementById('calendarModal');
const closeBtn  = document.getElementById('closeCalendar');
const confirmBtn= document.getElementById('confirmDays');
const pillsBox  = document.getElementById('selectedDaysPills');
const calendar  = document.getElementById('calendarBody');

/* ---------- Abrir / Cerrar ---------- */
btnOpen.addEventListener('click', () => {
    renderCalendar();
    modalCal.classList.add('show');
});
closeBtn.addEventListener('click', () => modalCal.classList.remove('show'));
confirmBtn.addEventListener('click', () => {
    renderPills();
    modalCal.classList.remove('show');
});

/* ---------- Renderizar calendario ---------- */
function renderCalendar(){
    calendar.innerHTML = '';
    for(let d=1; d<=31; d++){
        const day = document.createElement('div');
        day.className = 'day-cell';
        day.textContent = d;
        if(selectedDays.includes(d)) day.classList.add('selected');
        day.addEventListener('click', () => {
            day.classList.toggle('selected');
            if(day.classList.contains('selected')){
                if(!selectedDays.includes(d)) selectedDays.push(d);
            }else{
                selectedDays = selectedDays.filter(n => n !== d);
            }
            selectedDays.sort((a,b)=>a-b);
        });
        calendar.appendChild(day);
    }
}

/* ---------- Mostrar pastillas ---------- */
function renderPills(){
    pillsBox.innerHTML = '';
    selectedDays.forEach(d => {
        const pill = document.createElement('span');
        pill.className = 'day-pill';
        pill.innerHTML = `${d} <button class="remove-day" data-day="${d}">×</button>`;
        pillsBox.appendChild(pill);
    });
    // Delegar evento para quitar
    pillsBox.addEventListener('click', e => {
        if(e.target.classList.contains('remove-day')){
            const day = Number(e.target.dataset.day);
            selectedDays = selectedDays.filter(n => n !== day);
            renderPills();
        }
    });
}

/* ---------- Al guardar la venta incluir los días ---------- */
function collectPaymentDays(){
    return selectedDays.join(','); // "5,10,15,20"
}

// Agregar estas funciones al final de tu archivo categories.js

/* ---------- SISTEMA DE RECIBOS ---------- */

/* ---------- SISTEMA DE RECIBOS (CORREGIDO) ---------- */

// Variable global para almacenar los datos de la venta
let currentSaleForReceipt = null;

// Generar número de recibo único
function generateReceiptNumber() {
    const now = new Date();
    const timestamp = now.getTime();
    // Usa solo los últimos 8 dígitos del timestamp para que quepa en un Number
    return parseInt(timestamp.toString().slice(-8));
}

// Mostrar modal de confirmación para generar recibo
function showReceiptModal(saleData) {
    console.log("Datos recibidos en showReceiptModal:", saleData); // Debug
    
    // Guardar datos globalmente
    currentSaleForReceipt = saleData;
    
    // Crear modal dinámicamente
    const modal = document.createElement('div');
    modal.id = 'receiptConfirmModal';
    modal.className = 'receipt-modal';
    modal.innerHTML = `
        <div class="receipt-modal-content">
            <div class="receipt-modal-header">
                <h2><i class="fas fa-receipt"></i> ¿Generar Recibo?</h2>
                <button class="close-btn" onclick="closeReceiptConfirmModal()">×</button>
            </div>
            <div class="receipt-modal-body">
                <p>¿Deseas generar un recibo para esta venta?</p>
                <div class="sale-summary">
                    <h3>Resumen de la venta:</h3>
                    <p><strong>Cliente:</strong> ${saleData.clientName || 'Sin nombre'}</p>
                    <p><strong>Producto:</strong> ${saleData.productName || 'Sin productos'}</p>
                    <p><strong>Total:</strong> $${(saleData.price || 0).toLocaleString('es-CO')}</p>
                    <p><strong>Abono inicial:</strong> $${(saleData.advancePayment || 0).toLocaleString('es-CO')}</p>
                </div>
            </div>
            <div class="receipt-modal-actions">
                <button class="btn btn-secondary" onclick="closeReceiptConfirmModal()">
                    <i class="fas fa-times"></i> No, gracias
                </button>
                <button class="btn btn-primary" onclick="generateReceiptFromModal()">
                    <i class="fas fa-receipt"></i> Sí, generar recibo
                </button>
            </div>
        </div>
    `;

    // Agregar estilos CSS (solo si no existen)
    if (!document.querySelector('#receiptModalStyles')) {
        const styles = document.createElement('style');
        styles.id = 'receiptModalStyles';
        styles.innerHTML = `
            .receipt-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                animation: fadeIn 0.3s ease;
            }

            .receipt-modal-content {
                background: white;
                border-radius: 15px;
                padding: 30px;
                max-width: 500px;
                width: 90%;
                max-height: 80%;
                overflow-y: auto;
                box-shadow: 0 20px 40px rgba(0,0,0,0.2);
                animation: slideIn 0.3s ease;
            }

            .receipt-modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                padding-bottom: 15px;
                border-bottom: 2px solid #ecf0f1;
            }

            .receipt-modal-header h2 {
                color: #2c3e50;
                margin: 0;
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .receipt-modal-body p {
                font-size: 1.1rem;
                margin-bottom: 20px;
                color: #34495e;
            }

            .sale-summary {
                background: #f8f9fa;
                padding: 20px;
                border-radius: 10px;
                border-left: 4px solid #3498db;
            }

            .sale-summary h3 {
                color: #2c3e50;
                margin-bottom: 15px;
                font-size: 1.2rem;
            }

            .sale-summary p {
                margin-bottom: 10px;
                color: #2c3e50;
            }

            .receipt-modal-actions {
                display: flex;
                gap: 15px;
                justify-content: flex-end;
                margin-top: 30px;
            }

            .btn {
                padding: 12px 24px;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-size: 1rem;
                font-weight: 600;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .btn-primary {
                background: #3498db;
                color: white;
            }

            .btn-secondary {
                background: #95a5a6;
                color: white;
            }

            .btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            }

            .close-btn {
                background: none;
                border: none;
                font-size: 1.5rem;
                cursor: pointer;
                color: #7f8c8d;
                padding: 5px;
                border-radius: 50%;
                width: 35px;
                height: 35px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease;
            }

            .close-btn:hover {
                background: #ecf0f1;
                color: #e74c3c;
            }

            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            @keyframes slideIn {
                from { transform: translateY(-50px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
        `;
        document.head.appendChild(styles);
    }

    document.body.appendChild(modal);
}

function generateReceiptFromModal() {
    console.log("Datos en generateReceiptFromModal:", currentSaleForReceipt); // Debug
    
    if (!currentSaleForReceipt) {
        alert("Error: No hay datos de la venta disponibles");
        return;
    }
    
    // Crear una copia profunda de los datos antes de hacer cualquier cosa
    const dataForReceipt = {
        clientName: currentSaleForReceipt.clientName,
        clientAddress: currentSaleForReceipt.clientAddress,
        products: currentSaleForReceipt.products ? [...currentSaleForReceipt.products] : [],
        productName: currentSaleForReceipt.productName,
        saleDate: currentSaleForReceipt.saleDate,
        price: currentSaleForReceipt.price,
        installments: currentSaleForReceipt.installments,
        advancePayment: currentSaleForReceipt.advancePayment,
        paymentDays: currentSaleForReceipt.paymentDays
    };
    
    console.log("Copia de datos para recibo:", dataForReceipt); // Debug
    
    // Cerrar modal
    closeReceiptConfirmModal();
    
    // Generar recibo con la copia
    generateReceipt(dataForReceipt);
}

function closeReceiptConfirmModal() {
    const modal = document.getElementById('receiptConfirmModal');
    if (modal) {
        modal.remove();
    }
    // Limpiar la variable después de un pequeño delay para asegurar que se use la copia
    setTimeout(() => {
        currentSaleForReceipt = null;
    }, 100);
}

// Generar recibo con canvas
function generateReceipt(saleData) {
    console.log("Datos en generateReceipt:", saleData); // Debug
    
    // Validación más robusta
    if (!saleData || typeof saleData !== 'object') {
        console.error("Error: saleData no es un objeto válido:", saleData);
        alert("Error: No se pudieron obtener los datos de la venta");
        return;
    }

    if (!saleData.clientName) {
        console.error("Error: falta clientName en saleData:", saleData);
        alert("Error: Faltan datos del cliente");
        return;
    }

    const receiptNumber = generateReceiptNumber();
    const receiptId = 'receipt_' + Date.now();
    
    // Crear canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 600;
    canvas.height = 800;
    
    // Fondo blanco
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Header con gradiente
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 120);
    gradient.addColorStop(0, '#2c3e50');
    gradient.addColorStop(1, '#3498db');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, 120);
    
    // Título principal
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('RECIBO DE VENTA', canvas.width / 2, 50);
    
    // Número de recibo
    ctx.font = 'bold 20px Arial';
    ctx.fillText(`Recibo #${receiptNumber}`, canvas.width / 2, 80);
    
    // Fecha de generación
    ctx.font = '16px Arial';
    ctx.fillText(`Fecha: ${new Date().toLocaleDateString('es-CO', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })}`, canvas.width / 2, 105);
    
    // Línea decorativa
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(50, 130);
    ctx.lineTo(canvas.width - 50, 130);
    ctx.stroke();
    
    // Sección cliente
    ctx.fillStyle = '#2c3e50';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('INFORMACIÓN DEL CLIENTE', 50, 170);
    
    // Línea bajo título
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(50, 180);
    ctx.lineTo(350, 180);
    ctx.stroke();
    
    ctx.font = '18px Arial';
    ctx.fillStyle = '#34495e';
    ctx.fillText(`Nombre: ${saleData.clientName || 'No especificado'}`, 50, 210);
    ctx.fillText(`Dirección: ${saleData.clientAddress || 'No especificada'}`, 50, 235);
    ctx.fillText(`Teléfono: ${saleData.clientPhone || 'No especificado'}`, 50, 260);
    
    // Sección productos
    ctx.fillStyle = '#2c3e50';
    ctx.font = 'bold 24px Arial';
    ctx.fillText('PRODUCTOS VENDIDOS', 50, 310);
    
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(50, 320);
    ctx.lineTo(320, 320);
    ctx.stroke();
    
    // Lista de productos
    let yPosition = 350;
    ctx.font = '16px Arial';
    ctx.fillStyle = '#34495e';
    
    if (saleData.products && saleData.products.length > 0) {
        saleData.products.forEach((product, index) => {
            ctx.fillText(`${index + 1}. ${product.name}`, 50, yPosition);
            ctx.fillText(`   Marca: ${product.brand || 'N/A'}`, 70, yPosition + 20);
            ctx.fillText(`   Precio: $${product.salePrice.toLocaleString('es-CO')}`, 70, yPosition + 40);
            yPosition += 70;
        });
    } else {
        ctx.fillText(`• ${saleData.productName || 'Producto no especificado'}`, 50, yPosition);
        yPosition += 30;
    }
    
    // Ajustar posición si hay muchos productos
    yPosition = Math.max(yPosition, 480);
    
    // Sección financiera
    ctx.fillStyle = '#2c3e50';
    ctx.font = 'bold 24px Arial';
    ctx.fillText('INFORMACIÓN FINANCIERA', 50, yPosition);
    
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(50, yPosition + 10);
    ctx.lineTo(350, yPosition + 10);
    ctx.stroke();
    
    yPosition += 40;
    ctx.font = '18px Arial';
    ctx.fillStyle = '#34495e';
    ctx.fillText(`Fecha de venta: ${new Date(saleData.saleDate).toLocaleDateString('es-CO')}`, 50, yPosition);
    yPosition += 30;
    ctx.fillText(`Valor total: $${(saleData.price || 0).toLocaleString('es-CO')}`, 50, yPosition);
    yPosition += 30;
    ctx.fillText(`Abono inicial: $${(saleData.advancePayment || 0).toLocaleString('es-CO')}`, 50, yPosition);
    yPosition += 30;
    
    const saldoPendiente = (saleData.price || 0) - (saleData.advancePayment || 0);
    if (saldoPendiente > 0) {
        ctx.fillStyle = '#e74c3c';
        ctx.font = 'bold 18px Arial';
        ctx.fillText(`Saldo pendiente: $${saldoPendiente.toLocaleString('es-CO')}`, 50, yPosition);
        yPosition += 30;
        
        ctx.fillStyle = '#34495e';
        ctx.font = '18px Arial';
        ctx.fillText(`Cuotas: ${saleData.installments || 'No especificado'}`, 50, yPosition);
        
        if (saleData.paymentDays) {
            yPosition += 30;
            const days = saleData.paymentDays.split(',').map(d => d.trim()).join(', ');
            ctx.fillText(`Días de pago: ${days}`, 50, yPosition);
        }
    } else {
        ctx.fillStyle = '#27ae60';
        ctx.font = 'bold 18px Arial';
        ctx.fillText('✓ PAGADO COMPLETAMENTE', 50, yPosition);
    }
    
    // Footer
    yPosition = canvas.height - 100;
    ctx.fillStyle = '#95a5a6';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Este recibo fue generado automáticamente', canvas.width / 2, yPosition);
    ctx.fillText(`Por el programa JC-C - ${new Date().getFullYear()}`, canvas.width / 2, yPosition + 20);
    
    // Línea final decorativa
    ctx.strokeStyle = '#bdc3c7';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(50, yPosition - 20);
    ctx.lineTo(canvas.width - 50, yPosition - 20);
    ctx.stroke();
    
    // Guardar recibo
    const receiptData = {
        id: receiptId,
        receiptNumber: receiptNumber,
        saleData: saleData,
        createdAt: new Date().toISOString(),
        canvas: canvas.toDataURL('image/png')
    };
    
    console.log("Recibo generado exitosamente:", receiptData.receiptNumber); // Debug
    
    saveReceipt(receiptData);
    
    // Mostrar modal de opciones
    showReceiptOptionsModal(receiptData);
}

async function saveReceiptToMongo(receiptData) {
    try {
        const token = getToken();
        await apiFetch("/receipts", "POST", {
            receiptNumber: receiptData.receiptNumber, // ✅ ahora es número
            saleData: receiptData.saleData,
            localId: receiptData.id
        }, token);
        console.log("✅ Recibo guardado en MongoDB");
    } catch (err) {
        console.warn("❌ No se pudo guardar el recibo en MongoDB:", err);
    }
}

// Resto de funciones permanecen igual...
function saveReceipt(receiptData) {
    // Solo guardar en MongoDB, no usar localStorage
    saveReceiptToMongo(receiptData);
    console.log('✅ Recibo guardado en MongoDB');
}
// REEMPLAZA la función showReceiptOptionsModal en tu categories.js:

function showReceiptOptionsModal(receiptData) {
    const modal = document.createElement('div');
    modal.id = 'receiptOptionsModal';
    modal.className = 'receipt-modal';
    modal.innerHTML = `
        <div class="receipt-modal-content" style="max-width: 700px;">
            <div class="receipt-modal-header">
                <h2><i class="fas fa-check-circle" style="color: #27ae60;"></i> ¡Recibo Generado!</h2>
                <button class="close-btn" onclick="closeReceiptOptionsModal()">×</button>
            </div>
            <div class="receipt-modal-body">
                <div class="receipt-preview">
                    <img src="${receiptData.canvas}" alt="Recibo" style="width: 100%; max-width: 400px; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 20px;">
                </div>
                <p style="text-align: center; color: #27ae60; font-weight: 600; margin-bottom: 15px;">
                    <i class="fas fa-save"></i> El recibo ha sido guardado automáticamente
                </p>
                <div style="text-align: center; margin: 20px 0;">
                    <strong>Recibo #${receiptData.receiptNumber}</strong><br>
                    <span style="color: #7f8c8d;">Cliente: ${receiptData.saleData.clientName}</span>
                </div>
                
                <!-- Botón de compartir prominente -->
                <div style="text-align: center; margin: 25px 0;">
                    <button class="btn btn-share-prominent" onclick="shareReceiptFromModal('${receiptData.id}')" style="
                        background: linear-gradient(135deg, #25D366 0%, #128C7E 100%);
                        color: white;
                        border: none;
                        border-radius: 12px;
                        padding: 15px 30px;
                        font-size: 18px;
                        font-weight: 700;
                        cursor: pointer;
                        box-shadow: 0 4px 15px rgba(37, 211, 102, 0.3);
                        transition: all 0.3s ease;
                        display: inline-flex;
                        align-items: center;
                        gap: 12px;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                    " onmouseover="
                        this.style.transform = 'translateY(-3px)';
                        this.style.boxShadow = '0 8px 25px rgba(37, 211, 102, 0.4)';
                    " onmouseout="
                        this.style.transform = 'translateY(0)';
                        this.style.boxShadow = '0 4px 15px rgba(37, 211, 102, 0.3)';
                    ">
                        <i class="fas fa-share-alt" style="font-size: 20px;"></i>
                        Compartir Recibo
                    </button>
                </div>

                <p style="text-align: center; color: #7f8c8d; font-size: 14px; margin-top: 10px;">
                    Comparte por WhatsApp, email o cualquier app
                </p>
            </div>
            
            <div class="receipt-modal-actions" style="border-top: 1px solid #ecf0f1; padding-top: 20px;">
                <button class="btn btn-secondary" onclick="closeReceiptOptionsModal()">
                    <i class="fas fa-times"></i> Cerrar
                </button>
                <button class="btn btn-primary" onclick="downloadReceiptFromModal('${receiptData.id}')">
                    <i class="fas fa-download"></i> Descargar
                </button>
                <button class="btn" style="background: #9b59b6; color: white;" onclick="viewReceiptsPage()">
                    <i class="fas fa-eye"></i> Ver todos
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function closeReceiptOptionsModal() {
    const modal = document.getElementById('receiptOptionsModal');
    if (modal) {
        modal.remove();
    }
}

// REEMPLAZA la función shareReceiptFromModal en tu categories.js:

function shareReceiptFromModal(receiptId) {
    const receipts = JSON.parse(localStorage.getItem('salesReceipts') || '[]');
    const receipt = receipts.find(r => r.id === receiptId);
    
    if (!receipt) {
        alert("Error: No se encontró el recibo");
        return;
    }

    // Mostrar indicador de carga
    const shareBtn = document.querySelector('.btn-share-prominent');
    const originalContent = shareBtn.innerHTML;
    shareBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Preparando...';
    shareBtn.disabled = true;

    // Convertir dataURL a blob
    fetch(receipt.canvas)
        .then(res => res.blob())
        .then(blob => {
            const file = new File([blob], `recibo-${receipt.receiptNumber}.png`, { type: 'image/png' });
            
            // Verificar si el dispositivo soporta compartir archivos
            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                // Usar API nativa de compartir (funciona en móviles)
                return navigator.share({
                    title: `Recibo de Venta #${receipt.receiptNumber}`,
                    text: `Recibo de venta para ${receipt.saleData.clientName} - Total: $${receipt.saleData.price.toLocaleString('es-CO')}`,
                    files: [file]
                }).then(() => {
                    // Éxito al compartir
                    showShareSuccess();
                }).catch((error) => {
                    if (error.name !== 'AbortError') {
                        // Error que no sea cancelación del usuario
                        console.error('Error al compartir:', error);
                        fallbackShare(file, receipt);
                    }
                });
            } else {
                // Fallback para dispositivos que no soportan la API nativa
                fallbackShare(file, receipt);
            }
        })
        .catch(error => {
            console.error('Error al procesar el recibo:', error);
            alert('Error al preparar el recibo para compartir');
        })
        .finally(() => {
            // Restaurar el botón
            shareBtn.innerHTML = originalContent;
            shareBtn.disabled = false;
        });
}

// Función auxiliar para mostrar éxito al compartir
function showShareSuccess() {
    const successMsg = document.createElement('div');
    successMsg.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #27ae60;
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 4px 20px rgba(39, 174, 96, 0.3);
        z-index: 10001;
        display: flex;
        align-items: center;
        gap: 10px;
        font-weight: 600;
        animation: slideInRight 0.3s ease;
    `;
    successMsg.innerHTML = `
        <i class="fas fa-check-circle"></i>
        ¡Recibo compartido exitosamente!
    `;
    
    document.body.appendChild(successMsg);
    
    setTimeout(() => {
        successMsg.remove();
    }, 3000);
}

// Función auxiliar para compartir en dispositivos que no soportan la API nativa
function fallbackShare(file, receipt) {
    // Crear URL del archivo
    const url = URL.createObjectURL(file);
    
    // Detectar si es móvil
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
        // En móviles, mostrar opciones de compartir
        showMobileShareOptions(url, file, receipt);
    } else {
        // En desktop, descargar directamente
        const a = document.createElement('a');
        a.href = url;
        a.download = `recibo-${receipt.receiptNumber}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // Mostrar mensaje personalizado
        showDesktopShareMessage();
    }
}

// Mostrar opciones de compartir en móviles
function showMobileShareOptions(url, file, receipt) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: flex-end;
        z-index: 10002;
        padding: 20px;
    `;
    
    modal.innerHTML = `
        <div style="
            background: white;
            border-radius: 20px 20px 0 0;
            padding: 30px;
            width: 100%;
            max-width: 400px;
            animation: slideUpFromBottom 0.3s ease;
        ">
            <h3 style="text-align: center; margin-bottom: 20px; color: #2c3e50;">
                <i class="fas fa-share-alt"></i> Compartir Recibo
            </h3>
            
            <div style="display: flex; flex-direction: column; gap: 15px;">
                <button onclick="openWhatsApp('${receipt.receiptNumber}', '${receipt.saleData.clientName}')" style="
                    background: #25D366;
                    color: white;
                    border: none;
                    border-radius: 12px;
                    padding: 15px;
                    font-size: 16px;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    cursor: pointer;
                ">
                    <i class="fab fa-whatsapp" style="font-size: 24px;"></i>
                    Compartir por WhatsApp
                </button>
                
                <button onclick="downloadReceiptDirect('${url}', '${receipt.receiptNumber}')" style="
                    background: #3498db;
                    color: white;
                    border: none;
                    border-radius: 12px;
                    padding: 15px;
                    font-size: 16px;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    cursor: pointer;
                ">
                    <i class="fas fa-download" style="font-size: 20px;"></i>
                    Descargar y compartir manualmente
                </button>
                
                <button onclick="this.parentElement.parentElement.parentElement.remove()" style="
                    background: #95a5a6;
                    color: white;
                    border: none;
                    border-radius: 12px;
                    padding: 15px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                ">
                    Cancelar
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Función para abrir WhatsApp con el texto del recibo
function openWhatsApp(receiptNumber, clientName) {
    const text = `¡Hola! Te envío el recibo de tu compra.\n\n📋 *Recibo #${receiptNumber}*\n👤 Cliente: ${clientName}\n\n¡Gracias por tu compra!`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
    
    // Cerrar modal
    document.querySelector('[style*="z-index: 10002"]')?.remove();
}

// Función para descargar directamente
function downloadReceiptDirect(url, receiptNumber) {
    const a = document.createElement('a');
    a.href = url;
    a.download = `recibo-${receiptNumber}.png`;
    a.click();
    
    // Cerrar modal y mostrar mensaje
    document.querySelector('[style*="z-index: 10002"]')?.remove();
    showShareSuccess();
}

// Mensaje para desktop
function showDesktopShareMessage() {
    const msg = document.createElement('div');
    msg.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        border-radius: 15px;
        padding: 30px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        z-index: 10001;
        text-align: center;
        max-width: 400px;
    `;
    msg.innerHTML = `
        <i class="fas fa-download" style="font-size: 48px; color: #3498db; margin-bottom: 20px;"></i>
        <h3 style="color: #2c3e50; margin-bottom: 15px;">¡Recibo descargado!</h3>
        <p style="color: #7f8c8d; margin-bottom: 20px;">
            El archivo se guardó en tu carpeta de descargas. 
            Ahora puedes compartirlo por email, WhatsApp o cualquier aplicación.
        </p>
        <button onclick="this.parentElement.remove()" style="
            background: #3498db;
            color: white;
            border: none;
            border-radius: 8px;
            padding: 10px 20px;
            cursor: pointer;
        ">Entendido</button>
    `;
    
    document.body.appendChild(msg);
    
    setTimeout(() => {
        msg.remove();
    }, 5000);
}

// Agregar estilos para las animaciones (si no existen)
if (!document.querySelector('#shareAnimationStyles')) {
    const styles = document.createElement('style');
    styles.id = 'shareAnimationStyles';
    styles.innerHTML = `
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes slideUpFromBottom {
            from { transform: translateY(100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
    `;
    document.head.appendChild(styles);
}

function downloadReceiptFromModal(receiptId) {
    const receipts = JSON.parse(localStorage.getItem('salesReceipts') || '[]');
    const receipt = receipts.find(r => r.id === receiptId);
    
    if (!receipt) return;
    
    const link = document.createElement('a');
    link.download = `recibo-${receipt.receiptNumber}.png`;
    link.href = receipt.canvas;
    link.click();
}

function viewReceiptsPage() {
    closeReceiptOptionsModal();
    window.location.href = 'recibos.html';
}

// Event listeners globales
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeReceiptConfirmModal();
        closeReceiptOptionsModal();
    }
});

// Hacer las funciones globales (ACTUALIZADO)
window.closeReceiptConfirmModal = closeReceiptConfirmModal;
window.generateReceiptFromModal = generateReceiptFromModal;
window.closeReceiptOptionsModal = closeReceiptOptionsModal;
window.shareReceiptFromModal = shareReceiptFromModal;
window.downloadReceiptFromModal = downloadReceiptFromModal;
window.viewReceiptsPage = viewReceiptsPage;

// Nuevas funciones globales para compartir
window.openWhatsApp = openWhatsApp;
window.downloadReceiptDirect = downloadReceiptDirect;

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