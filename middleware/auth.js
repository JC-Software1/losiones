const jwt = require("jsonwebtoken");
const User = require("../models/Users");

const auth = async (req, res, next) => {
  const authHeader = req.header("Authorization"); // "Bearer <token>"

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token no proporcionado o inválido" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified; // { id, tipo, iat, exp }

    // Si es administrador o superadmin, cargar si tiene un vendedor enlazado
    if (verified.tipo === 2 || verified.tipo === 3) {
        try {
            const dbUser = await User.findById(verified.id).select('linkedVendedor');
            if (dbUser && dbUser.linkedVendedor) {
                req.user.linkedVendedor = dbUser.linkedVendedor.toString();
            }
        } catch (dbError) {
            console.error("Error cargando linkedVendedor:", dbError);
        }
    }

    next();
  } catch (err) {
    console.error("Error al verificar el token:", err.name, err.message);

    let message = "Token inválido";
    if (err.name === "TokenExpiredError") message = "Token expirado";

    return res.status(401).json({ error: message });
  }
};

module.exports = auth;