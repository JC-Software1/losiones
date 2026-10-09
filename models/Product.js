const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    costPrice: { type: Number, required: true },
    salePrice: { type: Number, required: true },
    sold: { type: Boolean, default: false },
    soldDate: { type: Date, default: null },
    soldTo: { type: String, default: null },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    category: { type: String, required: true, trim: true },
    brand: { type: String, required: true, trim: true },
    size: { type: String, default: null, trim: true },
    barcode: { type: String, default: null, trim: true }, // Nuevo campo para código de fábrica
    liquidatedDay: { type: Boolean, default: false },
    stock: { type: Number, default: 1, min: 0 } // Nuevo campo
}, { timestamps: true });

module.exports = mongoose.model("Product", ProductSchema);
