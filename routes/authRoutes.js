const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const User = require("../models/Users");
const validator = require("validator");
const auth = require("../middleware/auth");

const router = express.Router();

async function encriptarContraseñasEnTextoPlano() {
  try {
    // Buscar todos los usuarios
    const usuarios = await User.find();

    for (const usuario of usuarios) {
      // Verificar si la contraseña ya está encriptada (esto depende de cómo almacenes las contraseñas)
      // Por ejemplo, si las contraseñas en texto plano tienen un tamaño específico, o si puedes identificar que no están encriptadas.
      // Aquí asumimos que solo encriptaremos si la contraseña parece estar en texto plano.
      
      if (!usuario.password || usuario.password.length < 60) { // 60 es el tamaño típico de un hash de bcrypt
        console.log(`Encriptando contraseña para el usuario ${usuario.email}`);

        // Encriptar la contraseña
        const hashedPassword = await bcrypt.hash(usuario.password, 10);

        // Actualizar la contraseña en la base de datos
        usuario.password = hashedPassword;

        // Guardar el usuario con la nueva contraseña encriptada
        await usuario.save();
        console.log(`Contraseña encriptada y actualizada para el usuario ${usuario.email}`);
      }
    }

    console.log('Proceso de encriptación de contraseñas completado');
  } catch (error) {
    console.error('Error al encriptar las contraseñas:', error);
  }
}

//
// Llamar la función para encriptar las contraseñas
encriptarContraseñasEnTextoPlano();

// Ruta para iniciar sesión como un usuario
router.post("/login-as/:userId", async (req, res) => {
    try {
        const userId = req.params.userId;

        // Verifica si el usuario existe
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }

        // Genera un token para el usuario
        const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });

        // Devuelve el token
        res.json({ token });
    } catch (error) {
        res.status(500).json({ error: "Error al intentar iniciar sesión" });
    }
});


// 🟢 Registrar usuario
router.post("/register", async (req, res) => {
    try {
        const { name, username, password, tipo = 1 } = req.body;

 if (!username || !username.trim()) {
           return res.status(400).json({ error: "El nombre de usuario es obligatorio" });
        }

        if (!validator.isLength(password, { min: 6 })) {
            return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });
        }

        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ error: "Ya existe un usuario con este correo" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ name, email, password: hashedPassword, tipo });

        await user.save();
        res.status(201).json({ message: "Usuario registrado con éxito" });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// 🔵 Iniciar sesión (Login)
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ error: "Usuario no encontrado" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: "los datos de inicio de sesión no coinciden, intentelo de nuevo" });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });
        res.status(200).json({ token });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// 🟠 Verificar token
router.get("/verify", auth, (req, res) => {
    res.status(200).json({ message: "Token válido", user: req.user });
});

module.exports = router;
