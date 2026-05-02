const express = require("express");
const auth = require("../middleware/auth");
const { checkPermission } = require("../middleware/checkPermissions");
const Expense = require("../models/Expense");
const router = express.Router();

// ✅ FUNCIÓN AUXILIAR: Buscar gastos con permisos admin
async function findExpenseWithAdminPermission(expenseId, userId, userTipo) {
    if (userTipo === 2 || userTipo === 3) {
        return await Expense.findById(expenseId);
    } else {
        return await Expense.findOne({ _id: expenseId, user: userId });
    }
}

// 🔥 NUEVA RUTA: Crear gasto para un vendedor específico (SOLO ADMINS)
router.post("/vendedor/:vendedorId/new", auth, async (req, res) => {
    try {
        // Verificar que sea admin
        if (req.user.tipo !== 2 && req.user.tipo !== 3) {
            return res.status(403).json({ error: 'No tienes permisos' });
        }

        const { vendedorId } = req.params;
        const { date, items } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ error: "Debe agregar al menos un gasto" });
        }

        for (const item of items) {
            if (!item.description || !item.description.trim()) {
                return res.status(400).json({ error: "Todas las descripciones son obligatorias" });
            }
            if (!item.amount || item.amount <= 0) {
                return res.status(400).json({ error: "Todos los montos deben ser mayores a cero" });
            }
        }

        const expense = new Expense({
            user: vendedorId,  // 👈 Usar el ID del vendedor seleccionado
            date: date || new Date(),
            items
        });

        await expense.save();
        res.status(201).json(expense);

    } catch (error) {
        console.error("Error al crear gasto:", error);
        res.status(500).json({ error: "Error al crear gasto: " + error.message });
    }
});

// 🔥 RUTA PARA ADMINS: Obtener gastos de un vendedor específico
router.get("/vendedor/:vendedorId", auth, async (req, res) => {
    try {
        const { vendedorId } = req.params;
        
        if (req.user.tipo !== 2 && req.user.tipo !== 3) {
            return res.status(403).json({ error: 'No tienes permisos' });
        }
        
        // SIN filtro de liquidatedDay - mostrar TODOS los gastos
        const expenses = await Expense.find({ 
            user: vendedorId
        }).sort({ date: -1 });
        
        res.json(expenses);
    } catch (error) {
        console.error("Error al obtener gastos del vendedor:", error);
        res.status(500).json({ error: "Error al obtener gastos" });
    }
});

// Obtener todos los gastos
router.get("/", auth, checkPermission('verGastos'), async (req, res) => {
    try {
        // SIN filtro de liquidatedDay - mostrar TODOS los gastos
        const query = (req.user.tipo === 1 || req.user.linkedVendedor) 
            ? { user: req.user.linkedVendedor || req.user.id } 
            : {};
        
        const expenses = await Expense.find(query).sort({ date: -1 });
        res.json(expenses);
    } catch (error) {
        console.error("Error al obtener gastos:", error);
        res.status(500).json({ error: "Error al obtener gastos" });
    }
});
// Obtener gastos por fecha
router.get("/by-date/:date", auth, checkPermission('verGastos'), async (req, res) => {
    try {
        const dateParam = new Date(req.params.date);
        const startOfDay = new Date(dateParam.setHours(0, 0, 0, 0));
        const endOfDay = new Date(dateParam.setHours(23, 59, 59, 999));

        const query = {
            date: {
                $gte: startOfDay,
                $lte: endOfDay
            }
        };
        
        if (req.user.tipo === 1 || req.user.linkedVendedor) {
            query.user = req.user.linkedVendedor || req.user.id;
        }

        const expenses = await Expense.find(query);
        res.json(expenses);
    } catch (error) {
        console.error("Error al filtrar gastos por fecha:", error);
        res.status(500).json({ error: "Error al obtener gastos por fecha" });
    }
});

// Crear nuevo gasto
router.post("/", auth, checkPermission('crearGastos'), async (req, res) => {
    try {
        const { date, items } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ error: "Debe agregar al menos un gasto" });
        }

        for (const item of items) {
            if (!item.description || !item.description.trim()) {
                return res.status(400).json({ error: "Todas las descripciones son obligatorias" });
            }
            if (!item.amount || item.amount <= 0) {
                return res.status(400).json({ error: "Todos los montos deben ser mayores a cero" });
            }
        }

        const expense = new Expense({
            user: req.user.linkedVendedor || req.user.id,
            date: date || new Date(),
            items
        });

        await expense.save();
        res.status(201).json(expense);

    } catch (error) {
        console.error("Error al crear gasto:", error);
        res.status(500).json({ error: "Error al crear gasto: " + error.message });
    }
});

// Actualizar gasto
router.put("/:id", auth, checkPermission('editarGastos'), async (req, res) => {
    try {
        const { date, items } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ error: "Debe agregar al menos un gasto" });
        }

        const expense = await findExpenseWithAdminPermission(req.params.id, req.user.id, req.user.tipo);

        if (!expense) {
            return res.status(404).json({ error: "Gasto no encontrado" });
        }

        expense.date = date || expense.date;
        expense.items = items;

        await expense.save();
        res.json(expense);

    } catch (error) {
        console.error("Error al actualizar gasto:", error);
        res.status(500).json({ error: "Error al actualizar gasto" });
    }
});

// Eliminar gasto
router.delete("/:id", auth, checkPermission('eliminarGastos'), async (req, res) => {
    try {
        const expense = await findExpenseWithAdminPermission(req.params.id, req.user.id, req.user.tipo);

        if (!expense) {
            return res.status(404).json({ error: "Gasto no encontrado" });
        }

        await Expense.findByIdAndDelete(req.params.id);
        res.json({ message: "Gasto eliminado correctamente" });
    } catch (error) {
        console.error("Error al eliminar gasto:", error);
        res.status(500).json({ error: "Error al eliminar gasto" });
    }
});

// Obtener total de gastos
router.get("/total", auth, checkPermission('verGastos'), async (req, res) => {
    try {
        const query = { liquidatedDay: false };
        if (req.user.tipo === 1 || req.user.linkedVendedor) {
            query.user = req.user.linkedVendedor || req.user.id;
        }
        
        const expenses = await Expense.find(query);
        const total = expenses.reduce((sum, exp) => sum + exp.totalAmount, 0);
        
        res.json({ 
            total,
            count: expenses.length 
        });
    } catch (error) {
        console.error("Error al calcular total:", error);
        res.status(500).json({ error: "Error al calcular total de gastos" });
    }
});

module.exports = router;