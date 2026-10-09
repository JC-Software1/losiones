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
    exportarReportes: { type: Boolean, default: false },
    verCostosYGanancias: { type: Boolean, default: true }
}, { _id: false });

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    tipo: { type: Number, default: 1 },
    bloqueado: { type: Boolean, default: false },
    permisos: { type: Boolean, default: false },
    permisosDetallados: { type: PermisosSchema, default: () => ({}) },
    jefe: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    // NUEVOS CAMPOS
    fechaPago: { type: Date, default: null },
    fechaVencimiento: { type: Date, default: null },
    diasAvisoVencimiento: { type: Number, default: 5 },
    motivoBloqueo: { type: String, default: '' },
    fechaBloqueo: { type: Date, default: null },
    pagado: { type: Boolean, default: false },
    // CONFIGURACIÓN DE NEGOCIO PARA FACTURAS
    businessName: { type: String, default: "" },
    businessNit: { type: String, default: "" },
    // ENLACE DE ADMINISTRADOR
    linkedVendedor: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    // CONFIGURACIÓN MATIAS API
    matiasConfig: {
        activo: { type: Boolean, default: false },
        environment: { type: String, default: 'sandbox' },
        token: { type: String, default: '' },
        prefix: { type: String, default: 'FEV' },
        resolutionNumber: { type: String, default: '18760000001' },
        currentNumber: { type: Number, default: 1 },
        to: { type: Number, default: 500000 },
        email: { type: String, default: 'jcdev.software@gmail.com' },
        direccion: { type: String, default: 'Calle Principal' },
        municipioId: { type: String, default: '149' }
    }
});

// Método para obtener el token
UserSchema.methods.getMatiasToken = function () {
    return this.matiasConfig ? this.matiasConfig.token : null;
};
{ timestamps: true };

module.exports = mongoose.model("User", UserSchema);
