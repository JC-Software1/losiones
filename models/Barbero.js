const mongoose = require("mongoose");

const BarberoSchema = new mongoose.Schema({
    nombre: { type: String, required: true, trim: true },
    activo: { type: Boolean, default: true },
    propietario: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });

module.exports = mongoose.model("Barbero", BarberoSchema);
