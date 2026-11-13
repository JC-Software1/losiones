const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    costPrice: { type: Number, required: true },
    salePrice: { type: Number, required: true },
    sold: { type: Boolean, default: false },
    soldDate: { type: Date, default: null },
    soldTo: { type: String, default: null },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    category: { type: String, required: false, default: '', trim: true },
    brand: { type: String, required: false, default: '', trim: true },
    size: { type: String, default: null, trim: true },
    barcode: { type: String, default: null, trim: true }, // Nuevo campo para código de fábrica
    liquidatedDay: { type: Boolean, default: false },
    stock: { type: Number, default: 1, min: 0 } // Nuevo campo
}, { timestamps: true });

// Índices para optimizar listados, paginación alfabética y filtros
ProductSchema.index({ user: 1, name: 1 });
ProductSchema.index({ name: 1 });
ProductSchema.index({ sold: 1, stock: 1 });

module.exports = mongoose.model("Product", ProductSchema);
