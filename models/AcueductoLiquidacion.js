const mongoose = require("mongoose");

const AcueductoLiquidacionSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    fecha: { type: Date, default: Date.now },
    cajaInicial: { type: Number, required: true, default: 0 },
    cajaFinal: { type: Number, required: true, default: 0 },
    totalIngresos: { type: Number, required: true, default: 0 },
    totalGastos: { type: Number, required: true, default: 0 },
    cantidadAbonos: { type: Number, default: 0 },
    cantidadGastos: { type: Number, default: 0 },
    abonos: [{ type: mongoose.Schema.Types.ObjectId, ref: "AcueductoAbono" }],
    gastos: [{ type: mongoose.Schema.Types.ObjectId, ref: "AcueductoGasto" }]
}, { timestamps: true });

module.exports = mongoose.model("AcueductoLiquidacion", AcueductoLiquidacionSchema);
