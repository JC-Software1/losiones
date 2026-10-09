import { apiFetch } from "../utils/api.js";
import { getToken } from "../utils/auth.js";

// Referencias a elementos del DOM
const form = document.getElementById("expenseForm");
const inputTitle = document.getElementById("expenseTitle");
const inputAmount = document.getElementById("expenseAmount");
const selectCategory = document.getElementById("expenseCategory");
const inputDate = document.getElementById("expenseDate");
const inputId = document.getElementById("expenseId");
const btnSave = document.getElementById("saveExpense");
const btnUpdate = document.getElementById("updateExpense");
const btnCancel = document.getElementById("cancelUpdate");
const list = document.getElementById("expenseList");

// Configurar la fecha por defecto como hoy
inputDate.valueAsDate = new Date();

// Cargar las categorías al inicio
async function loadCategories() {
    try {
        const token = getToken();
        const categories = await apiFetch("/categories", "GET", null, token);

        // Limpiar el select, manteniendo solo la opción por defecto
        selectCategory.innerHTML = '<option value="">Selecciona una categoría</option>';

        // Agregar cada categoría como una opción
        categories.forEach(category => {
            const option = document.createElement("option");
            option.value = category._id;
            option.textContent = category.name;
            selectCategory.appendChild(option);
        });
    } catch (error) {
        console.error("Error al cargar categorías:", error);
        showNotification("No se pudieron cargar las categorías", "error");
    }
}

// Cargar los gastos
async function loadExpenses() {
    try {
        const token = getToken();
        const expenses = await apiFetch("/expenses", "GET", null, token);
        list.innerHTML = "";

        expenses.forEach(expense => {
            // Verificar si expense.category existe y tiene propiedad name
            const categoryName = expense.category && expense.category.name
                ? expense.category.name
                : "Sin categoría";

            const li = document.createElement("li");
            li.innerHTML = `
                <div class="expense-info">
                    <h3>${expense.title}</h3>
                    <p class="amount">$${expense.amount.toFixed(2)}</p>
                    <p>Categoría: ${categoryName}</p>
                    <p>Fecha: ${new Date(expense.date).toLocaleDateString()}</p>
                </div>
                <div class="expense-actions">
                    <button class="edit">Editar</button>
                    <button class="delete">Eliminar</button>
                </div>
            `;

            // Asignar eventos a los botones
            li.querySelector(".edit").addEventListener("click", () => editExpense(expense));
            li.querySelector(".delete").addEventListener("click", () => deleteExpense(expense._id));

            list.appendChild(li);
        });
    } catch (error) {
        console.error("Error al cargar gastos:", error);
        showNotification("No se pudieron cargar los gastos", "error");
    }
}

// Función para editar gasto
function editExpense(expense) {
    inputId.value = expense._id;
    inputTitle.value = expense.title;
    inputAmount.value = expense.amount;
    selectCategory.value = expense.category._id;
    inputDate.value = new Date(expense.date).toISOString().split('T')[0];

    btnSave.style.display = "none";
    btnUpdate.style.display = "inline-block";
    btnCancel.style.display = "inline-block";
}

// Función para eliminar gasto
async function deleteExpense(id) {
    if (!await showConfirm("¿Estás seguro de que deseas eliminar este gasto?")) {
        return;
    }

    try {
        const token = getToken();
        await apiFetch(`/expenses/${id}`, "DELETE", null, token);
        showNotification("Gasto eliminado correctamente", "success");
        loadExpenses();
    } catch (error) {
        console.error("Error al eliminar gasto:", error);
        showNotification("No se pudo eliminar el gasto", "error");
    }
}

// Función para guardar gasto
async function saveExpense() {
    const title = inputTitle.value.trim();
    const amount = parseFloat(inputAmount.value);
    const category = selectCategory.value;
    const date = inputDate.value;

    if (!title || isNaN(amount) || amount <= 0 || !category) {
        showNotification("Por favor completa todos los campos correctamente", "warning");
        return;
    }

    try {
        const token = getToken();
        const data = { title, amount, category, date };
        await apiFetch("/expenses/new", "POST", data, token);

        showNotification("Gasto guardado correctamente", "success");
        form.reset();
        inputDate.valueAsDate = new Date(); // Restaurar fecha actual
        loadExpenses();
    } catch (error) {
        console.error("Error al guardar gasto:", error);
        showNotification("No se pudo guardar el gasto", "error");
    }
}

// Función para actualizar gasto
async function updateExpense() {
    const id = inputId.value;
    const title = inputTitle.value.trim();
    const amount = parseFloat(inputAmount.value);
    const category = selectCategory.value;
    const date = inputDate.value;

    if (!id || !title || isNaN(amount) || amount <= 0 || !category) {
        showNotification("Por favor completa todos los campos correctamente", "warning");
        return;
    }

    try {
        const token = getToken();
        const data = { title, amount, category, date };
        await apiFetch(`/expenses/${id}`, "PUT", data, token);

        showNotification("Gasto actualizado correctamente", "success");
        form.reset();
        inputDate.valueAsDate = new Date(); // Restaurar fecha actual
        btnSave.style.display = "inline-block";
        btnUpdate.style.display = "none";
        btnCancel.style.display = "none";
        loadExpenses();
    } catch (error) {
        console.error("Error al actualizar gasto:", error);
        showNotification("No se pudo actualizar el gasto", "error");
    }
}

// Función para cancelar actualización
function cancelUpdate() {
    form.reset();
    inputDate.valueAsDate = new Date(); // Restaurar fecha actual
    btnSave.style.display = "inline-block";
    btnUpdate.style.display = "none";
    btnCancel.style.display = "none";
}

// Asignar eventos a los botones
btnSave.addEventListener("click", saveExpense);
btnUpdate.addEventListener("click", updateExpense);
btnCancel.addEventListener("click", cancelUpdate);

// Cargar datos al iniciar la página
document.addEventListener("DOMContentLoaded", () => {
    loadCategories();
    loadExpenses();
});