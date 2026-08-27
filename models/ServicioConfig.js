const mongoose = require("mongoose");

// Catálogo de servicios que el dueño configura (corte, barba, etc.)
const ServicioConfigSchema = new mongoose.Schema({
    nombre: { type: String, required: true, trim: true },
    precio: { type: Number, required: true, min: 0 },
    activo: { type: Boolean, default: true },
    propietario: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });

module.exports = mongoose.model("ServicioConfig", ServicioConfigSchema);
