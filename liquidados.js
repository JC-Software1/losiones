import { apiFetch } from "./utils/api.js";
import { getToken } from "./utils/auth.js";

let sales = [];
let filteredSales = [];

document.addEventListener("DOMContentLoaded", async () => {
    const liquidatedHistory = document.getElementById("liquidatedHistory");
    const searchInput = document.getElementById("searchInput");
    const dateFilter = document.getElementById("dateFilter");
    const totalLiquidatedElement = document.getElementById("totalLiquidated");

    try {
        const token = getToken();
        if (!token) {
            window.location.href = "login.html";
            return;
        }
        
        sales = await apiFetch("/sales/settled", "GET", null, token);
        filteredSales = [...sales];
        
        displayLiquidatedSales(filteredSales);
        updateStatistics(filteredSales);
        setupMenuHandlers();

        // Filtrar las ventas mientras se escribe en el campo de búsqueda
        searchInput.addEventListener("input", applyFilters);
        
        // Filtrar por fecha de liquidación
        dateFilter.addEventListener("change", applyFilters);

    } catch (error) {
        console.error("Error al cargar las ventas liquidadas:", error);
        liquidatedHistory.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error al cargar</h3>
                <p>No se pudieron cargar las ventas liquidadas. Intenta nuevamente.</p>
            </div>`;
    }
});

function applyFilters() {
    const searchText = document.getElementById("searchInput").value.toLowerCase().trim();
    const selectedDate = document.getElementById("dateFilter").value;
    
    filteredSales = sales.filter(sale => {
        const matchesSearch = searchText === "" || sale.clientName.toLowerCase().includes(searchText);
        
        let matchesDate = true;
        if (selectedDate !== "") {
            // Convertir la fecha de liquidación a formato YYYY-MM-DD para comparación precisa
            const settledDateStr = new Date(sale.settledDate).toISOString().split('T')[0];
            matchesDate = settledDateStr === selectedDate;
        }
        
        return matchesSearch && matchesDate;
    });

    displayLiquidatedSales(filteredSales);
    updateStatistics(filteredSales);
}
function displayLiquidatedSales(salesList) {
    const liquidatedHistory = document.getElementById("liquidatedHistory");
    liquidatedHistory.innerHTML = ""; // Limpiar antes de actualizar

    if (salesList.length === 0) {
        liquidatedHistory.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h3>No se encontraron resultados</h3>
                <p>No hay ventas liquidadas que coincidan con los filtros aplicados.</p>
            </div>`;
        return;
    }

    salesList.forEach((sale) => {
        const saleCard = document.createElement("div");
        saleCard.classList.add("sale-card", "liquidated");

        // Formatear fechas
        const settledDate = new Date(sale.settledDate).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        
        const saleDate = new Date(sale.saleDate).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        
        // Calcular días entre venta y liquidación
        const msPerDay = 24 * 60 * 60 * 1000;
        const daysBetween = Math.round(
            (new Date(sale.settledDate) - new Date(sale.saleDate)) / msPerDay
        );

        // Determinar si fue una liquidación rápida (menos de 30 días)
        const isQuickLiquidation = daysBetween <= 30;
        const periodClass = isQuickLiquidation ? 'success' : 'warning';
        const periodIcon = isQuickLiquidation ? 'fas fa-bolt' : 'fas fa-clock';
        const periodText = isQuickLiquidation ? 'Liquidación rápida' : 'Liquidación extendida';

        saleCard.innerHTML = `
            <div class="sale-header">
                <div class="sale-info">
                    <span class="liquidated-badge"><i class="fas fa-check"></i> Liquidado</span>
                    <h3>${sale.clientName}</h3>
                    <p>${sale.productName}</p>
                </div>
                <div class="sale-amount">
                    <div class="liquidated-amount">$${sale.price.toLocaleString()}</div>
                </div>
            </div>
            
            <div class="sale-meta">
                <div class="meta-item">
                    <i class="fas fa-calendar-plus"></i>
                    <span>Venta: <span class="meta-value">${saleDate}</span></span>
                </div>
                <div class="meta-item">
                    <i class="fas fa-check-circle"></i>
                    <span>Liquidado: <span class="meta-value">${settledDate}</span></span>
                </div>
                <div class="meta-item">
                    <i class="fas fa-hourglass-half"></i>
                    <span>Duración: <span class="meta-value">${daysBetween} días</span></span>
                </div>
                <div class="meta-item">
                    <i class="${periodIcon}"></i>
                    <span class="meta-value" style="color: var(--${periodClass})">${periodText}</span>
                </div>
            </div>
            
            <div class="liquidation-period">
                <div class="period-text">
                    <i class="${periodIcon}"></i> 
                    Completado en ${daysBetween} día${daysBetween !== 1 ? 's' : ''}
                </div>
            </div>
            
            <div class="sale-actions">
                <button class="btn btn-info" onclick="showSaleDetails('${sale._id}')">
                    <i class="fas fa-info-circle"></i> Ver detalles
                </button>
                <button class="btn btn-danger" onclick="deleteSale('${sale._id}')">
                    <i class="fas fa-trash-alt"></i> Eliminar
                </button>
            </div>
        `;

        liquidatedHistory.appendChild(saleCard);
    });
}

function updateStatistics(salesList) {
    // Total liquidado
    const totalLiquidated = salesList.reduce((sum, sale) => sum + sale.price, 0);
    document.getElementById("totalLiquidated").textContent = `$${totalLiquidated.toLocaleString()}`;
    
    // Total de ventas liquidadas
    document.getElementById("totalCount").textContent = salesList.length;
    
    // Días promedio de liquidación
    if (salesList.length > 0) {
        const avgDays = Math.round(
            salesList.reduce((sum, sale) => {
                const msPerDay = 24 * 60 * 60 * 1000;
                const days = Math.round((new Date(sale.settledDate) - new Date(sale.saleDate)) / msPerDay);
                return sum + days;
            }, 0) / salesList.length
        );
        document.getElementById("avgDays").textContent = avgDays;
    } else {
        document.getElementById("avgDays").textContent = "0";
    }
    
    // Total liquidado este mes
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const thisMonthSales = salesList.filter(sale => {
        const saleDate = new Date(sale.settledDate);
        return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear;
    });
    
    const thisMonthTotal = thisMonthSales.reduce((sum, sale) => sum + sale.price, 0);
    document.getElementById("thisMonth").textContent = `$${thisMonthTotal.toLocaleString()}`;
}

// Función global para mostrar detalles de venta
window.showSaleDetails = function(saleId) {
    const sale = sales.find(s => s._id === saleId);
    if (!sale) return;
    
    const saleDate = new Date(sale.saleDate).toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    const settledDate = new Date(sale.settledDate).toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysBetween = Math.round((new Date(sale.settledDate) - new Date(sale.saleDate)) / msPerDay);
    
    alert(`
DETALLES DE LA VENTA LIQUIDADA

Cliente: ${sale.clientName}
Producto: ${sale.productName}
Precio: $${sale.price.toLocaleString()} COP

📅 Fecha de venta: ${saleDate}
✅ Fecha de liquidación: ${settledDate}
⏱️ Tiempo de liquidación: ${daysBetween} días

${daysBetween <= 30 ? '⚡ Liquidación rápida' : '🕐 Liquidación extendida'}
    `);
};

// Función global para eliminar venta
window.deleteSale = async function(saleId) {
    if (!confirm("¿Estás seguro de que deseas eliminar este registro de liquidación?\n\nEsta acción no se puede deshacer.")) {
        return;
    }
    
    try {
        const token = getToken();
        await apiFetch(`/sales/${saleId}`, "DELETE", null, token);
        
        // Eliminar la venta del array y actualizar la vista
        sales = sales.filter(sale => sale._id !== saleId);
        applyFilters(); // Reaplicar filtros
        
        // Mostrar mensaje de éxito
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--success);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: var(--shadow-hover);
            z-index: 10000;
            font-weight: 600;
        `;
        notification.innerHTML = '<i class="fas fa-check"></i> Venta eliminada correctamente';
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
        
    } catch (error) {
        console.error("Error al eliminar la venta:", error);
        alert("❌ No se pudo eliminar la venta. Intenta nuevamente.");
    }
};

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

// Función para exportar datos (funcionalidad adicional)
window.exportLiquidatedData = function() {
    if (filteredSales.length === 0) {
        alert("No hay datos para exportar");
        return;
    }
    
    const csvData = [
        ['Cliente', 'Producto', 'Precio', 'Fecha Venta', 'Fecha Liquidación', 'Días Liquidación']
    ];
    
    filteredSales.forEach(sale => {
        const saleDate = new Date(sale.saleDate).toLocaleDateString('es-ES');
        const settledDate = new Date(sale.settledDate).toLocaleDateString('es-ES');
        const msPerDay = 24 * 60 * 60 * 1000;
        const daysBetween = Math.round((new Date(sale.settledDate) - new Date(sale.saleDate)) / msPerDay);
        
        csvData.push([
            sale.clientName,
            sale.productName,
            sale.price,
            saleDate,
            settledDate,
            daysBetween
        ]);
    });
    
    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `liquidados_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// Función para obtener estadísticas avanzadas
function getAdvancedStats() {
    if (sales.length === 0) return null;
    
    const liquidationTimes = sales.map(sale => {
        const msPerDay = 24 * 60 * 60 * 1000;
        return Math.round((new Date(sale.settledDate) - new Date(sale.saleDate)) / msPerDay);
    });
    
    const quickLiquidations = liquidationTimes.filter(days => days <= 30).length;
    const slowLiquidations = liquidationTimes.filter(days => days > 30).length;
    
    // Clientes más frecuentes
    const clientFrequency = {};
    sales.forEach(sale => {
        clientFrequency[sale.clientName] = (clientFrequency[sale.clientName] || 0) + 1;
    });
    
    const topClient = Object.entries(clientFrequency)
        .sort(([,a], [,b]) => b - a)[0];
    
    // Mes con más liquidaciones
    const monthlyStats = {};
    sales.forEach(sale => {
        const monthKey = new Date(sale.settledDate).toISOString().slice(0, 7);
        monthlyStats[monthKey] = (monthlyStats[monthKey] || 0) + sale.price;
    });
    
    const bestMonth = Object.entries(monthlyStats)
        .sort(([,a], [,b]) => b - a)[0];
    
    return {
        quickLiquidations,
        slowLiquidations,
        topClient: topClient ? { name: topClient[0], count: topClient[1] } : null,
        bestMonth: bestMonth ? { month: bestMonth[0], total: bestMonth[1] } : null,
        averageAmount: Math.round(sales.reduce((sum, sale) => sum + sale.price, 0) / sales.length),
        totalAmount: sales.reduce((sum, sale) => sum + sale.price, 0)
    };
}

// Función para mostrar estadísticas avanzadas
window.showAdvancedStats = function() {
    const stats = getAdvancedStats();
    if (!stats) {
        alert("No hay datos suficientes para mostrar estadísticas");
        return;
    }
    
    const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    
    const bestMonthFormatted = stats.bestMonth ? 
        `${monthNames[parseInt(stats.bestMonth.month.split('-')[1]) - 1]} ${stats.bestMonth.month.split('-')[0]}` : 
        'N/A';
    
    const message = `
📊 ESTADÍSTICAS AVANZADAS DE LIQUIDACIONES

💰 Total liquidado: ${stats.totalAmount.toLocaleString()} COP
💵 Promedio por venta: ${stats.averageAmount.toLocaleString()} COP

⚡ Liquidaciones rápidas (≤30 días): ${stats.quickLiquidations}
🕐 Liquidaciones extendidas (>30 días): ${stats.slowLiquidations}

👤 Cliente más frecuente: ${stats.topClient?.name || 'N/A'} (${stats.topClient?.count || 0} liquidaciones)
📅 Mejor mes: ${bestMonthFormatted} (${stats.bestMonth?.total.toLocaleString() || 0} COP)

📈 Tasa de liquidación rápida: ${Math.round((stats.quickLiquidations / sales.length) * 100)}%
    `;
    
    alert(message);
};