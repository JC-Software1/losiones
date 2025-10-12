const express = require("express");
const auth = require("../middleware/auth");
const { checkPermission } = require("../middleware/checkPermissions");
const Sale = require("../models/Sale");
const router = express.Router();



// ✅ FUNCIÓN AUXILIAR: Buscar venta con permisos admin
async function findSaleWithAdminPermission(saleId, userId, userTipo) {
    if (userTipo === 2 || userTipo === 3) {
        return await Sale.findById(saleId);
    } else {
        return await Sale.findOne({ _id: saleId, user: userId });
    }
}

// ========================================
// RUTAS ESPECÍFICAS (DEBEN IR PRIMERO)
// ========================================

// Obtener ventas por fecha
router.get("/by-date/:date", auth, checkPermission('verVentas'), async (req, res) => {
    try {
        const userId = req.user.id;
        const dateParam = new Date(req.params.date);

        const startOfDay = new Date(dateParam.setHours(0, 0, 0, 0));
        const endOfDay = new Date(dateParam.setHours(23, 59, 59, 999));

        const query = {
            saleDate: {
                $gte: startOfDay,
                $lte: endOfDay
            }
        };
        
        if (req.user.tipo === 1) {
            query.user = userId;
        }

        const sales = await Sale.find(query);
        res.json(sales);
    } catch (error) {
        console.error("Error al filtrar por fecha:", error);
        res.status(500).json({ error: "Error al obtener ventas por fecha" });
    }
});

// Obtener todas las ventas
router.get("/all", auth, checkPermission('verVentas'), async (req, res) => {
    try {
        const query = req.user.tipo === 1 ? { user: req.user.id } : {};
        const sales = await Sale.find(query);
        res.json(sales);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener todas las ventas" });
    }
});

// Obtener ventas liquidadas
router.get("/settled", auth, checkPermission('verVentas'), async (req, res) => {
    try {
        const query = req.user.tipo === 1 
            ? { user: req.user.id, settled: true } 
            : { settled: true };
            
        const sales = await Sale.find(query).sort({ settledDate: -1 });
        res.json(sales);
    } catch (error) {
        console.error("Error al obtener ventas liquidadas:", error);
        res.status(500).json({ error: "Error al obtener ventas liquidadas" });
    }
});

// Crear nueva venta
// Crear nueva venta
router.post("/new", auth, checkPermission('crearVentas'), async (req, res) => {
    try {
        const { 
            clientName, 
            productName, 
            saleDate, 
            price, 
            installments, 
            advancePayment, 
            clientAddress,
            paymentPerInstallment  // ✅ RECIBIR DESDE EL FRONTEND
        } = req.body;

        if (!clientName || !productName || !price || !saleDate) {
            return res.status(400).json({ error: "Todos los campos son obligatorios" });
        }

        const sale = new Sale({
            clientName,
            productName,
            saleDate: new Date(saleDate),
            price,
            installments,
            advancePayment: advancePayment || 0,
            clientAddress,
            paymentFrequency: req.body.paymentFrequency || 'mensual',
            paymentDays: req.body.paymentDays || [],
            paymentDaysText: req.body.paymentDaysText || '',
            paymentPerInstallment: paymentPerInstallment || 0, // ✅ USAR VALOR DEL FRONTEND
            numberOfInstallments: req.body.numberOfInstallments || 1,
            user: req.user.id,
            settled: false
        });

        if (advancePayment > 0) {
            sale.payments.push({
                amount: advancePayment,
                date: new Date(saleDate),
                liquidatedDay: false
            });

            if (advancePayment >= price) {
                sale.settled = true;
                sale.settledDate = new Date();
            }
        }

        await sale.save();
        res.status(201).json(sale);
    } catch (error) {
        console.error("Error al crear la venta:", error);
        res.status(500).json({ error: "Error al crear la venta" });
    }
});

// Crear nueva venta para vendedor específico
router.post('/vendedor/:vendedorId/new', auth, async (req, res) => {
    try {
        const { vendedorId } = req.params;
        
        if (req.user.tipo !== 2 && req.user.tipo !== 3) {
            return res.status(403).json({ error: 'No tienes permisos para crear ventas para otros usuarios' });
        }
        
        const { 
            clientName, 
            productName, 
            saleDate, 
            price, 
            installments, 
            advancePayment, 
            clientAddress,
            paymentPerInstallment  // ✅ RECIBIR DESDE EL FRONTEND
        } = req.body;

        if (!clientName || !productName || !price || !saleDate) {
            return res.status(400).json({ error: "Todos los campos son obligatorios" });
        }

        const sale = new Sale({
            clientName,
            productName,
            saleDate: new Date(saleDate),
            price,
            installments,
            advancePayment: advancePayment || 0,
            clientAddress,
            paymentFrequency: req.body.paymentFrequency || 'mensual',
            paymentDays: req.body.paymentDays || [],
            paymentDaysText: req.body.paymentDaysText || '',
            paymentPerInstallment: paymentPerInstallment || 0, // ✅ USAR VALOR DEL FRONTEND
            numberOfInstallments: req.body.numberOfInstallments || 1,
            user: vendedorId,
            settled: false
        });

        if (advancePayment > 0) {
            sale.payments.push({
                amount: advancePayment,
                date: new Date(saleDate),
                liquidatedDay: false
            });

            if (advancePayment >= price) {
                sale.settled = true;
                sale.settledDate = new Date();
            }
        }

        await sale.save();
        res.status(201).json(sale);
    } catch (error) {
        console.error("Error al crear la venta para vendedor:", error);
        res.status(500).json({ error: "Error al crear la venta" });
    }
});

// Obtener ventas de un vendedor específico
router.get('/vendedor/:vendedorId', auth, async (req, res) => {
    try {
        const { vendedorId } = req.params;
        
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

// Obtener ventas liquidadas de un vendedor específico
router.get('/vendedor/:vendedorId/settled', auth, async (req, res) => {
    try {
        const { vendedorId } = req.params;
        
        if (req.user.tipo !== 2 && req.user.tipo !== 3) {
            return res.status(403).json({ error: 'No tienes permisos para ver ventas de otros usuarios' });
        }
        
        const sales = await Sale.find({ user: vendedorId, settled: true }).sort({ settledDate: -1 });
        res.json(sales);
    } catch (error) {
        console.error('Error al obtener ventas liquidadas del vendedor:', error);
        res.status(500).json({ error: 'Error al obtener ventas liquidadas' });
    }
});

// ========================================
// RUTAS CON PARÁMETROS DINÁMICOS
// ========================================

// Eliminar un abono específico
router.delete("/:saleId/payment/:paymentId", auth, checkPermission('eliminarAbonos'), async (req, res) => {
    try {
        const { saleId, paymentId } = req.params;

        const sale = await findSaleWithAdminPermission(saleId, req.user.id, req.user.tipo);
        
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

// Eliminar una venta liquidada
router.delete("/:id/settled", auth, checkPermission('eliminarVentas'), async (req, res) => {
    try {
        const sale = await findSaleWithAdminPermission(req.params.id, req.user.id, req.user.tipo);

        if (!sale || !sale.settled) {
            return res.status(404).json({ error: "Venta liquidada no encontrada" });
        }

        await Sale.findByIdAndDelete(req.params.id);
        res.json({ message: "Venta liquidada eliminada correctamente" });
    } catch (error) {
        res.status(500).json({ error: "Error al eliminar la venta liquidada" });
    }
});

// Obtener una venta específica
router.get("/:id", auth, checkPermission('verVentas'), async (req, res) => {
    try {
        const sale = await findSaleWithAdminPermission(req.params.id, req.user.id, req.user.tipo);

        if (!sale) {
            return res.status(404).json({ error: "Venta no encontrada" });
        }

        res.json(sale);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener la venta" });
    }
});

router.put("/:id", auth, checkPermission('editarVentas'), async (req, res) => {
    const { 
        clientName, 
        productName, 
        saleDate, 
        price, 
        installments, 
        clientAddress, 
        advancePayment,
        paymentPerInstallment,
        updateProductPrices  // ✅ NUEVO
    } = req.body;

    try {
        const sale = await findSaleWithAdminPermission(req.params.id, req.user.id, req.user.tipo);

        if (!sale) {
            return res.status(404).json({ error: "Venta no encontrada" });
        }

        // ✅ NUEVO: Actualizar precio de productos vendidos
        if (updateProductPrices && productName) {
            const Product = require("../models/Product");
            const productNames = productName.split(',').map(p => p.trim());
            
            for (const name of productNames) {
                await Product.updateMany(
                    { 
                        name: name, 
                        sold: true, 
                        user: sale.user 
                    },
                    { 
                        $set: { salePrice: Math.round(price / productNames.length) }
                    }
                );
            }
        }

        sale.clientName = clientName;
        sale.productName = productName;
        sale.saleDate = saleDate;
        sale.price = price;
        sale.installments = installments;
        sale.clientAddress = clientAddress;
        sale.paymentFrequency = req.body.paymentFrequency || sale.paymentFrequency;
        sale.paymentDays = req.body.paymentDays || sale.paymentDays;
        sale.paymentDaysText = req.body.paymentDaysText || sale.paymentDaysText;
        sale.numberOfInstallments = req.body.numberOfInstallments || sale.numberOfInstallments;
        
        if (paymentPerInstallment !== undefined) {
            sale.paymentPerInstallment = paymentPerInstallment;
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
        console.error("Error al actualizar la venta:", error);
        res.status(500).json({ error: "Error al actualizar la venta" });
    }
});
// Agregar abono
router.post("/:id/payment", auth, checkPermission('agregarAbonos'), async (req, res) => {
    const { amount, date } = req.body;

    if (!amount || amount <= 0) {
        return res.status(400).json({ error: "El monto del abono debe ser mayor a cero" });
    }

    try {
        const sale = await findSaleWithAdminPermission(req.params.id, req.user.id, req.user.tipo);

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

// Eliminar una venta
router.delete("/:id", auth, checkPermission('eliminarVentas'), async (req, res) => {
    try {
        const sale = await findSaleWithAdminPermission(req.params.id, req.user.id, req.user.tipo);

        if (!sale) {
            return res.status(404).json({ error: "Venta no encontrada" });
        }

        await Sale.findByIdAndDelete(req.params.id);
        res.json({ message: "Venta eliminada correctamente" });
    } catch (error) {
        res.status(500).json({ error: "Error al eliminar la venta" });
    }
});

module.exports = router;