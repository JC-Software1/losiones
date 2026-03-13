import { apiFetch } from "./utils/api.js";
import { getToken } from "./utils/auth.js";
import "./authCheck.js";

// Función para verificar permiso y ocultar/mostrar costos
async function verificarPermisoCostos() {
    try {
        const token = getToken();
        const response = await apiFetch('/auth/mis-permisos', 'GET', null, token);
        const { permisosDetallados, tipo } = response;

        // Admins y jefes siempre ven costos
        if (tipo === 2 || tipo === 3) {
            return true;
        }

        // Vendedores: verificar permiso específico
        return permisosDetallados?.verCostosYGanancias !== false;

    } catch (error) {
        console.error('Error al verificar permisos de costos:', error);
        // Por defecto, ocultar en caso de error para mayor seguridad
        return false;
    }
}

// Función auxiliar para formatear texto oculto
function ocultarTexto(texto) {
    return '<span style="color: var(--medium-gray); font-style: italic;">●●●●●</span>';
}

document.addEventListener("DOMContentLoaded", async () => {
    const productsList = document.getElementById("productsList");
    const searchInput = document.getElementById("searchInput");
    const totalSoldElement = document.getElementById("totalSold");
    const totalProductsElement = document.getElementById("totalProducts");
    const totalProfitElement = document.getElementById("totalProfit");

    let soldProducts = [];

    try {
        const token = getToken();
        if (!token) {
            window.location.href = "login.html";
            return;
        }

        const products = await apiFetch("/products", "GET", null, token);

        // Obtener ventas realizadas
        const sales = await apiFetch("/sales", "GET", null, token);

        // Filtrar ventas que no están canceladas (todas las ventas cuentan)
        const validSales = sales.filter(sale => !sale.cancelled);

        // Crear lista de productos vendidos a partir de las ventas
        const soldFromSales = [];

        for (const sale of validSales) {
            if (sale.products && Array.isArray(sale.products)) {
                for (const prod of sale.products) {
                    soldFromSales.push({
                        _id: prod.productId || prod._id || sale._id,
                        name: prod.name,
                        brand: prod.brand,
                        category: prod.category,
                        size: prod.size,
                        salePrice: prod.salePrice,
                        quantity: prod.quantity || 1,
                        soldDate: sale.saleDate,
                        soldTo: sale.clientName,
                        saleId: sale._id,
                        totalPrice: sale.price,
                        paymentType: sale.paymentType,
                        settled: sale.settled
                    });
                }
            } else {
                // Productos antigos sin formato de array
                soldFromSales.push({
                    _id: sale._id,
                    name: sale.productName,
                    brand: '',
                    category: '',
                    size: '',
                    salePrice: sale.price,
                    quantity: 1,
                    soldDate: sale.saleDate,
                    soldTo: sale.clientName,
                    saleId: sale._id,
                    totalPrice: sale.price,
                    paymentType: sale.paymentType,
                    settled: sale.settled
                });
            }
        }

        soldProducts = soldFromSales;

        displayProducts(soldProducts);
        updateTotals(soldProducts);

        // Filtrar los productos mientras se escribe en el campo de búsqueda
        searchInput.addEventListener("input", () => {
            const searchText = searchInput.value.toLowerCase().trim();

            if (searchText === "") {
                displayProducts(soldProducts);
                updateTotals(soldProducts);
            } else {
                const filteredProducts = soldProducts.filter(product =>
                    product.name.toLowerCase().includes(searchText)
                );

                if (filteredProducts.length > 0) {
                    displayProducts(filteredProducts);
                    updateTotals(filteredProducts);
                } else {
                    productsList.innerHTML = `
                        <li class="empty-message">
                            <div class="empty-icon">🔍</div>
                            <p>No se encontraron productos vendidos con ese nombre.</p>
                        </li>`;
                    updateTotals([]);
                }
            }
        });

    } catch (error) {
        console.error("Error al cargar productos vendidos:", error);
        productsList.innerHTML = `
            <li class="error-message">
                <div class="error-icon">❌</div>
                <p>No se pudieron cargar los productos vendidos. Intenta nuevamente.</p>
            </li>`;
    }
});

function displayProducts(products) {
    const productsList = document.getElementById("productsList");
    productsList.innerHTML = "";

    if (products.length === 0) {
        const emptyMessage = document.createElement("li");
        emptyMessage.innerHTML = `
            <div class="empty-icon">📦</div>
            <p>No hay productos vendidos para mostrar</p>`;
        emptyMessage.classList.add("empty-message");
        productsList.appendChild(emptyMessage);
        return;
    }

    products.forEach(product => {
        const li = document.createElement("li");
        const qty = product.quantity || 1;
        const totalProductPrice = (product.salePrice || 0) * qty;
        const profit = (product.salePrice || 0) - (product.costPrice || 0);
        const profitPercentage = product.costPrice ? Math.round((profit / product.costPrice) * 100) : 0;

        // Determinar clase de rentabilidad para estilizado visual
        let profitClass = "neutral";
        if (profitPercentage >= 30) profitClass = "high";
        else if (profitPercentage >= 15) profitClass = "medium";
        else if (profitPercentage < 10) profitClass = "low";

        li.innerHTML = `
            <div class="product-header">
                <h3>${product.name} <span style="color: #e74c3c; font-size: 12px;">(x${qty})</span></h3>
                <span class="product-badge">${product.paymentType === 'contado' ? '✅ Contado' : '📅 Cuotas'}</span>
            </div>
            
            <div class="product-details">
                <div class="price-row">
                    <span class="detail-label">Cantidad:</span>
                    <span class="detail-value">${qty} unidades</span>
                </div>
                
                <div class="price-row">
                    <span class="detail-label">Precio unitario:</span>
                    <span class="detail-value">${(product.salePrice || 0).toLocaleString()} COP</span>
                </div>
                
                <div class="price-row">
                    <span class="detail-label">Total venta:</span>
                    <span class="detail-value sale">${totalProductPrice.toLocaleString()} COP</span>
                </div>
            </div>
            
            <div class="card-actions">
                <button class="view-sale-btn" data-sale-id="${product.saleId}">
                    <span class="btn-icon">👁️</span> Ver venta
                </button>
            </div>
        `;

        productsList.appendChild(li);
    });

    // Agregar event listeners para los botones de eliminar
    const deleteButtons = document.querySelectorAll(".delete-btn");
    deleteButtons.forEach(button => {
        button.addEventListener("click", async (e) => {
            if (await showConfirm("¿Estás seguro de que deseas eliminar este producto vendido?")) {
                const productId = e.target.closest(".delete-btn").dataset.id;
                try {
                    const token = getToken();
                    await apiFetch(`/products/${productId}`, "DELETE", null, token);

                    // Animación de eliminación
                    const card = e.target.closest("li");
                    card.classList.add("deleting");

                    setTimeout(() => {
                        card.remove();
                        const remainingProducts = document.querySelectorAll("#productsList li").length;
                        if (remainingProducts === 0) {
                            productsList.innerHTML = `
                                <li class="empty-message">
                                    <div class="empty-icon">📦</div>
                                    <p>No hay productos vendidos para mostrar</p>
                                </li>`;
                        }

                        // Actualizar totales sin tener que recargar la página
                        const products = Array.from(document.querySelectorAll("#productsList li:not(.empty-message)")).map(li => {
                            const costText = li.querySelector(".price-row:nth-child(1) .detail-value").textContent;
                            const saleText = li.querySelector(".price-row:nth-child(2) .detail-value").textContent;
                            const costPrice = parseInt(costText.replace(/[^\d]/g, ""));
                            const salePrice = parseInt(saleText.replace(/[^\d]/g, ""));
                            return { costPrice, salePrice };
                        });

                        updateTotals(products);
                    }, 300);

                } catch (error) {
                    console.error("Error al eliminar el producto:", error);
                    showNotification("No se pudo eliminar el producto.", "error");
                }
            }
        });
    });
}

function updateTotals(products) {
    const totalSoldElement = document.getElementById("totalSold");
    const totalProductsElement = document.getElementById("totalProducts");
    const totalProfitElement = document.getElementById("totalProfit");

    // Calcular considerando cantidades
    const totalSold = products.reduce((sum, product) => {
        const qty = product.quantity || 1;
        return sum + ((product.salePrice || 0) * qty);
    }, 0);

    const totalProfit = products.reduce((sum, product) => {
        const qty = product.quantity || 1;
        const profit = ((product.salePrice || 0) - (product.costPrice || 0)) * qty;
        return sum + profit;
    }, 0);

    const totalQty = products.reduce((sum, product) => sum + (product.quantity || 1), 0);

    totalProductsElement.textContent = totalQty;
    totalSoldElement.textContent = `${totalSold.toLocaleString()} COP`;
    totalProfitElement.textContent = `${totalProfit.toLocaleString()} COP`;
}

