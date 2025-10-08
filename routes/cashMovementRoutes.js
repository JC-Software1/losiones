const express = require('express');
const auth = require('../middleware/auth');
const CashMovement = require('../models/CashMovement');
const DailyLiquidation = require('../models/DailyLiquidation');
const router = express.Router();

/* POST /cash-movement  – body { tipo, valor, vendedorId? } */
router.post('/', auth, async (req, res) => {
  try {
    const { tipo, valor, vendedorId } = req.body;
    if (!['INGRESO','RETIRO'].includes(tipo))
      return res.status(400).json({error:'Tipo debe ser INGRESO o RETIRO'});
    
    const userId = req.user.tipo === 1 ? req.user.id : vendedorId;
    if (!userId) return res.status(400).json({error:'Falta vendedorId'});

    // Última liquidación para tomar su caja final como “caja actual”
    const last = await DailyLiquidation.findOne({ user: userId })
                                      .sort({ liquidationDate: -1 });
    const cashBefore = last ? last.finalCash : 0;
    const delta = tipo === 'INGRESO' ? valor : -valor;
    const newCash = cashBefore + delta;

    // Guardar movimiento
    await CashMovement.create({
      user: userId,
      type: tipo,
      amount: valor,
      cashBefore,
      cashAfter: newCash
    });

    // Opcional: si queremos que el cambio ya se refleje como “caja inicial”
    // simplemente devolvemos el nuevo valor y el front lo pone en #initialCash
    res.json({ newCash, message: 'Movimiento guardado' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;