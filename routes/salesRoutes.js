const express = require("express");
const auth = require("../middleware/auth");
const Sale = require("../models/Sale");
const salesController = require('../controllers/salesController');
const router = express.Router();

// Eliminar un abono específico de una venta
router.delete("/:saleId/payment/:paymentId", auth, async (req, res) => {
    try {
        const { saleId, paymentId } = req.params;

        const sale = await Sale.findOne({ _id: saleId, user: req.user.id });
        if (!sale) {
            return res.status(404).json({ error: "Venta no encontrada" });
        }

        // Filtrar el abono que se desea eliminar
        const initialLength = sale.payments.length;
        sale.payments = sale.payments.filter(p => p._id.toString() !== paymentId);

        if (sale.payments.length === initialLength) {
            return res.status(404).json({ error: "Abono no encontrado" });
        }

        // Si estaba liquidada, verificar si aún debería estarlo
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


// Obtener ventas por fecha (exacta)
router.get("/by-date/:date", auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const dateParam = new Date(req.params.date);

        // Obtener inicio y fin del día
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


// Obtener todas las ventas (liquidadas y no liquidadas)
router.get("/all", auth, async (req, res) => {
    try {
        const sales = await Sale.find({ user: req.user.id });
        res.json(sales);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener todas las ventas" });
    }
});

// Eliminar una venta liquidada
router.delete("/:id/settled", auth, async (req, res) => {
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



// Obtener todas las ventas, excluyendo las liquidadas
router.get("/", auth, async (req, res) => {
    try {
        const sales = await Sale.find({ 
            user: req.user.id, 
            settled: { $ne: true }  // Excluir ventas donde settled es true
        });
        res.json(sales);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener las ventas" });
    }
});



// Obtener todas las ventas liquidadas del usuario
router.get("/settled", auth, async (req, res) => {
    try {
        const sales = await Sale.find({ user: req.user.id, settled: true });
        res.json(sales);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener las ventas liquidadas" });
    }
});



// Crear nueva venta
router.post("/new", auth, async (req, res) => {
    try {
        const { clientName, productName, saleDate, price, installments, advancePayment, clientAddress } = req.body;

        // Verificar si el pago inicial (advancePayment) es igual o mayor que el precio total
        const initiallySettled = advancePayment >= price;

        const sale = new Sale({
            clientName,
            productName,
            saleDate,
            price,
            installments,
            advancePayment,
            clientAddress,
            user: req.user.id,
            // Si el pago inicial cubre el precio total, marcar como liquidada inmediatamente
            settled: initiallySettled,
            settledDate: initiallySettled ? new Date() : null,
            payments: advancePayment > 0 ? [{ amount: advancePayment, date: new Date() }] : []
        });

        await sale.save();
        res.status(201).json(sale);
    } catch (error) {
        console.error("Error en el servidor:", error);
        res.status(500).json({ error: error.message });
    }
});

// Actualizar una venta
router.put("/:id", auth, async (req, res) => {
    const { clientName, productName, saleDate, price, installments, clientAddress } = req.body;

    try {
        const sale = await Sale.findOne({ _id: req.params.id, user: req.user.id });

        if (!sale) {
            return res.status(404).json({ error: "Venta no encontrada" });
        }

        // Actualizamos los datos básicos
        sale.clientName = clientName;
        sale.productName = productName;
        sale.saleDate = saleDate;
        sale.price = price;
        sale.installments = installments;
        sale.clientAddress = clientAddress;

        // Verificar si con el nuevo precio, la venta debería actualizarse a liquidada o no
        const totalPaid = sale.payments.reduce((sum, payment) => sum + payment.amount, 0);
        
        // Si bajamos el precio y los pagos ya cubren el nuevo precio
        if (totalPaid >= price && !sale.settled) {
            sale.settled = true;
            sale.settledDate = new Date();
        } 
        // Si subimos el precio y los pagos ya no cubren el nuevo precio
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


router.post("/:id/payment", auth, async (req, res) => {
    const { amount, date } = req.body;

    if (!amount || amount <= 0) {
        return res.status(400).json({ error: "El monto del abono debe ser mayor a cero" });
    }

    try {
        const sale = await Sale.findOne({ _id: req.params.id, user: req.user.id });

        if (!sale) {
            return res.status(404).json({ error: "Venta no encontrada" });
        }

        // Si ya está liquidada no permitir más pagos
        if (sale.settled) {
            return res.status(400).json({ error: "La venta ya está liquidada, no puedes agregar más pagos" });
        }

        // Agregar el nuevo abono
        sale.payments.push({
            amount,
            date: date || new Date()
        });

        // 💥 Aquí recalculamos bien el total pagado
        const totalPaid = sale.payments.reduce((sum, payment) => sum + payment.amount, 0);

        let justSettled = false;

        // 💥 Aquí marcamos como liquidada si pagó todo
        if (totalPaid >= sale.price) {
            sale.settled = true;
            sale.settledDate = new Date();
            justSettled = true;
        }

        await sale.save();

        // Devolver respuesta correcta
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



// Eliminar una venta
router.delete("/:id", auth, async (req, res) => {
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

module.exports = router;