import { apiFetch } from "./utils/api.js";
import { getToken } from "./utils/auth.js";
import "./authCheck.js";

// DOM elements
const productsList = document.getElementById("productsList");
const searchInput = document.getElementById("searchInput");
const marginFilter = document.getElementById("marginFilter");
const priceFilter = document.getElementById("priceFilter");

// Elementos de estadísticas
const totalProductsSpan = document.getElementById("totalProducts");
const avgMarginSpan = document.getElementById("avgMargin");
const totalInventoryValueSpan = document.getElementById("totalInventoryValue");
const totalPotentialProfitSpan = document.getElementById("totalPotentialProfit");

// Variables globales
let allProducts = [];
let filteredProducts = [];



// Al inicio del archivo, después de las importaciones
let puedeVerCostos = true; // Variable global

// FunciÃ³n para verificar permiso y ocultar/mostrar costos
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

// FunciÃ³n auxiliar para formatear texto oculto
function ocultarTexto() {
    return '<span style="color: var(--medium-gray); font-style: italic;">●●●●●</span>';
}
// Inicialización
document.addEventListener("DOMContentLoaded", async () => {
    try {
        const token = getToken();
        if (!token) {
            window.location.href = "index.html";
            return;
        }

        // ✅ Verificar permisos de costos ANTES de cargar productos
        puedeVerCostos = await verificarPermisoCostos();

        await loadProducts();
        showLowStockAlert(); // Alerta real de stock
        showLowMarginAlert(); // Alerta de márgenes
        setupEventListeners();

    } catch (error) {
        console.error("Error al inicializar:", error);
        showError("Error al cargar la aplicación");
    }
});

// Cargar productos
async function loadProducts() {
    try {
        const token = getToken();
        const products = await apiFetch("/products", "GET", null, token);

        // ✅ El usuario pide que si un producto no tiene stock, no aparezca en inventario
        // ✅ Ordenar alfabéticamente por nombre
        allProducts = products
            .filter(p => (p.stock || 0) > 0)
            .sort((a, b) => a.name.localeCompare(b.name));
        filteredProducts = allProducts;
        displayProducts(allProducts);
        updateStatistics(allProducts);
        populateFilters(allProducts);

    } catch (error) {
        console.error("Error al cargar productos:", error);
        showError("No se pudieron cargar los productos. Intenta nuevamente.");
    }
}

// Mostrar productos con el nuevo diseño
function displayProducts(products) {
    productsList.innerHTML = "";

    if (products.length === 0) {
        productsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-box-open"></i>
                <h3>No hay productos disponibles</h3>
                <p>No se encontraron productos que coincidan con los filtros aplicados.</p>
            </div>
        `;
        return;
    }

    products.forEach((product, index) => {
        const productCard = document.createElement("div");
        productCard.classList.add("product-card");

        // Calcular estadísticas solo si puede ver costos
        let margin = 0;
        let profit = 0;

        if (puedeVerCostos) {
            profit = product.salePrice - product.costPrice;
            margin = ((product.salePrice - product.costPrice) / product.salePrice * 100).toFixed(1);
        }

        const marginClass = margin >= 30 ? 'margin-high' : margin >= 20 ? 'margin-medium' : 'margin-low';

        // Mostrar u ocultar según permiso
        const costoPriceHTML = puedeVerCostos
            ? `<div class="price-value">$${product.costPrice.toLocaleString()}</div>`
            : `<div class="price-value" style="color: var(--medium-gray); font-style: italic;">●●●●●</div>`;

        const profitHighlightHTML = puedeVerCostos
            ? `<div class="profit-highlight">
                <div class="profit-text">
                    <i class="fas fa-chart-line"></i> 
                    Ganancia: $${profit.toLocaleString()} • Margen: ${margin}% 
                    <span class="margin-indicator ${marginClass}"></span>
                </div>
            </div>`
            : `<div class="profit-highlight">
                <div class="profit-text" style="color: var(--medium-gray);">
                    <i class="fas fa-lock"></i> 
                    Ganancia: <span style="font-style: italic;">●●●●●</span> • Margen: <span style="font-style: italic;">●●●●●</span>
                </div>
            </div>`;

        const stock = product.stock || 1;
        const isOutOfStock = stock <= 0;
        const isLowStock = stock > 0 && stock <= 3;

        productCard.innerHTML = `
            <div class="product-header">
                <div class="product-info">
                    <h3>${product.name}</h3>
                    <p>${isOutOfStock ? '<span style="color: #e74c3c; font-weight: bold;">❌ No hay stock disponible</span>' : 'Producto disponible en inventario'}</p>
                </div>
                <div class="product-status ${isOutOfStock ? 'status-out' : 'status-available'}">
                    <i class="fas ${isOutOfStock ? 'fa-times-circle' : 'fa-check-circle'}"></i> ${isOutOfStock ? 'Sin Stock' : 'Disponible'}
                </div>
            </div>

            <div class="product-meta-custom">
                <i class="fas fa-folder"></i> ${product.category} • 
                <i class="fas fa-tag"></i> ${product.brand} • 
                ${product.size ? `<i class="fas fa-ruler"></i> Talla: ${product.size} • ` : ''}
                <span class="${isLowStock ? 'low-stock-warning' : ''}">
                    <i class="fas fa-boxes"></i> Stock: ${stock} ${isLowStock ? '⚠️' : ''}
                </span>
            </div>
            
            <div class="product-prices">
                <div class="price-item">
                    <div class="price-label">Precio de Costo</div>
                    ${costoPriceHTML}
                </div>
                <div class="price-item">
                    <div class="price-label">Precio de Venta</div>
                    <div class="price-value">$${product.salePrice.toLocaleString()}</div>
                </div>
            </div>
            
            ${profitHighlightHTML}
            
            <div class="product-actions">
                ${isOutOfStock ? `
                <button class="btn btn-info" onclick="showProductAnalysis('${product._id}')" title="Ver información">
                    <i class="fas fa-info-circle"></i> Info
                </button>
                <button class="btn btn-warning" onclick="reinventarProducto('${product._id}')" title="Reinventar producto">
                    <i class="fas fa-magic"></i> Reinventar
                </button>
                ` : `
                <button class="btn btn-primary" onclick="editProduct('${product._id}')" title="Editar producto">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="btn btn-success" onclick="sellProduct('${product._id}')" title="Marcar como vendido">
                    <i class="fas fa-shopping-cart"></i> Vender
                </button>
                <button class="btn btn-accent" onclick="showProductAnalysis('${product._id}')" title="Ver análisis detallado">
                    <i class="fas fa-analytics"></i> Análisis
                </button>
                `}
            </div>
        `;

        // Agregar clase de stock bajo o agotado
        if (isOutOfStock) {
            productCard.classList.add('out-of-stock');
        } else if (isLowStock) {
            productCard.classList.add('low-stock');
        }

        productCard.style.animationDelay = `${index * 0.1}s`;
        productsList.appendChild(productCard);
    });
}

// Actualizar estadísticas
function updateStatistics(products) {
    // Filtrar solo productos con stock para las estadísticas
    const availableProducts = products.filter(p => (p.stock || 0) > 0);

    totalProductsSpan.textContent = availableProducts.length;

    if (availableProducts.length > 0) {
        if (puedeVerCostos) {
            // Calcular margen promedio
            const avgMargin = (availableProducts.reduce((sum, product) => {
                const margin = ((product.salePrice - product.costPrice) / product.salePrice) * 100;
                return sum + margin;
            }, 0) / availableProducts.length).toFixed(1);
            avgMarginSpan.textContent = `${avgMargin}%`;

            // Calcular valor total del inventario (precio de costo)
            const totalInventoryValue = availableProducts.reduce((sum, product) => sum + product.costPrice, 0);
            totalInventoryValueSpan.textContent = `$${totalInventoryValue.toLocaleString()}`;

            // Calcular ganancia potencial total
            const totalPotentialProfit = availableProducts.reduce((sum, product) => {
                return sum + (product.salePrice - product.costPrice);
            }, 0);
            totalPotentialProfitSpan.textContent = `$${totalPotentialProfit.toLocaleString()}`;
        } else {
            // Ocultar estadísticas de costos y ganancias
            avgMarginSpan.innerHTML = '<span style="font-style: italic; color: var(--medium-gray);">●●●●●</span>';
            totalInventoryValueSpan.innerHTML = '<span style="font-style: italic; color: var(--medium-gray);">●●●●●</span>';
            totalPotentialProfitSpan.innerHTML = '<span style="font-style: italic; color: var(--medium-gray);">●●●●●</span>';
        }
    } else {
        avgMarginSpan.textContent = "0%";
        totalInventoryValueSpan.textContent = "$0";
        totalPotentialProfitSpan.textContent = "$0";
    }
}

// Configurar event listeners
function setupEventListeners() {
    if (searchInput) searchInput.addEventListener("input", applyFilters);
    if (marginFilter) marginFilter.addEventListener("change", applyFilters);
    if (priceFilter) priceFilter.addEventListener("change", applyFilters);

    const categoryFilter = document.getElementById('categoryFilter');
    const brandFilter = document.getElementById('brandFilter');
    const sizeFilter = document.getElementById('sizeFilter');

    if (categoryFilter) categoryFilter.addEventListener("change", applyFilters);
    if (brandFilter) brandFilter.addEventListener("change", applyFilters);
    if (sizeFilter) sizeFilter.addEventListener("change", applyFilters);
}

// Aplicar filtros
function applyFilters() {
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : "";
    const marginFilterValue = marginFilter ? marginFilter.value : "all";
    const priceFilterValue = priceFilter ? priceFilter.value : "all";
    const categoryFilterValue = document.getElementById('categoryFilter')?.value || "all";
    const brandFilterValue = document.getElementById('brandFilter')?.value || "all";
    const sizeFilterValue = document.getElementById('sizeFilter')?.value || "all";

    filteredProducts = allProducts.filter(product => {
        const matchesSearch = searchTerm === "" || product.name.toLowerCase().includes(searchTerm);
        const margin = ((product.salePrice - product.costPrice) / product.salePrice) * 100;

        let matchesMargin = true;
        if (marginFilterValue === "high") matchesMargin = margin >= 30;
        else if (marginFilterValue === "medium") matchesMargin = margin >= 20 && margin < 30;
        else if (marginFilterValue === "low") matchesMargin = margin < 20;

        let matchesPrice = true;
        if (priceFilterValue === "low") matchesPrice = product.salePrice <= 50000;
        else if (priceFilterValue === "medium") matchesPrice = product.salePrice > 50000 && product.salePrice <= 200000;
        else if (priceFilterValue === "high") matchesPrice = product.salePrice > 200000;

        const matchesCategory = categoryFilterValue === "all" || product.category === categoryFilterValue;
        const matchesBrand = brandFilterValue === "all" || product.brand === brandFilterValue;
        const matchesSize = sizeFilterValue === "all" || product.size === sizeFilterValue;

        return matchesSearch && matchesMargin && matchesPrice && matchesCategory && matchesBrand && matchesSize;
    });

    displayProducts(filteredProducts);
    updateStatistics(filteredProducts);
}

// Editar producto
window.editProduct = function (productId) {
    window.location.href = "productos.html";
};

// Vender producto
window.sellProduct = async function (productId) {
    const product = allProducts.find(p => p._id === productId);
    if (!product) return;

    if (!await showConfirm(confirmMessage)) return;

    try {
        const token = getToken();
        await apiFetch(`/products/${productId}/sell`, "PUT", null, token);
        showNotification("¡Producto vendido exitosamente!", "success");

        // Recargar productos después de un breve retraso
        setTimeout(() => {
            loadProducts();
        }, 1000);

    } catch (error) {
        console.error("Error al marcar como vendido:", error);
        showNotification("Error al procesar la venta: " + error.message, "error");
    }
};

// Mostrar análisis detallado del producto
window.showProductAnalysis = function (productId) {
    const product = allProducts.find(p => p._id === productId);
    if (!product) return;

    const profit = product.salePrice - product.costPrice;
    const margin = ((profit / product.salePrice) * 100).toFixed(1);
    const roi = ((profit / product.costPrice) * 100).toFixed(1);
    const breakEven = product.costPrice;

    // Calcular competitividad del margen
    let competitiveness = "";
    let recommendation = "";

    if (margin >= 30) {
        competitiveness = "Excelente";
        recommendation = "Margen muy competitivo. Producto altamente rentable.";
    } else if (margin >= 20) {
        competitiveness = "Bueno";
        recommendation = "Margen aceptable. Considera optimizar costos para mejorar.";
    } else {
        competitiveness = "Bajo";
        recommendation = "Margen bajo. Revisa precios de costo y venta.";
    }

    const analysisMessage = `
ANÁLISIS DETALLADO DEL PRODUCTO

Producto: ${product.name}

INFORMACIÓN FINANCIERA:
• Precio de costo: $${product.costPrice.toLocaleString()}
• Precio de venta: $${product.salePrice.toLocaleString()}
• Ganancia unitaria: $${profit.toLocaleString()}

MÉTRICAS CLAVE:
• Margen de ganancia: ${margin}%
• ROI (Retorno de inversión): ${roi}%
• Punto de equilibrio: $${breakEven.toLocaleString()}

EVALUACIÓN:
• Competitividad: ${competitiveness}
• Recomendación: ${recommendation}

DATOS ADICIONALES:
• Por cada $1 invertido, obtienes $${(profit / product.costPrice + 1).toFixed(2)}
• Tiempo estimado de recuperación: Inmediato al vender
    `;

    showNotification(analysisMessage, "info", "Análisis de Inventario");
};

// Exportar datos del inventario
window.exportInventoryData = function () {
    if (filteredProducts.length === 0) {
        showNotification("No hay datos para exportar", "warning");
        return;
    }

    const csvData = [
        ['Producto', 'Precio Costo', 'Precio Venta', 'Ganancia', 'Margen %', 'ROI %', 'Estado']
    ];

    filteredProducts.forEach(product => {
        const profit = product.salePrice - product.costPrice;
        const margin = ((profit / product.salePrice) * 100).toFixed(1);
        const roi = ((profit / product.costPrice) * 100).toFixed(1);

        csvData.push([
            product.name,
            product.costPrice,
            product.salePrice,
            profit,
            margin,
            roi,
            'Disponible'
        ]);
    });

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `inventario_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showNotification("Inventario exportado correctamente", "success");
};

// Mostrar alertas de margen bajo
window.showLowMarginAlert = function () {
    const lowMarginProducts = allProducts.filter(product => {
        const margin = ((product.salePrice - product.costPrice) / product.salePrice) * 100;
        return margin < 20;
    });

    if (lowMarginProducts.length === 0) {
        showNotification("Excelente! Todos los productos tienen márgenes saludables", "success");
        return;
    }

    let alertMessage = `ALERTA DE MÁRGENES BAJOS\n\nSe encontraron ${lowMarginProducts.length} productos con margen inferior al 20%:\n\n`;

    lowMarginProducts.forEach((product, index) => {
        if (index < 5) { // Mostrar solo los primeros 5
            const margin = ((product.salePrice - product.costPrice) / product.salePrice) * 100;
            alertMessage += `• ${product.name}: ${margin.toFixed(1)}%\n`;
        }
    });

    if (lowMarginProducts.length > 5) {
        alertMessage += `\n... y ${lowMarginProducts.length - 5} productos más.`;
    }

    alertMessage += `\n\nRECOMENDACIÓN: Revisa los precios de estos productos para mejorar la rentabilidad.`;

    showNotification(alertMessage, "warning", "Alerta de Stock");
};

// ✅ Nueva función para mostrar alertas de STOCK BAJO (no invasiva)
window.showLowStockAlert = function () {
    if (sessionStorage.getItem('lowStockAlertShownInventory')) return;

    const lowStockProducts = allProducts.filter(p => !p.sold && (p.stock === undefined || p.stock <= 3));

    if (lowStockProducts.length > 0) {
        const alertDiv = document.createElement('div');
        alertDiv.id = 'lowStockAlert';
        alertDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #e67e22, #f39c12);
            color: white;
            padding: 16px 20px;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(230, 126, 34, 0.4);
            z-index: 10001;
            max-width: 350px;
            font-weight: 500;
            animation: slideIn 0.5s ease-out;
        `;

        alertDiv.innerHTML = `
            <div style="display: flex; align-items: flex-start; gap: 12px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 24px; margin-top: 2px;"></i>
                <div style="flex: 1;">
                    <div style="font-weight: 700; margin-bottom: 8px;">⚠️ Stock Bajo Detectado</div>
                    <ul style="margin: 0; padding-left: 18px; font-size: 13px; line-height: 1.6;">
                        ${lowStockProducts.slice(0, 5).map(p => `<li>${p.name}: <strong>${p.stock || 0}</strong> unds</li>`).join('')}
                        ${lowStockProducts.length > 5 ? `<li>...y ${lowStockProducts.length - 5} más</li>` : ''}
                    </ul>
                </div>
                <button onclick="this.parentElement.parentElement.remove(); sessionStorage.setItem('lowStockAlertShownInventory', 'true');" 
                        style="background: none; border: none; color: white; font-size: 18px; cursor: pointer; padding: 0; line-height: 1;">✕</button>
            </div>
        `;

        document.body.appendChild(alertDiv);
    }
};

// Función para reinventar desde inventario
window.reinventarProducto = function (productId) {
    const product = allProducts.find(p => p._id === productId);
    if (!product) return;

    // Guardar en localStorage para que productos.html lo recoja
    localStorage.setItem('reinventarProduct', JSON.stringify(product));

    // Redirigir
    window.location.href = "productos.html";
};

// Generar reporte completo
window.generateInventoryReport = function () {
    if (allProducts.length === 0) {
        showNotification("No hay productos para generar reporte", "warning");
        return;
    }

    // Calcular estadísticas avanzadas
    const totalProducts = allProducts.length;
    const totalCostValue = allProducts.reduce((sum, p) => sum + p.costPrice, 0);
    const totalSaleValue = allProducts.reduce((sum, p) => sum + p.salePrice, 0);
    const totalPotentialProfit = totalSaleValue - totalCostValue;

    const avgCost = totalCostValue / totalProducts;
    const avgSale = totalSaleValue / totalProducts;
    const avgMargin = ((totalSaleValue - totalCostValue) / totalSaleValue * 100).toFixed(1);

    // Productos por categoría de margen
    const highMargin = allProducts.filter(p => ((p.salePrice - p.costPrice) / p.salePrice * 100) >= 30).length;
    const mediumMargin = allProducts.filter(p => {
        const margin = (p.salePrice - p.costPrice) / p.salePrice * 100;
        return margin >= 20 && margin < 30;
    }).length;
    const lowMargin = allProducts.filter(p => ((p.salePrice - p.costPrice) / p.salePrice * 100) < 20).length;

    const reportMessage = `
REPORTE COMPLETO DEL INVENTARIO
Generado el: ${new Date().toLocaleDateString()}

RESUMEN EJECUTIVO:
• Total de productos: ${totalProducts}
• Valor total invertido: $${totalCostValue.toLocaleString()}
• Valor potencial de venta: $${totalSaleValue.toLocaleString()}
• Ganancia potencial total: $${totalPotentialProfit.toLocaleString()}
• Margen promedio: ${avgMargin}%

PROMEDIOS:
• Precio de costo promedio: $${avgCost.toLocaleString()}
• Precio de venta promedio: $${avgSale.toLocaleString()}

DISTRIBUCIÓN POR MÁRGENES:
• Margen alto (≥30%): ${highMargin} productos (${(highMargin / totalProducts * 100).toFixed(1)}%)
• Margen medio (20-29%): ${mediumMargin} productos (${(mediumMargin / totalProducts * 100).toFixed(1)}%)
• Margen bajo (<20%): ${lowMargin} productos (${(lowMargin / totalProducts * 100).toFixed(1)}%)

RECOMENDACIONES:
${highMargin >= totalProducts * 0.6 ? 'Excelente distribución de márgenes' : 'Considera optimizar productos con márgenes bajos'}
${avgMargin >= 25 ? 'Margen promedio saludable' : 'Margen promedio por debajo del objetivo (25%)'}
    `;

    showNotification(reportMessage, "info", "Reporte de Valor");
};

// Mostrar consejos de optimización
window.showBestSellingTips = function () {
    const tips = `
CONSEJOS PARA OPTIMIZAR TU INVENTARIO

ESTRATEGIAS DE PRECIOS:
• Mantén un margen mínimo del 20% en todos los productos
• Los productos con margen >30% son los más rentables
• Revisa precios cada 30 días según el mercado

ANÁLISIS DE RENTABILIDAD:
• Prioriza la venta de productos con mayor margen
• Identifica productos con rotación lenta
• Considera descuentos para productos de bajo margen

GESTIÓN FINANCIERA:
• Reinvierte las ganancias en productos de alto margen
• Diversifica el inventario en diferentes rangos de precio
• Mantén registros detallados de todas las transacciones

CRECIMIENTO DEL NEGOCIO:
• Analiza tendencias de venta mensualmente
• Ajusta el inventario según la demanda
• Considera la estacionalidad en tus productos

ACCIONES RÁPIDAS:
• Exporta reportes regularmente
• Revisa alertas de márgenes bajos
• Mantén actualizada la información de productos
    `;

    showNotification(tips, "info", "Consejos de Optimización");
};

// Mostrar notificaciones
function showNotification(message, type = 'info', title = '') {
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type, title);
    } else {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed; top: 20px; right: 20px;
            background: #333; color: white; padding: 12px 20px;
            border-radius: 8px; z-index: 10000;
        `;
        notification.innerHTML = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 4000);
    }
}

// Mostrar error
function showError(message) {
    productsList.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>Error</h3>
            <p>${message}</p>
        </div>`;
}

// Configurar manejadores del menú

// Llenar filtros con valores únicos
function populateFilters(products) {
    const categories = [...new Set(products.map(p => p.category))].sort();
    const brands = [...new Set(products.map(p => p.brand))].sort();
    const sizes = [...new Set(products.map(p => p.size).filter(Boolean))].sort();

    populateSelect('categoryFilter', categories);
    populateSelect('brandFilter', brands);
    populateSelect('sizeFilter', sizes);
}

function populateSelect(selectId, values) {
    const select = document.getElementById(selectId);
    const currentValue = select.value;
    select.innerHTML = `<option value="all">Todas${selectId === 'sizeFilter' ? ' las tallas' : selectId === 'categoryFilter' ? ' las categorías' : ' las marcas'}</option>`;
    values.forEach(value => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
    });
    select.value = currentValue; // Mantener selección si aplica
}

