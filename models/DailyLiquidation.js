const mongoose = require("mongoose");

const DailyLiquidationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    liquidationDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    // Caja
    initialCash: {
        type: Number,
        required: true,
        default: 0
    },
    finalCash: {
        type: Number,
        required: true
    },
    // Ingresos
payments: {
    count: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    totalInitialPayments: { type: Number, default: 0 },  // ✅ NUEVO CAMPO
    afterCommission: { type: Number, default: 0 },
    commissionPercentage: { type: Number, default: 0 }
},
    sales: {
        count: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
        afterCommission: { type: Number, default: 0 },
        commissionPercentage: { type: Number, default: 0 }
    },
    totalIncome: {
        type: Number,
        default: 0
    },
    // Egresos
    inventory: {
        totalCost: { type: Number, default: 0 },
        productCount: { type: Number, default: 0 }
    },
    totalExpenses: {
        type: Number,
        default: 0
    },

    expenses: {
    totalAmount: { type: Number, default: 0 },
    count: { type: Number, default: 0 }
},

    // Detalles de las ventas y abonos liquidados
    liquidatedSales: [{
        saleId: mongoose.Schema.Types.ObjectId,
        clientName: String,
        amount: Number
    }],
    liquidatedPayments: [{
        saleId: mongoose.Schema.Types.ObjectId,
        clientName: String,
        amount: Number
    }],
    liquidatedProducts: [{
        productId: mongoose.Schema.Types.ObjectId,
        name: String,
        costPrice: Number
    }],

    liquidatedExpenses: [{
    expenseId: mongoose.Schema.Types.ObjectId,
    date: Date,
    totalAmount: Number,
    items: [{
        description: String,
        amount: Number
    }]
}],

    notes: {
        type: String,
        default: ""
    }
}, { timestamps: true });

module.exports = mongoose.model("DailyLiquidation", DailyLiquidationSchema);