const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const User = require("../models/Users");
const validator = require("validator");
const auth = require("../middleware/auth");

const router = express.Router();

/* ----------  Encriptar contraseñas viejas (opcional) ---------- */
async function encriptarContraseñasEnTextoPlano() {
  try {
    const usuarios = await User.find();
    for (const u of usuarios) {
      if (!u.password || u.password.length < 60) {
        const hash = await bcrypt.hash(u.password, 10);
        u.password = hash;
        await u.save();
      }
    }
    console.log("Proceso de encriptación terminado");
  } catch (e) {
    console.error("Error encriptando:", e);
  }
}
encriptarContraseñasEnTextoPlano();

/* ----------  LOGIN-AS (solo tipo 3) ---------- */
router.post("/login-as/:userId", auth, async (req, res) => {
  try {
    if (req.user.tipo !== 3) {
      return res.status(403).json({ error: "No autorizado" });
    }
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    const token = jwt.sign(
      { id: user._id, username: user.username, tipo: user.tipo },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    res.json({ token });
  } catch (e) {
    res.status(500).json({ error: "Error al iniciar sesión como el usuario" });
  }
});

/* ----------  REGISTER ---------- */
router.post("/register", async (req, res) => {
  try {
    const { name, username, password, tipo = 1 } = req.body;

    if (!username?.trim()) {
      return res.status(400).json({ error: "El nombre de usuario es obligatorio" });
    }
    if (!validator.isLength(password, { min: 6 })) {
      return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });
    }
    const exists = await User.findOne({ username });
    if (exists) {
      return res.status(400).json({ error: "Ya existe ese nombre de usuario" });
    }

    const hash = await bcrypt.hash(password, 10);
    const user = new User({ name, username, password: hash, tipo });
    await user.save();
    res.status(201).json({ message: "Usuario registrado con éxito" });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/* ----------  LOGIN ---------- */
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ error: "Usuario no encontrado" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: "Credenciales incorrectas" });

    const token = jwt.sign(
      { id: user._id, tipo: user.tipo },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );
    res.status(200).json({ token });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/* ----------  VERIFY ---------- */
router.get("/verify", auth, (req, res) => {
  res.json({ message: "Token válido", user: req.user });
});

/* ============================================================
   RUTAS AUXILIARES (todas protegidas y solo para tipo 3)
   ============================================================ */

/* ----------  OBTENER USUARIOS ---------- */
router.get("/users", auth, async (req, res) => {
  try {
    if (req.user.tipo !== 3) return res.status(403).json({ error: "No autorizado" });
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: "Error al obtener usuarios" });
  }
});

/* ----------  ACTUALIZAR USUARIO ---------- */
router.put("/users/:id", auth, async (req, res) => {
  try {
    if (req.user.tipo !== 3) return res.status(403).json({ error: "No autorizado" });
    
    const { name, username, password, tipo } = req.body;
    const userId = req.params.id;

    // Validaciones
    if (!name?.trim() || !username?.trim()) {
      return res.status(400).json({ error: "Nombre y usuario son obligatorios" });
    }

    // Verificar si el username ya existe (excepto para el usuario actual)
    const existingUser = await User.findOne({ username, _id: { $ne: userId } });
    if (existingUser) {
      return res.status(400).json({ error: "Ya existe ese nombre de usuario" });
    }

    const updateData = { name: name.trim(), username: username.trim() };
    
    // Si se proporciona tipo, validarlo
    if (tipo !== undefined) {
      if (![1, 2, 3].includes(parseInt(tipo))) {
        return res.status(400).json({ error: "Tipo de usuario inválido" });
      }
      updateData.tipo = parseInt(tipo);
    }

    // Si se proporciona contraseña, encriptarla
    if (password && password.trim()) {
      if (!validator.isLength(password.trim(), { min: 6 })) {
        return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });
      }
      updateData.password = await bcrypt.hash(password.trim(), 10);
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId, 
      updateData, 
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json({ message: "Usuario actualizado exitosamente", user: updatedUser });
  } catch (e) {
    console.error("Error actualizando usuario:", e);
    res.status(500).json({ error: "Error al actualizar usuario" });
  }
});

/* ----------  BLOQUEAR USUARIO ---------- */
router.put("/users/:id/block", auth, async (req, res) => {
  try {
    if (req.user.tipo !== 3) return res.status(403).json({ error: "No autorizado" });
    
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
    
    // No permitir bloquear super admins
    if (user.tipo === 3) {
      return res.status(400).json({ error: "No se puede bloquear a un super administrador" });
    }
    
    await User.findByIdAndUpdate(req.params.id, { bloqueado: true });
    res.json({ message: "Usuario bloqueado exitosamente" });
  } catch (e) {
    res.status(500).json({ error: "Error al bloquear usuario" });
  }
});

/* ----------  DESBLOQUEAR USUARIO ---------- */
router.put("/users/:id/unblock", auth, async (req, res) => {
  try {
    if (req.user.tipo !== 3) return res.status(403).json({ error: "No autorizado" });
    
    await User.findByIdAndUpdate(req.params.id, { bloqueado: false });
    res.json({ message: "Usuario desbloqueado exitosamente" });
  } catch (e) {
    res.status(500).json({ error: "Error al desbloquear usuario" });
  }
});

/* ----------  ELIMINAR USUARIO ---------- */
router.delete("/users/:id", auth, async (req, res) => {
  try {
    if (req.user.tipo !== 3) return res.status(403).json({ error: "No autorizado" });
    
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
    
    // No permitir eliminar super admins
    if (user.tipo === 3) {
      return res.status(400).json({ error: "No se puede eliminar a un super administrador" });
    }
    
    // No permitir eliminar el usuario actual
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({ error: "No puedes eliminarte a ti mismo" });
    }
    
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "Usuario eliminado exitosamente" });
  } catch (e) {
    res.status(500).json({ error: "Error al eliminar usuario" });
  }
});

module.exports = router;