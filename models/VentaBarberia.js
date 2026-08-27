const mongoose = require("mongoose");

const ItemVentaSchema = new mongoose.Schema({
    tipo: { type: String, enum: ["servicio", "producto"], required: true },
    nombre: { type: String, required: true },
    precio: { type: Number, required: true },
    cantidad: { type: Number, default: 1 },
    // Referencia al producto de inventario (solo si tipo === 'producto')
    productoRef: { type: mongoose.Schema.Types.ObjectId, ref: "ProductoBarberia", default: null }
}, { _id: false });

const VentaBarberiaSchema = new mongoose.Schema({
    barbero: { type: mongoose.Schema.Types.ObjectId, ref: "Barbero", required: true },
    propietario: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    fecha: { type: Date, default: Date.now },
    items: [ItemVentaSchema],
    total: { type: Number, required: true },
    numeroRecibo: { type: Number, required: true }
}, { timestamps: true });

module.exports = mongoose.model("VentaBarberia", VentaBarberiaSchema);
