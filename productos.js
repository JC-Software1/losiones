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

/* 1️⃣  DECLARAR funciones que se usan después */
function generateBarcodeImage(id, name, price) {
  const code = `${id}|${name}|${price}`;
  
  console.log("Generando código QR personalizado:", code);
  
  // Limpiar canvas anterior
  const canvas = document.getElementById('barcodeCanvas');
  canvas.innerHTML = '';
  
  // Generar código QR
  new QRCode(canvas, {
    text: code,
    width: 256,
    height: 256,
    colorDark: "#000000",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H
  });
  
  canvas.dataset.productId = id;
  canvas.dataset.name = name;
  canvas.dataset.price = price;
}

function showBarcode(id, name, price) {
  generateBarcodeImage(id, name, price);
  document.getElementById('barcodeTitle').textContent = name;
  document.getElementById('barcodePrice').textContent =
    `Precio: $${Number(price).toLocaleString()}`;
  document.getElementById('barcodeModal').classList.add('show');
}

function closeBarcodeModal(e) {
  if (!e || e.target.id === 'barcodeModal') {
    document.getElementById('barcodeModal').classList.remove('show');
  }
}

function downloadBarcode() {
  const container = document.getElementById('barcodeCanvas');
  const qrCanvas = container.querySelector('canvas');
  
  if (qrCanvas) {
    qrCanvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `QR_${container.dataset.productId}_${container.dataset.name.replace(/[^a-z0-9]/gi,'_')}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }
}

/* 2️⃣  PUBLICARLAS en window para los onclick inline */
window.showBarcode       = showBarcode;
window.closeBarcodeModal = closeBarcodeModal;
window.downloadBarcode   = downloadBarcode;



// Al inicio del archivo, después de las importaciones
let puedeVerCostos = true; // Variable global

// En el DOMContentLoaded
document.addEventListener("DOMContentLoaded", async () => {
    try {
        const token = getToken();
        if (!token) {
            window.location.href = "login.html";
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

// Modificar displayProducts para ocultar costos si no tiene permiso
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

        // Calcular margen solo si puede ver costos
        let margin = 0;
        let profit = 0;
        
        if (puedeVerCostos) {
            margin = ((product.salePrice - product.costPrice) / product.salePrice * 100).toFixed(1);
            profit = product.salePrice - product.costPrice;
        }
        
        const marginClass = margin >= 30 ? 'success' : margin >= 20 ? 'warning' : 'danger';
        const marginIcon = margin >= 30 ? 'fas fa-trending-up' : margin >= 20 ? 'fas fa-minus' : 'fas fa-trending-down';

        // Mostrar u ocultar según permiso
        const costoPriceHTML = puedeVerCostos 
            ? `Costo: $${product.costPrice.toLocaleString()}`
            : `Costo: <span style="color: var(--medium-gray); font-style: italic;">●●●●●</span>`;
            
        const gananciasHTML = puedeVerCostos
            ? `<div class="profit-margin">
                <div class="margin-text">
                    <i class="${marginIcon}"></i> 
                    Margen: ${margin}% • Ganancia: $${profit.toLocaleString()}
                </div>
            </div>`
            : `<div class="profit-margin">
                <div class="margin-text" style="color: var(--medium-gray);">
                    <i class="fas fa-lock"></i> 
                    Margen: <span style="font-style: italic;">●●●●●</span> • Ganancia: <span style="font-style: italic;">●●●●●</span>
                </div>
            </div>`;
            
        const metaItemsHTML = puedeVerCostos 
            ? `
            <div class="meta-item">
                <i class="fas fa-coins"></i>
                <span>Costo: <span class="meta-value">$${product.costPrice.toLocaleString()}</span></span>
            </div>
            <div class="meta-item">
                <i class="fas fa-chart-line"></i>
                <span>Margen: <span class="meta-value">${margin}%</span></span>
            </div>
            <div class="meta-item">
                <i class="fas fa-hand-holding-usd"></i>
                <span>Ganancia: <span class="meta-value">$${profit.toLocaleString()}</span></span>
            </div>
            `
            : `
            <div class="meta-item">
                <i class="fas fa-coins"></i>
                <span>Costo: <span class="meta-value" style="color: var(--medium-gray); font-style: italic;">●●●●●</span></span>
            </div>
            <div class="meta-item">
                <i class="fas fa-chart-line"></i>
                <span>Margen: <span class="meta-value" style="color: var(--medium-gray); font-style: italic;">●●●●●</span></span>
            </div>
            <div class="meta-item">
                <i class="fas fa-hand-holding-usd"></i>
                <span>Ganancia: <span class="meta-value" style="color: var(--medium-gray); font-style: italic;">●●●●●</span></span>
            </div>
            `;

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
                    <div class="cost-price">${costoPriceHTML}</div>
                    <div class="sale-price">$${product.salePrice.toLocaleString()}</div>
                </div>
            </div>
            
            ${gananciasHTML}
            
            <div class="product-meta">
                ${metaItemsHTML}
                <div class="meta-item">
                    <i class="fas fa-money-bill-wave"></i>
                    <span>Venta: <span class="meta-value">$${product.salePrice.toLocaleString()}</span></span>
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
            <button class="btn btn-info" onclick="showBarcode('${product._id}', '${product.name}', '${product.salePrice}')">
                <i class="fas fa-barcode"></i> Ver código de barras
            </button>
        `;

        productsContainer.appendChild(productCard);
    });
}

// ✅ Ocultar campo de costo en el formulario si no tiene permiso
async function setupEventListeners() {
    btnSave.addEventListener("click", saveProduct);
    btnUpdate.addEventListener("click", updateProduct);
    btnCancel.addEventListener("click", cancelUpdate);
    
    searchInput.addEventListener("input", applyFilters);
    
    // ✅ Ocultar campo de costo si no tiene permiso
    if (!puedeVerCostos) {
        const costPriceGroup = inputCostPrice.closest('.form-group');
        if (costPriceGroup) {
            costPriceGroup.style.display = 'none';
        }
    } else {
        inputCostPrice.addEventListener("input", calculateMargin);
        inputSalePrice.addEventListener("input", calculateMargin);
    }
}

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



// Actualizar estadísticas
function updateStatistics(productsList) {
    // Total de productos
    document.getElementById("totalProducts").textContent = productsList.length;
    
    if (productsList.length > 0) {
        if (puedeVerCostos) {
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
            // Ocultar estadísticas de costos
            document.getElementById("avgMargin").innerHTML = '<span style="font-style: italic; color: var(--medium-gray);">●●●●●</span>';
            document.getElementById("totalInventoryValue").innerHTML = '<span style="font-style: italic; color: var(--medium-gray);">●●●●●</span>';
        }
    } else {
        document.getElementById("avgMargin").textContent = "0%";
        document.getElementById("totalInventoryValue").textContent = "$0";
    }
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
    // Si no puede ver costos, no mostrar nada
    if (!puedeVerCostos) {
        return;
    }
    
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
        costPrice: parseFloat(inputCostPrice.value) || 0,
        salePrice: parseFloat(inputSalePrice.value) || 0,
        category: inputCategory.value.trim(),
        brand: inputBrand.value.trim(),
        size: inputSize.value.trim() || null
    };

    // ✅ Validación mínima: solo nombre es obligatorio
    if (!baseProduct.name) {
        showNotification("El nombre del producto es obligatorio.", "error");
        return;
    }

    // ✅ Validar que los precios sean números válidos (permitir 0)
if (isNaN(baseProduct.costPrice) || isNaN(baseProduct.salePrice)) {
    showNotification("Los precios deben ser números válidos.", "error");
    return;
}

    // ✅ Validar que no sean negativos
    if (baseProduct.costPrice < 0 || baseProduct.salePrice < 0) {
        showNotification("Los precios no pueden ser negativos.", "error");
        return;
    }

    // ✅ Solo validar margen si ambos precios son mayores a 0
// ✅ Solo validar margen si ambos precios son mayores a 0
// ✅ Solo validar margen si ambos precios son mayores a 0
if (baseProduct.costPrice > 0 &&
    baseProduct.salePrice > 0 &&
    baseProduct.salePrice <= baseProduct.costPrice) {
  const confirm = window.confirm(
    "El precio de venta es menor o igual al costo. ¿Deseas continuar?");
  if (!confirm) return;
}
    try {
        const token = getToken();

        // Detectar modo admin
        const adminMode = sessionStorage.getItem('adminMode') === 'true';
        const vendedorId = sessionStorage.getItem('vendedorId');

        let createEndpoint = "/products/new";
        if (adminMode && vendedorId) {
            createEndpoint = `/products/vendedor/${vendedorId}/new`;
        }

        // Guardar el producto la cantidad de veces indicada
        for (let i = 0; i < quantity; i++) {
            await apiFetch(createEndpoint, "POST", baseProduct, token);
        }

        // Generar código de barras del último producto creado
        let lastProductEndpoint = "/products/last";
        if (adminMode && vendedorId) {
            lastProductEndpoint = `/products/vendedor/${vendedorId}/last`;
        }

        try {
            const lastProduct = await apiFetch(lastProductEndpoint, "GET", null, token);
            if (lastProduct && lastProduct._id) {
                generateBarcodeImage(lastProduct._id, lastProduct.name, lastProduct.salePrice);
            }
        } catch (error) {
            console.log("No se pudo generar el código de barras:", error);
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
    
    // Solo calcular margen si tiene permiso
    if (puedeVerCostos) {
        calculateMargin();
    }
    
    // Scroll al formulario
    document.querySelector('.form-container').scrollIntoView({ behavior: 'smooth' });
};

// Actualizar producto
async function updateProduct() {
    const id = inputId.value;

    const productData = {
        name: inputName.value.trim(),
        costPrice: parseFloat(inputCostPrice.value) || 0,
        salePrice: parseFloat(inputSalePrice.value) || 0,
        category: inputCategory.value.trim(),
        brand: inputBrand.value.trim(),
        size: inputSize.value.trim() || null
    };

    // 1) Solo el nombre es obligatorio
    if (!productData.name) {
        showNotification("El nombre del producto es obligatorio.", "error");
        return;
    }

    // 2) No permitir precios negativos
    if (productData.costPrice < 0 || productData.salePrice < 0) {
        showNotification("Los precios no pueden ser negativos.", "error");
        return;
    }

    // 3) Validar margen SOLO si ambos precios son mayores a 0
    if (
        productData.costPrice > 0 &&
        productData.salePrice > 0 &&
        productData.salePrice <= productData.costPrice
    ) {
        const confirm = window.confirm(
            "El precio de venta es menor o igual al costo. ¿Deseas continuar?"
        );
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

// Hacer disponibles las funciones que llama el HTML
window.showBarcode        = showBarcode;
window.closeBarcodeModal  = closeBarcodeModal;
window.downloadBarcode    = downloadBarcode;

/* =========================================================
   GENERACIÓN MASIVA DE CÓDIGOS DE BARRAS (CON CM)
   ========================================================= */



// Actualizar preview del layout
window.updateLayoutPreview = function() {
    const layout = document.querySelector('input[name="layout"]:checked').value;
    const previewText = document.getElementById('previewText');
    
    const previews = {
        grid: '3 columnas × N filas - Ideal para hojas A4',
        list: '1 columna × N filas - Uno debajo del otro',
        compact: '4-5 columnas × N filas - Máxima densidad'
    };
    
    previewText.textContent = previews[layout] || '';
};

// Generar códigos de barras masivos CON MEDIDAS EN CM
window.generateBulkBarcodes = async function() {
    if (bulkSelectedProducts.length === 0) {
        showNotification("Selecciona al menos un producto", "warning");
        return;
    }

    showNotification("Generando códigos de barras...", "info");

    // Obtener configuración EN CENTÍMETROS
    const widthCm = parseFloat(document.getElementById('barcodeWidth').value);
    const heightCm = parseFloat(document.getElementById('barcodeHeight').value);
    const fontSizeCm = parseFloat(document.getElementById('barcodeFontSize').value);
    const marginCm = parseFloat(document.getElementById('barcodeMargin').value);
    const containerWidthCm = parseFloat(document.getElementById('barcodeContainerWidth').value);
    const containerHeightCm = parseFloat(document.getElementById('barcodeContainerHeight').value);
    const layout = document.querySelector('input[name="layout"]:checked').value;

    // Convertir a píxeles
    const width = widthCm * 10; // Factor de escala para JsBarcode
    const height = cmToPx(heightCm);
    const fontSize = cmToPx(fontSizeCm);
    const margin = cmToPx(marginCm);
    const containerWidth = cmToPx(containerWidthCm);
    const containerHeight = cmToPx(containerHeightCm);

    // Obtener productos seleccionados
    const selectedProductsData = allProductsForBulk.filter(p => 
        bulkSelectedProducts.includes(p._id)
    );

    // Crear contenedor temporal
    const container = document.createElement('div');
    container.style.cssText = `
        position: fixed;
        left: -9999px;
        top: 0;
        background: white;
        padding: ${cmToPx(1)}px;
        width: ${cmToPx(21)}px; /* A4 width: 21cm */
    `;
    document.body.appendChild(container);

    // Configurar layout según el tipo
    const layoutConfigs = {
        grid: {
            columns: 3,
            gap: cmToPx(0.5)
        },
        list: {
            columns: 1,
            gap: cmToPx(0.3)
        },
        compact: {
            columns: 4,
            gap: cmToPx(0.2)
        }
    };

    const config = layoutConfigs[layout];
    container.style.display = 'grid';
    container.style.gridTemplateColumns = `repeat(${config.columns}, 1fr)`;
    container.style.gap = `${config.gap}px`;

    // Generar cada código
    for (const product of selectedProductsData) {
        const wrapper = document.createElement('div');
        wrapper.style.cssText = `
            border: 1px solid #ddd;
            padding: ${margin}px;
            border-radius: 4px;
            text-align: center;
            background: white;
            width: ${containerWidth}px;
            height: ${containerHeight}px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            box-sizing: border-box;
            overflow: hidden;
        `;

        // Título del producto
        const title = document.createElement('div');
        title.textContent = product.name;
        title.style.cssText = `
            font-weight: 600;
            margin-bottom: ${cmToPx(0.2)}px;
            font-size: ${fontSize}px;
            color: #2c3e50;
            line-height: 1.2;
            max-height: ${fontSize * 2.4}px;
            overflow: hidden;
            text-overflow: ellipsis;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
        `;

        // Precio
        const price = document.createElement('div');
        price.textContent = `$${product.salePrice.toLocaleString()}`;
        price.style.cssText = `
            font-size: ${fontSize * 0.9}px;
            color: #27ae60;
            margin-bottom: ${cmToPx(0.1)}px;
            font-weight: 600;
        `;

        // Detalles adicionales (categoría, marca, talla)
        const details = document.createElement('div');
        const detailsParts = [];
        if (product.category) detailsParts.push(product.category);
        if (product.brand) detailsParts.push(product.brand);
        if (product.size) detailsParts.push(`Talla: ${product.size}`);
        
        details.textContent = detailsParts.join(' • ');
        details.style.cssText = `
            font-size: ${fontSize * 0.65}px;
            color: #7f8c8d;
            margin-bottom: ${cmToPx(0.15)}px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 100%;
        `;

        // Canvas para el código
        const canvas = document.createElement('canvas');
        
        wrapper.appendChild(title);
        wrapper.appendChild(details);
        wrapper.appendChild(price);
        wrapper.appendChild(canvas);
        container.appendChild(wrapper);

        // Generar código de barras
        const shortId = product._id.slice(-8);
        const cleanName = product.name.replace(/[^\w\s]/g, '').substring(0, 15);
        const code = `${shortId}|${cleanName}|${product.salePrice}`;

try {
            // Crear div contenedor para el QR
            const qrDiv = document.createElement('div');
            qrDiv.style.cssText = `
                width: ${cmToPx(containerWidthCm * 0.6)}px;
                height: ${cmToPx(containerHeightCm * 0.5)}px;
                display: flex;
                justify-content: center;
                align-items: center;
            `;
            
            // Generar código QR en el div
            new QRCode(qrDiv, {
                text: code,
                width: cmToPx(containerWidthCm * 0.6),
                height: cmToPx(containerHeightCm * 0.5),
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });
            
            // Agregar el div (que contiene el canvas del QR) al wrapper
            wrapper.appendChild(qrDiv);
            
        } catch (error) {
            console.error('Error generando código QR para:', product.name, error);
        }
    }

    // ✅ ESPERAR MÁS TIEMPO para que los QR se rendericen completamente
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Convertir a imagen y descargar
    try {
        if (typeof html2canvas !== 'undefined') {
            const canvas = await html2canvas(container, {
                scale: 3, // Mayor escala para mejor calidad de impresión
                backgroundColor: '#ffffff',
                logging: false,
                width: cmToPx(21), // A4 width
                windowWidth: cmToPx(21)
            });

            canvas.toBlob(blob => {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                const timestamp = new Date().toISOString().slice(0,10);
                link.href = url;
                link.download = `codigos_barras_${timestamp}_${bulkSelectedProducts.length}productos.png`;
                link.click();
                URL.revokeObjectURL(url);
                
                showNotification(`${bulkSelectedProducts.length} códigos generados correctamente`, "success");
                closeBulkBarcodeModal();
            }, 'image/png', 1.0);
        } else {
            // Método alternativo: ventana de impresión con medidas reales
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Códigos de Barras - ${selectedProductsData.length} productos</title>
                        <style>
                            @page {
                                size: A4;
                                margin: 1cm;
                            }
                            body { 
                                font-family: Arial, sans-serif; 
                                padding: 0;
                                margin: 0;
                            }
                            .container {
                                display: grid;
                                grid-template-columns: repeat(${config.columns}, 1fr);
                                gap: ${marginCm}cm;
                                padding: 0.5cm;
                            }
                            .barcode-item {
                                border: 1px solid #ddd;
                                padding: ${marginCm}cm;
                                text-align: center;
                                width: ${containerWidthCm}cm;
                                height: ${containerHeightCm}cm;
                                box-sizing: border-box;
                                page-break-inside: avoid;
                            }
                            .product-name {
                                font-weight: 600;
                                font-size: ${fontSizeCm}cm;
                                margin-bottom: ${marginCm/2}cm;
                                color: #2c3e50;
                            }
                            .product-price {
                                font-size: ${fontSizeCm*0.9}cm;
                                color: #27ae60;
                                font-weight: 600;
                                margin-bottom: ${marginCm/2}cm;
                            }
                            .product-details {
                                font-size: ${fontSizeCm*0.65}cm;
                                color: #7f8c8d;
                                margin-bottom: ${marginCm/2}cm;
                            }
                            @media print {
                                body { margin: 0; }
                                .container { padding: 0; }
                            }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            ${container.innerHTML}
                        </div>
                        <script>
                            window.onload = function() {
                                setTimeout(function() {
                                    window.print();
                                }, 500);
                            };
                        </script>
                    </body>
                </html>
            `);
            printWindow.document.close();
            
            showNotification("Ventana de impresión abierta. Puedes guardar como PDF", "success");
        }
    } catch (error) {
        console.error('Error al generar imagen:', error);
        showNotification("Error al generar códigos: " + error.message, "error");
    } finally {
        // Limpiar
        document.body.removeChild(container);
    }
};

// Inicializar preview al abrir modal
document.addEventListener('DOMContentLoaded', () => {
    const layoutInputs = document.querySelectorAll('input[name="layout"]');
    layoutInputs.forEach(input => {
        input.addEventListener('change', updateLayoutPreview);
    });
    updateLayoutPreview();
});

/* =========================================================
   GENERACIÓN MASIVA DE CÓDIGOS DE BARRAS (ALTA CALIDAD)
   ========================================================= */

let bulkSelectedProducts = [];
let allProductsForBulk = [];

// Función auxiliar: convertir CM a píxeles (96 DPI estándar)
function cmToPx(cm) {
    return Math.round(cm * 37.7952755906); // 1cm = 37.7952755906px a 96 DPI
}

// Abrir modal
window.openBulkBarcodeModal = function() {
    // Filtrar solo productos no vendidos
    allProductsForBulk = products.filter(p => !p.sold);
    
    if (allProductsForBulk.length === 0) {
        showNotification("No hay productos disponibles para generar códigos", "warning");
        return;
    }

    // Llenar filtros
    populateBulkFilters();
    
    // Mostrar todos los productos inicialmente
    updateBulkSelection();
    
    // Inicializar preview
    updateLayoutPreview();
    
    // Mostrar modal
    document.getElementById('bulkBarcodeModal').classList.add('show');
};

// Cerrar modal
window.closeBulkBarcodeModal = function(event) {
    if (!event || event.target.id === 'bulkBarcodeModal') {
        document.getElementById('bulkBarcodeModal').classList.remove('show');
        bulkSelectedProducts = [];
    }
};

// Poblar filtros con categorías, marcas y tallas únicas
function populateBulkFilters() {
    const categories = [...new Set(allProductsForBulk.map(p => p.category))].sort();
    const brands = [...new Set(allProductsForBulk.map(p => p.brand))].sort();
    const sizes = [...new Set(allProductsForBulk.map(p => p.size).filter(Boolean))].sort();

    // Categorías
    const categorySelect = document.getElementById('bulkCategory');
    categorySelect.innerHTML = '<option value="">Todas las categorías</option>';
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        categorySelect.appendChild(option);
    });

    // Marcas
    const brandSelect = document.getElementById('bulkBrand');
    brandSelect.innerHTML = '<option value="">Todas las marcas</option>';
    brands.forEach(brand => {
        const option = document.createElement('option');
        option.value = brand;
        option.textContent = brand;
        brandSelect.appendChild(option);
    });

    // Tallas
    const sizeSelect = document.getElementById('bulkSize');
    sizeSelect.innerHTML = '<option value="">Todas las tallas</option>';
    sizes.forEach(size => {
        const option = document.createElement('option');
        option.value = size;
        option.textContent = size;
        sizeSelect.appendChild(option);
    });
}

// Actualizar selección según filtros
window.updateBulkSelection = function() {
    const category = document.getElementById('bulkCategory').value;
    const brand = document.getElementById('bulkBrand').value;
    const size = document.getElementById('bulkSize').value;
    const searchText = document.getElementById('bulkSearch').value.toLowerCase();

    const filtered = allProductsForBulk.filter(product => {
        const matchCategory = !category || product.category === category;
        const matchBrand = !brand || product.brand === brand;
        const matchSize = !size || product.size === size;
        const matchSearch = !searchText || product.name.toLowerCase().includes(searchText);

        return matchCategory && matchBrand && matchSize && matchSearch;
    });

    renderBulkProductList(filtered);
};

// Renderizar lista de productos
function renderBulkProductList(productList) {
    const container = document.getElementById('bulkProductList');
    container.innerHTML = '';

    if (productList.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--medium-gray); padding: 20px;">No hay productos que coincidan con los filtros</p>';
        updateSelectedCount();
        return;
    }

    productList.forEach(product => {
        const isSelected = bulkSelectedProducts.includes(product._id);
        
        const item = document.createElement('div');
        item.className = 'product-item';
        item.innerHTML = `
            <input 
                type="checkbox" 
                id="bulk_${product._id}" 
                ${isSelected ? 'checked' : ''}
                onchange="toggleBulkProduct('${product._id}')"
            >
            <div class="product-item-info">
                <div class="product-item-name">${product.name}</div>
                <div class="product-item-details">
                    <span><i class="fas fa-folder"></i> ${product.category}</span>
                    <span><i class="fas fa-tag"></i> ${product.brand}</span>
                    ${product.size ? `<span><i class="fas fa-ruler"></i> ${product.size}</span>` : ''}
                    <span><i class="fas fa-dollar-sign"></i> $${product.salePrice.toLocaleString()}</span>
                </div>
            </div>
        `;
        container.appendChild(item);
    });

    updateSelectedCount();
}

// Toggle selección de producto
window.toggleBulkProduct = function(productId) {
    const index = bulkSelectedProducts.indexOf(productId);
    if (index === -1) {
        bulkSelectedProducts.push(productId);
    } else {
        bulkSelectedProducts.splice(index, 1);
    }
    updateSelectedCount();
};

// Seleccionar todos
window.selectAllBulk = function() {
    const checkboxes = document.querySelectorAll('#bulkProductList input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        if (!checkbox.checked) {
            checkbox.checked = true;
            const productId = checkbox.id.replace('bulk_', '');
            if (!bulkSelectedProducts.includes(productId)) {
                bulkSelectedProducts.push(productId);
            }
        }
    });
    updateSelectedCount();
};

// Deseleccionar todos
window.deselectAllBulk = function() {
    const checkboxes = document.querySelectorAll('#bulkProductList input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    bulkSelectedProducts = [];
    updateSelectedCount();
};

// Actualizar contador
function updateSelectedCount() {
    document.getElementById('selectedCount').textContent = 
        `${bulkSelectedProducts.length} producto${bulkSelectedProducts.length !== 1 ? 's' : ''} seleccionado${bulkSelectedProducts.length !== 1 ? 's' : ''}`;
}

// Actualizar preview del layout
window.updateLayoutPreview = function() {
    const layout = document.querySelector('input[name="layout"]:checked').value;
    const previewText = document.getElementById('previewText');
    
    const previews = {
        grid: '3 columnas × N filas - Ideal para hojas A4',
        list: '1 columna × N filas - Uno debajo del otro',
        compact: '4-5 columnas × N filas - Máxima densidad'
    };
    
    if (previewText) {
        previewText.textContent = previews[layout] || '';
    }
};

// Aplicar configuraciones predefinidas (✅ MEJORADO CON VALORES DE ALTA CALIDAD)
window.applyPreset = function(presetName) {
    const presets = {
        standard: {
            width: 0.06,      // ✅ Aumentado para líneas más gruesas
            height: 2.2,      // ✅ Aumentado para mejor escaneo
            fontSize: 0.45,   // ✅ Aumentado para mejor legibilidad
            margin: 0.5,
            containerWidth: 6.5,  // ✅ Más espacio
            containerHeight: 4.5  // ✅ Más espacio
        },
        small: {
            width: 0.05,
            height: 1.8,
            fontSize: 0.35,
            margin: 0.3,
            containerWidth: 4.5,
            containerHeight: 3.5
        },
        large: {
            width: 0.08,      // ✅ Mucho más grueso
            height: 3,        // ✅ Mucho más alto
            fontSize: 0.6,    // ✅ Fuente grande
            margin: 0.7,
            containerWidth: 9,
            containerHeight: 6
        },
        thermal: {
            width: 0.05,
            height: 2,
            fontSize: 0.4,
            margin: 0.2,
            containerWidth: 5.5,
            containerHeight: 3.5
        }
    };

    const preset = presets[presetName];
    if (preset) {
        document.getElementById('barcodeWidth').value = preset.width;
        document.getElementById('barcodeHeight').value = preset.height;
        document.getElementById('barcodeFontSize').value = preset.fontSize;
        document.getElementById('barcodeMargin').value = preset.margin;
        document.getElementById('barcodeContainerWidth').value = preset.containerWidth;
        document.getElementById('barcodeContainerHeight').value = preset.containerHeight;
        
        showNotification(`✅ Preset HD "${presetName}" aplicado`, "success");
    }
};


// ✅ GENERAR CÓDIGOS QR MASIVOS CON DISEÑO MEJORADO Y CENTRADO
window.generateBulkBarcodes = async function() {
    if (bulkSelectedProducts.length === 0) {
        showNotification("Selecciona al menos un producto", "warning");
        return;
    }

    showNotification("Generando códigos QR en alta calidad...", "info");

    // Obtener configuración EN CENTÍMETROS
    const widthCm = parseFloat(document.getElementById('barcodeWidth').value);
    const heightCm = parseFloat(document.getElementById('barcodeHeight').value);
    const fontSizeCm = parseFloat(document.getElementById('barcodeFontSize').value);
    const marginCm = parseFloat(document.getElementById('barcodeMargin').value);
    const containerWidthCm = parseFloat(document.getElementById('barcodeContainerWidth').value);
    const containerHeightCm = parseFloat(document.getElementById('barcodeContainerHeight').value);
    const layout = document.querySelector('input[name="layout"]:checked').value;

    // Obtener productos seleccionados
    const selectedProductsData = allProductsForBulk.filter(p => 
        bulkSelectedProducts.includes(p._id)
    );

    // Configurar layout
    const layoutConfigs = {
        grid: { columns: 3 },
        list: { columns: 1 },
        compact: { columns: 4 }
    };

    const config = layoutConfigs[layout];
    
    // CONFIGURACIÓN DE PÁGINA A4 Y DPI
    const DPI = 300;
    const pageWidthCm = 21;
    const pageHeightCm = 29.7;
    const pagePaddingCm = 1;
    const gapCm = 0.5;
    
    // Función auxiliar: convertir CM a píxeles a 300 DPI
    const cmToPx300 = (cm) => Math.round((cm / 2.54) * DPI);
    
    // Calcular dimensiones en píxeles
    const pageWidthPx = cmToPx300(pageWidthCm);
    const pageHeightPx = cmToPx300(pageHeightCm);
    const pagePaddingPx = cmToPx300(pagePaddingCm);
    const gapPx = cmToPx300(gapCm);
    const containerWidthPx = cmToPx300(containerWidthCm);
    const containerHeightPx = cmToPx300(containerHeightCm);
    
    // CALCULAR CUÁNTOS PRODUCTOS CABEN POR PÁGINA
    const usableWidthCm = pageWidthCm - (2 * pagePaddingCm);
    const usableHeightCm = pageHeightCm - (2 * pagePaddingCm);
    
    const itemsPerRow = config.columns;
    const rowsPerPage = Math.floor(usableHeightCm / (containerHeightCm + gapCm));
    const itemsPerPage = itemsPerRow * rowsPerPage;
    
    console.log(`📄 Configuración:`);
    console.log(`   - ${itemsPerPage} códigos por página`);
    console.log(`   - ${itemsPerRow} columnas × ${rowsPerPage} filas`);
    
    // DIVIDIR PRODUCTOS EN PÁGINAS
    const pages = [];
    for (let i = 0; i < selectedProductsData.length; i += itemsPerPage) {
        pages.push(selectedProductsData.slice(i, i + itemsPerPage));
    }
    
    console.log(`📑 Total de páginas: ${pages.length}`);
    
    // GENERAR CADA PÁGINA
    const images = [];
    
    for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
        const pageProducts = pages[pageIndex];
        
        showNotification(`Generando página ${pageIndex + 1}/${pages.length}...`, "info");
        
        // Crear contenedor para esta página
        const container = document.createElement('div');
        container.style.cssText = `
            position: fixed;
            left: -99999px;
            top: 0;
            width: ${pageWidthPx}px;
            height: ${pageHeightPx}px;
            background: white;
            padding: ${pagePaddingPx}px;
            box-sizing: border-box;
            display: grid;
            grid-template-columns: repeat(${itemsPerRow}, 1fr);
            gap: ${gapPx}px;
            align-content: start;
        `;
        document.body.appendChild(container);
        
        // ✅ GENERAR CADA CÓDIGO CON DISEÑO MEJORADO
        for (const product of pageProducts) {
            const wrapper = document.createElement('div');
            
            wrapper.style.cssText = `
                border: ${cmToPx300(0.05)}px solid #333;
                padding: ${cmToPx300(marginCm)}px;
                border-radius: ${cmToPx300(0.3)}px;
                text-align: center;
                background: white;
                width: ${containerWidthPx}px;
                height: ${containerHeightPx}px;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                box-sizing: border-box;
                overflow: hidden;
                gap: ${cmToPx300(0.2)}px;
            `;

            // ✅ CONTENEDOR DEL QR (perfectamente centrado)
            const qrContainer = document.createElement('div');
            const qrSize = cmToPx300(Math.min(containerWidthCm * 0.6, containerHeightCm * 0.5));
            qrContainer.style.cssText = `
                width: ${qrSize}px;
                height: ${qrSize}px;
                display: flex;
                justify-content: center;
                align-items: center;
                margin: ${cmToPx300(0.2)}px auto;
                flex-shrink: 0;
            `;
            
            // Generar código QR
            const shortId = product._id.slice(-8);
            const cleanName = product.name.replace(/[^\w\s]/g, '').substring(0, 15);
            const code = `${shortId}|${cleanName}|${product.salePrice}`;

            try {
                new QRCode(qrContainer, {
                    text: code,
                    width: qrSize,
                    height: qrSize,
                    colorDark: "#000000",
                    colorLight: "#ffffff",
                    correctLevel: QRCode.CorrectLevel.H
                });
            } catch (error) {
                console.error('Error generando código QR para:', product.name, error);
            }

            // ✅ NOMBRE DEL PRODUCTO (debajo del QR)
            const title = document.createElement('div');
            const productName = product.name.length > 30 ? product.name.substring(0, 27) + '...' : product.name;
            title.textContent = productName;
            title.style.cssText = `
                font-weight: 700;
                font-size: ${cmToPx300(fontSizeCm * 0.9)}px;
                color: #000;
                line-height: 1.2;
                font-family: Arial, sans-serif;
                width: 100%;
                text-align: center;
                overflow: hidden;
                text-overflow: ellipsis;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                margin-top: ${cmToPx300(0.1)}px;
                flex-shrink: 0;
            `;

            // ✅ PRECIO (destacado debajo del nombre)
            const price = document.createElement('div');
            price.textContent = `$${product.salePrice.toLocaleString()}`;
            price.style.cssText = `
                font-size: ${cmToPx300(fontSizeCm * 1.1)}px;
                color: #27ae60;
                font-weight: 800;
                font-family: Arial, sans-serif;
                margin-top: ${cmToPx300(0.1)}px;
                text-align: center;
                flex-shrink: 0;
            `;

            // Agregar elementos al wrapper en orden: QR → Nombre → Precio
            wrapper.appendChild(qrContainer);
            wrapper.appendChild(title);
            wrapper.appendChild(price);
            container.appendChild(wrapper);
        }

        // Esperar para renderizado completo
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // CAPTURAR ESTA PÁGINA
        try {
            const canvas = await html2canvas(container, {
                scale: 1,
                backgroundColor: '#ffffff',
                logging: false,
                width: pageWidthPx,
                height: pageHeightPx,
                windowWidth: pageWidthPx,
                windowHeight: pageHeightPx,
                useCORS: true,
                allowTaint: false
            });

            const blob = await new Promise(resolve => {
                canvas.toBlob(resolve, 'image/png', 1.0);
            });
            
            images.push({
                blob: blob,
                pageNumber: pageIndex + 1,
                totalPages: pages.length
            });
            
            console.log(`✅ Página ${pageIndex + 1}/${pages.length} generada`);
            
        } catch (error) {
            console.error(`❌ Error en página ${pageIndex + 1}:`, error);
            showNotification(`Error en página ${pageIndex + 1}`, "error");
        } finally {
            document.body.removeChild(container);
        }
    }
    
    // DESCARGAR TODAS LAS IMÁGENES
    if (images.length > 0) {
        const timestamp = new Date().toISOString().slice(0, 10);
        
        for (const img of images) {
            const url = URL.createObjectURL(img.blob);
            const link = document.createElement('a');
            
            let filename = `codigos_QR_${timestamp}`;
            
            if (img.totalPages > 1) {
                filename += `_pag${img.pageNumber}de${img.totalPages}`;
            }
            filename += '.png';
            
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        showNotification(
            `✅ ${images.length} archivo(s) descargado(s) - ${bulkSelectedProducts.length} códigos QR generados`, 
            "success"
        );
        closeBulkBarcodeModal();
    } else {
        showNotification("❌ No se pudo generar ninguna imagen", "error");
    }
};

// Inicializar listeners cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Verificar si los elementos existen antes de agregar listeners
    const layoutInputs = document.querySelectorAll('input[name="layout"]');
    if (layoutInputs.length > 0) {
        layoutInputs.forEach(input => {
            input.addEventListener('change', updateLayoutPreview);
        });
    }
});