import { apiFetch } from "./utils/api.js";
import { getToken } from "./utils/auth.js";
import "./keepAlive.js";
import "./authCheck.js";

document.addEventListener("DOMContentLoaded", async () => {
    const expenseCountInput = document.getElementById("expenseCount");
    const expenseItemsContainer = document.getElementById("expenseItemsContainer");
    const saveExpenseBtn = document.getElementById("saveExpense");
    const updateExpenseBtn = document.getElementById("updateExpense");  // ✅ AGREGAR AQUÍ
    const cancelExpenseBtn = document.getElementById("cancelExpense");
    const expenseDateInput = document.getElementById("expenseDate");
    const expensesList = document.getElementById("expensesList");
    const emptyState = document.getElementById("emptyState");
    const totalExpensesElement = document.getElementById("totalExpenses");

    // Establecer fecha de hoy por defecto
    const today = new Date().toISOString().split('T')[0];
    expenseDateInput.value = today;

    try {
        const token = getToken();
        if (!token) {
            window.location.href = "login.html";
            return;
        }

        await loadExpenses();

        // Event listeners
        // Event listeners
        expenseCountInput.addEventListener("input", generateExpenseFields);
        saveExpenseBtn.addEventListener("click", saveExpense);
        updateExpenseBtn.addEventListener("click", updateExpense);  // ✅ AGREGAR AQUÍ
        cancelExpenseBtn.addEventListener("click", async () => {
            if (document.getElementById("expenseId").value) {
                if (await showConfirm("¿Seguro que deseas cancelar la edición?")) {
                    resetForm();
                }
            } else {
                resetForm();
            }
        });
    } catch (error) {
        console.error("Error al inicializar:", error);
        showError("Error al cargar la página");
    }

    function generateExpenseFields() {
        const count = parseInt(expenseCountInput.value);

        if (!count || count < 1 || count > 20) {
            expenseItemsContainer.classList.add("hidden");
            expenseItemsContainer.innerHTML = "";
            return;
        }

        expenseItemsContainer.classList.remove("hidden");
        expenseItemsContainer.innerHTML = "";

        for (let i = 1; i <= count; i++) {
            const itemDiv = document.createElement("div");
            itemDiv.className = "expense-item";
            itemDiv.innerHTML = `
                <div class="form-group" style="margin: 0;">
                    <label>Descripción del Gasto ${i}</label>
                    <input type="text" class="expense-description" placeholder="Ej: Transporte, Comida, etc." required>
                </div>
                <div class="form-group" style="margin: 0;">
                    <label>Monto ($)</label>
                    <input type="number" class="expense-amount" placeholder="0" min="0" step="1000" required>
                </div>
            `;
            expenseItemsContainer.appendChild(itemDiv);
        }
    }

    async function saveExpense() {
        const date = expenseDateInput.value;
        const descriptions = document.querySelectorAll(".expense-description");
        const amounts = document.querySelectorAll(".expense-amount");

        if (!date) {
            showNotification("Por favor selecciona una fecha", "warning");
            return;
        }

        if (descriptions.length === 0) {
            showNotification("Por favor especifica cuántos gastos deseas registrar", "warning");
            return;
        }

        const items = [];
        for (let i = 0; i < descriptions.length; i++) {
            const description = descriptions[i].value.trim();
            const amount = parseFloat(amounts[i].value);

            if (!description) {
                showNotification(`Por favor completa la descripción del gasto ${i + 1}`, "warning");
                return;
            }

            if (!amount || amount <= 0) {
                showNotification(`Por favor ingresa un monto válido para el gasto ${i + 1}`, "warning");
                return;
            }

            items.push({ description, amount });
        }

        try {
            const token = getToken();
            await apiFetch("/expenses", "POST", { date, items }, token);

            showNotification("¡Gastos registrados exitosamente!", "success");
            resetForm();
            await loadExpenses();

        } catch (error) {
            console.error("Error al guardar gastos:", error);
            showNotification("Error al guardar gastos: " + error.message, "error");
        }
    }

    async function updateExpense() {
        const id = document.getElementById("expenseId").value;
        const date = expenseDateInput.value;
        const descriptions = document.querySelectorAll(".expense-description");
        const amounts = document.querySelectorAll(".expense-amount");

        if (!id) {
            showNotification("Error: No se encontró el ID del gasto", "error");
            return;
        }

        if (!date) {
            showNotification("Por favor selecciona una fecha", "warning");
            return;
        }

        if (descriptions.length === 0) {
            showNotification("Por favor especifica cuántos gastos deseas registrar", "warning");
            return;
        }

        const items = [];
        for (let i = 0; i < descriptions.length; i++) {
            const description = descriptions[i].value.trim();
            const amount = parseFloat(amounts[i].value);

            if (!description) {
                showNotification(`Por favor completa la descripción del gasto ${i + 1}`, "warning");
                return;
            }

            if (!amount || amount <= 0) {
                showNotification(`Por favor ingresa un monto válido para el gasto ${i + 1}`, "warning");
                return;
            }

            items.push({ description, amount });
        }

        try {
            const token = getToken();
            await apiFetch(`/expenses/${id}`, "PUT", { date, items }, token);

            showNotification("¡Gasto actualizado exitosamente!", "success");
            resetFormAfterEdit();
            await loadExpenses();

        } catch (error) {
            console.error("Error al actualizar gasto:", error);
            showNotification("Error al actualizar gasto: " + error.message, "error");
        }
    }

    function resetForm() {
        document.getElementById("expenseId").value = "";
        expenseCountInput.value = "";
        expenseDateInput.value = today;
        expenseItemsContainer.innerHTML = "";
        expenseItemsContainer.classList.add("hidden");

        // Restaurar botones
        saveExpenseBtn.classList.remove("hidden");
        updateExpenseBtn.classList.add("hidden");
    }

    function resetFormAfterEdit() {
        resetForm();
    }
    window.editExpense = async function (id) {
        try {
            const token = getToken();
            const expenses = await apiFetch("/expenses", "GET", null, token);
            const expense = expenses.find(e => e._id === id);

            if (!expense) {
                showNotification("Gasto no encontrado", "error");
                return;
            }

            // Llenar el formulario con los datos existentes
            document.getElementById("expenseId").value = expense._id;

            const expenseDate = new Date(expense.date);
            const localDate = new Date(expenseDate.getTime() + expenseDate.getTimezoneOffset() * 60000);
            expenseDateInput.value = localDate.toISOString().split('T')[0];

            expenseCountInput.value = expense.items.length;

            // Generar campos
            generateExpenseFields();

            // Llenar los campos con los valores existentes
            setTimeout(() => {
                const descriptions = document.querySelectorAll(".expense-description");
                const amounts = document.querySelectorAll(".expense-amount");

                expense.items.forEach((item, index) => {
                    if (descriptions[index]) descriptions[index].value = item.description;
                    if (amounts[index]) amounts[index].value = item.amount;
                });
            }, 100);

            // Cambiar botones
            saveExpenseBtn.classList.add("hidden");
            updateExpenseBtn.classList.remove("hidden");

            // Scroll al formulario
            document.querySelector(".form-container").scrollIntoView({ behavior: 'smooth' });

        } catch (error) {
            console.error("Error al cargar gasto:", error);
            showNotification("Error al cargar el gasto para editar", "error");
        }
    };

    async function loadExpenses() {
        try {
            const token = getToken();
            const expenses = await apiFetch("/expenses", "GET", null, token);

            if (expenses.length === 0) {
                expensesList.innerHTML = "";
                emptyState.classList.remove("hidden");
                totalExpensesElement.textContent = "$0";
                return;
            }

            emptyState.classList.add("hidden");
            displayExpenses(expenses);
            updateTotal(expenses);

        } catch (error) {
            console.error("Error al cargar gastos:", error);
            showError("Error al cargar los gastos");
        }
    }

    function displayExpenses(expenses) {
        expensesList.innerHTML = expenses.map(expense => {
            const expenseDate = new Date(expense.date);
            const localDate = new Date(expenseDate.getTime() + expenseDate.getTimezoneOffset() * 60000);
            const formattedDate = localDate.toLocaleDateString('es-CO', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
            });

            return `
                <div class="expense-card">
                    <div class="expense-header">
                        <div class="expense-date">
                            <i class="fas fa-calendar"></i> ${formattedDate}
                        </div>
                        <div class="expense-total">
                            $${expense.totalAmount.toLocaleString('es-CO')}
                        </div>
                    </div>

                    <div class="expense-items-list">
                        ${expense.items.map(item => `
                            <div class="expense-item-row">
                                <span class="item-description">
                                    <i class="fas fa-receipt"></i> ${item.description}
                                </span>
                                <span class="item-amount">
                                    $${item.amount.toLocaleString('es-CO')}
                                </span>
                            </div>
                        `).join('')}
                    </div>

 <div class="expense-actions">
    <button class="btn btn-primary" onclick="editExpense('${expense._id}')">
        <i class="fas fa-edit"></i> Editar
    </button>
    <button class="btn btn-danger" onclick="deleteExpense('${expense._id}')">
        <i class="fas fa-trash"></i> Eliminar
    </button>
</div>
                </div>
            `;
        }).join('');
    }

    function updateTotal(expenses) {
        const total = expenses.reduce((sum, exp) => sum + exp.totalAmount, 0);
        totalExpensesElement.textContent = `$${total.toLocaleString('es-CO')}`;
    }

    window.deleteExpense = async function (id) {
        if (!await showConfirm("¿Estás seguro de eliminar este gasto?")) return;

        try {
            const token = getToken();
            await apiFetch(`/expenses/${id}`, "DELETE", null, token);
            showNotification("Gasto eliminado correctamente", "success");
            await loadExpenses();
        } catch (error) {
            console.error("Error al eliminar:", error);
            showNotification("Error al eliminar el gasto: " + error.message, "error");
        }
    };

    function showError(message) {
        expensesList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error</h3>
                <p>${message}</p>
            </div>
        `;
    }
});