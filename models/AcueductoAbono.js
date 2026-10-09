const mongoose = require("mongoose");

const AcueductoAbonoSchema = new mongoose.Schema({
    cliente: { type: mongoose.Schema.Types.ObjectId, ref: "AcueductoClient", required: true },
    monto: { type: Number, required: true, min: 0 },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    metodoPago: { type: String, enum: ["efectivo", "transferencia"], default: "efectivo" },
    fecha: { type: Date, default: Date.now },
    nota: { type: String, default: "", trim: true },
    reciboDia: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model("AcueductoAbono", AcueductoAbonoSchema);
