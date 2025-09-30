const mongoose = require("mongoose");

const ExpenseItemSchema = new mongoose.Schema({
    description: {
        type: String,
        required: true,
        trim: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    }
});

const ExpenseSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    date: {
        type: Date,
        required: true,
        default: Date.now
    },
    items: [ExpenseItemSchema],
    totalAmount: {
        type: Number,
        required: true,
        default: 0
    },
    liquidatedDay: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

// Calcular total automáticamente antes de guardar
ExpenseSchema.pre('save', function(next) {
    this.totalAmount = this.items.reduce((sum, item) => sum + item.amount, 0);
    next();
});

module.exports = mongoose.model("Expense", ExpenseSchema);