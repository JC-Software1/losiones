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
    },
    liquidatedDay: {
        type: Boolean,
        default: false
    }
});

const SaleSchema = new mongoose.Schema({
    clientName: { type: String, required: true, trim: true },
    productName: { type: String, required: true, trim: true },
    products: [{
        name: String,
        brand: String,
        category: String,
        size: String,
        salePrice: Number
    }],

     advancePayment: { type: Number, default: 0 }, // <-- NUEVO
  payments: [PaymentSchema],
    saleDate: { type: Date, required: true },
    price: { type: Number, required: true },
    installments: { type: String, default: "1" },
    payments: [PaymentSchema],
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    settled: { type: Boolean, default: false },
    settledDate: { type: Date, default: null },
    clientAddress: { type: String, required: false, trim: true },
    paymentFrequency: { 
    type: String, 
    enum: ['diario','semanal','quincenal','mensual'], 
    default: 'mensual' 
},
paymentDays: [{ type: mongoose.Schema.Types.Mixed }],
paymentDaysText: { type: String, default: '' },
    liquidatedDay: { type: Boolean, default: false },
     // Nuevo campo
}, { timestamps: true });

SaleSchema.virtual('totalPaid').get(function() {
    return this.payments.reduce((sum, payment) => sum + payment.amount, 0);
});

SaleSchema.set('toJSON', { virtuals: true });
SaleSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model("Sale", SaleSchema);