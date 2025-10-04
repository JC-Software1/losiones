import { apiFetch } from "./utils/api.js";
import { getToken } from "./utils/auth.js";

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
        setupEventListeners();
        setupMenuHandlers();
        
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

        // Filtrar solo productos NO vendidos para Inventario
        const availableProducts = products.filter(product => !product.sold);

        allProducts = availableProducts;
        filteredProducts = availableProducts;
        displayProducts(availableProducts);
        updateStatistics(availableProducts);
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
        
        // ✅ Calcular estadísticas solo si puede ver costos
        let margin = 0;
        let profit = 0;
        
        if (puedeVerCostos) {
            profit = product.salePrice - product.costPrice;
            margin = ((product.salePrice - product.costPrice) / product.salePrice * 100).toFixed(1);
        }
        
        const marginClass = margin >= 30 ? 'margin-high' : margin >= 20 ? 'margin-medium' : 'margin-low';
        
        // ✅ Mostrar u ocultar según permiso
        const costoPriceHTML = puedeVerCostos 
            ? `<div class="price-value">$${product.costPrice.toLocaleString()}</div>`
            : `<div class="price-value">${ocultarTexto()}</div>`;
            
        const profitHighlightHTML = puedeVerCostos
            ? `<div class="profit-highlight">
                <div class="profit-text">
                    <i class="fas fa-chart-line"></i> 
                    Ganancia: $${profit.toLocaleString()} • Margen: ${margin}% 
                    <span class="margin-indicator ${marginClass}"></span>
                </div>
            </div>`
            : '';

        productCard.innerHTML = `
            <div class="product-header">
                <div class="product-info">
                    <h3>${product.name}</h3>
                </div>
                <div class="product-status status-available">
                    <i class="fas fa-check-circle"></i> Disponible
                    <i class="fas fa-folder"></i> ${product.category} • 
                    <i class="fas fa-tag"></i> ${product.brand} • 
                    ${product.size ? `<i class="fas fa-ruler"></i> Talla: ${product.size}` : ''}
                </div>
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
                <button class="btn btn-primary" onclick="editProduct('${product._id}')" title="Editar producto">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="btn btn-success" onclick="sellProduct('${product._id}')" title="Marcar como vendido">
                    <i class="fas fa-shopping-cart"></i> Vender
                </button>
                <button class="btn btn-accent" onclick="showProductAnalysis('${product._id}')" title="Ver análisis detallado">
                    <i class="fas fa-analytics"></i> Análisis
                </button>
            </div>
        `;

        productCard.style.animationDelay = `${index * 0.1}s`;
        productsList.appendChild(productCard);
    });
}

// Actualizar estadísticas
function updateStatistics(products) {
    totalProductsSpan.textContent = products.length;
    
    if (products.length > 0) {
        // Calcular margen promedio
        const avgMargin = (products.reduce((sum, product) => {
            const margin = ((product.salePrice - product.costPrice) / product.salePrice) * 100;
            return sum + margin;
        }, 0) / products.length).toFixed(1);
        avgMarginSpan.textContent = `${avgMargin}%`;
        
        // Calcular valor total del inventario (precio de costo)
        const totalInventoryValue = products.reduce((sum, product) => sum + product.costPrice, 0);
        totalInventoryValueSpan.textContent = `$${totalInventoryValue.toLocaleString()}`;
        
        // Calcular ganancia potencial total
        const totalPotentialProfit = products.reduce((sum, product) => {
            return sum + (product.salePrice - product.costPrice);
        }, 0);
        totalPotentialProfitSpan.textContent = `$${totalPotentialProfit.toLocaleString()}`;
        
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
window.editProduct = function(productId) {
    window.location.href = "productos.html";
};

// Vender producto
window.sellProduct = async function(productId) {
    const product = allProducts.find(p => p._id === productId);
    if (!product) return;
    
    const confirmMessage = `¿Confirmar venta del producto "${product.name}"?\n\nPrecio de venta: $${product.salePrice.toLocaleString()}\nGanancia obtenida: $${(product.salePrice - product.costPrice).toLocaleString()}`;
    
    if (!confirm(confirmMessage)) return;
    
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
window.showProductAnalysis = function(productId) {
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
    
    alert(analysisMessage);
};

// Exportar datos del inventario
window.exportInventoryData = function() {
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
window.showLowStockAlert = function() {
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
    
    alert(alertMessage);
};

// Generar reporte completo
window.generateInventoryReport = function() {
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
• Margen alto (≥30%): ${highMargin} productos (${(highMargin/totalProducts*100).toFixed(1)}%)
• Margen medio (20-29%): ${mediumMargin} productos (${(mediumMargin/totalProducts*100).toFixed(1)}%)
• Margen bajo (<20%): ${lowMargin} productos (${(lowMargin/totalProducts*100).toFixed(1)}%)

RECOMENDACIONES:
${highMargin >= totalProducts * 0.6 ? 'Excelente distribución de márgenes' : 'Considera optimizar productos con márgenes bajos'}
${avgMargin >= 25 ? 'Margen promedio saludable' : 'Margen promedio por debajo del objetivo (25%)'}
    `;
    
    alert(reportMessage);
};

// Mostrar consejos de optimización
window.showBestSellingTips = function() {
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
    
    alert(tips);
};

// Mostrar notificaciones
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    const colors = {
        success: '#27ae60',
        error: '#e74c3c',
        warning: '#f39c12',
        info: '#3498db'
    };
    
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${colors[type]};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        font-weight: 600;
        max-width: 350px;
        display: flex;
        align-items: center;
        gap: 8px;
    `;
    notification.innerHTML = `<i class="${icons[type]}"></i> ${message}`;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
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
function setupMenuHandlers() {
    const menuToggle = document.getElementById('menuToggle');
    const menuClose = document.getElementById('menuClose');
    const menuItems = document.getElementById('menuItems');
    const backdrop = document.getElementById('backdrop');

    if (!menuToggle || !menuItems || !backdrop) {
        console.warn("Elementos del menú no encontrados");
        return;
    }

    function openMenu() {
        menuItems.classList.add('show');
        backdrop.classList.add('show');
        menuToggle.classList.add('open');
        menuToggle.setAttribute('aria-expanded', 'true');
        menuItems.setAttribute('aria-hidden', 'false');
    }

    function closeMenu() {
        menuItems.classList.remove('show');
        backdrop.classList.remove('show');
        menuToggle.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', 'false');
        menuItems.setAttribute('aria-hidden', 'true');
    }

    menuToggle.addEventListener('click', () => {
        if (menuItems.classList.contains('show')) {
            closeMenu();
        } else {
            openMenu();
        }
    });

    if (menuClose) {
        menuClose.addEventListener('click', closeMenu);
    }
    
    backdrop.addEventListener('click', closeMenu);

    // Cerrar menú con tecla Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && menuItems.classList.contains('show')) {
            closeMenu();
        }
    });

    // Animación escalonada de los enlaces del menú
    const menuLinks = document.querySelectorAll('.menu-link');
    menuLinks.forEach((link, index) => {
        link.style.transitionDelay = `${index * 50}ms`;
    });
}

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

