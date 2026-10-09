const mongoose = require('mongoose');

const CashMovementSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['INGRESO', 'RETIRO'], required: true },
  amount: { type: Number, required: true },
  cashBefore: Number,
  cashAfter: Number,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('CashMovement', CashMovementSchema);