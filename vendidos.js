import { apiFetch } from "./utils/api.js";
import { getToken } from "./utils/auth.js";

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

        // Filtrar solo productos vendidos
        soldProducts = products.filter(product => product.sold);

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
        const profit = product.salePrice - product.costPrice;
        const profitPercentage = Math.round((profit / product.costPrice) * 100);
        
        // Determinar clase de rentabilidad para estilizado visual
        let profitClass = "neutral";
        if (profitPercentage >= 30) profitClass = "high";
        else if (profitPercentage >= 15) profitClass = "medium";
        else if (profitPercentage < 10) profitClass = "low";
        
        li.innerHTML = `
            <div class="product-header">
                <h3>${product.name}</h3>
                <span class="product-badge">Vendido</span>
            </div>
            
            <div class="product-details">
                <div class="price-row">
                    <span class="detail-label">Precio de costo:</span>
                    <span class="detail-value">${product.costPrice.toLocaleString()} COP</span>
                </div>
                
                <div class="price-row">
                    <span class="detail-label">Precio de venta:</span>
                    <span class="detail-value sale">${product.salePrice.toLocaleString()} COP</span>
                </div>
                
                <div class="price-row profit ${profitClass}">
                    <span class="detail-label">Ganancia:</span>
                    <span class="detail-value">
                        ${profit.toLocaleString()} COP 
                        <span class="percentage">(${profitPercentage}%)</span>
                    </span>
                </div>
            </div>
            
            <div class="card-actions">
                <button class="delete-btn" data-id="${product._id}">
                    <span class="btn-icon">🗑️</span> Eliminar
                </button>
            </div>
        `;
        
        productsList.appendChild(li);
    });

    // Agregar event listeners para los botones de eliminar
    const deleteButtons = document.querySelectorAll(".delete-btn");
    deleteButtons.forEach(button => {
        button.addEventListener("click", async (e) => {
            if (confirm("¿Estás seguro de que deseas eliminar este producto vendido?")) {
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
                    alert("No se pudo eliminar el producto.");
                }
            }
        });
    });
}

function updateTotals(products) {
    const totalSoldElement = document.getElementById("totalSold");
    const totalProductsElement = document.getElementById("totalProducts");
    const totalProfitElement = document.getElementById("totalProfit");
    
    const totalSold = products.reduce((sum, product) => sum + product.salePrice, 0);
    const totalProfit = products.reduce((sum, product) => sum + (product.salePrice - product.costPrice), 0);
    
    totalProductsElement.textContent = products.length;
    totalSoldElement.textContent = `${totalSold.toLocaleString()} COP`;
    totalProfitElement.textContent = `${totalProfit.toLocaleString()} COP`;
}

const menuToggle = document.getElementById('menuToggle');
const menuItems = document.getElementById('menuItems');
const backdrop = document.getElementById('backdrop');

menuToggle.addEventListener('click', () => {
  menuItems.classList.toggle('show');
  backdrop.classList.toggle('show');
});

backdrop.addEventListener('click', () => {
  menuItems.classList.remove('show');
  backdrop.classList.remove('show');
});
