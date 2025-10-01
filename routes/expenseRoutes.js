const express = require("express");
const auth = require("../middleware/auth");
const { checkPermission } = require("../middleware/checkPermissions");
const Expense = require("../models/Expense");
const router = express.Router();

// Obtener todos los gastos - requiere "verGastos"
router.get("/", auth, checkPermission('verGastos'), async (req, res) => {
    try {
        const expenses = await Expense.find({ 
            user: req.user.id,
            liquidatedDay: false 
        }).sort({ date: -1 });
        
        res.json(expenses);
    } catch (error) {
        console.error("Error al obtener gastos:", error);
        res.status(500).json({ error: "Error al obtener gastos" });
    }
});

// Obtener gastos por fecha - requiere "verGastos"
router.get("/by-date/:date", auth, checkPermission('verGastos'), async (req, res) => {
    try {
        const dateParam = new Date(req.params.date);
        const startOfDay = new Date(dateParam.setHours(0, 0, 0, 0));
        const endOfDay = new Date(dateParam.setHours(23, 59, 59, 999));

        const expenses = await Expense.find({
            user: req.user.id,
            date: {
                $gte: startOfDay,
                $lte: endOfDay
            }
        });

        res.json(expenses);
    } catch (error) {
        console.error("Error al filtrar gastos por fecha:", error);
        res.status(500).json({ error: "Error al obtener gastos por fecha" });
    }
});

// Crear nuevo gasto - requiere "crearGastos"
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
            user: req.user.id,
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

// Actualizar gasto - requiere "editarGastos"
router.put("/:id", auth, checkPermission('editarGastos'), async (req, res) => {
    try {
        const { date, items } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ error: "Debe agregar al menos un gasto" });
        }

        const expense = await Expense.findOne({ 
            _id: req.params.id, 
            user: req.user.id 
        });

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

// Eliminar gasto - requiere "eliminarGastos"
router.delete("/:id", auth, checkPermission('eliminarGastos'), async (req, res) => {
    try {
        const expense = await Expense.findOneAndDelete({ 
            _id: req.params.id, 
            user: req.user.id 
        });

        if (!expense) {
            return res.status(404).json({ error: "Gasto no encontrado" });
        }

        res.json({ message: "Gasto eliminado correctamente" });
    } catch (error) {
        console.error("Error al eliminar gasto:", error);
        res.status(500).json({ error: "Error al eliminar gasto" });
    }
});

// Obtener total de gastos - requiere "verGastos"
router.get("/total", auth, checkPermission('verGastos'), async (req, res) => {
    try {
        const expenses = await Expense.find({ 
            user: req.user.id,
            liquidatedDay: false 
        });

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