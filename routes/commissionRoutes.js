const express = require("express");
const auth = require("../middleware/auth");
const router = express.Router();

// Modelo simple para guardar configuración de comisión
const mongoose = require("mongoose");

const CommissionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true
    },
    percentage: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

const Commission = mongoose.model("Commission", CommissionSchema);

// Obtener porcentaje de comisión guardado
router.get("/", auth, async (req, res) => {
    try {
        const commission = await Commission.findOne({ user: req.user.id });
        
        if (!commission) {
            return res.status(404).json({ error: "No hay porcentaje guardado" });
        }
        
        res.json({ percentage: commission.percentage });
    } catch (error) {
        console.error("Error al obtener comisión:", error);
        res.status(500).json({ error: "Error al obtener comisión" });
    }
});

// GET /api/commission/vendedor/:vendedorId  (para admins)
router.get("/vendedor/:vendedorId", auth, async (req, res) => {
    try {
        if (req.user.tipo !== 2 && req.user.tipo !== 3) {
            return res.status(403).json({ error: "Sin permisos" });
        }
        const commission = await Commission.findOne({ user: req.params.vendedorId });
        if (!commission) return res.status(404).json({ error: "No hay porcentaje guardado" });
        res.json({ percentage: commission.percentage });
    } catch (error) {
        console.error("Error al obtener comisión del vendedor:", error);
        res.status(500).json({ error: "Error al obtener comisión" });
    }
});

// Guardar o actualizar porcentaje de comisión
router.post("/", auth, async (req, res) => {
    try {
        const { percentage } = req.body;
        
        if (percentage === undefined || percentage < 0 || percentage > 100) {
            return res.status(400).json({ error: "Porcentaje inválido" });
        }
        
        // Buscar si ya existe una configuración
        let commission = await Commission.findOne({ user: req.user.id });
        
        if (commission) {
            // Actualizar existente
            commission.percentage = percentage;
            commission.updatedAt = new Date();
            await commission.save();
        } else {
            // Crear nuevo
            commission = new Commission({
                user: req.user.id,
                percentage
            });
            await commission.save();
        }
        
        res.json({ 
            message: "Porcentaje guardado correctamente",
            percentage: commission.percentage
        });
    } catch (error) {
        console.error("Error al guardar comisión:", error);
        res.status(500).json({ error: "Error al guardar comisión" });
    }
});

module.exports = router;