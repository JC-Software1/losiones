// routes/receiptRoutes.js
const express = require('express');
const router = express.Router();
const Receipt = require('../models/receipt');
const auth = require('../middleware/auth'); // Importar el middleware

// Aplicar middleware a todas las rutas
router.use(auth);

// Crear / sincronizar un recibo
router.post('/', async (req, res) => {
  try {
    const payload = req.body;
    const userId = req.user.id; // El middleware auth guarda req.user = { id, tipo, iat, exp }
    
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

// Obtener recibos del usuario autenticado
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id; // El middleware auth guarda req.user.id
    
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    
    const receipts = await Receipt.find({ userId: userId }).sort({ createdAt: -1 });
    res.json(receipts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Eliminar recibo por _id (solo si pertenece al usuario)
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const userId = req.user.id;
    
    const receipt = await Receipt.findOne({ _id: id, userId: userId });
    
    if (!receipt) {
      return res.status(404).json({ error: 'Recibo no encontrado o no autorizado' });
    }
    
    await Receipt.findByIdAndDelete(id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;