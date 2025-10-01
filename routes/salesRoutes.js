const express = require("express");
const auth = require("../middleware/auth");
const { checkPermission } = require("../middleware/checkPermissions");
const Sale = require("../models/Sale");
const router = express.Router();

// Eliminar un abono específico - requiere "eliminarAbonos"
router.delete("/:saleId/payment/:paymentId", auth, checkPermission('eliminarAbonos'), async (req, res) => {
    try {
        const { saleId, paymentId } = req.params;

        const sale = await Sale.findOne({ _id: saleId, user: req.user.id });
        if (!sale) {
            return res.status(404).json({ error: "Venta no encontrada" });
        }

        const initialLength = sale.payments.length;
        sale.payments = sale.payments.filter(p => p._id.toString() !== paymentId);

        if (sale.payments.length === initialLength) {
            return res.status(404).json({ error: "Abono no encontrado" });
        }

        if (sale.settled) {
            const totalPaid = sale.payments.reduce((sum, payment) => sum + payment.amount, 0);
            if (totalPaid < sale.price) {
                sale.settled = false;
                sale.settledDate = null;
            }
        }

        await sale.save();
        res.json({ message: "Abono eliminado correctamente" });
    } catch (error) {
        console.error("Error al eliminar el abono:", error);
        res.status(500).json({ error: "Error al eliminar el abono" });
    }
});

// Obtener ventas por fecha - requiere "verVentas"
router.get("/by-date/:date", auth, checkPermission('verVentas'), async (req, res) => {
    try {
        const userId = req.user.id;
        const dateParam = new Date(req.params.date);

        const startOfDay = new Date(dateParam.setHours(0, 0, 0, 0));
        const endOfDay = new Date(dateParam.setHours(23, 59, 59, 999));

        const sales = await Sale.find({
            user: userId,
            saleDate: {
                $gte: startOfDay,
                $lte: endOfDay
            }
        });

        res.json(sales);
    } catch (error) {
        console.error("Error al filtrar por fecha:", error);
        res.status(500).json({ error: "Error al obtener ventas por fecha" });
    }
});

// Obtener todas las ventas - requiere "verVentas"
router.get("/all", auth, checkPermission('verVentas'), async (req, res) => {
    try {
        const sales = await Sale.find({ user: req.user.id });
        res.json(sales);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener todas las ventas" });
    }
});

// Eliminar una venta liquidada - requiere "eliminarVentas"
router.delete("/:id/settled", auth, checkPermission('eliminarVentas'), async (req, res) => {
    try {
        const sale = await Sale.findOneAndDelete({ _id: req.params.id, user: req.user.id, settled: true });

        if (!sale) {
            return res.status(404).json({ error: "Venta liquidada no encontrada" });
        }

        res.json({ message: "Venta liquidada eliminada correctamente" });
    } catch (error) {
        res.status(500).json({ error: "Error al eliminar la venta liquidada" });
    }
});

// Obtener ventas activas - requiere "verVentas"
router.get("/", auth, checkPermission('verVentas'), async (req, res) => {
    try {
        const sales = await Sale.find({ 
            user: req.user.id, 
            settled: { $ne: true }
        });
        res.json(sales);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener las ventas" });
    }
});

// Obtener ventas liquidadas - requiere "verVentasLiquidadas"
router.get("/settled", auth, checkPermission('verVentasLiquidadas'), async (req, res) => {
    try {
        const sales = await Sale.find({ user: req.user.id, settled: true });
        res.json(sales);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener las ventas liquidadas" });
    }
});

// Crear nueva venta - requiere "crearVentas"
router.post("/new", auth, checkPermission('crearVentas'), async (req, res) => {
    try {
        const {
            clientName,
            products,
            saleDate,
            price,
            installments,
            advancePayment,
            clientAddress,
            paymentDays
        } = req.body;

        const productName = products.map(p => p.name).join(', ');
        const initiallySettled = advancePayment >= price;

        const sale = new Sale({
            clientName,
            productName,
            products,
            saleDate,
            price,
            installments,
            advancePayment,
            clientAddress,
            paymentDays,
            user: req.user.id,
            settled: initiallySettled,
            settledDate: initiallySettled ? new Date() : null,
            liquidatedDay: false,
            payments: advancePayment > 0 ? [{ 
                amount: advancePayment, 
                date: saleDate,
                liquidatedDay: false
            }] : []
        });

        await sale.save();
        res.status(201).json(sale);
    } catch (error) {
        console.error("Error en el servidor:", error);
        res.status(500).json({ error: error.message });
    }
});



// Actualizar una venta - requiere "editarVentas"
router.put("/:id", auth, checkPermission('editarVentas'), async (req, res) => {
    const { clientName, productName, saleDate, price, installments, clientAddress, paymentDays } = req.body;

    try {
        const sale = await Sale.findOne({ _id: req.params.id, user: req.user.id });

        if (!sale) {
            return res.status(404).json({ error: "Venta no encontrada" });
        }

        sale.clientName = clientName;
        sale.productName = productName;
        sale.saleDate = saleDate;
        sale.price = price;
        sale.installments = installments;
        sale.clientAddress = clientAddress;
        
        if (paymentDays !== undefined) {
            sale.paymentDays = paymentDays;
        }

        const totalPaid = sale.payments.reduce((sum, payment) => sum + payment.amount, 0);
        
        if (totalPaid >= price && !sale.settled) {
            sale.settled = true;
            sale.settledDate = new Date();
        } 
        else if (totalPaid < price && sale.settled) {
            sale.settled = false;
            sale.settledDate = null;
        }

        await sale.save();
        res.json(sale);
    } catch (error) {
        res.status(500).json({ error: "Error al actualizar la venta" });
    }
});

// Agregar abono - requiere "agregarAbonos"
router.post("/:id/payment", auth, checkPermission('agregarAbonos'), async (req, res) => {
    const { amount, date } = req.body;

    if (!amount || amount <= 0) {
        return res.status(400).json({ error: "El monto del abono debe ser mayor a cero" });
    }

    try {
        const sale = await Sale.findOne({ _id: req.params.id, user: req.user.id });

        if (!sale) {
            return res.status(404).json({ error: "Venta no encontrada" });
        }

        if (sale.settled) {
            return res.status(400).json({ error: "La venta ya está liquidada, no puedes agregar más pagos" });
        }

        sale.payments.push({
            amount,
            date: date || new Date(),
            liquidatedDay: false
        });

        const totalPaid = sale.payments.reduce((sum, payment) => sum + payment.amount, 0);

        let justSettled = false;

        if (totalPaid >= sale.price) {
            sale.settled = true;
            sale.settledDate = new Date();
            justSettled = true;
        }

        await sale.save();

        res.json({
            settled: sale.settled,
            justSettled,
            remainingDebt: Math.max(0, sale.price - totalPaid),
            totalPaid: totalPaid,
            saleId: sale._id
        });
    } catch (error) {
        console.error("Error al agregar el abono:", error);
        res.status(500).json({ error: "Error al agregar el abono" });
    }
});

// Eliminar una venta - requiere "eliminarVentas"
router.delete("/:id", auth, checkPermission('eliminarVentas'), async (req, res) => {
    try {
        const sale = await Sale.findOneAndDelete({ _id: req.params.id, user: req.user.id });

        if (!sale) {
            return res.status(404).json({ error: "Venta no encontrada" });
        }

        res.json({ message: "Venta eliminada correctamente" });
    } catch (error) {
        res.status(500).json({ error: "Error al eliminar la venta" });
    }
});

// Obtener ventas de un vendedor específico (para administradores)
router.get('/vendedor/:vendedorId', auth, async (req, res) => {
    try {
        const { vendedorId } = req.params;
        
        // Verificar que el usuario actual sea admin/jefe
        if (req.user.tipo !== 2 && req.user.tipo !== 3) {
            return res.status(403).json({ error: 'No tienes permisos para ver ventas de otros usuarios' });
        }
        
        const sales = await Sale.find({ user: vendedorId }).sort({ saleDate: -1 });
        
        res.json(sales);
    } catch (error) {
        console.error('Error al obtener ventas del vendedor:', error);
        res.status(500).json({ error: 'Error al obtener ventas del vendedor' });
    }
});

module.exports = router;