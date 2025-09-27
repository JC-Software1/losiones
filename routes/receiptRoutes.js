// routes/receiptRoutes.js
const express = require('express');
const router = express.Router();
const Receipt = require('../models/receipt');

// Crear / sincronizar un recibo
router.post('/', async (req, res) => {
  try {
    const payload = req.body;

    // Si el cliente mandó localId, busca para evitar duplicados
    if (payload.localId) {
      const existing = await Receipt.findOne({ localId: payload.localId });
      if (existing) return res.status(200).json(existing); // ya existe
    }

    const r = new Receipt({
      receiptNumber: payload.receiptNumber,
      saleData: payload.saleData,
      localId: payload.localId
    });

    await r.save();
    res.status(201).json(r);
  } catch (err) {
    console.error('Error guardando recibo:', err);
    res.status(500).json({ error: err.message });
  }
});

// Obtener recibos (puedes filtrar por usuario si implementas auth)
router.get('/', async (req, res) => {
  try {
    const receipts = await Receipt.find({}).sort({ createdAt: -1 });
    res.json(receipts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Eliminar recibo por _id (opcional)
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await Receipt.findByIdAndDelete(id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
