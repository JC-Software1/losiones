/* ---------- módulos (sin cambios) ---------- */
import { apiFetch } from "./utils/api.js";
import { getToken } from "./utils/auth.js";

/* ---------- referencias DOM ---------- */
const salesHistory   = document.getElementById("salesHistory");
const searchInput    = document.getElementById("searchInput");
const dateInput      = document.getElementById("dateFilter");
const totalDebtElement = document.getElementById("totalDebt");

let sales = [];

/* ---------- inicialización ---------- */
document.addEventListener("DOMContentLoaded", async () => {
    try {
        const token = getToken();
        sales = await apiFetch("/sales", "GET", null, token);

        // Mostrar solo no liquidadas
        const unsettled = sales.filter(s => !s.settled);
        renderSales(unsettled);
        updateTotalDebt(unsettled);

        // Filtros
        searchInput.addEventListener("input", applyFilters);
        dateInput.addEventListener("change", applyFilters);

    } catch (error) {
        console.error("Error al cargar el historial:", error);
        salesHistory.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-circle"></i><h3>Error al cargar ventas</h3></div>`;
    }

    // Menú (igual que categories)
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

/* ---------- filtros ---------- */
function applyFilters() {
    const text = searchInput.value.toLowerCase().trim();
    const date = dateInput.value;

    const filtered = sales.filter(sale => {
        const matchesText = sale.clientName.toLowerCase().includes(text) || sale.productName.toLowerCase().includes(text);
        const matchesDate = date ? new Date(sale.saleDate).toISOString().split("T")[0] === date : true;
        return !sale.settled && matchesText && matchesDate;
    });

    renderSales(filtered);
    updateTotalDebt(filtered);
}

/* ---------- pintar tarjetas (nuevo estilo) ---------- */
function renderSales(list) {
    salesHistory.innerHTML = "";

    if (!list.length) {
        salesHistory.innerHTML = `<div class="empty-state"><i class="fas fa-inbox"></i><h3>No se encontraron ventas</h3></div>`;
        return;
    }

    list.forEach(sale => {
        const totalPaid = sale.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
        const remainingDebt = sale.price - totalPaid;
        const percentage = sale.price > 0 ? Math.min(100, (totalPaid / sale.price) * 100) : 0;

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
                    <div class="progress-text">${percentage.toFixed(0)}% pagado</div>
                </div>
            </div>

            <div class="progress-bar">
                <div class="progress-fill" style="width: ${percentage}%"></div>
            </div>

            <div class="sale-actions">
                <button class="btn btn-primary btn-sm"><i class="fas fa-eye"></i> Info</button>
                <button class="btn btn-danger btn-sm"><i class="fas fa-trash"></i> Eliminar</button>
            </div>
        `;

        card.querySelector(".btn-primary").onclick = () => viewSaleDetails(sale);
        card.querySelector(".btn-danger").onclick  = () => deleteSale(sale._id, card);

        salesHistory.appendChild(card);
    });
}

/* ---------- total deuda ---------- */
function updateTotalDebt(list) {
    const total = list.reduce((sum, s) => {
        const paid = s.payments?.reduce((a, p) => a + p.amount, 0) || 0;
        return sum + Math.max(0, s.price - paid);
    }, 0);
    totalDebtElement.textContent = `$${total.toLocaleString('es-CO')}`;
}

/* ---------- detalles ---------- */
function viewSaleDetails(sale) {
    localStorage.setItem("saleDetails", JSON.stringify(sale));
    window.location.href = "saleDetails.html";
}

/* ---------- eliminar ---------- */
async function deleteSale(id, card) {
    if (!confirm("¿Eliminar esta venta?")) return;
    try {
        const token = getToken();
        await apiFetch(`/sales/${id}`, "DELETE", null, token);
        card.remove();
        alert("Venta eliminada correctamente.");
        applyFilters(); // recalcula deuda
    } catch (error) {
        console.error("Error al eliminar la venta:", error);
        alert("No se pudo eliminar la venta.");
    }
}