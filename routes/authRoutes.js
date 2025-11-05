const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const User = require("../models/Users");
const validator = require("validator");
const auth = require("../middleware/auth");
const VendedorAsignado = require("../models/VendedorAsignado");

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
/* ----------  LOGIN ---------- */
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username }).populate('jefe');
    
    if (!user) return res.status(400).json({ error: "Usuario no encontrado" });

    // Verificar si el usuario está bloqueado
    if (user.bloqueado) {
      return res.status(403).json({ 
        error: "Su cuenta ha sido suspendida. Comuníquese con soporte al 3232323232"
      });
    }

    // Verificar si el jefe del usuario está bloqueado
    if (user.jefe && user.jefe.bloqueado) {
      return res.status(403).json({ 
        error: "La cuenta del administrador está suspendida. Comuníquese con soporte al 3232323232"
      });
    }

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

/* ----------  VERIFICAR ESTADO DE BLOQUEO ---------- */
router.post("/verificar-bloqueo", async (req, res) => {
  try {
    const { username } = req.body;
    const user = await User.findOne({ username });
    
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    if (user.bloqueado) {
      return res.status(403).json({ 
        bloqueado: true,
        mensaje: "Su cuenta ha sido suspendida. Por favor contacte con soporte."
      });
    }

    res.json({ bloqueado: false });
  } catch (e) {
    res.status(500).json({ error: "Error al verificar estado de bloqueo" });
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

/* ----------  BUSCAR Y ASIGNAR VENDEDOR POR ID ---------- */
router.get("/vendedor/:id", auth, async (req, res) => {
  try {
    // Permitir acceso a tipo 2 y tipo 3
    if (req.user.tipo !== 2 && req.user.tipo !== 3) {
      return res.status(403).json({ error: "No autorizado" });
    }

    const vendedor = await User.findById(req.params.id).select("-password");
    
    if (!vendedor) {
      return res.status(404).json({ error: "Vendedor no encontrado" });
    }

    // Verificar que sea un vendedor (tipo 1)
    if (vendedor.tipo !== 1) {
      return res.status(400).json({ error: "El usuario no es un vendedor" });
    }

    // Si es tipo 2, guardar/actualizar la asignación automáticamente
    if (req.user.tipo === 2) {
      await VendedorAsignado.findOneAndUpdate(
        { administrador: req.user.id, vendedor: vendedor._id },
        { 
          administrador: req.user.id, 
          vendedor: vendedor._id,
          fechaAsignacion: Date.now()
        },
        { upsert: true, new: true }
      );
    }

    // Verificar si ya está asignado y obtener datos adicionales
    const asignacion = await VendedorAsignado.findOne({ 
      administrador: req.user.id, 
      vendedor: vendedor._id 
    });

    res.json({
      ...vendedor.toObject(),
      asignado: !!asignacion,
      permisos: asignacion?.permisos || false,
      fechaAsignacion: asignacion?.fechaAsignacion,
      notas: asignacion?.notas || ""
    });
  } catch (e) {
    if (e.name === 'CastError') {
      return res.status(400).json({ error: "ID de vendedor inválido" });
    }
    res.status(500).json({ error: "Error al buscar vendedor" });
  }
});

/* ----------  OBTENER MIS VENDEDORES ASIGNADOS ---------- */
router.get("/mis-vendedores", auth, async (req, res) => {
  try {
    if (req.user.tipo !== 2 && req.user.tipo !== 3) {
      return res.status(403).json({ error: "No autorizado" });
    }

    const asignaciones = await VendedorAsignado.find({ 
      administrador: req.user.id 
    })
    .populate('vendedor', '-password')
    .sort({ fechaAsignacion: -1 });

    const vendedores = asignaciones.map(asig => ({
      ...asig.vendedor.toObject(),
      permisos: asig.permisos,
      fechaAsignacion: asig.fechaAsignacion,
      notas: asig.notas,
      asignacionId: asig._id
    }));

    res.json(vendedores);
  } catch (e) {
    console.error("Error obteniendo vendedores:", e);
    res.status(500).json({ error: "Error al obtener vendedores asignados" });
  }
});

/* ----------  OTORGAR PERMISOS A VENDEDOR ---------- */
router.put("/vendedor/:id/permisos", auth, async (req, res) => {
  try {
    if (req.user.tipo !== 2 && req.user.tipo !== 3) {
      return res.status(403).json({ error: "No autorizado" });
    }

    const { permisos } = req.body;
    
    const vendedor = await User.findById(req.params.id);
    if (!vendedor) {
      return res.status(404).json({ error: "Vendedor no encontrado" });
    }

    if (vendedor.tipo !== 1) {
      return res.status(400).json({ error: "El usuario no es un vendedor" });
    }

    // Actualizar en la tabla de asignaciones
    const asignacion = await VendedorAsignado.findOneAndUpdate(
      { administrador: req.user.id, vendedor: vendedor._id },
      { permisos: permisos },
      { new: true }
    );

    if (!asignacion) {
      return res.status(404).json({ error: "Vendedor no asignado a este administrador" });
    }

    res.json({ 
      message: "Permisos actualizados exitosamente", 
      vendedor: { ...vendedor.toObject(), password: undefined },
      permisos: asignacion.permisos
    });
  } catch (e) {
    res.status(500).json({ error: "Error al otorgar permisos" });
  }
});

/* ----------  ACTUALIZAR NOTAS DEL VENDEDOR ---------- */
router.put("/vendedor/:id/notas", auth, async (req, res) => {
  try {
    if (req.user.tipo !== 2 && req.user.tipo !== 3) {
      return res.status(403).json({ error: "No autorizado" });
    }

    const { notas } = req.body;
    
    const asignacion = await VendedorAsignado.findOneAndUpdate(
      { administrador: req.user.id, vendedor: req.params.id },
      { notas: notas || "" },
      { new: true }
    );

    if (!asignacion) {
      return res.status(404).json({ error: "Vendedor no asignado a este administrador" });
    }

    res.json({ 
      message: "Notas actualizadas exitosamente", 
      notas: asignacion.notas
    });
  } catch (e) {
    res.status(500).json({ error: "Error al actualizar notas" });
  }
});

/* ----------  DESASIGNAR VENDEDOR ---------- */
router.delete("/vendedor/:id/asignar", auth, async (req, res) => {
  try {
    if (req.user.tipo !== 2 && req.user.tipo !== 3) {
      return res.status(403).json({ error: "No autorizado" });
    }

    const resultado = await VendedorAsignado.findOneAndDelete({
      administrador: req.user.id,
      vendedor: req.params.id
    });

    if (!resultado) {
      return res.status(404).json({ error: "Vendedor no estaba asignado" });
    }

    res.json({ message: "Vendedor desasignado exitosamente" });
  } catch (e) {
    res.status(500).json({ error: "Error al desasignar vendedor" });
  }
});

/* ----------  ELIMINAR VENDEDOR (SOLO TIPO 3 O SI ESTÁ ASIGNADO) ---------- */
router.delete("/vendedor/:id", auth, async (req, res) => {
  try {
    if (req.user.tipo !== 2 && req.user.tipo !== 3) {
      return res.status(403).json({ error: "No autorizado" });
    }

    const vendedor = await User.findById(req.params.id);
    if (!vendedor) {
      return res.status(404).json({ error: "Vendedor no encontrado" });
    }

    if (vendedor.tipo !== 1) {
      return res.status(400).json({ error: "El usuario no es un vendedor" });
    }

    // Si es tipo 2, verificar que el vendedor esté asignado
    if (req.user.tipo === 2) {
      const asignacion = await VendedorAsignado.findOne({
        administrador: req.user.id,
        vendedor: vendedor._id
      });

      if (!asignacion) {
        return res.status(403).json({ error: "No tienes permiso para eliminar este vendedor" });
      }
    }

    // Eliminar vendedor y todas sus asignaciones
    await User.findByIdAndDelete(req.params.id);
    await VendedorAsignado.deleteMany({ vendedor: req.params.id });

    res.json({ message: "Vendedor eliminado exitosamente" });
  } catch (e) {
    res.status(500).json({ error: "Error al eliminar vendedor" });
  }
});

/* ----------  OBTENER TODOS LOS VENDEDORES (BÚSQUEDA) ---------- */
router.get("/vendedores", auth, async (req, res) => {
  try {
    if (req.user.tipo !== 2 && req.user.tipo !== 3) {
      return res.status(403).json({ error: "No autorizado" });
    }

    const vendedores = await User.find({ tipo: 1 })
      .select("-password")
      .sort({ createdAt: -1 });
    
    // Si es tipo 2, marcar cuáles están asignados
    if (req.user.tipo === 2) {
      const asignaciones = await VendedorAsignado.find({ 
        administrador: req.user.id 
      });
      
      const idsAsignados = new Set(asignaciones.map(a => a.vendedor.toString()));
      
      const vendedoresConEstado = vendedores.map(v => ({
        ...v.toObject(),
        asignado: idsAsignados.has(v._id.toString())
      }));
      
      return res.json(vendedoresConEstado);
    }
    
    res.json(vendedores);
  } catch (e) {
    res.status(500).json({ error: "Error al obtener vendedores" });
  }
});

// Agregar estas rutas a tu archivo authRoutes.js existente

// Obtener permisos detallados de un vendedor
router.get('/vendedor/:id/permisos-detallados', auth, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verificar que el usuario actual sea admin/jefe
        if (req.user.tipo !== 2 && req.user.tipo !== 3) {
            return res.status(403).json({ error: 'No tienes permisos para ver permisos de otros usuarios' });
        }
        
        const vendedor = await User.findById(id);
        
        if (!vendedor) {
            return res.status(404).json({ error: 'Vendedor no encontrado' });
        }
        
        // Verificar que el vendedor pertenezca al jefe actual
        if (vendedor.jefe && vendedor.jefe.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Este vendedor no está asignado a ti' });
        }
        
        res.json({
            permisosDetallados: vendedor.permisosDetallados || {},
            permisos: vendedor.permisos
        });
    } catch (error) {
        console.error('Error al obtener permisos:', error);
        res.status(500).json({ error: 'Error al obtener permisos detallados' });
    }
});

// Actualizar permisos detallados de un vendedor
router.put('/vendedor/:id/permisos-detallados', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const { permisosDetallados } = req.body;
        
        // Verificar que el usuario actual sea admin/jefe
        if (req.user.tipo !== 2 && req.user.tipo !== 3) {
            return res.status(403).json({ error: 'No tienes permisos para modificar permisos de otros usuarios' });
        }
        
        const vendedor = await User.findById(id);
        
        if (!vendedor) {
            return res.status(404).json({ error: 'Vendedor no encontrado' });
        }
        
        // Verificar que el vendedor pertenezca al jefe actual
        if (vendedor.jefe && vendedor.jefe.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Este vendedor no está asignado a ti' });
        }
        
        // Actualizar permisos detallados
        vendedor.permisosDetallados = permisosDetallados;
        
        // Si todos los permisos están en false, marcar permisos general como false
        const algunPermisoActivo = Object.values(permisosDetallados).some(val => val === true);
        vendedor.permisos = algunPermisoActivo;
        
        await vendedor.save();
        
        res.json({
            message: 'Permisos actualizados exitosamente',
            permisosDetallados: vendedor.permisosDetallados,
            permisos: vendedor.permisos
        });
    } catch (error) {
        console.error('Error al actualizar permisos:', error);
        res.status(500).json({ error: 'Error al actualizar permisos detallados' });
    }
});

// Ruta para obtener los permisos del usuario actual (para el frontend)
router.get('/mis-permisos', auth, async (req, res) => {
    try {
        const usuario = await User.findById(req.user.id);
        
        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        res.json({
            permisosDetallados: usuario.permisosDetallados || {},
            permisos: usuario.permisos,
            tipo: usuario.tipo
        });
    } catch (error) {
        console.error('Error al obtener mis permisos:', error);
        res.status(500).json({ error: 'Error al obtener permisos' });
    }
});

/* ----------  ACTUALIZAR FECHA DE PAGO ---------- */
router.put("/users/:id/fecha-pago", auth, async (req, res) => {
  try {
    if (req.user.tipo !== 3) {
      return res.status(403).json({ error: "No autorizado" });
    }

    const { fechaPago } = req.body;
    
    if (!fechaPago) {
      return res.status(400).json({ error: "Fecha de pago requerida" });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    user.fechaPago = new Date(fechaPago);
    await user.save();

    res.json({ 
      message: "Fecha de pago actualizada exitosamente",
      fechaPago: user.fechaPago
    });
  } catch (e) {
    res.status(500).json({ error: "Error al actualizar fecha de pago" });
  }
});

/* ----------  VERIFICAR ESTADO DE VENCIMIENTO ---------- */
router.get("/verificar-vencimiento", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !user.fechaPago) {
      return res.json({ 
        proximo_vencer: false, 
        dias_restantes: null 
      });
    }

    const hoy = new Date();
    const fechaPago = new Date(user.fechaPago);
    const diferenciaDias = Math.ceil((fechaPago - hoy) / (1000 * 60 * 60 * 24));

    const proximoVencer = diferenciaDias <= user.diasAvisoVencimiento && diferenciaDias > 0;

    res.json({
      proximo_vencer: proximoVencer,
      dias_restantes: diferenciaDias > 0 ? diferenciaDias : 0,
      fecha_pago: fechaPago,
      vencido: diferenciaDias <= 0
    });
  } catch (e) {
    res.status(500).json({ error: "Error al verificar vencimiento" });
  }
});

/* ----------  VERIFICAR SI EL JEFE ESTÁ BLOQUEADO ---------- */
router.get("/verificar-jefe/:username", async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username }).populate('jefe');
    
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    // Si tiene jefe asignado, verificar si está bloqueado
    if (user.jefe && user.jefe.bloqueado) {
      return res.json({ 
        jefeBloqueado: true,
        mensaje: "La cuenta del administrador está suspendida"
      });
    }

    res.json({ jefeBloqueado: false });
  } catch (e) {
    res.status(500).json({ error: "Error al verificar estado del jefe" });
  }
});

module.exports = router;