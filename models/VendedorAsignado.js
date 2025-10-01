const mongoose = require("mongoose");

const vendedorAsignadoSchema = new mongoose.Schema({
  administrador: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  vendedor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  fechaAsignacion: {
    type: Date,
    default: Date.now
  },
  permisos: {
    type: Boolean,
    default: false
  },
  notas: {
    type: String,
    default: ""
  }
}, {
  timestamps: true
});

// Índice compuesto para evitar duplicados
vendedorAsignadoSchema.index({ administrador: 1, vendedor: 1 }, { unique: true });

module.exports = mongoose.model("VendedorAsignado", vendedorAsignadoSchema);