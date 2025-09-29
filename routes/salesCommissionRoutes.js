// salesCommissionRoutes.js
const express = require("express");
const auth = require("../middleware/auth");
const router = express.Router();
const mongoose = require("mongoose");

const SalesCommissionSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    percentage: { type: Number, required: true, min: 0, max: 100 },
    updatedAt: { type: Date, default: Date.now }
});
const SalesCommission = mongoose.model("SalesCommission", SalesCommissionSchema);

// GET /api/sales-commission
router.get("/", auth, async (req, res) => {
    try {
        const sc = await SalesCommission.findOne({ user: req.user.id });
        if (!sc) return res.status(404).json({ error: "No hay porcentaje guardado" });
        res.json({ percentage: sc.percentage });
    } catch (e) { res.status(500).json({ error: "Error obteniendo comisión ventas" }); }
});

// POST /api/sales-commission
router.post("/", auth, async (req, res) => {
    try {
        const { percentage } = req.body;
        if (percentage == null || percentage < 0 || percentage > 100)
            return res.status(400).json({ error: "Porcentaje inválido" });

        let sc = await SalesCommission.findOne({ user: req.user.id });
        if (sc) {
            sc.percentage = percentage;
            sc.updatedAt = new Date();
            await sc.save();
        } else {
            sc = new SalesCommission({ user: req.user.id, percentage });
            await sc.save();
        }
        res.json({ message: "Comisión-ventas guardada", percentage: sc.percentage });
    } catch (e) { res.status(500).json({ error: "Error guardando comisión ventas" }); }
});

module.exports = router;