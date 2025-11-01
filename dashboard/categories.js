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
/* ---------- carga de ventas (100 % funcional) ---------- */
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
            // Excluir liquidadas
            if (sale.settled === true) return false;

            const clientMatch = sale.clientName.toLowerCase().includes(query.toLowerCase());
            const productMatch = sale.productName.toLowerCase().includes(query.toLowerCase());
            const searchMatch = clientMatch || productMatch;

let dayMatch = true;
if (filterDay) {
    // Normalizamos el tipo de plan seleccionado
    const planType = document.getElementById('dayFilterType').value; // "semanal", "quincenal", "mensual"

    // Normalizamos los días de la venta
    const rawDays = (() => {
        if (typeof sale.paymentDays === 'string') return sale.paymentDays.split(',').map(d => d.trim());
        if (Array.isArray(sale.paymentDays)) return sale.paymentDays.map(d => String(d).trim());
        return [];
    })();

    // Verificamos frecuencia exacta
    const freqMatch = (sale.paymentFrequency || '').toLowerCase() === planType;

    // Verificamos que el día esté en la lista
    const dayIncluded = rawDays.includes(filterDay.trim());

    dayMatch = freqMatch && dayIncluded;
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

        filteredSales.forEach(sale => {
            const totalPaid = sale.payments.reduce((sum, p) => sum + p.amount, 0);
            const remainingDebt = sale.price - totalPaid;
            const paymentPercentage = (totalPaid / sale.price) * 100;

            const card = document.createElement('div');
            card.className = 'sale-card';
            card.setAttribute('data-sale-id', sale._id);

            // Indicador de atraso
            let statusBadge = '';
            if (filterDay) {
                const filterDayNum = parseInt(filterDay);
                const today = new Date().getDate();

                const rawDays = (() => {
                    if (typeof sale.paymentDays === 'string') return sale.paymentDays.split(',');
                    if (Array.isArray(sale.paymentDays)) return sale.paymentDays;
                    return [];
                })();
                const paymentDaysArray = rawDays
                    .map(d => parseInt(String(d).trim()))
                    .filter(n => !isNaN(n));

                const missedDays = paymentDaysArray
                    .filter(d => d < today)
                    .filter(d => !sale.payments.some(p => new Date(p.date).getDate() === d));

                if (missedDays.length) {
                    const oldest = Math.min(...missedDays);
                    const daysOverdue = filterDayNum - oldest;
                    const missedText = missedDays.sort((a, b) => a - b).join(', ');
                    statusBadge = `<span style="background: #e74c3c; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; margin-left: 8px;">⚠️ DEBE DÍA(S): ${missedText} | ${daysOverdue} día(s) atrasado</span>`;
                }
            }

            const freq = sale.paymentFrequency || 'mensual';
            const daysText = sale.paymentDaysText || (Array.isArray(sale.paymentDays) ? sale.paymentDays.join(', ') : sale.paymentDays || '');
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
  <!-- ⭐ NUEVO: valor de cada cuota -->
${(() => {
    const installmentValue = sale.paymentPerInstallment || 
        Math.ceil((sale.price - (sale.advancePayment || 0)) / (parseInt(sale.installments) || 1));
    return `<div style="margin-top:6px;font-size:13px;color:#7f8c8d">
        Cuota: $${installmentValue.toLocaleString('es-CO')} ${sale.paymentFrequency}
    </div>`;
})()}
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

        buildSmartDayFilter(sales);

    } catch (error) {
        console.error('Error al cargar ventas:', error);
        list.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-circle"></i><h3>Error al cargar ventas</h3><p>${error.message}</p></div>`;
    }
}

/* ----------  FILTRO INTELIGENTE DE DÍAS  ---------- */
function buildSmartDayFilter(sales) {
  const semana = new Set();   // Lunes, Martes…
  const quin   = new Set();   // "1 y 15", "2 y 16"…
  const mens   = new Set();   // 1, 2, 3…

  sales.forEach(s => {
    const freq = s.paymentFrequency || 'mensual';
    const days = (s.paymentDays || []).map(d => String(d).trim());

    if (freq === 'semanal') {
      days.forEach(d => semana.add(d));
    } else if (freq === 'quincenal') {
      days.forEach(d => quin.add(d));
    } else {
      days.forEach(d => mens.add(d));
    }
  });

  // Guardamos para usar después
  window.availableFilters = {
    semanal: Array.from(semana).sort(),
    quincenal: Array.from(quin).sort(),
    mensual: Array.from(mens).sort((a, b) => a - b)
  };

  // Poblamos el segundo select apenas cambie el primero
  const typeSel = document.getElementById('dayFilterType');
  const daySel  = document.getElementById('dayFilterInput');

  typeSel.onchange = () => {
    daySel.innerHTML = '<option value="">Elegí un día</option>';
    daySel.disabled  = false;
    const tipo = typeSel.value;
    if (!tipo) { daySel.disabled = true; return; }

    const opciones = window.availableFilters[tipo] || [];
    opciones.forEach(d => {
      const opt       = document.createElement('option');
      opt.value       = d;
      opt.textContent = d;
      daySel.appendChild(opt);
    });
  };
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
async function editSale(sale) {
    inputId.value         = sale._id;
    inputClient.value     = sale.clientName;
    inputProduct.value    = sale.productName;
    inputDate.value       = new Date(sale.saleDate).toISOString().split('T')[0];
    inputPrice.value      = sale.price;
    inputInstallments.value = sale.installments;

    // ✅ Cargar valor por cuota si existe
    if (sale.paymentPerInstallment) {
        document.getElementById('installmentAmount').value = sale.paymentPerInstallment;
    }

    // ✅ NUEVO: Cargar abono inicial
    inputAdvance.value = sale.advancePayment || 0;

    // ✅ Habilitar edición de precio total y abono
    inputPrice.removeAttribute('readonly');
    inputAdvance.removeAttribute('readonly');
    
    if (document.getElementById("clientAddress")) {
        document.getElementById("clientAddress").value = sale.clientAddress || '';
    }

    // ✅ Cargar días de pago
    if (sale.paymentDays) {
        loadPaymentDaysFromString(sale.paymentDays);
    } else {
        selectedPaymentPlan = { type: '', days: [] };
        paymentPlanType.value = '';
        paymentDaysContainer.style.display = 'none';
        updateSelectedDaysDisplay();
    }

    // ✅ Cargar productos EXACTOS de la venta con sus precios originales
    selectedProducts = [];
    
    const productNames = sale.productName.split(',').map(p => p.trim()).filter(Boolean);
    const pricePerProduct = Math.round(sale.price / productNames.length);

    // Si la venta tiene el array 'products' con info completa, usarlo
    if (sale.products && sale.products.length > 0) {
        selectedProducts = sale.products.map(p => ({
            _id: p._id || `temp_${Date.now()}_${Math.random()}`,
            name: p.name,
            brand: p.brand || 'Sin marca',
            category: p.category || 'Sin categoría',
            size: p.size || '',
            salePrice: p.salePrice || pricePerProduct
        }));
    } else {
        // Fallback: crear productos sintéticos con precio proporcional
        const token = getToken();
        try {
            const allProducts = await apiFetch('/products', 'GET', null, token);
            
            productNames.forEach(name => {
                const foundInInventory = allProducts.find(p => p.name.trim() === name);
                
                selectedProducts.push({
                    _id: foundInInventory?._id || `temp_${Date.now()}_${Math.random()}`,
                    name: name,
                    brand: foundInInventory?.brand || 'Sin marca',
                    category: foundInInventory?.category || 'Sin categoría',
                    size: foundInInventory?.size || '',
                    salePrice: pricePerProduct
                });
            });
        } catch (error) {
            console.warn('No se pudo cargar inventario, usando datos básicos:', error);
            productNames.forEach(name => {
                selectedProducts.push({
                    _id: `temp_${Date.now()}_${Math.random()}`,
                    name: name,
                    brand: 'Sin marca',
                    category: 'Sin categoría',
                    size: '',
                    salePrice: pricePerProduct
                });
            });
        }
    }

    renderSelectedProducts();
    updateTotalPrice();

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
    const advance       = Number(inputAdvance.value) || 0;
    const address       = String(document.getElementById("clientAddress").value.trim() || "Sin dirección");

    // ---------- Validación FINAL ----------
    if (!clientName || !productName || !saleDate || !price) {
        alert("⚠ Faltan datos obligatorios:\nCliente, Producto, Fecha o Precio.");
        return;
    }

// Extraer número de cuotas (permite decimales con 2 dígitos: 4,44 → 4.44)
const cuotasMatch = installments.match(/^\d+(?:[.,]\d{1,2})?/);
const numberOfInstallments = cuotasMatch ? parseFloat(cuotasMatch[0].replace(',', '.')) : 1;

// ✅ CORREGIDO: Priorizar el valor manual del usuario
const manualInstallmentAmount = parseFloat(document.getElementById('installmentAmount').value);
const remaining = price - advance;

let paymentPerInstallment;
if (manualInstallmentAmount > 0) {
    // Si el usuario ingresó un valor manualmente, calcular cuotas CON DECIMALES
    const exactCuotas = remaining / manualInstallmentAmount;
    paymentPerInstallment = manualInstallmentAmount;
    
    // Actualizar el campo de cuotas con el valor decimal
    document.getElementById('installments').value = exactCuotas.toFixed(2);
} else {
    // Si no, calcular automáticamente
    paymentPerInstallment = numberOfInstallments <= 0 ? 0 : Math.ceil(remaining / numberOfInstallments);
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
        numberOfInstallments,        // ⭐ NUEVO
        paymentPerInstallment,       // ⭐ NUEVO
        // ✅ NUEVO: Guardar plan de pago en campos separados
        ...(collectPaymentPlan() || { 
            paymentFrequency: 'mensual', 
            paymentDays: [], 
            paymentDaysText: '' 
        }),
        paymentDays: selectedPaymentPlan.days.join(', ') // "Miércoles, Viernes"
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
    const plan = collectPaymentPlan();
    
    const installments = inputInstallments.value.trim();
    const price = parseFloat(inputPrice.value);
    const advance = parseFloat(document.getElementById('advancePayment').value) || 0;
    
    // Extraer número de cuotas (permite decimales)
    const cuotasMatch = installments.match(/^\d+(?:[.,]\d{1,2})?/);
    const numberOfInstallments = cuotasMatch ? parseFloat(cuotasMatch[0].replace(',', '.')) : 1;

    // ✅ Usar valor manual si existe
    const manualInstallmentAmount = parseFloat(document.getElementById('installmentAmount').value);
    const remaining = price - advance;

    let paymentPerInstallment;
    if (manualInstallmentAmount > 0) {
        const exactCuotas = remaining / manualInstallmentAmount;
        paymentPerInstallment = manualInstallmentAmount;
        document.getElementById('installments').value = exactCuotas.toFixed(2);
    } else {
        paymentPerInstallment = numberOfInstallments <= 0 ? 0 : Math.ceil(remaining / numberOfInstallments);
    }
    
    const saleData = {
        clientName: inputClient.value.trim(),
        clientAddress: document.getElementById("clientAddress").value.trim(),
        productName: inputProduct.value.trim(),
        saleDate: inputDate.value,
        price: price,
        installments: installments,
        numberOfInstallments,
        paymentPerInstallment,
        advancePayment: advance, // ✅ NUEVO: Incluir abono inicial
        updateProductPrices: true,
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

        /* ---- nuevo ---- */
const sale = JSON.parse(localStorage.getItem('saleDetails'));
sale.payments.push({ amount, date });
localStorage.setItem('saleDetails', JSON.stringify(sale));
window.dispatchEvent(new Event('saleUpdated'));
/* --------------- */

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
/* ---------- modal de pago (con autollenado) ---------- */
function openPaymentModal(saleId) {
    // 1. Buscar la venta en el listado actual
    const cards = document.querySelectorAll('.sale-card');
    let sale = null;

    cards.forEach(card => {
        if (card.dataset.saleId === saleId) {
            // Extraemos los datos del card
            const cuotaText = card.querySelector('.sale-amount div:last-child')?.textContent || '';
            const match = cuotaText.match(/[\d,.]+/);
            sale = {
                _id: saleId,
                paymentPerInstallment: match ? parseInt(match[0].replace(/\D/g, '')) : 0
            };
        }
    });

    // 2. Abrir modal y autollenar
    const modal = document.getElementById('paymentModal');
    modal?.classList.add('show');
    document.getElementById('paymentAmount').value = sale?.paymentPerInstallment || '';
    document.getElementById('paymentDate').value = new Date().toISOString().split('T')[0];
    modal.dataset.saleId = saleId;
}

// 🔒 Bandera para evitar loops infinitos
let isUpdating = false;

// ✅ Listener para cambio de número de cuotas
document.getElementById('installments').addEventListener('input', function() {
    if (isUpdating) return;
    
    const total = parseFloat(document.getElementById('price').value) || 0;
    const advance = parseFloat(document.getElementById('advancePayment').value) || 0;
    const cuotas = parseFloat(this.value.replace(',', '.')) || 0;
    
    if (cuotas <= 0) {
        document.getElementById('installmentAmount').value = '';
        return;
    }
    
    const remaining = total - advance;
    const perInstallment = Math.ceil(remaining / cuotas);
    
    isUpdating = true;
    document.getElementById('installmentAmount').value = perInstallment;
    isUpdating = false;
});

// ✅ Listener para cambio de valor por cuota (CON DECIMALES)
document.getElementById('installmentAmount').addEventListener('input', function() {
    if (isUpdating) return;
    
    const total = parseFloat(document.getElementById('price').value) || 0;
    const advance = parseFloat(document.getElementById('advancePayment').value) || 0;
    const perInstallment = parseFloat(this.value) || 0;
    
    if (perInstallment <= 0) {
        document.getElementById('installments').value = '';
        return;
    }
    
    const remaining = total - advance;
    // ✅ CAMBIO CLAVE: No redondear, usar decimales
    const exactCuotas = remaining / perInstallment;
    
    isUpdating = true;
    document.getElementById('installments').value = exactCuotas.toFixed(2);
    isUpdating = false;
});

// ✅ Listener para cambio de abono inicial
document.getElementById('advancePayment').addEventListener('input', () => {
    if (isUpdating) return;
    
    const installmentValue = parseFloat(document.getElementById('installmentAmount').value);
    
    if (installmentValue > 0) {
        const total = parseFloat(document.getElementById('price').value) || 0;
        const advance = parseFloat(document.getElementById('advancePayment').value) || 0;
        const remaining = total - advance;
        // ✅ CAMBIO CLAVE: Usar decimales
        const exactCuotas = remaining / installmentValue;
        
        isUpdating = true;
        document.getElementById('installments').value = exactCuotas.toFixed(2);
        isUpdating = false;
    } else {
        updateTotalPrice();
    }
});

/* ---------- listeners (sin cambios) ---------- */
searchInput.addEventListener("input", () => loadSales(searchInput.value.trim()));
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
      <div class="product-name">${product.name}</div>
      <div class="product-bottom">
        <span class="product-price">$${product.salePrice.toLocaleString('es-CO')}</span>
        <div class="product-buttons">
          <button class="edit-price"  data-index="${index}" title="Editar precio">✏️</button>
          <button class="remove"      data-index="${index}" title="Eliminar">🗑️</button>
        </div>
      </div>
    `;

    // listeners
    tag.querySelector('.edit-price').addEventListener('click', e => {
      const idx = parseInt(e.currentTarget.dataset.index);
      editProductPrice(idx);
    });
    tag.querySelector('.remove').addEventListener('click', e => {
      const idx = parseInt(e.currentTarget.dataset.index);
      removeSelectedProduct(idx);
    });

    container.appendChild(tag);
  });
}

async function editProductPrice(index) {
    const product = selectedProducts[index];
    if (!product) return;

    const newPrice = prompt(
        `🔧 Editar precio de: ${product.name}\n\nPrecio actual: $${product.salePrice.toLocaleString()}\n\nIngresa el nuevo precio:`,
        product.salePrice
    );

    if (newPrice === null || newPrice.trim() === '') return;

    const parsedPrice = parseFloat(newPrice);
    
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
        alert('❌ Precio inválido. Debe ser un número mayor a 0.');
        return;
    }

    // Guardar precio original para revertir si falla
    const originalPrice = product.salePrice;
    
    // Actualizar en el array local
    selectedProducts[index].salePrice = parsedPrice;

    // Actualizar en la base de datos
    try {
        const token = getToken();
        
        // ✅ CORREGIDO: Preparar datos completos del producto
        const updateData = {
            name: product.name,
            costPrice: product.costPrice || 0,
            salePrice: parsedPrice,
            category: product.category || 'Sin categoría',
            brand: product.brand || 'Sin marca',
            size: product.size || null
        };
        
        console.log('📤 Enviando actualización de producto:', updateData);
        
        await apiFetch(`/products/${product._id}`, 'PUT', updateData, token);

        // Mostrar notificación de éxito
        showPriceUpdateNotification(product.name, parsedPrice);

        // Re-renderizar los productos seleccionados
        renderSelectedProducts();
        updateTotalPrice();

    } catch (error) {
        console.error('Error al actualizar precio del producto:', error);
        
        // Revertir el cambio local si falló el guardado
        selectedProducts[index].salePrice = originalPrice;
        renderSelectedProducts();
        
        // Mostrar error más descriptivo
        let errorMessage = 'No se pudo actualizar el precio';
        if (error.message) {
            errorMessage += ': ' + error.message;
        }
        alert('❌ ' + errorMessage);
    }
}

function showPriceUpdateNotification(productName, newPrice) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: linear-gradient(135deg, #27ae60, #2ecc71);
        color: white;
        padding: 16px 20px;
        border-radius: 10px;
        box-shadow: 0 10px 30px rgba(39,174,96,0.4);
        z-index: 10001;
        font-weight: 600;
        font-size: 14px;
        animation: slideInRight 0.3s ease;
        max-width: 300px;
    `;
    
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-check-circle" style="font-size: 20px;"></i>
            <div>
                <div style="font-weight: 700; margin-bottom: 4px;">✅ Precio actualizado</div>
                <div style="font-size: 12px; opacity: 0.9;">${productName}</div>
                <div style="font-size: 13px; margin-top: 4px;">Nuevo precio: $${newPrice.toLocaleString()}</div>
            </div>
        </div>
    `;
    
    // Agregar animación CSS si no existe
    if (!document.getElementById('priceUpdateAnimation')) {
        const style = document.createElement('style');
        style.id = 'priceUpdateAnimation';
        style.innerHTML = `
            @keyframes slideInRight {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOutRight {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(400px);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}


function updateTotalPrice() {
    if (isUpdating) return;
    
    const total = selectedProducts.reduce((sum, p) => sum + p.salePrice, 0);
    document.getElementById("price").value = total;

    const advance = parseFloat(document.getElementById('advancePayment').value) || 0;
    const installmentsText = document.getElementById('installments').value.trim();
    
    // ✅ CAMBIO: Extraer número decimal de cuotas
    const cuotasMatch = installmentsText.match(/^\d+(?:[.,]\d{1,2})?/);
    const cuotas = cuotasMatch ? parseFloat(cuotasMatch[0].replace(',', '.')) : 0;
    
    const remaining = total - advance;
    
    if (cuotas > 0) {
        const currentInstallmentValue = parseFloat(document.getElementById('installmentAmount').value);
        
        isUpdating = true;
        
        if (!currentInstallmentValue || currentInstallmentValue === 0) {
            const perInstallment = Math.ceil(remaining / cuotas);
            document.getElementById('installmentAmount').value = perInstallment;
        } else {
            // ✅ CAMBIO CLAVE: Calcular cuotas exactas con decimales
            const exactCuotas = remaining / currentInstallmentValue;
            document.getElementById('installments').value = exactCuotas.toFixed(2);
        }
        
        isUpdating = false;
    }
}

// Listeners para recalcular cuota cuando cambien valores relevantes
document.getElementById('advancePayment').addEventListener('input', updateTotalPrice);

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

    // Recalcular paymentPerInstallment antes de enviar
const remaining = saleData.price - (saleData.advancePayment || 0);
const numInst   = parseInt(saleData.installments) || 1;
saleData.paymentPerInstallment = Math.ceil(remaining / numInst);

}

// Función para cargar días desde formato guardado
function loadPaymentDaysFromString(paymentDaysString) {
    // 1. Si no es string o no tiene "|", limpiar y salir
    if (typeof paymentDaysString !== 'string' || !paymentDaysString.includes('|')) {
        selectedPaymentPlan = { type: '', days: [] };
        paymentPlanType.value = '';
        paymentDaysContainer.style.display = 'none';
        updateSelectedDaysDisplay();
        return;
    }

    // 2. Separar tipo y días
    const [type, daysStr] = paymentDaysString.split('|');
    if (!type || !daysStr) {
        console.warn('Formato inválido:', paymentDaysString);
        return;
    }

    const days = daysStr.split(',').map(d => d.trim());

    selectedPaymentPlan = { type, days };
    paymentPlanType.value = type;

    // 3. Rellenar el select
    paymentPlanType.dispatchEvent(new Event('change'));

    setTimeout(() => {
        Array.from(paymentDaysSelect.options).forEach(opt => {
            if (days.includes(opt.value)) opt.selected = true;
        });
        selectedPaymentPlan.days = days;
        updateSelectedDaysDisplay();
    }, 100);
}

/* =========================================================
   LECTOR DE CÓDIGOS DE BARRAS CORREGIDO
   ========================================================= */

/* =========================================================
   LECTOR DE CÓDIGOS DE BARRAS CON FLIP DE CÁMARA
   ========================================================= */

const btnCamera   = document.getElementById('btnBarcodeScanner');
const btnStopScan = document.getElementById('btnStopScan');
const btnFlipCamera = document.getElementById('btnFlipCamera');
const modalScan   = document.getElementById('scannerModal');
const video       = document.getElementById('scannerVideo');

let qrScanner = null;
let scanning   = false;
let scanCount  = 0;
let availableCameras = [];
let currentCameraIndex = 0;

// Abrir modal y arrancar cámara
btnCamera.addEventListener('click', startScanner);
btnStopScan.addEventListener('click', stopScanner);
btnFlipCamera.addEventListener('click', flipCamera);

async function startScanner() {
    modalScan.classList.remove('hidden');
    scanning = true;
    scanCount = 0;
    
    try {
        // Obtener cámaras disponibles
        const devices = await navigator.mediaDevices.enumerateDevices();
        availableCameras = devices.filter(d => d.kind === 'videoinput');
        
        console.log("📷 Cámaras disponibles:", availableCameras.map(d => d.label));
        
        if (availableCameras.length === 0) {
            throw new Error("No se encontraron cámaras disponibles");
        }

        // Mostrar/ocultar botón de voltear según cantidad de cámaras
        if (availableCameras.length > 1) {
            btnFlipCamera.style.display = 'inline-flex';
        } else {
            btnFlipCamera.style.display = 'none';
        }
        
        // Buscar cámara trasera como predeterminada
        currentCameraIndex = availableCameras.findIndex(d => {
            const label = d.label.toLowerCase();
            return label.includes('back') || 
                   label.includes('rear') || 
                   label.includes('environment') ||
                   label.includes('camera2') ||
                   (!label.includes('front') && !label.includes('user'));
        });
        
        if (currentCameraIndex === -1) {
            currentCameraIndex = 0;
        }
        
        await activateCamera(currentCameraIndex);

    } catch (e) {
        console.error("Error al iniciar escáner:", e);
        alert('No se pudo acceder a la cámara: ' + e.message);
        stopScanner();
    }
}

async function activateCamera(cameraIndex) {
    if (!availableCameras[cameraIndex]) {
        console.error("❌ Índice de cámara inválido");
        return;
    }

    const selectedCamera = availableCameras[cameraIndex];
    console.log("🔹 Activando cámara:", selectedCamera.label);

    try {
        // Detener stream anterior si existe
        if (video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
        }

        // Iniciar nueva cámara
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { 
                deviceId: selectedCamera.deviceId,
                facingMode: selectedCamera.label.toLowerCase().includes('back') ? 'environment' : 'user'
            }
        });
        
        video.srcObject = stream;
        await video.play();
        
        // Iniciar escaneo de QR con canvas
        scanQRCode();

        // Mostrar feedback visual de cámara activa
        showCameraFeedback(selectedCamera.label);

    } catch (error) {
        console.error("Error al activar cámara:", error);
        alert('Error al cambiar de cámara: ' + error.message);
    }
}

// Nueva función para escanear QR desde el video
function scanQRCode() {
    if (!scanning) return;
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const scan = () => {
        if (!scanning) return;
        
        try {
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            
            // Usar jsQR para detectar códigos QR
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "dontInvert",
            });
            
            if (code && scanCount === 0) {
                console.log("✅ ¡Código QR detectado!", code.data);
                handleSuccessfulScan(code.data);
            } else {
                requestAnimationFrame(scan);
            }
        } catch (e) {
            console.debug("Error en frame:", e);
            requestAnimationFrame(scan);
        }
    };
    
    requestAnimationFrame(scan);
}

async function flipCamera() {
    if (availableCameras.length <= 1) {
        alert('Solo hay una cámara disponible');
        return;
    }

    // Animar el botón
    btnFlipCamera.style.transform = 'scale(0.9)';
    setTimeout(() => {
        btnFlipCamera.style.transform = 'scale(1)';
    }, 150);

    // Cambiar al siguiente índice (circular)
    currentCameraIndex = (currentCameraIndex + 1) % availableCameras.length;
    
    await activateCamera(currentCameraIndex);
}

function showCameraFeedback(cameraLabel) {
    // Crear indicador temporal
    const indicator = document.createElement('div');
    indicator.style.cssText = `
        position: absolute;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(52, 152, 219, 0.9);
        color: white;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        z-index: 1000;
        animation: fadeInOut 2s ease;
    `;
    indicator.textContent = `📹 ${cameraLabel}`;
    
    // Agregar animación CSS si no existe
    if (!document.getElementById('cameraFeedbackStyles')) {
        const styles = document.createElement('style');
        styles.id = 'cameraFeedbackStyles';
        styles.innerHTML = `
            @keyframes fadeInOut {
                0%, 100% { opacity: 0; }
                10%, 90% { opacity: 1; }
            }
        `;
        document.head.appendChild(styles);
    }
    
    const scannerBox = document.querySelector('.scanner-box');
    scannerBox.style.position = 'relative';
    scannerBox.appendChild(indicator);
    
    setTimeout(() => indicator.remove(), 2000);
}

function handleSuccessfulScan(code) {
    if (scanCount > 0) return;
    scanCount++;
    scanning = false;
    showScanFeedback();
    setTimeout(() => {
        stopScanner();
        handleBarcode(code);
    }, 500);
}

function showScanFeedback() {
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
    setTimeout(() => overlay.remove(), 600);
}

function stopScanner() {
    scanning = false;
    scanCount = 0;
    
    if (video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
        video.srcObject = null;
    }
    
    modalScan.classList.add('hidden');
    availableCameras = [];
    currentCameraIndex = 0;
}
/* ---------------------------------------------------------
   PROCESAMIENTO DE CÓDIGOS MEJORADO
   --------------------------------------------------------- */
async function handleBarcode(raw) {
    console.log("Código QR raw recibido:", raw);
    
    const cleanCode = raw.trim();
    
    // Verificar formato personalizado (ID|NOMBRE|PRECIO)
    if (cleanCode.includes('|')) {
        const parts = cleanCode.split('|');
        if (parts.length >= 3) {
            console.log("✅ Detectado código QR PERSONALIZADO");
            await handleCustomBarcode(cleanCode);
            return;
        }
    }
    
    // Si no es formato personalizado, buscar en inventario
    console.log("⚠️ Código QR no reconocido, buscando en inventario...");
    await handleStandardBarcode(cleanCode);
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

function showReceiptModal(saleData) {
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
    ctx.fillText(`Fecha: ${new Date().toLocaleDateString('es-CO')}`, canvas.width / 2, 105);
    
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
    
    ctx.font = '18px Arial';
    ctx.fillStyle = '#34495e';
    ctx.fillText(`Nombre: ${saleData.clientName}`, 50, 210);
    ctx.fillText(`Dirección: ${saleData.clientAddress || 'No especificada'}`, 50, 235);
    
    // Sección productos
    ctx.fillStyle = '#2c3e50';
    ctx.font = 'bold 24px Arial';
    ctx.fillText('PRODUCTOS VENDIDOS', 50, 310);
    
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
        ctx.fillText(`• ${saleData.productName}`, 50, yPosition);
        yPosition += 30;
    }
    
    // Sección financiera
    yPosition = Math.max(yPosition, 480);
    ctx.fillStyle = '#2c3e50';
    ctx.font = 'bold 24px Arial';
    ctx.fillText('INFORMACIÓN FINANCIERA', 50, yPosition);
    
    yPosition += 40;
    ctx.font = '18px Arial';
    ctx.fillStyle = '#34495e';
    ctx.fillText(`Fecha de venta: ${new Date(saleData.saleDate).toLocaleDateString('es-CO')}`, 50, yPosition);
    yPosition += 30;
    ctx.fillText(`Valor total: $${saleData.price.toLocaleString('es-CO')}`, 50, yPosition);
    yPosition += 30;
    ctx.fillText(`Abono inicial: $${(saleData.advancePayment || 0).toLocaleString('es-CO')}`, 50, yPosition);
    
    const saldoPendiente = saleData.price - (saleData.advancePayment || 0);
    if (saldoPendiente > 0) {
        yPosition += 30;
        ctx.fillStyle = '#e74c3c';
        ctx.font = 'bold 18px Arial';
        ctx.fillText(`Saldo pendiente: $${saldoPendiente.toLocaleString('es-CO')}`, 50, yPosition);
        yPosition += 30;
        
        ctx.fillStyle = '#34495e';
        ctx.font = '18px Arial';
        ctx.fillText(`Cuotas: ${saleData.installments}`, 50, yPosition);
        
        if (saleData.paymentDays) {
            yPosition += 30;
            ctx.fillText(`Días de pago: ${saleData.paymentDays}`, 50, yPosition);
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
    
    // Guardar recibo
    const receiptData = {
        id: receiptId,
        receiptNumber: receiptNumber,
        saleData: saleData,
        createdAt: new Date().toISOString(),
        canvas: canvas.toDataURL('image/png')
    };
    
    saveReceipt(receiptData);
    showReceiptOptions(receiptData);
}

// Función auxiliar para generar número de recibo
function generateReceiptNumber() {
    const now = new Date();
    return parseInt(now.getTime().toString().slice(-8));
}

// Función para guardar recibo
function saveReceipt(receiptData) {
  receiptData.createdAt = Date.now();

  let receipts = JSON.parse(localStorage.getItem('salesReceipts') || '[]');
  receipts.unshift(receiptData);

  try {
    // ✅ Guardar en localStorage
    localStorage.setItem('salesReceipts', JSON.stringify(receipts));
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      receipts.splice(15);
      localStorage.setItem('salesReceipts', JSON.stringify(receipts));
      console.warn('🧹 Límite de almacenamiento alcanzado. Se eliminaron recibos antiguos.');
    } else {
      console.error('❌ Error al guardar recibo:', e);
    }
  }

  // ⏱️ Borrar después de 10 s
  setTimeout(() => {
    const list = JSON.parse(localStorage.getItem('salesReceipts') || '[]');
    const idx = list.findIndex(r => r.id === receiptData.id);
    if (idx !== -1) {
      list.splice(idx, 1);
      localStorage.setItem('salesReceipts', JSON.stringify(list));
      console.log('🧹 Recibo auto-eliminado tras 10 s');
    }
  }, 10_000);
}

// Función para mostrar opciones del recibo
function showReceiptOptions(receiptData) {
    const modal = document.createElement('div');
    modal.className = 'receipt-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,.5); display: flex; align-items: center; justify-content: center;
        z-index: 10000;
    `;
    modal.innerHTML = `
        <div style="
            background: #fff; border-radius: 12px; padding: 30px; max-width: 500px; width: 90%;
            box-shadow: 0 10px 30px rgba(0,0,0,.2); text-align: center;
        ">
            <h3 style="margin-bottom: 20px;">✅ Recibo generado</h3>
            <img src="${receiptData.canvas}" style="width: 100%; max-width: 300px; margin-bottom: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,.1);">
            <p><strong>Recibo #${receiptData.receiptNumber}</strong></p>
            <p>Cliente: ${receiptData.saleData.clientName}</p>
            <div style="margin-top: 25px; display: flex; gap: 10px; justify-content: center;">
                <button class="btn btn-primary" onclick="handleReceiptAction('share', '${receiptData.id}')">
                    <i class="fas fa-share-alt"></i> Compartir
                </button>
                <button class="btn btn-secondary" onclick="handleReceiptAction('download', '${receiptData.id}')">
                    <i class="fas fa-download"></i> Descargar
                </button>
                <button class="btn btn-success" onclick="handleReceiptAction('view', '${receiptData.id}')">
                    <i class="fas fa-eye"></i> Ver todos
                </button>
                <button class="btn" onclick="handleReceiptAction('close', '${receiptData.id}')" style="background:#95a5a6;color:#fff">
                    <i class="fas fa-times"></i> Cerrar
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Funciones para compartir y descargar
async function shareReceipt(receiptId) {
  const receipts = JSON.parse(localStorage.getItem('salesReceipts') || '[]');
  const receipt = receipts.find(r => r.id === receiptId);
  if (!receipt) return;

  const blob = await fetch(receipt.canvas).then(r => r.blob());
  const file = new File([blob], `recibo-${receipt.receiptNumber}.png`, { type: 'image/png' });

  const shareData = {
    title: `Recibo #${receipt.receiptNumber}`,
    text: `Recibo de venta para ${receipt.saleData.clientName}`,
    files: [file]
  };

  if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share(shareData); // <-- espera a que el usuario termine
  } else {
    fallbackShare(receipt);
  }
}

function downloadReceipt(receiptId) {
    const receipts = JSON.parse(localStorage.getItem('salesReceipts') || '[]');
    const receipt = receipts.find(r => r.id === receiptId);
    if (!receipt) return;

    const link = document.createElement('a');
    link.download = `recibo-${receipt.receiptNumber}.png`;
    link.href = receipt.canvas;
    link.click();
}

function viewAllReceipts() {
    window.location.href = 'recibos.html';
}

function fallbackShare(receipt) {
    const text = `Recibo de Venta #${receipt.receiptNumber}\nCliente: ${receipt.saleData.clientName}\nTotal: $${receipt.saleData.price.toLocaleString('es-CO')}\nFecha: ${new Date(receipt.saleData.saleDate).toLocaleDateString('es-CO')}`;
    
    if (navigator.share) {
        navigator.share({
            title: `Recibo #${receipt.receiptNumber}`,
            text: text
        });
    } else {
        // Fallback: copiar al portapapeles
        navigator.clipboard.writeText(text).then(() => {
            alert('Texto del recibo copiado al portapapeles. Pégalo en WhatsApp, email, etc.');
        });
    }
}

// --- hacer globales los botones del modal de recibo ---
window.shareReceipt     = shareReceipt;
window.downloadReceipt  = downloadReceipt;
window.viewAllReceipts  = viewAllReceipts;
window.handleReceiptAction = handleReceiptAction;

function closeReceiptModal() {
  const modal = document.querySelector('.receipt-modal');
  if (modal) modal.remove();
}

async function saveReceiptToMongo(receiptData) {
    try {
        const token = getToken();
        await apiFetch("/receipts", "POST", {
            receiptNumber: receiptData.receiptNumber,
            saleData: receiptData.saleData,
            localId: receiptData.id
        }, token);
        console.log("✅ Recibo guardado en MongoDB");
    } catch (err) {
        console.warn("❌ No se pudo guardar el recibo en MongoDB:", err);
    }
}

async function handleReceiptAction(action, receiptId) {
  const receipts = JSON.parse(localStorage.getItem('salesReceipts') || '[]');
  const receiptIndex = receipts.findIndex(r => r.id === receiptId);
  if (receiptIndex === -1) {
    alert('❌ Recibo no encontrado');
    return;
  }

  const receipt = receipts[receiptIndex];

  // 1. Guardar en MongoDB (no crítico)
  try {
    await saveReceiptToMongo(receipt);
  } catch (e) {
    console.warn('⚠️ No se pudo guardar en MongoDB:', e);
  }

  // 2. Ejecutar la acción PRIMERO
  switch (action) {
    case 'share':
      await shareReceipt(receiptId); // <-- espera a que termine
      break;
    case 'download':
      downloadReceipt(receiptId);
      break;
    case 'view':
      viewAllReceipts();
      break;
    case 'close':
      break; // nada que hacer
  }

  // 3. Recién AHORA eliminar de localStorage
  try {
   
    console.log('🧹 Recibo eliminado de localStorage tras acción');
  } catch (e) {
    console.warn('⚠️ Error al actualizar localStorage:', e);
  }

  closeReceiptModal();
}
window.cerrarSesion = function() {
    if (!confirm('¿Estás seguro de que deseas cerrar sesión?')) {
        return;
    }
    
    // Limpiar TODA la información de sesión
    localStorage.clear();
    sessionStorage.clear();
    
    // Mostrar feedback
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #27ae60, #2ecc71);
        color: white;
        padding: 20px 30px;
        border-radius: 10px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        z-index: 10001;
        font-weight: 600;
        text-align: center;
    `;
    notification.innerHTML = `
        <i class="fas fa-check-circle" style="font-size: 24px; margin-bottom: 8px;"></i>
        <div>Sesión cerrada correctamente</div>
    `;
    document.body.appendChild(notification);
    
    // Redirigir después de 1 segundo
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1000);
};

// 🔄 Renovar automáticamente el timestamp del modo admin cada 5 minutos
setInterval(() => {
    const adminMode = sessionStorage.getItem('adminMode');
    const vendedorId = sessionStorage.getItem('vendedorId');
    
    if (adminMode === 'true' && vendedorId && vendedorId !== 'null') {
        sessionStorage.setItem('adminModeTimestamp', Date.now().toString());
        console.log('🔄 Sesión de administrador renovada');
    }
}, 5 * 60 * 1000); // Cada 5 minutos