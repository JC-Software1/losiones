import { apiFetch } from "./utils/api.js";
import { getToken } from "./utils/auth.js";

// DOM elements
const form = document.getElementById("productForm");
const formTitle = document.getElementById("formTitle");
const inputId = document.getElementById("productId");
const inputName = document.getElementById("productName");
const inputCostPrice = document.getElementById("costPrice");
const inputSalePrice = document.getElementById("salePrice");

const btnSave = document.getElementById("saveProduct");
const btnUpdate = document.getElementById("updateProduct");
const btnCancel = document.getElementById("cancelUpdate");
const btnDelete = document.getElementById("deleteProduct");
const productsList = document.getElementById("productsList");
const searchInput = document.getElementById("searchInput");
const inputCategory = document.getElementById("productCategory");
const inputBrand = document.getElementById("productBrand");
const inputSize = document.getElementById("productSize");
const inputQuantity = document.getElementById("productQuantity");

// Variables globales
let products = [];
let filteredProducts = [];

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const token = getToken();
        if (!token) {
            window.location.href = "login.html";
            return;
        }
        
        await loadProducts();
        setupEventListeners();
        setupMenuHandlers();
        
    } catch (error) {
        console.error("Error al inicializar:", error);
        showError("Error al cargar la aplicación");
    }

    // ✅ ✅ ✅ MOVER AQUÍ ✅ ✅ ✅
    const params = new URLSearchParams(window.location.search);
    const editId = params.get('edit');

    if (editId) {
        // ✅ Cargar productos y activar edición
        loadProducts().then(() => {
            const product = products.find(p => p._id === editId);
            if (product) {
                editProduct(product._id); // ✅ activa el formulario
                window.scrollTo({ top: 0, behavior: 'smooth' }); // ✅ sube al form
            }
        });
    }
});

// Cargar productos
async function loadProducts() {
    try {
        const token = getToken();
        products = await apiFetch("/products", "GET", null, token);
        filteredProducts = products.filter(product => !product.sold);
        
        displayProducts(filteredProducts);
        updateStatistics(filteredProducts);
        
    } catch (error) {
        console.error("Error al cargar productos:", error);
        productsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error al cargar</h3>
                <p>No se pudieron cargar los productos. Intenta nuevamente.</p>
            </div>`;
    }
}

// Mostrar productos
function displayProducts(productsList) {
    const productsContainer = document.getElementById("productsList");
    productsContainer.innerHTML = "";

    if (productsList.length === 0) {
        productsContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-box-open"></i>
                <h3>No hay productos</h3>
                <p>No se encontraron productos disponibles.</p>
            </div>`;
        return;
    }

    productsList.forEach((product) => {
        const productCard = document.createElement("div");
        productCard.classList.add("product-card");

        // Calcular margen de ganancia
        const margin = ((product.salePrice - product.costPrice) / product.salePrice * 100).toFixed(1);
        const profit = product.salePrice - product.costPrice;
        
        // Determinar color del margen
        const marginClass = margin >= 30 ? 'success' : margin >= 20 ? 'warning' : 'danger';
        const marginIcon = margin >= 30 ? 'fas fa-trending-up' : margin >= 20 ? 'fas fa-minus' : 'fas fa-trending-down';

        productCard.innerHTML = `
            <div class="product-header">
                <div class="product-info">
                    <h3>${product.name}</h3>
                    <p>Producto disponible en inventario</p>
                </div>

                <div class="product-meta">
    <div class="meta-item">
        <i class="fas fa-folder"></i>
        <span>Categoría: <span class="meta-value">${product.category}</span></span>
    </div>
    <div class="meta-item">
        <i class="fas fa-tag"></i>
        <span>Marca: <span class="meta-value">${product.brand}</span></span>
    </div>
    ${product.size ? `
    <div class="meta-item">
        <i class="fas fa-ruler"></i>
        <span>Talla: <span class="meta-value">${product.size}</span></span>
    </div>` : ''}
</div>

                <div class="product-prices">
                    <div class="cost-price">Costo: $${product.costPrice.toLocaleString()}</div>
                    <div class="sale-price">$${product.salePrice.toLocaleString()}</div>
                </div>
            </div>
            
            <div class="profit-margin">
                <div class="margin-text">
                    <i class="${marginIcon}"></i> 
                    Margen: ${margin}% • Ganancia: $${profit.toLocaleString()}
                </div>
            </div>
            
            <div class="product-meta">
                <div class="meta-item">
                    <i class="fas fa-coins"></i>
                    <span>Costo: <span class="meta-value">$${product.costPrice.toLocaleString()}</span></span>
                </div>
                <div class="meta-item">
                    <i class="fas fa-money-bill-wave"></i>
                    <span>Venta: <span class="meta-value">$${product.salePrice.toLocaleString()}</span></span>
                </div>
                <div class="meta-item">
                    <i class="fas fa-chart-line"></i>
                    <span>Margen: <span class="meta-value">${margin}%</span></span>
                </div>
                <div class="meta-item">
                    <i class="fas fa-hand-holding-usd"></i>
                    <span>Ganancia: <span class="meta-value">$${profit.toLocaleString()}</span></span>
                </div>
            </div>
            
            <div class="product-actions">
                <button class="btn btn-primary" onclick="editProduct('${product._id}')">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="btn btn-danger" onclick="deleteProduct('${product._id}')">
                    <i class="fas fa-trash-alt"></i> Eliminar
                </button>
                <button class="btn btn-success" onclick="showProductDetails('${product._id}')">
                    <i class="fas fa-info-circle"></i> Detalles
                </button>
            </div>
        `;

        productsContainer.appendChild(productCard);
    });
}

// Actualizar estadísticas
function updateStatistics(productsList) {
    // Total de productos
    document.getElementById("totalProducts").textContent = productsList.length;
    
    if (productsList.length > 0) {
        // Margen promedio
        const avgMargin = (productsList.reduce((sum, product) => {
            const margin = ((product.salePrice - product.costPrice) / product.salePrice) * 100;
            return sum + margin;
        }, 0) / productsList.length).toFixed(1);
        document.getElementById("avgMargin").textContent = `${avgMargin}%`;
        
        // Valor total del inventario (precio de costo)
        const totalValue = productsList.reduce((sum, product) => sum + product.costPrice, 0);
        document.getElementById("totalInventoryValue").textContent = `$${totalValue.toLocaleString()}`;
    } else {
        document.getElementById("avgMargin").textContent = "0%";
        document.getElementById("totalInventoryValue").textContent = "$0";
    }
}

// Configurar event listeners
function setupEventListeners() {
    btnSave.addEventListener("click", saveProduct);
    btnUpdate.addEventListener("click", updateProduct);
    btnCancel.addEventListener("click", cancelUpdate);
    
    searchInput.addEventListener("input", applyFilters);
    
    // Auto-calcular margen mientras se escribe
    inputCostPrice.addEventListener("input", calculateMargin);
    inputSalePrice.addEventListener("input", calculateMargin);
}

// Aplicar filtros
function applyFilters() {
    const searchText = searchInput.value.toLowerCase().trim();
    
    filteredProducts = products.filter(product => {
        if (product.sold) return false;
        return searchText === "" || product.name.toLowerCase().includes(searchText);
    });
    
    displayProducts(filteredProducts);
    updateStatistics(filteredProducts);
}

// Calcular margen en tiempo real
function calculateMargin() {
    const costPrice = parseFloat(inputCostPrice.value) || 0;
    const salePrice = parseFloat(inputSalePrice.value) || 0;
    
    if (costPrice > 0 && salePrice > 0) {
        const margin = ((salePrice - costPrice) / salePrice * 100).toFixed(1);
        const profit = salePrice - costPrice;
        
        // Mostrar información del margen en tiempo real
        showMarginPreview(margin, profit);
    }
}

// Mostrar vista previa del margen
function showMarginPreview(margin, profit) {
    let previewElement = document.getElementById('marginPreview');
    
    if (!previewElement) {
        previewElement = document.createElement('div');
        previewElement.id = 'marginPreview';
        previewElement.style.cssText = `
            margin-top: 10px;
            padding: 8px 12px;
            border-radius: var(--radius);
            font-size: 14px;
            font-weight: 600;
            text-align: center;
            transition: var(--transition);
        `;
        document.querySelector('.form-grid').appendChild(previewElement);
    }
    
    const marginClass = margin >= 30 ? 'success' : margin >= 20 ? 'warning' : 'danger';
    const marginColor = margin >= 30 ? 'var(--success)' : margin >= 20 ? 'var(--warning)' : 'var(--danger)';
    
    previewElement.style.background = `rgba(${margin >= 30 ? '39,174,96' : margin >= 20 ? '243,156,18' : '231,76,60'}, 0.1)`;
    previewElement.style.border = `1px solid rgba(${margin >= 30 ? '39,174,96' : margin >= 20 ? '243,156,18' : '231,76,60'}, 0.3)`;
    previewElement.style.color = marginColor;
    
    previewElement.innerHTML = `
        <i class="fas ${margin >= 30 ? 'fa-trending-up' : margin >= 20 ? 'fa-minus' : 'fa-trending-down'}"></i>
        Margen: ${margin}% • Ganancia: ${profit.toLocaleString()}
    `;
}

// Guardar producto
// Guardar producto
async function saveProduct() {
    const quantity = parseInt(inputQuantity.value) || 1;

    const baseProduct = {
        name: inputName.value.trim(),
        costPrice: parseFloat(inputCostPrice.value),
        salePrice: parseFloat(inputSalePrice.value),
        category: inputCategory.value.trim(),
        brand: inputBrand.value.trim(),
        size: inputSize.value.trim() || null
    };

    if (!baseProduct.name || isNaN(baseProduct.costPrice) || isNaN(baseProduct.salePrice)) {
        showNotification("Completa todos los campos requeridos.", "error");
        return;
    }

    if (baseProduct.costPrice < 0 || baseProduct.salePrice < 0) {
        showNotification("Los precios no pueden ser negativos.", "error");
        return;
    }

    if (baseProduct.salePrice <= baseProduct.costPrice) {
        const confirm = window.confirm("El precio de venta es menor o igual al costo. ¿Deseas continuar?");
        if (!confirm) return;
    }

    try {
        const token = getToken();

        // Guardar el producto la cantidad de veces indicada
        for (let i = 0; i < quantity; i++) {
            await apiFetch("/products/new", "POST", baseProduct, token);
        }

        showNotification(`${quantity} producto(s) guardado(s) correctamente.`, "success");
        form.reset();
        clearMarginPreview();
        await loadProducts();
    } catch (error) {
        console.error("Error al guardar el producto:", error.message);
        showNotification("No se pudo guardar el producto: " + error.message, "error");
    }
}
// Editar producto
window.editProduct = function(productId) {
    const product = products.find(p => p._id === productId);
    if (!product) return;
    
    inputId.value = product._id;
    inputName.value = product.name;
    inputCostPrice.value = product.costPrice;
    inputSalePrice.value = product.salePrice;
    inputCategory.value = product.category;
inputBrand.value = product.brand;
inputSize.value = product.size || "";
    
    formTitle.innerHTML = '<i class="fas fa-edit"></i> Editar Producto';
    btnSave.classList.add('hidden');
    btnUpdate.classList.remove('hidden');
    btnCancel.classList.remove('hidden');
    btnDelete.classList.remove('hidden');
    
    calculateMargin();
    
    // Scroll al formulario
    document.querySelector('.form-container').scrollIntoView({ behavior: 'smooth' });
};

// Actualizar producto
async function updateProduct() {
    const id = inputId.value;
    
const productData = {
    name: inputName.value.trim(),
    costPrice: parseFloat(inputCostPrice.value),
    salePrice: parseFloat(inputSalePrice.value),
    category: inputCategory.value.trim(),
    brand: inputBrand.value.trim(),
    size: inputSize.value.trim() || null
};
    
    if (!productData.name || isNaN(productData.costPrice) || isNaN(productData.salePrice)) {
        showNotification("Completa todos los campos requeridos.", "error");
        return;
    }
    
    if (productData.salePrice <= productData.costPrice) {
        const confirm = window.confirm("El precio de venta es menor o igual al costo. ¿Deseas continuar?");
        if (!confirm) return;
    }
    
    try {
        const token = getToken();
        await apiFetch(`/products/${id}`, "PUT", productData, token);
        showNotification("Producto actualizado correctamente.", "success");
        cancelUpdate();
        await loadProducts();
    } catch (error) {
        console.error("Error al actualizar el producto:", error.message);
        showNotification("No se pudo actualizar el producto: " + error.message, "error");
    }
}

// Eliminar producto
window.deleteProduct = async function(id) {
    if (!confirm("¿Estás seguro de que deseas eliminar este producto?\n\nEsta acción no se puede deshacer.")) {
        return;
    }
    
    try {
        const token = getToken();
        await apiFetch(`/products/${id}`, "DELETE", null, token);
        showNotification("Producto eliminado correctamente.", "success");
        
        if (inputId.value === id) {
            cancelUpdate();
        }
        
        await loadProducts();
    } catch (error) {
        console.error("Error al eliminar el producto:", error.message);
        showNotification("No se pudo eliminar el producto.", "error");
    }
};

// Cancelar actualización
function cancelUpdate() {
    formTitle.innerHTML = '<i class="fas fa-plus-circle"></i> Agregar Nuevo Producto';
    btnSave.classList.remove('hidden');
    btnUpdate.classList.add('hidden');
    btnCancel.classList.add('hidden');
    btnDelete.classList.add('hidden');
    form.reset();
    clearMarginPreview();
}

// Mostrar detalles del producto
window.showProductDetails = function(productId) {
    const product = products.find(p => p._id === productId);
    if (!product) return;
    
    const margin = ((product.salePrice - product.costPrice) / product.salePrice * 100).toFixed(1);
    const profit = product.salePrice - product.costPrice;
    const roi = ((profit / product.costPrice) * 100).toFixed(1);
    
    const message = `
📦 DETALLES DEL PRODUCTO

Producto: ${product.name}
💰 Precio de costo: ${product.costPrice.toLocaleString()} COP
💵 Precio de venta: ${product.salePrice.toLocaleString()} COP

📊 ANÁLISIS FINANCIERO
• Ganancia por unidad: ${profit.toLocaleString()} COP
• Margen de ganancia: ${margin}%
• ROI (Retorno de inversión): ${roi}%

📈 CLASIFICACIÓN
${margin >= 30 ? '🟢 Margen excelente' : margin >= 20 ? '🟡 Margen aceptable' : '🔴 Margen bajo'}
    `;
    
    alert(message);
};

// Limpiar vista previa del margen
function clearMarginPreview() {
    const previewElement = document.getElementById('marginPreview');
    if (previewElement) {
        previewElement.remove();
    }
}

// Mostrar notificaciones
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    const colors = {
        success: 'var(--success)',
        error: 'var(--danger)',
        warning: 'var(--warning)',
        info: 'var(--accent)'
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
        box-shadow: var(--shadow-hover);
        z-index: 10000;
        font-weight: 600;
        max-width: 300px;
    `;
    notification.innerHTML = `<i class="${icons[type]}"></i> ${message}`;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 4000);
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

    menuClose.addEventListener('click', closeMenu);
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

// Función para exportar productos (funcionalidad adicional)
window.exportProductsData = function() {
    if (filteredProducts.length === 0) {
        showNotification("No hay datos para exportar", "warning");
        return;
    }
    
    const csvData = [
        ['Producto', 'Precio Costo', 'Precio Venta', 'Margen %', 'Ganancia', 'ROI %']
    ];
    
    filteredProducts.forEach(product => {
        const margin = ((product.salePrice - product.costPrice) / product.salePrice * 100).toFixed(1);
        const profit = product.salePrice - product.costPrice;
        const roi = ((profit / product.costPrice) * 100).toFixed(1);
        
        csvData.push([
            product.name,
            product.costPrice,
            product.salePrice,
            margin,
            profit,
            roi
        ]);
    });
    
    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `productos_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification("Datos exportados correctamente", "success");
};