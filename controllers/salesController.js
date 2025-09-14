const Sale = require('../models/Sale');

async function addPayment(req, res) {
    const { id } = req.params; // ID de la venta
    const { amount, date } = req.body; // Monto y fecha del pago

    try {
        const sale = await Sale.findById(id);

        if (!sale) {
            return res.status(404).json({ message: "Venta no encontrada" });
        }

        // Agregar el pago a la venta
        sale.payments.push({ amount, date });

        // Verificar si el total pagado es suficiente para liquidar la venta
        if (sale.totalPaid >= sale.price) {
            sale.settled = true;
            sale.settledDate = new Date(); // Fecha de liquidación
        }

        await sale.save();

        res.status(200).json({
            settled: sale.settled,
            message: sale.settled ? "Venta liquidada" : "Pago registrado",
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al procesar el pago" });
    }
}

module.exports = {
    addPayment,
};
