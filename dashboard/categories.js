/* ---------- módulos (sin cambios) ---------- */
import { apiFetch } from "../utils/api.js";
import { getToken } from "../utils/auth.js";
import "../keepAlive.js";

/* ---------- referencias DOM (sin cambios) ---------- */
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
        productName: inputProduct.value.trim(),
        saleDate: inputDate.value,          // <- ahora seguro que tiene valor
        price: parseFloat(inputPrice.value),
        installments: inputInstallments.value.trim(),
        advancePayment: parseFloat(inputAdvance.value) || 0
    };

    try {
        const token = getToken();
        await apiFetch("/sales/new", "POST", saleData, token);
        alert("Venta guardada correctamente.");
        form.reset();
        // ponemos la fecha de hoy por defecto de nuevo
        inputDate.value = new Date().toISOString().split('T')[0];
        loadSales();
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
});

document.addEventListener("DOMContentLoaded", () => {
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