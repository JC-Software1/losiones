const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema({
    amount: {
        type: Number,
        required: true
    },
    date: {
        type: Date,
        required: true,
        default: Date.now
    }
});

const SaleSchema = new mongoose.Schema({
    clientName: { type: String, required: true, trim: true },
    productName: { type: String, required: true, trim: true }, // Mantenemos esto para compatibilidad
    products: [{ // Nuevo campo para múltiples productos
        name: String,
        brand: String,
        category: String,
        size: String,
        salePrice: Number
    }],
    saleDate: { type: Date, required: true },
    price: { type: Number, required: true },
    installments: { type: String, default: "1" },
    payments: [PaymentSchema],
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    settled: { type: Boolean, default: false },
    settledDate: { type: Date, default: null },
    clientAddress: { type: String, required: false, trim: true },
    paymentDays: { type: String, default: '' } // "5,10,15,20"
}, { timestamps: true });

// Método virtual para calcular el total abonado
SaleSchema.virtual('totalPaid').get(function() {
    return this.payments.reduce((sum, payment) => sum + payment.amount, 0);
});

// Asegurarse de que los virtuals se incluyan cuando el documento se convierte a JSON
SaleSchema.set('toJSON', { virtuals: true });
SaleSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model("Sale", SaleSchema);
