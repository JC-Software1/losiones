// routes/receiptRoutes.js
const express = require('express');
const router = express.Router();
const Receipt = require('../models/receipt');
const auth = require('../middleware/auth');

// Aplicar middleware a todas las rutas
router.use(auth);

// Crear / sincronizar un recibo
router.post('/', async (req, res) => {
  try {
    const payload = req.body;
    const userId = req.user.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

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

// Obtener recibos (con soporte para admin)
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const userTipo = req.user.tipo; // 1 = jefe, 2 = vendedor
    
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    
    // Permitir query param ?userId=xxx para que admin vea recibos de otros
    const targetUserId = req.query.userId;
    
    let query = {};
    
    // Si es admin (tipo 1) y se envió userId, buscar por ese usuario
    if (userTipo === 1 && targetUserId) {
      query.userId = targetUserId;
    } else {
      // Usuario normal: solo sus propios recibos
      query.userId = userId;
    }
    
    const receipts = await Receipt.find(query).sort({ createdAt: -1 });
    res.json(receipts);
  } catch (err) {
    console.error('Error obteniendo recibos:', err);
    res.status(500).json({ error: err.message });
  }
});

// Eliminar recibo por _id
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const userId = req.user.id;
    const userTipo = req.user.tipo;
    
    const receipt = await Receipt.findById(id);
    
    if (!receipt) {
      return res.status(404).json({ error: 'Recibo no encontrado' });
    }
    
    // Admin puede eliminar cualquier recibo, vendedor solo los suyos
    if (userTipo !== 1 && receipt.userId.toString() !== userId) {
      return res.status(403).json({ error: 'No autorizado' });
    }
    
    await Receipt.findByIdAndDelete(id);
    res.json({ ok: true });
  } catch (err) {
    console.error('Error eliminando recibo:', err);
    res.status(500).json({ error: err.message });
  }
});

// RUTA DE MIGRACIÓN - Agregar userId a recibos antiguos
router.post('/migrate-userid', async (req, res) => {
  try {
    const userId = req.user.id; // El usuario que hace la petición
    
    // Actualizar todos los recibos sin userId
    const result = await Receipt.updateMany(
      { userId: { $exists: false } },
      { $set: { userId: userId } }
    );
    
    res.json({
      success: true,
      message: `${result.modifiedCount} recibos actualizados`,
      modifiedCount: result.modifiedCount
    });
    
  } catch (err) {
    console.error('Error en migración:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;