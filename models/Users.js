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
       trim: true,
   },
    password: {
        type: String,
        required: [true, "La contraseña es obligatoria"]
       },
   tipo: {
       type: Number,
       default: 1
   }
})
module.exports = mongoose.model("User", userSchema);