const express = require("express");
const auth = require("../middleware/auth");
const AcueductoClient = require("../models/AcueductoClient");
const AcueductoAbono = require("../models/AcueductoAbono");

const router = express.Router();

function calcularProximoPago(modoPago, desde = new Date()) {
    const fecha = new Date(desde);
    switch (modoPago) {
        case "quincenal": fecha.setDate(fecha.getDate() + 15); break;
        case "mensual": fecha.setMonth(fecha.getMonth() + 1); break;
        case "bimensual": fecha.setMonth(fecha.getMonth() + 2); break;
        case "trimensual": fecha.setMonth(fecha.getMonth() + 3); break;
        case "cuatrimestral": fecha.setMonth(fecha.getMonth() + 4); break;
        case "quintrimestral": fecha.setMonth(fecha.getMonth() + 5); break;
        case "semestral": fecha.setMonth(fecha.getMonth() + 6); break;
    }
    return fecha;
}

/* ----------  CREAR CLIENTE  ---------- */
router.post("/clientes", auth, async (req, res) => {
    try {
        if (req.user.tipo !== 4) return res.status(403).json({ error: "No autorizado" });

        const { nombre, telefono, cedula, valorServicio, modoPago } = req.body;

        if (!nombre?.trim()) return res.status(400).json({ error: "El nombre es obligatorio" });
        if (!valorServicio || valorServicio <= 0) return res.status(400).json({ error: "El valor del servicio debe ser mayor a 0" });
        if (!modoPago) return res.status(400).json({ error: "El modo de pago es obligatorio" });

        const cliente = new AcueductoClient({
            nombre: nombre.trim(),
            telefono: telefono?.trim() || "",
            cedula: cedula?.trim() || "",
            valorServicio,
            modoPago,
            deudaPendiente: valorServicio,
            proximoPago: calcularProximoPago(modoPago),
            user: req.user.id
        });

        await cliente.save();
        res.status(201).json(cliente);
    } catch (e) {
        console.error("Error creando cliente:", e);
        res.status(500).json({ error: "Error al crear cliente" });
    }
});

/* ----------  OBTENER TODOS LOS CLIENTES DEL USUARIO  ---------- */
router.get("/clientes", auth, async (req, res) => {
    try {
        if (req.user.tipo !== 4) return res.status(403).json({ error: "No autorizado" });

        const clientes = await AcueductoClient.find({ user: req.user.id, activo: true }).sort({ createdAt: -1 });
        res.json(clientes);
    } catch (e) {
        res.status(500).json({ error: "Error al obtener clientes" });
    }
});

/* ----------  OBTENER UN CLIENTE POR ID  ---------- */
router.get("/clientes/:id", auth, async (req, res) => {
    try {
        if (req.user.tipo !== 4) return res.status(403).json({ error: "No autorizado" });

        const cliente = await AcueductoClient.findOne({ _id: req.params.id, user: req.user.id });
        if (!cliente) return res.status(404).json({ error: "Cliente no encontrado" });

        res.json(cliente);
    } catch (e) {
        res.status(500).json({ error: "Error al obtener cliente" });
    }
});

/* ----------  ACTUALIZAR CLIENTE  ---------- */
router.put("/clientes/:id", auth, async (req, res) => {
    try {
        if (req.user.tipo !== 4) return res.status(403).json({ error: "No autorizado" });

        const { nombre, telefono, cedula, valorServicio, modoPago } = req.body;

        const cliente = await AcueductoClient.findOne({ _id: req.params.id, user: req.user.id });
        if (!cliente) return res.status(404).json({ error: "Cliente no encontrado" });

        if (nombre?.trim()) cliente.nombre = nombre.trim();
        if (telefono !== undefined) cliente.telefono = telefono.trim();
        if (cedula !== undefined) cliente.cedula = cedula.trim();
        if (valorServicio !== undefined && valorServicio > 0) cliente.valorServicio = valorServicio;
        if (modoPago) {
            cliente.modoPago = modoPago;
            cliente.proximoPago = calcularProximoPago(modoPago);
        }

        await cliente.save();
        res.json(cliente);
    } catch (e) {
        console.error("Error actualizando cliente:", e);
        res.status(500).json({ error: "Error al actualizar cliente" });
    }
});

/* ----------  ELIMINAR CLIENTE (SOFT DELETE)  ---------- */
router.delete("/clientes/:id", auth, async (req, res) => {
    try {
        if (req.user.tipo !== 4) return res.status(403).json({ error: "No autorizado" });

        const cliente = await AcueductoClient.findOne({ _id: req.params.id, user: req.user.id });
        if (!cliente) return res.status(404).json({ error: "Cliente no encontrado" });

        cliente.activo = false;
        await cliente.save();

        res.json({ message: "Cliente eliminado exitosamente" });
    } catch (e) {
        res.status(500).json({ error: "Error al eliminar cliente" });
    }
});

/* ----------  REGISTRAR ABONO  ---------- */
router.post("/abonos", auth, async (req, res) => {
    try {
        if (req.user.tipo !== 4) return res.status(403).json({ error: "No autorizado" });

        const { clienteId, monto, nota, metodoPago } = req.body;

        if (!clienteId) return res.status(400).json({ error: "El ID del cliente es obligatorio" });
        if (!monto || monto <= 0) return res.status(400).json({ error: "El monto debe ser mayor a 0" });
        if (!metodoPago || !["efectivo", "transferencia"].includes(metodoPago)) {
            return res.status(400).json({ error: "El metodo de pago es obligatorio (efectivo o transferencia)" });
        }

        const cliente = await AcueductoClient.findOne({ _id: clienteId, user: req.user.id });
        if (!cliente) return res.status(404).json({ error: "Cliente no encontrado" });

        if (monto > cliente.deudaPendiente) {
            return res.status(400).json({ error: "El monto excede la deuda pendiente" });
        }

        const abono = new AcueductoAbono({
            cliente: clienteId,
            monto,
            user: req.user.id,
            metodoPago,
            nota: nota?.trim() || ""
        });
        await abono.save();

        cliente.deudaPendiente = Math.max(0, cliente.deudaPendiente - monto);
        if (cliente.deudaPendiente === 0) {
            cliente.proximoPago = calcularProximoPago(cliente.modoPago);
            cliente.deudaPendiente = cliente.valorServicio;
        }
        await cliente.save();

        res.status(201).json({ abono, cliente });
    } catch (e) {
        console.error("Error registrando abono:", e);
        res.status(500).json({ error: "Error al registrar abono" });
    }
});

/* ----------  HISTORIAL DE ABONOS DE UN CLIENTE  ---------- */
router.get("/abonos/cliente/:clienteId", auth, async (req, res) => {
    try {
        if (req.user.tipo !== 4) return res.status(403).json({ error: "No autorizado" });

        const abonos = await AcueductoAbono.find({
            cliente: req.params.clienteId,
            user: req.user.id
        }).sort({ fecha: -1 });

        res.json(abonos);
    } catch (e) {
        res.status(500).json({ error: "Error al obtener historial" });
    }
});

/* ----------  ELIMINAR ABONO  ---------- */
router.delete("/abonos/:id", auth, async (req, res) => {
    try {
        if (req.user.tipo !== 4) return res.status(403).json({ error: "No autorizado" });

        const abono = await AcueductoAbono.findOne({ _id: req.params.id, user: req.user.id });
        if (!abono) return res.status(404).json({ error: "Abono no encontrado" });

        const cliente = await AcueductoClient.findOne({ _id: abono.cliente, user: req.user.id });
        if (cliente) {
            cliente.deudaPendiente += abono.monto;
            await cliente.save();
        }

        await AcueductoAbono.findByIdAndDelete(req.params.id);
        res.json({ message: "Abono eliminado exitosamente", cliente });
    } catch (e) {
        console.error("Error eliminando abono:", e);
        res.status(500).json({ error: "Error al eliminar abono" });
    }
});

/* ----------  TODOS LOS ABONOS DEL USUARIO (PARA SIDEBAR)  ---------- */
router.get("/abonos", auth, async (req, res) => {
    try {
        if (req.user.tipo !== 4) return res.status(403).json({ error: "No autorizado" });

        const { nombre, desde, hasta } = req.query;
        const filtro = { user: req.user.id };

        if (nombre) {
            const clientes = await AcueductoClient.find({
                user: req.user.id,
                nombre: { $regex: nombre, $options: "i" }
            }).select("_id");
            filtro.cliente = { $in: clientes.map(c => c._id) };
        }

        if (desde || hasta) {
            filtro.fecha = {};
            if (desde) filtro.fecha.$gte = new Date(desde);
            if (hasta) {
                const hastaDate = new Date(hasta);
                hastaDate.setHours(23, 59, 59, 999);
                filtro.fecha.$lte = hastaDate;
            }
        }

        const abonos = await AcueductoAbono.find(filtro)
            .populate("cliente", "nombre cedula telefono")
            .sort({ fecha: -1 });

        res.json(abonos);
    } catch (e) {
        console.error("Error obteniendo abonos:", e);
        res.status(500).json({ error: "Error al obtener abonos" });
    }
});

/* ----------  RESUMEN DEL DASHBOARD  ---------- */
router.get("/dashboard", auth, async (req, res) => {
    try {
        if (req.user.tipo !== 4) return res.status(403).json({ error: "No autorizado" });

        const clientes = await AcueductoClient.find({ user: req.user.id, activo: true });
        const totalDeuda = clientes.reduce((sum, c) => sum + c.deudaPendiente, 0);
        const totalClientes = clientes.length;

        const hoy = new Date();
        const proximosAVencer = clientes.filter(c => {
            if (!c.proximoPago) return false;
            const diff = (new Date(c.proximoPago) - hoy) / (1000 * 60 * 60 * 24);
            return diff <= 7 && diff >= 0;
        }).length;

        res.json({
            totalClientes,
            totalDeuda,
            proximosAVencer
        });
    } catch (e) {
        res.status(500).json({ error: "Error al obtener dashboard" });
    }
});

module.exports = router;
