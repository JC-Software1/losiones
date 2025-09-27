// models/Receipt.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const SaleDataSchema = new Schema({
  clientName: String,
  productName: String,
  clientAddress: String,
  price: Number,
  advancePayment: Number,
  saleDate: Date,
  installments: Number,
  paymentDays: String
}, { _id: false });

const ReceiptSchema = new Schema({
  receiptNumber: { type: Number, required: true },
  saleData: { type: SaleDataSchema, required: true },
  // Guarda el id local (si viene del frontend) para evitar duplicados
  localId: { type: String, index: true, sparse: true },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Receipt', ReceiptSchema);
