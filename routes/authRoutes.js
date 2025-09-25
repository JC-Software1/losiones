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
router.get("/users", auth, async (req, res) => {
  if (req.user.tipo !== 3) return res.status(403).send();
  const users = await User.find().select("-password");
  res.json(users);
});

router.put("/users/:id/block", auth, async (req, res) => {
  if (req.user.tipo !== 3) return res.status(403).send();
  await User.findByIdAndUpdate(req.params.id, { bloqueado: true });
  res.json({ ok: true });
});

router.put("/users/:id/unblock", auth, async (req, res) => {
  if (req.user.tipo !== 3) return res.status(403).send();
  await User.findByIdAndUpdate(req.params.id, { bloqueado: false });
  res.json({ ok: true });
});

module.exports = router;