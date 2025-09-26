const mongoose = require("mongoose");

const ReceiptSchema = new mongoose.Schema({
    receiptNumber: {
        type: String,
        required: true,
        unique: true
    },
    saleData: {
        clientName: { type: String, required: true, trim: true },
        clientAddress: { type: String, trim: true },
        productName: { type: String, required: true, trim: true },
        saleDate: { type: Date, required: true },
        price: { type: Number, required: true },
        installments: { type: String, default: "1" },
        advancePayment: { type: Number, default: 0 },
        paymentDays: { type: String, default: '' }
    },
    saleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Sale",
        required: false // Por si quieres asociar el recibo con una venta específica
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Índice para asegurar que los números de recibo sean únicos por usuario
ReceiptSchema.index({ receiptNumber: 1, user: 1 }, { unique: true });

module.exports = mongoose.model("Receipt", ReceiptSchema);