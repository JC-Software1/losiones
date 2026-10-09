const mongoose = require("mongoose");

const AcueductoClientSchema = new mongoose.Schema({
    nombre: { type: String, required: true, trim: true },
    telefono: { type: String, default: "", trim: true },
    cedula: { type: String, default: "", trim: true },
    valorServicio: { type: Number, required: true, min: 0 },
    modoPago: {
        type: String,
        required: true,
        enum: ["quincenal", "mensual", "bimensual", "trimensual", "cuatrimestral", "quintrimestral", "semestral"]
    },
    deudaPendiente: { type: Number, default: 0, min: 0 },
    proximoPago: { type: Date, default: null },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    activo: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model("AcueductoClient", AcueductoClientSchema);
