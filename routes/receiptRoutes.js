// routes/receiptRoutes.js
const express = require('express');
const auth = require('../middleware/auth');
const Receipt = require('../models/receipt');
const router = express.Router();

// Crear recibo
router.post('/', auth, async (req, res) => {
  try {
    const {
      receiptNumber,
      saleData,
      saleId // puede ser null si no se desea enlazar a una venta
    } = req.body;

    // Evitar duplicados por usuario
    const exists = await Receipt.findOne({ receiptNumber, user: req.user.id });
    if (exists) {
      return res.status(409).json({ error: 'Número de recibo ya existe' });
    }

    const newReceipt = new Receipt({
      receiptNumber,
      saleData,
      saleId: saleId || undefined,
      user: req.user.id
    });

    await newReceipt.save();
    res.status(201).json(newReceipt);
  } catch (err) {
    console.error('Error guardando recibo:', err);
    res.status(500).json({ error: 'Error al guardar recibo' });
  }
});

// Obtener todos los recibos del usuario
router.get('/', auth, async (req, res) => {
  try {
    const receipts = await Receipt.find({ user: req.user.id })
      .sort({ createdAt: -1 });
    res.json(receipts);
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo recibos' });
  }
});

module.exports = router;