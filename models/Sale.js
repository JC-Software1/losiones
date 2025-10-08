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
    advancePayment: { type: Number, default: 0 },
    payments: [PaymentSchema],
    saleDate: { type: Date, required: true },
    price: { type: Number, required: true },
    installments: { type: String, default: "1" },
    // ⭐ NUEVO: Número de cuotas como número
    numberOfInstallments: { type: Number, default: 1 },
    // ⭐ NUEVO: Valor de cada cuota
    installmentAmount: { type: Number, default: 0 },
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
}, { timestamps: true });

// Virtual para calcular el total pagado
SaleSchema.virtual('totalPaid').get(function() {
    return this.payments.reduce((sum, payment) => sum + payment.amount, 0);
});

// Método para calcular el valor de cada cuota
SaleSchema.methods.calculateInstallmentAmount = function() {
    if (this.numberOfInstallments <= 0) return 0;
    
    // Restar el abono inicial del precio total
    const remainingAmount = this.price - (this.advancePayment || 0);
    
    // Dividir el monto restante entre el número de cuotas
    return Math.ceil(remainingAmount / this.numberOfInstallments);
};

// Middleware para calcular automáticamente antes de guardar
SaleSchema.pre('save', function(next) {
    // Calcular el monto de cada cuota si hay cuotas definidas
    if (this.numberOfInstallments > 0) {
        this.installmentAmount = this.calculateInstallmentAmount();
    }
    next();
});

SaleSchema.set('toJSON', { virtuals: true });
SaleSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model("Sale", SaleSchema);