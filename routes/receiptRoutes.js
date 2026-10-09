// routes/receiptRoutes.js
const express = require('express');
const router = express.Router();
const Receipt = require('../models/receipt');
const auth = require('../middleware/auth');
const mongoose = require('mongoose');

// Aplicar middleware a todas las rutas
router.use(auth);

// Crear / sincronizar un recibo
router.post('/', async (req, res) => {
  try {
    const payload = req.body;
    const authenticatedUserId = req.user.id;
    const userTipo = req.user.tipo;
    
    if (!authenticatedUserId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    let targetUserId = authenticatedUserId;
    
    if (userTipo === 2 || userTipo === 3) {
      if (payload.userId) {
        targetUserId = payload.userId;
        console.log('📝 Admin creando recibo para vendedor:', targetUserId);
      }
    }

    if (payload.localId) {
      const existing = await Receipt.findOne({ 
        localId: payload.localId,
        userId: targetUserId 
      });
      if (existing) return res.status(200).json(existing);
    }

    const r = new Receipt({
      receiptNumber: payload.receiptNumber,
      saleData: payload.saleData,
      localId: payload.localId,
      userId: targetUserId
    });

    await r.save();
    console.log('✅ Recibo guardado con userId:', targetUserId);
    res.status(201).json(r);
  } catch (err) {
    console.error('Error guardando recibo:', err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ OBTENER RECIBOS - CORREGIDO
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const userTipo = req.user.tipo;
    
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    
    const targetUserId = req.query.userId;
    let query = {};
    
    // ✅ CORRECCIÓN: tipo 2 y 3 son admins, NO tipo 1
    if ((userTipo === 2 || userTipo === 3) && targetUserId) {
      // Intentar como ObjectId primero
      try {
        if (mongoose.Types.ObjectId.isValid(targetUserId)) {
          query.userId = new mongoose.Types.ObjectId(targetUserId);
        } else {
          query.userId = targetUserId;
        }
      } catch (e) {
        query.userId = targetUserId;
      }
      console.log('🔍 Admin buscando recibos de:', targetUserId);
    } else {
      // Usuario normal: solo sus propios recibos
      query.userId = userId;
      console.log('🔍 Vendedor buscando sus propios recibos');
    }
    
    console.log('🔍 Query final:', JSON.stringify(query));
    
    const receipts = await Receipt.find(query).sort({ createdAt: -1 });
    console.log('📊 Recibos encontrados:', receipts.length);
    
    // Debug si no encuentra nada
    if (receipts.length === 0 && targetUserId) {
      console.log('⚠️ No se encontraron recibos. Muestreando BD...');
      const sample = await Receipt.find({}).limit(3);
      console.log('📋 Muestra de recibos en BD:', sample.map(r => ({
        receiptNum: r.receiptNumber,
        userId: r.userId?.toString(),
        userIdType: typeof r.userId
      })));
    }
    
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
    
    // ✅ Admins (tipo 2 y 3) pueden eliminar cualquier recibo
    if (userTipo !== 2 && userTipo !== 3 && receipt.userId.toString() !== userId) {
      return res.status(403).json({ error: 'No autorizado' });
    }
    
    await Receipt.findByIdAndDelete(id);
    res.json({ ok: true });
  } catch (err) {
    console.error('Error eliminando recibo:', err);
    res.status(500).json({ error: err.message });
  }
});

// RUTA DE MIGRACIÓN
router.post('/migrate-userid', async (req, res) => {
  try {
    const userId = req.user.id;
    
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