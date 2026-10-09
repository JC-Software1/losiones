const mongoose = require("mongoose");

const ProductoBarberiaSchema = new mongoose.Schema({
    nombre: { type: String, required: true, trim: true },
    categoria: { type: String, default: "General", trim: true },
    stock: { type: Number, required: true, min: 0, default: 0 },
    precioVenta: { type: Number, required: true, min: 0 },
    precioCosto: { type: Number, default: 0, min: 0 },
    stockMinimo: { type: Number, default: 3 },
    activo: { type: Boolean, default: true },
    propietario: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });

module.exports = mongoose.model("ProductoBarberia", ProductoBarberiaSchema);
