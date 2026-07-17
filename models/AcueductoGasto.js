const mongoose = require("mongoose");

const AcueductoGastoSchema = new mongoose.Schema({
    descripcion: { type: String, required: true, trim: true },
    monto: { type: Number, required: true, min: 0 },
    metodoPago: { type: String, enum: ["efectivo", "transferencia"], default: "efectivo" },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    fecha: { type: Date, default: Date.now },
    reciboDia: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model("AcueductoGasto", AcueductoGastoSchema);
