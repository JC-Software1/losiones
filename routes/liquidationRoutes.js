const express = require("express");
const auth = require("../middleware/auth");
const Sale = require("../models/Sale");
const Product = require("../models/Product");
const DailyLiquidation = require("../models/DailyLiquidation");
const Expense = require("../models/Expense");
const router = express.Router();

// RUTA PARA ADMINS: Datos pendientes de un vendedor
router.get("/vendedor/:vendedorId/pending", auth, async (req, res) => {
    try {
        const { vendedorId } = req.params;
        
        if (req.user.tipo !== 2 && req.user.tipo !== 3) {
            return res.status(403).json({ error: 'No tienes permisos' });
        }
        
        // Usar vendedorId en lugar de req.user.id
        const sales = await Sale.find({ 
            user: vendedorId, 
            liquidatedDay: false 
        }).lean().select('_id clientName price advancePayment payments');

        const products = await Product.find({ 
            user: vendedorId, 
            liquidatedDay: false,
            sold: false
        }).lean().select('_id name brand costPrice');

        const expenses = await Expense.find({ 
            user: vendedorId, 
            liquidatedDay: false 
        }).lean().select('_id date totalAmount items');

        const allActiveSales = await Sale.find({ 
            user: vendedorId, 
            settled: false
        }).lean().select('_id clientName payments advancePayment');

        let paymentsData = [];
        let totalPayments = 0;
        let totalInitialPayments = 0;
        const clientsWhoPaidToday = new Set();

        allActiveSales.forEach(sale => {
            if (!sale.payments) return;
            
            const unliquidatedPayments = sale.payments.filter(p => !p.liquidatedDay);
            
            unliquidatedPayments.forEach((payment, index) => {
                const isFirstPayment = index === 0 && sale.advancePayment > 0 && payment.amount === sale.advancePayment;
                
                if (isFirstPayment) {
                    totalInitialPayments += payment.amount;
                }
                
                totalPayments += payment.amount;
                clientsWhoPaidToday.add(sale.clientName);
                
                paymentsData.push({
                    saleId: sale._id,
                    clientName: sale.clientName,
                    amount: payment.amount,
                    date: payment.date,
                    paymentId: payment._id,
                    isInitialPayment: isFirstPayment
                });
            });
        });

        const totalSales = sales.reduce((sum, s) => sum + s.price, 0);
        const totalInventoryCost = products.reduce((sum, p) => sum + p.costPrice, 0);
        const totalExpensesAmount = expenses.reduce((sum, exp) => sum + exp.totalAmount, 0);

        const totalActiveClients = allActiveSales.length;
        const paidTodayCount = clientsWhoPaidToday.size;
        const clientsWhoDidntPayToday = totalActiveClients - paidTodayCount;
        const effectivenessPercentage = totalActiveClients > 0 
            ? ((paidTodayCount / totalActiveClients) * 100).toFixed(1)
            : 0;

        const salesData = sales.map(s => ({
            _id: s._id,
            clientName: s.clientName,
            price: s.price
        }));

        const productsData = products.map(p => ({
            _id: p._id,
            name: p.name,
            brand: p.brand,
            costPrice: p.costPrice
        }));

        const expensesData = expenses.map(e => ({
            _id: e._id,
            date: e.date,
            totalAmount: e.totalAmount,
            items: e.items
        }));

        res.json({
            sales: {
                count: sales.length,
                total: totalSales,
                data: salesData
            },
            payments: {
                count: paymentsData.length,
                total: totalPayments,
                totalInitialPayments: totalInitialPayments,
                data: paymentsData
            },
            inventory: {
                count: products.length,
                totalCost: totalInventoryCost,
                data: productsData
            },
            expenses: {
                count: expenses.length,
                total: totalExpensesAmount,
                data: expensesData
            },
            clientTracking: {
                totalActiveClients,
                paidToday: paidTodayCount,
                didNotPayToday: clientsWhoDidntPayToday,
                effectivenessPercentage: parseFloat(effectivenessPercentage),
                totalIncome: totalPayments
            }
        });
    } catch (error) {
        console.error("Error al obtener datos pendientes del vendedor:", error);
        res.status(500).json({ error: "Error al obtener datos pendientes" });
    }
});

// RUTA PARA ADMINS: Historial de liquidaciones de un vendedor
router.get("/vendedor/:vendedorId/history", auth, async (req, res) => {
    try {
        const { vendedorId } = req.params;
        
        if (req.user.tipo !== 2 && req.user.tipo !== 3) {
            return res.status(403).json({ error: 'No tienes permisos' });
        }
        
        const liquidations = await DailyLiquidation.find({ user: vendedorId })
            .sort({ liquidationDate: -1 });
        
        res.json(liquidations);
    } catch (error) {
        console.error("Error al obtener historial del vendedor:", error);
        res.status(500).json({ error: "Error al obtener historial" });
    }
});

// Obtener datos pendientes de liquidación
router.get("/pending", auth, async (req, res) => {
    try {
        const userId = req.user.id; // Simplificado, ya que admins no usan esta ruta para vendedores
        
        const sales = await Sale.find({ 
            user: userId, 
            liquidatedDay: false 
        }).lean().select('_id clientName price advancePayment payments');

        const products = await Product.find({ 
            user: userId, 
            liquidatedDay: false,
            sold: false
        }).lean().select('_id name brand costPrice');

        const expenses = await Expense.find({ 
            user: userId, 
            liquidatedDay: false 
        }).lean().select('_id date totalAmount items');

        const allActiveSales = await Sale.find({ 
            user: userId, 
            settled: false
        }).lean().select('_id clientName payments advancePayment');

        let paymentsData = [];
        let totalPayments = 0;
        let totalInitialPayments = 0;
        const clientsWhoPaidToday = new Set();

        allActiveSales.forEach(sale => {
            if (!sale.payments) return;
            
            const unliquidatedPayments = sale.payments.filter(p => !p.liquidatedDay);
            
            unliquidatedPayments.forEach((payment, index) => {
                const isFirstPayment = index === 0 && sale.advancePayment > 0 && payment.amount === sale.advancePayment;
                
                if (isFirstPayment) {
                    totalInitialPayments += payment.amount;
                }
                
                totalPayments += payment.amount;
                clientsWhoPaidToday.add(sale.clientName);
                
                paymentsData.push({
                    saleId: sale._id,
                    clientName: sale.clientName,
                    amount: payment.amount,
                    date: payment.date,
                    paymentId: payment._id,
                    isInitialPayment: isFirstPayment
                });
            });
        });

        const totalSales = sales.reduce((sum, s) => sum + s.price, 0);
        const totalInventoryCost = products.reduce((sum, p) => sum + p.costPrice, 0);
        const totalExpensesAmount = expenses.reduce((sum, exp) => sum + exp.totalAmount, 0);

        const totalActiveClients = allActiveSales.length;
        const paidTodayCount = clientsWhoPaidToday.size;
        const clientsWhoDidntPayToday = totalActiveClients - paidTodayCount;
        const effectivenessPercentage = totalActiveClients > 0 
            ? ((paidTodayCount / totalActiveClients) * 100).toFixed(1)
            : 0;

        const salesData = sales.map(s => ({
            _id: s._id,
            clientName: s.clientName,
            price: s.price
        }));

        const productsData = products.map(p => ({
            _id: p._id,
            name: p.name,
            brand: p.brand,
            costPrice: p.costPrice
        }));

        const expensesData = expenses.map(e => ({
            _id: e._id,
            date: e.date,
            totalAmount: e.totalAmount,
            items: e.items
        }));

        res.json({
            sales: {
                count: sales.length,
                total: totalSales,
                data: salesData
            },
            payments: {
                count: paymentsData.length,
                total: totalPayments,
                totalInitialPayments: totalInitialPayments,
                data: paymentsData
            },
            inventory: {
                count: products.length,
                totalCost: totalInventoryCost,
                data: productsData
            },
            expenses: {
                count: expenses.length,
                total: totalExpensesAmount,
                data: expensesData
            },
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

// Crear nueva liquidación (para el usuario logueado, e.g. vendedores)
router.post("/new", auth, async (req, res) => {
    try {
        const { initialCash, notes } = req.body;
        
        const userId = req.user.id;
        const sales = await Sale.find({ 
            user: userId, 
            liquidatedDay: false 
        }).lean().select('_id clientName price advancePayment payments');

        const products = await Product.find({ 
            user: userId, 
            liquidatedDay: false,
            sold: false
        }).lean().select('_id name brand costPrice');

        const expenses = await Expense.find({ 
            user: userId, 
            liquidatedDay: false 
        }).lean().select('_id date totalAmount items');

        const allActiveSales = await Sale.find({ 
            user: userId, 
            settled: false
        }).lean().select('_id clientName payments advancePayment');

        let paymentsData = [];
        let paymentUpdates = [];
        let totalPayments = 0;
        let totalInitialPayments = 0;

        allActiveSales.forEach(sale => {
            if (!sale.payments) return;
            
            const unliquidatedPayments = sale.payments.filter(p => !p.liquidatedDay);
            
            unliquidatedPayments.forEach((payment, index) => {
                const isFirstPayment = index === 0 && sale.advancePayment > 0 && payment.amount === sale.advancePayment;
                
                if (isFirstPayment) {
                    totalInitialPayments += payment.amount;
                }
                
                totalPayments += payment.amount;
                paymentsData.push({
                    saleId: sale._id,
                    clientName: sale.clientName,
                    amount: payment.amount,
                    date: payment.date,
                    paymentId: payment._id
                });
                paymentUpdates.push({
                    saleId: sale._id,
                    paymentId: payment._id
                });
            });
        });

        const totalSales = sales.reduce((sum, s) => sum + s.price, 0);
        const paymentsCommission = 3;
        const paymentsAfterCommission = Math.round(totalPayments - (totalPayments * (paymentsCommission / 100)));
        const totalIncome = paymentsAfterCommission + totalInitialPayments;
        const totalInventoryCost = products.reduce((sum, p) => sum + p.costPrice, 0);
        const totalExpensesAmount = expenses.reduce((sum, exp) => sum + exp.totalAmount, 0);
        const totalExpenses = totalInventoryCost + totalExpensesAmount;
        const finalCash = initialCash + totalIncome - totalExpenses;

        const liquidation = new DailyLiquidation({
            user: userId,
            initialCash,
            finalCash,
            payments: {
                count: paymentsData.length,
                total: totalPayments,
                totalInitialPayments: totalInitialPayments,
                afterCommission: paymentsAfterCommission,
                commissionPercentage: paymentsCommission
            },
            sales: {
                count: sales.length,
                total: totalSales,
                afterCommission: 0,
                commissionPercentage: 0
            },
            totalIncome,
            inventory: {
                totalCost: totalInventoryCost,
                productCount: products.length
            },
            expenses: {
                totalAmount: totalExpensesAmount,
                count: expenses.length
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
            liquidatedExpenses: expenses.map(e => ({
                expenseId: e._id,
                date: e.date,
                totalAmount: e.totalAmount,
                items: e.items
            })),
            notes: notes || ""
        });

        await liquidation.save();

        await Sale.updateMany(
            { 
                _id: { $in: sales.map(s => s._id) },
                user: userId 
            },
            { $set: { liquidatedDay: true } }
        );

        await Product.updateMany(
            { 
                _id: { $in: products.map(p => p._id) },
                user: userId 
            },
            { $set: { liquidatedDay: true } }
        );

        await Expense.updateMany(
            { 
                _id: { $in: expenses.map(e => e._id) },
                user: userId 
            },
            { $set: { liquidatedDay: true } }
        );

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

// RUTA NUEVA PARA ADMINS: Crear liquidación para un vendedor específico
router.post("/vendedor/:vendedorId/new", auth, async (req, res) => {
    try {
        const { vendedorId } = req.params;
        const { initialCash, notes } = req.body;
        
        if (req.user.tipo !== 2 && req.user.tipo !== 3) {
            return res.status(403).json({ error: 'No tienes permisos' });
        }
        
        const sales = await Sale.find({ 
            user: vendedorId, 
            liquidatedDay: false 
        }).lean().select('_id clientName price advancePayment payments');

        const products = await Product.find({ 
            user: vendedorId, 
            liquidatedDay: false,
            sold: false
        }).lean().select('_id name brand costPrice');

        const expenses = await Expense.find({ 
            user: vendedorId, 
            liquidatedDay: false 
        }).lean().select('_id date totalAmount items');

        const allActiveSales = await Sale.find({ 
            user: vendedorId, 
            settled: false
        }).lean().select('_id clientName payments advancePayment');

        let paymentsData = [];
        let paymentUpdates = [];
        let totalPayments = 0;
        let totalInitialPayments = 0;

        allActiveSales.forEach(sale => {
            if (!sale.payments) return;
            
            const unliquidatedPayments = sale.payments.filter(p => !p.liquidatedDay);
            
            unliquidatedPayments.forEach((payment, index) => {
                const isFirstPayment = index === 0 && sale.advancePayment > 0 && payment.amount === sale.advancePayment;
                
                if (isFirstPayment) {
                    totalInitialPayments += payment.amount;
                }
                
                totalPayments += payment.amount;
                paymentsData.push({
                    saleId: sale._id,
                    clientName: sale.clientName,
                    amount: payment.amount,
                    date: payment.date,
                    paymentId: payment._id
                });
                paymentUpdates.push({
                    saleId: sale._id,
                    paymentId: payment._id
                });
            });
        });

        const totalSales = sales.reduce((sum, s) => sum + s.price, 0);
        const paymentsCommission = 3;
        const paymentsAfterCommission = Math.round(totalPayments - (totalPayments * (paymentsCommission / 100)));
        const totalIncome = paymentsAfterCommission + totalInitialPayments;
        const totalInventoryCost = products.reduce((sum, p) => sum + p.costPrice, 0);
        const totalExpensesAmount = expenses.reduce((sum, exp) => sum + exp.totalAmount, 0);
        const totalExpenses = totalInventoryCost + totalExpensesAmount;
        const finalCash = initialCash + totalIncome - totalExpenses;

        const liquidation = new DailyLiquidation({
            user: vendedorId,
            initialCash,
            finalCash,
            payments: {
                count: paymentsData.length,
                total: totalPayments,
                totalInitialPayments: totalInitialPayments,
                afterCommission: paymentsAfterCommission,
                commissionPercentage: paymentsCommission
            },
            sales: {
                count: sales.length,
                total: totalSales,
                afterCommission: 0,
                commissionPercentage: 0
            },
            totalIncome,
            inventory: {
                totalCost: totalInventoryCost,
                productCount: products.length
            },
            expenses: {
                totalAmount: totalExpensesAmount,
                count: expenses.length
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
            liquidatedExpenses: expenses.map(e => ({
                expenseId: e._id,
                date: e.date,
                totalAmount: e.totalAmount,
                items: e.items
            })),
            notes: notes || ""
        });

        await liquidation.save();

        await Sale.updateMany(
            { 
                _id: { $in: sales.map(s => s._id) },
                user: vendedorId 
            },
            { $set: { liquidatedDay: true } }
        );

        await Product.updateMany(
            { 
                _id: { $in: products.map(p => p._id) },
                user: vendedorId 
            },
            { $set: { liquidatedDay: true } }
        );

        await Expense.updateMany(
            { 
                _id: { $in: expenses.map(e => e._id) },
                user: vendedorId 
            },
            { $set: { liquidatedDay: true } }
        );

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
            message: "Liquidación creada exitosamente para el vendedor",
            liquidation
        });
    } catch (error) {
        console.error("Error al crear liquidación para vendedor:", error);
        res.status(500).json({ error: "Error al crear liquidación: " + error.message });
    }
});

// Obtener historial de liquidaciones
router.get("/history", auth, async (req, res) => {
    try {
        const query = req.user.tipo === 1 ? { user: req.user.id } : {};
        const liquidations = await DailyLiquidation.find(query)
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
        const query = req.user.tipo === 1 
            ? { _id: req.params.id, user: req.user.id }
            : { _id: req.params.id };

        const liquidation = await DailyLiquidation.findOne(query);

        if (!liquidation) {
            return res.status(404).json({ error: "Liquidación no encontrada" });
        }

        res.json(liquidation);
    } catch (error) {
        console.error("Error al obtener liquidación:", error);
        res.status(500).json({ error: "Error al obtener liquidación" });
    }
});

// Eliminar liquidación
router.delete("/:id", auth, async (req, res) => {
    try {
        const query = req.user.tipo === 1 
            ? { _id: req.params.id, user: req.user.id }
            : { _id: req.params.id };

        const liquidation = await DailyLiquidation.findOneAndDelete(query);

        if (!liquidation) {
            return res.status(404).json({ error: "Liquidación no encontrada" });
        }

        res.json({ message: "Liquidación eliminada correctamente" });
    } catch (error) {
        console.error("Error al eliminar liquidación:", error);
        res.status(500).json({ error: "Error al eliminar liquidación" });
    }
});

// Corregir cálculo de liquidaciones existentes
router.post("/fix-calculations", auth, async (req, res) => {
    try {
        const query = req.user.tipo === 1 ? { user: req.user.id } : {};
        const liquidations = await DailyLiquidation.find(query);
        
        let fixed = 0;
        const results = [];

        for (const liq of liquidations) {
            const paymentsAfterComm = Math.round(
                liq.payments.total - (liq.payments.total * (liq.payments.commissionPercentage / 100))
            );
            
            const initialPayments = liq.payments.totalInitialPayments || 0;
            const totalIncome = Math.round(paymentsAfterComm + initialPayments);
            const expensesAmount = liq.expenses?.totalAmount || 0;
            const totalExpenses = Math.round(liq.inventory.totalCost + expensesAmount);
            const correctFinalCash = Math.round(liq.initialCash + totalIncome - totalExpenses);

            const needsUpdate = 
                !liq.payments.totalInitialPayments || 
                liq.finalCash !== correctFinalCash ||
                liq.totalIncome !== totalIncome ||
                liq.totalExpenses !== totalExpenses;

            if (needsUpdate) {
                results.push({
                    id: liq._id,
                    date: liq.liquidationDate,
                    oldFinalCash: liq.finalCash,
                    newFinalCash: correctFinalCash,
                    oldTotalIncome: liq.totalIncome,
                    newTotalIncome: totalIncome,
                    oldTotalExpenses: liq.totalExpenses,
                    newTotalExpenses: totalExpenses,
                    initialPayments: initialPayments,
                    expensesAmount: expensesAmount,
                    difference: correctFinalCash - liq.finalCash
                });

                liq.finalCash = correctFinalCash;
                liq.totalIncome = totalIncome;
                liq.totalExpenses = totalExpenses;
                liq.payments.afterCommission = paymentsAfterComm;
                liq.payments.totalInitialPayments = initialPayments;
                
                await liq.save();
                fixed++;
            }
        }

        res.json({
            message: `${fixed} liquidaciones corregidas`,
            totalLiquidations: liquidations.length,
            corrections: results
        });

    } catch (error) {
        console.error("Error al corregir liquidaciones:", error);
        res.status(500).json({ error: "Error al corregir liquidaciones: " + error.message });
    }
});

module.exports = router;