/* ---------- módulos (sin cambios) ---------- */
import { apiFetch } from "../utils/api.js";
import { getToken } from "../utils/auth.js";
import "../keepAlive.js";



/* ---------- referencias DOM (sin cambios) ---------- */

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

/* ---------- carga de ventas (adaptada al nuevo estilo) ---------- */
async function loadSales(query = "") {
    try {
        const token = getToken();
        const sales = await apiFetch("/sales", "GET", null, token);
        list.innerHTML = "";

        const filteredSales = sales.filter(sale => {
            const clientMatch = sale.clientName.toLowerCase().includes(query.toLowerCase());
            const productMatch = sale.productName.toLowerCase().includes(query.toLowerCase());
            return clientMatch || productMatch;
        });

        if (filteredSales.length === 0) {
            list.innerHTML = `<div class="empty-state"><i class="fas fa-inbox"></i><h3>No se encontraron ventas</h3></div>`;
            return;
        }

        filteredSales.forEach((sale) => {
            const totalPaid = sale.payments.reduce((sum, p) => sum + p.amount, 0);
            const remainingDebt = sale.price - totalPaid;
            const paymentPercentage = (totalPaid / sale.price) * 100;

            const card = document.createElement("div");
            card.className = "sale-card";
            card.setAttribute("data-sale-id", sale._id);

            card.innerHTML = `
                <div class="sale-header">
                    <div class="sale-info">
                        <h3>${sale.clientName}</h3>
                        <p>${sale.productName}</p>
                        <p><i class="fas fa-map-marker-alt"></i> ${sale.clientAddress || 'Sin dirección'}</p>
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

            // Eventos
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
    }

    document.getElementById("paymentSection").style.display = "block";
    inputPaymentDate.value = new Date().toISOString().split('T')[0];

btnSave.classList.add("hidden");
btnUpdate.classList.remove("hidden");
btnCancel.classList.remove("hidden");
btnDelete.classList.remove("hidden");   // <- ahora sí se ve
btnAddPayment.classList.remove("hidden");
}


async function loadProductsForSelect() {
    try {
        const token = getToken();
        const products = await apiFetch("/products", "GET", null, token);
        const select = document.getElementById("productName");

        select.innerHTML = '<option value="">Seleccioná un producto</option>';

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

/* ---------- guardar nueva ---------- */
/* ---------- guardar nueva ---------- */
async function saveSale() {
    // 🔥 Agregá esta validación
    if (!inputDate.value) {
        alert("Por favor seleccioná una fecha de venta.");
        inputDate.focus();
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
})),        saleDate: inputDate.value,          // <- ahora seguro que tiene valor
        price: parseFloat(inputPrice.value),
        installments: inputInstallments.value.trim(),
        advancePayment: parseFloat(inputAdvance.value) || 0
    };

    try {
        const token = getToken();
        await apiFetch("/sales/new", "POST", saleData, token);
        alert("Venta guardada correctamente.");

        // ✅ Marcar producto como vendido
// ✅ Marcar producto como vendido
try {
    const productToSell = await apiFetch("/products", "GET", null, token);
    const soldProduct = productToSell.find(p => p.name === saleData.productName && !p.sold);

    if (soldProduct) {
        await apiFetch(`/products/${soldProduct._id}/sell`, "PUT", null, token);
    }
} catch (err) {
    console.warn("No se pudo marcar el producto como vendido:", err);
}
        form.reset();
        // ponemos la fecha de hoy por defecto de nuevo
        inputDate.value = new Date().toISOString().split('T')[0];
        loadSales();
    } catch (error) {
        console.error("Error al guardar la venta:", error.message);
        alert("No se pudo guardar la venta: " + error.message);


    }

    await loadProductsForDropdown(); // ✅ recarga el dropdown

    selectedProducts = []; // Limpiar selección
renderSelectedProducts(); // Actualizar vista

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
        installments: inputInstallments.value.trim()
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
    const today = new Date().toLocaleDateString('en-CA'); // formato YYYY-MM-DD
    document.getElementById("saleDate").value = today;
    loadSales();
    loadProductsForSelect();

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