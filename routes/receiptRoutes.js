// routes/receiptRoutes.js
const express = require('express');
const router = express.Router();
const Receipt = require('../models/receipt');

router.use(authMiddleware);

// Crear / sincronizar un recibo
// Crear / sincronizar un recibo
router.post('/', async (req, res) => {
  try {
    const payload = req.body;
    const userId = req.userId; // Del middleware de autenticación
    
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    // Si el cliente mandó localId, busca para evitar duplicados
    if (payload.localId) {
      const existing = await Receipt.findOne({ 
        localId: payload.localId,
        userId: userId 
      });
      if (existing) return res.status(200).json(existing);
    }

    const r = new Receipt({
      receiptNumber: payload.receiptNumber,
      saleData: payload.saleData,
      localId: payload.localId,
      userId: userId
    });

    await r.save();
    res.status(201).json(r);
  } catch (err) {
    console.error('Error guardando recibo:', err);
    res.status(500).json({ error: err.message });
  }
});
// Obtener recibos (puedes filtrar por usuario si implementas auth)
// Obtener recibos del usuario autenticado
router.get('/', async (req, res) => {
  try {
    // Obtener userId del token decodificado (req.userId lo setea el middleware de auth)
    const userId = req.userId; // Asegúrate de tener un middleware que extraiga esto del token
    
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    
    const receipts = await Receipt.find({ userId: userId }).sort({ createdAt: -1 });
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
