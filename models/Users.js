const mongoose = require("mongoose");



const PermisosSchema = new mongoose.Schema({
    // Permisos de Productos
    verProductos: { type: Boolean, default: true },
    crearProductos: { type: Boolean, default: true },
    editarProductos: { type: Boolean, default: true },
    eliminarProductos: { type: Boolean, default: false },
    marcarVendido: { type: Boolean, default: true },
    
    // Permisos de Ventas
    verVentas: { type: Boolean, default: true },
    crearVentas: { type: Boolean, default: true },
    editarVentas: { type: Boolean, default: true },
    eliminarVentas: { type: Boolean, default: false },
    agregarAbonos: { type: Boolean, default: true },
    eliminarAbonos: { type: Boolean, default: false },
    verVentasLiquidadas: { type: Boolean, default: true },
    
    // Permisos de Gastos
    verGastos: { type: Boolean, default: true },
    crearGastos: { type: Boolean, default: true },
    editarGastos: { type: Boolean, default: true },
    eliminarGastos: { type: Boolean, default: false },
    
    // Permisos de Liquidación
    realizarLiquidacion: { type: Boolean, default: false },
    verHistorialLiquidaciones: { type: Boolean, default: true },
    
    // Permisos de Reportes
    verReportes: { type: Boolean, default: true },
    exportarReportes: { type: Boolean, default: false }
}, { _id: false });

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    tipo: { type: Number, default: 1 }, // 1: vendedor, 2: admin, 3: jefe
    bloqueado: { type: Boolean, default: false },
    permisos: { type: Boolean, default: false }, // Mantener para compatibilidad
    permisosDetallados: { type: PermisosSchema, default: () => ({}) },
    jefe: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
}, { timestamps: true });

module.exports = mongoose.model("User", UserSchema);
