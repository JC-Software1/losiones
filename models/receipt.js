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
  // Campo para asociar el recibo al usuario que lo creó
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true
  },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Índice compuesto para búsquedas eficientes por usuario
ReceiptSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Receipt', ReceiptSchema);