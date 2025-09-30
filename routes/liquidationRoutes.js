// liquidationRoutes.js
const express = require("express");
const auth = require("../middleware/auth");
const Sale = require("../models/Sale");
const Product = require("../models/Product");
const DailyLiquidation = require("../models/DailyLiquidation");
const router = express.Router();

// Obtener datos pendientes de liquidación
router.get("/pending", auth, async (req, res) => {
    try {
        // Ventas no liquidadas
        const sales = await Sale.find({ 
            user: req.user.id, 
            liquidatedDay: false 
        });

        // Productos no liquidados Y NO VENDIDOS
        const products = await Product.find({ 
            user: req.user.id, 
            liquidatedDay: false,
            sold: false
        });

        // Abonos no liquidados (dentro de todas las ventas)
        const allSales = await Sale.find({ user: req.user.id });
        
        let paymentsData = [];
        allSales.forEach(sale => {
            const unliquidatedPayments = sale.payments.filter(p => !p.liquidatedDay);
            unliquidatedPayments.forEach(payment => {
                paymentsData.push({
                    saleId: sale._id,
                    clientName: sale.clientName,
                    amount: payment.amount,
                    date: payment.date,
                    paymentId: payment._id
                });
            });
        });

        // ✅ NUEVO: Calcular estadísticas de seguimiento de clientes
        const allActiveSales = await Sale.find({ 
            user: req.user.id, 
            settled: false  // Solo ventas no liquidadas completamente
        });

        const totalActiveClients = allActiveSales.length;
        
        // Clientes que han pagado algo (tienen al menos un abono no liquidado hoy)
        const clientsWhoPaidToday = new Set();
        paymentsData.forEach(p => {
            clientsWhoPaidToday.add(p.clientName);
        });
        const paidTodayCount = clientsWhoPaidToday.size;
        
        // Clientes que no pagaron hoy
        const clientsWhoDidntPayToday = totalActiveClients - paidTodayCount;
        
        // Porcentaje de efectividad
        const effectivenessPercentage = totalActiveClients > 0 
            ? ((paidTodayCount / totalActiveClients) * 100).toFixed(1)
            : 0;

        // Calcular totales
        const totalSales = sales.reduce((sum, s) => sum + s.price, 0);
        const totalPayments = paymentsData.reduce((sum, p) => sum + p.amount, 0);
        const totalInventoryCost = products.reduce((sum, p) => sum + p.costPrice, 0);

        res.json({
            sales: {
                count: sales.length,
                total: totalSales,
                data: sales
            },
            payments: {
                count: paymentsData.length,
                total: totalPayments,
                data: paymentsData
            },
            inventory: {
                count: products.length,
                totalCost: totalInventoryCost,
                data: products
            },
            // ✅ NUEVO: Estadísticas de seguimiento
            clientTracking: {
                totalActiveClients,
                paidToday: paidTodayCount,
                didNotPayToday: clientsWhoDidntPayToday,
                effectivenessPercentage: parseFloat(effectivenessPercentage),
                totalIncome: totalPayments
            }
        });
    } catch (error) {
        console.error("Error al obtener datos pendientes:", error);
        res.status(500).json({ error: "Error al obtener datos pendientes" });
    }
});

// Crear liquidación del día
router.post("/create", auth, async (req, res) => {
    try {
        const {
            initialCash,
            paymentsCommission,
            salesCommission,
            notes
        } = req.body;

        // Obtener datos pendientes
        const sales = await Sale.find({ 
            user: req.user.id, 
            liquidatedDay: false 
        });

        const products = await Product.find({ 
            user: req.user.id, 
            liquidatedDay: false,
            sold: false
        });

        const allSales = await Sale.find({ user: req.user.id });
        
        let paymentsData = [];
        let paymentUpdates = [];
        
        allSales.forEach(sale => {
            const unliquidatedPayments = sale.payments.filter(p => !p.liquidatedDay);
            unliquidatedPayments.forEach(payment => {
                paymentsData.push({
                    saleId: sale._id,
                    clientName: sale.clientName,
                    amount: payment.amount
                });
                paymentUpdates.push({
                    saleId: sale._id,
                    paymentId: payment._id
                });
            });
        });

        // Calcular totales
        const totalSales = sales.reduce((sum, s) => sum + s.price, 0);
        const totalPayments = paymentsData.reduce((sum, p) => sum + p.amount, 0);
        const totalInventoryCost = products.reduce((sum, p) => sum + p.costPrice, 0);

        // ✅ CAMBIO: Solo los abonos cuentan como ingreso, las ventas NO
        const paymentsAfterCommission = totalPayments - (totalPayments * (paymentsCommission / 100));
        
        // Las ventas ya NO generan ingreso adicional
        const totalIncome = paymentsAfterCommission;  // ← SOLO ABONOS
        const totalExpenses = totalInventoryCost;
        const finalCash = initialCash + totalIncome - totalExpenses;

        // Crear registro de liquidación
        const liquidation = new DailyLiquidation({
            user: req.user.id,
            initialCash,
            finalCash,
            payments: {
                count: paymentsData.length,
                total: totalPayments,
                afterCommission: paymentsAfterCommission,
                commissionPercentage: paymentsCommission
            },
            sales: {
                count: sales.length,
                total: totalSales,
                afterCommission: 0,  // ← Ya no aplica comisión a ventas
                commissionPercentage: 0  // ← Ya no aplica
            },
            totalIncome,
            inventory: {
                totalCost: totalInventoryCost,
                productCount: products.length
            },
            totalExpenses,
            liquidatedSales: sales.map(s => ({
                saleId: s._id,
                clientName: s.clientName,
                amount: s.price
            })),
            liquidatedPayments: paymentsData,
            liquidatedProducts: products.map(p => ({
                productId: p._id,
                name: p.name,
                costPrice: p.costPrice
            })),
            notes: notes || ""
        });

        await liquidation.save();

        // Marcar ventas como liquidadas
        await Sale.updateMany(
            { 
                _id: { $in: sales.map(s => s._id) },
                user: req.user.id 
            },
            { $set: { liquidatedDay: true } }
        );

        // Marcar productos como liquidados
        await Product.updateMany(
            { 
                _id: { $in: products.map(p => p._id) },
                user: req.user.id 
            },
            { $set: { liquidatedDay: true } }
        );

        // Marcar abonos como liquidados
        for (const update of paymentUpdates) {
            await Sale.updateOne(
                {
                    _id: update.saleId,
                    'payments._id': update.paymentId
                },
                {
                    $set: { 'payments.$.liquidatedDay': true }
                }
            );
        }

        res.json({
            message: "Liquidación creada exitosamente",
            liquidation
        });
    } catch (error) {
        console.error("Error al crear liquidación:", error);
        res.status(500).json({ error: "Error al crear liquidación: " + error.message });
    }
});

// Obtener historial de liquidaciones
router.get("/history", auth, async (req, res) => {
    try {
        const liquidations = await DailyLiquidation.find({ user: req.user.id })
            .sort({ liquidationDate: -1 });
        
        res.json(liquidations);
    } catch (error) {
        console.error("Error al obtener historial:", error);
        res.status(500).json({ error: "Error al obtener historial" });
    }
});

// Obtener una liquidación específica
router.get("/:id", auth, async (req, res) => {
    try {
        const liquidation = await DailyLiquidation.findOne({
            _id: req.params.id,
            user: req.user.id
        });

        if (!liquidation) {
            return res.status(404).json({ error: "Liquidación no encontrada" });
        }

        res.json(liquidation);
    } catch (error) {
        console.error("Error al obtener liquidación:", error);
        res.status(500).json({ error: "Error al obtener liquidación" });
    }
});

// Eliminar liquidación (solo para correcciones)
router.delete("/:id", auth, async (req, res) => {
    try {
        const liquidation = await DailyLiquidation.findOneAndDelete({
            _id: req.params.id,
            user: req.user.id
        });

        if (!liquidation) {
            return res.status(404).json({ error: "Liquidación no encontrada" });
        }

        res.json({ message: "Liquidación eliminada correctamente" });
    } catch (error) {
        console.error("Error al eliminar liquidación:", error);
        res.status(500).json({ error: "Error al eliminar liquidación" });
    }
});

module.exports = router;