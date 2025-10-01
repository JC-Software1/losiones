const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "El nombre es obligatorio"]
  },
  username: {
    type: String,
    required: [true, "El nombre de usuario es obligatorio"],
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, "La contraseña es obligatoria"]
  },
  tipo: {
    type: Number,
    default: 1
  },
  bloqueado: {
    type: Boolean,
    default: false
  },
  // Nuevo campo para permisos especiales
  permisos: {
    type: Boolean,
    default: false
  },
  // Campos adicionales útiles
  fechaCreacion: {
    type: Date,
    default: Date.now
  },
  ultimoAcceso: {
    type: Date
  }
}, {
  timestamps: true // Agrega createdAt y updatedAt automáticamente
});

module.exports = mongoose.model("User", userSchema);