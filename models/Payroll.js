const mongoose = require("mongoose");

const PayrollSchema = new mongoose.Schema({
    employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    settlementStartDate: { type: Date, required: true },
    settlementEndDate: { type: Date, required: true },
    payDay: { type: Date, default: Date.now },
    workedDays: { type: Number, default: 30, min: 1, max: 31 },
    timeWorked: { type: Number, default: 30 }, // días trabajados totales acumulados
    salaryWorked: { type: Number, required: true },
    transportationAssistance: { type: Number, default: 0 },
    bonuses: { type: Number, default: 0 },
    commissions: { type: Number, default: 0 },
    overtime: { type: Number, default: 0 },
    totalEarned: { type: Number, required: true },
    healthDeduction: { type: Number, default: 0 },
    pensionDeduction: { type: Number, default: 0 },
    otherDeductions: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 },
    totalPayable: { type: Number, required: true },
    notes: { type: String, default: '' },
    // 🏛️ Datos DIAN / Matias API
    dianCune: { type: String, default: null },
    dianDocumentNumber: { type: String, default: null },
    dianStatus: { type: String, default: null },
    dianIsValid: { type: Boolean, default: false },
    dianSentAt: { type: Date, default: null },
    dianResponse: { type: mongoose.Schema.Types.Mixed, default: null }
}, {
    timestamps: true
});

PayrollSchema.index({ user: 1, settlementStartDate: -1 });
PayrollSchema.index({ employee: 1, settlementStartDate: -1 });

module.exports = mongoose.model("Payroll", PayrollSchema);
