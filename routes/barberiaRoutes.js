const express = require("express");
const auth = require("../middleware/auth");
const Barbero = require("../models/Barbero");
const ServicioConfig = require("../models/ServicioConfig");
const VentaBarberia = require("../models/VentaBarberia");
const ProductoBarberia = require("../models/ProductoBarberia");

const router = express.Router();

// Middleware: solo tipo 5
function soloTipo5(req, res, next) {
    if (req.user.tipo !== 5) return res.status(403).json({ error: "No autorizado" });
    next();
}

// ─────────────────────────────────────────────────────────
// BARBEROS
// ─────────────────────────────────────────────────────────

// GET /api/barberia/barberos
router.get("/barberos", auth, soloTipo5, async (req, res) => {
    try {
        const barberos = await Barbero.find({ propietario: req.user.id }).sort({ nombre: 1 });
        res.json(barberos);
    } catch (e) {
        res.status(500).json({ error: "Error al obtener barberos" });
    }
});

// POST /api/barberia/barberos
router.post("/barberos", auth, soloTipo5, async (req, res) => {
    try {
        const { nombre } = req.body;
        if (!nombre?.trim()) return res.status(400).json({ error: "El nombre es obligatorio" });

        const existe = await Barbero.findOne({ nombre: nombre.trim(), propietario: req.user.id });
        if (existe) return res.status(400).json({ error: "Ya existe un barbero con ese nombre" });

        const barbero = new Barbero({ nombre: nombre.trim(), propietario: req.user.id });
        await barbero.save();
        res.status(201).json(barbero);
    } catch (e) {
        res.status(500).json({ error: "Error al crear barbero" });
    }
});

// PATCH /api/barberia/barberos/:id — activar/desactivar o renombrar
router.patch("/barberos/:id", auth, soloTipo5, async (req, res) => {
    try {
        const barbero = await Barbero.findOne({ _id: req.params.id, propietario: req.user.id });
        if (!barbero) return res.status(404).json({ error: "Barbero no encontrado" });

        if (req.body.nombre !== undefined) barbero.nombre = req.body.nombre.trim();
        if (req.body.activo !== undefined) barbero.activo = req.body.activo;
        await barbero.save();
        res.json(barbero);
    } catch (e) {
        res.status(500).json({ error: "Error al actualizar barbero" });
    }
});

// DELETE /api/barberia/barberos/:id
router.delete("/barberos/:id", auth, soloTipo5, async (req, res) => {
    try {
        const barbero = await Barbero.findOneAndDelete({ _id: req.params.id, propietario: req.user.id });
        if (!barbero) return res.status(404).json({ error: "Barbero no encontrado" });
        res.json({ message: "Barbero eliminado" });
    } catch (e) {
        res.status(500).json({ error: "Error al eliminar barbero" });
    }
});

// ─────────────────────────────────────────────────────────
// CATÁLOGO DE SERVICIOS
// ─────────────────────────────────────────────────────────

// GET /api/barberia/servicios
router.get("/servicios", auth, soloTipo5, async (req, res) => {
    try {
        const servicios = await ServicioConfig.find({ propietario: req.user.id }).sort({ nombre: 1 });
        res.json(servicios);
    } catch (e) {
        res.status(500).json({ error: "Error al obtener servicios" });
    }
});

// POST /api/barberia/servicios
router.post("/servicios", auth, soloTipo5, async (req, res) => {
    try {
        const { nombre, precio } = req.body;
        if (!nombre?.trim()) return res.status(400).json({ error: "El nombre es obligatorio" });
        if (precio === undefined || precio < 0) return res.status(400).json({ error: "Precio inválido" });

        const servicio = new ServicioConfig({ nombre: nombre.trim(), precio, propietario: req.user.id });
        await servicio.save();
        res.status(201).json(servicio);
    } catch (e) {
        res.status(500).json({ error: "Error al crear servicio" });
    }
});

// PATCH /api/barberia/servicios/:id
router.patch("/servicios/:id", auth, soloTipo5, async (req, res) => {
    try {
        const servicio = await ServicioConfig.findOne({ _id: req.params.id, propietario: req.user.id });
        if (!servicio) return res.status(404).json({ error: "Servicio no encontrado" });

        if (req.body.nombre !== undefined) servicio.nombre = req.body.nombre.trim();
        if (req.body.precio !== undefined) servicio.precio = req.body.precio;
        if (req.body.activo !== undefined) servicio.activo = req.body.activo;
        await servicio.save();
        res.json(servicio);
    } catch (e) {
        res.status(500).json({ error: "Error al actualizar servicio" });
    }
});

// DELETE /api/barberia/servicios/:id
router.delete("/servicios/:id", auth, soloTipo5, async (req, res) => {
    try {
        const s = await ServicioConfig.findOneAndDelete({ _id: req.params.id, propietario: req.user.id });
        if (!s) return res.status(404).json({ error: "Servicio no encontrado" });
        res.json({ message: "Servicio eliminado" });
    } catch (e) {
        res.status(500).json({ error: "Error al eliminar servicio" });
    }
});

// ─────────────────────────────────────────────────────────
// INVENTARIO
// ─────────────────────────────────────────────────────────

// GET /api/barberia/inventario
router.get("/inventario", auth, soloTipo5, async (req, res) => {
    try {
        const productos = await ProductoBarberia.find({ propietario: req.user.id, activo: true }).sort({ nombre: 1 });
        res.json(productos);
    } catch (e) {
        res.status(500).json({ error: "Error al obtener inventario" });
    }
});

// POST /api/barberia/inventario
router.post("/inventario", auth, soloTipo5, async (req, res) => {
    try {
        const { nombre, categoria, stock, precioVenta, stockMinimo } = req.body;
        if (!nombre?.trim()) return res.status(400).json({ error: "El nombre es obligatorio" });
        if (precioVenta === undefined || precioVenta < 0) return res.status(400).json({ error: "Precio inválido" });

        const producto = new ProductoBarberia({
            nombre: nombre.trim(),
            categoria: categoria?.trim() || "General",
            stock: stock || 0,
            precioVenta,
            stockMinimo: stockMinimo || 3,
            propietario: req.user.id
        });
        await producto.save();
        res.status(201).json(producto);
    } catch (e) {
        res.status(500).json({ error: "Error al crear producto" });
    }
});

// PATCH /api/barberia/inventario/:id
router.patch("/inventario/:id", auth, soloTipo5, async (req, res) => {
    try {
        const producto = await ProductoBarberia.findOne({ _id: req.params.id, propietario: req.user.id });
        if (!producto) return res.status(404).json({ error: "Producto no encontrado" });

        const campos = ["nombre", "categoria", "stock", "precioVenta", "stockMinimo", "activo"];
        campos.forEach(c => { if (req.body[c] !== undefined) producto[c] = req.body[c]; });
        await producto.save();
        res.json(producto);
    } catch (e) {
        res.status(500).json({ error: "Error al actualizar producto" });
    }
});

// DELETE /api/barberia/inventario/:id
router.delete("/inventario/:id", auth, soloTipo5, async (req, res) => {
    try {
        const p = await ProductoBarberia.findOneAndDelete({ _id: req.params.id, propietario: req.user.id });
        if (!p) return res.status(404).json({ error: "Producto no encontrado" });
        res.json({ message: "Producto eliminado" });
    } catch (e) {
        res.status(500).json({ error: "Error al eliminar producto" });
    }
});

// ─────────────────────────────────────────────────────────
// VENTAS / CAJA
// ─────────────────────────────────────────────────────────

// GET /api/barberia/ventas?fecha=YYYY-MM-DD&barberoId=xxx&desde=YYYY-MM-DD&hasta=YYYY-MM-DD
router.get("/ventas", auth, soloTipo5, async (req, res) => {
    try {
        const { fecha, barberoId, desde, hasta } = req.query;
        const filtro = { propietario: req.user.id };

        if (barberoId) filtro.barbero = barberoId;

        if (fecha) {
            const inicio = new Date(fecha);
            inicio.setHours(0, 0, 0, 0);
            const fin = new Date(fecha);
            fin.setHours(23, 59, 59, 999);
            filtro.fecha = { $gte: inicio, $lte: fin };
        } else if (desde || hasta) {
            filtro.fecha = {};
            if (desde) { const d = new Date(desde); d.setHours(0,0,0,0); filtro.fecha.$gte = d; }
            if (hasta) { const h = new Date(hasta); h.setHours(23,59,59,999); filtro.fecha.$lte = h; }
        }

        const ventas = await VentaBarberia.find(filtro)
            .populate("barbero", "nombre")
            .sort({ fecha: -1 });
        res.json(ventas);
    } catch (e) {
        res.status(500).json({ error: "Error al obtener ventas" });
    }
});

// POST /api/barberia/ventas — crear nueva venta y descontar stock
router.post("/ventas", auth, soloTipo5, async (req, res) => {
    try {
        const { barberoId, items, fecha } = req.body;

        if (!barberoId) return res.status(400).json({ error: "Barbero requerido" });
        if (!items || items.length === 0) return res.status(400).json({ error: "Debe agregar al menos un ítem" });

        // Verificar barbero
        const barbero = await Barbero.findOne({ _id: barberoId, propietario: req.user.id, activo: true });
        if (!barbero) return res.status(404).json({ error: "Barbero no encontrado" });

        // Descontar stock de productos
        for (const item of items) {
            if (item.tipo === "producto" && item.productoRef) {
                const prod = await ProductoBarberia.findOne({ _id: item.productoRef, propietario: req.user.id });
                if (!prod) return res.status(404).json({ error: `Producto no encontrado: ${item.nombre}` });
                if (prod.stock < (item.cantidad || 1)) {
                    return res.status(400).json({ error: `Stock insuficiente para: ${prod.nombre} (disponible: ${prod.stock})` });
                }
                prod.stock -= (item.cantidad || 1);
                await prod.save();
            }
        }

        // Número de recibo correlativo por propietario
        const ultimaVenta = await VentaBarberia.findOne({ propietario: req.user.id }).sort({ numeroRecibo: -1 });
        const numeroRecibo = ultimaVenta ? ultimaVenta.numeroRecibo + 1 : 1;

        const total = items.reduce((s, i) => s + (i.precio * (i.cantidad || 1)), 0);

        const venta = new VentaBarberia({
            barbero: barberoId,
            propietario: req.user.id,
            fecha: fecha ? new Date(fecha) : new Date(),
            items,
            total,
            numeroRecibo
        });

        await venta.save();
        await venta.populate("barbero", "nombre");
        res.status(201).json(venta);
    } catch (e) {
        console.error("Error creando venta:", e);
        res.status(500).json({ error: "Error al registrar venta" });
    }
});

// DELETE /api/barberia/ventas/:id — anular venta y reponer stock
router.delete("/ventas/:id", auth, soloTipo5, async (req, res) => {
    try {
        const venta = await VentaBarberia.findOne({ _id: req.params.id, propietario: req.user.id });
        if (!venta) return res.status(404).json({ error: "Venta no encontrada" });

        // Reponer stock
        for (const item of venta.items) {
            if (item.tipo === "producto" && item.productoRef) {
                await ProductoBarberia.findByIdAndUpdate(item.productoRef, {
                    $inc: { stock: item.cantidad || 1 }
                });
            }
        }

        await venta.deleteOne();
        res.json({ message: "Venta anulada" });
    } catch (e) {
        res.status(500).json({ error: "Error al anular venta" });
    }
});

// ─────────────────────────────────────────────────────────
// REPORTES
// ─────────────────────────────────────────────────────────

// GET /api/barberia/reporte?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
router.get("/reporte", auth, soloTipo5, async (req, res) => {
    try {
        const { desde, hasta } = req.query;
        const filtro = { propietario: req.user.id };

        if (desde || hasta) {
            filtro.fecha = {};
            if (desde) { const d = new Date(desde); d.setHours(0,0,0,0); filtro.fecha.$gte = d; }
            if (hasta) { const h = new Date(hasta); h.setHours(23,59,59,999); filtro.fecha.$lte = h; }
        } else {
            // Por defecto: hoy
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            const fin = new Date();
            fin.setHours(23, 59, 59, 999);
            filtro.fecha = { $gte: hoy, $lte: fin };
        }

        const ventas = await VentaBarberia.find(filtro).populate("barbero", "nombre");

        // Agrupar por barbero
        const resumenMap = {};
        let totalGlobal = 0;

        ventas.forEach(v => {
            const bid = v.barbero?._id?.toString() || "sin_barbero";
            const bNombre = v.barbero?.nombre || "Sin barbero";
            if (!resumenMap[bid]) {
                resumenMap[bid] = { barberoId: bid, nombre: bNombre, cortes: 0, total: 0, ventas: [] };
            }
            resumenMap[bid].cortes += 1;
            resumenMap[bid].total += v.total;
            resumenMap[bid].ventas.push({ numeroRecibo: v.numeroRecibo, fecha: v.fecha, items: v.items, total: v.total });
            totalGlobal += v.total;
        });

        res.json({
            totalGlobal,
            totalVentas: ventas.length,
            resumenBarberos: Object.values(resumenMap).sort((a, b) => b.total - a.total)
        });
    } catch (e) {
        res.status(500).json({ error: "Error al generar reporte" });
    }
});

module.exports = router;
