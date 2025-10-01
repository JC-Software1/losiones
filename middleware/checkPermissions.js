const User = require('../models/User');

// Middleware para verificar permisos específicos
const checkPermission = (permisoRequerido) => {
    return async (req, res, next) => {
        try {
            const usuario = await User.findById(req.user.id);
            
            if (!usuario) {
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }

            // Los admin y jefes (tipo 2 y 3) tienen todos los permisos
            if (usuario.tipo === 2 || usuario.tipo === 3) {
                return next();
            }

            // Verificar si el usuario tiene permisos generales
            if (!usuario.permisos) {
                return res.status(403).json({ 
                    error: 'No tienes permisos para realizar esta acción',
                    permiso: permisoRequerido 
                });
            }

            // Verificar el permiso específico
            const tienePermiso = usuario.permisosDetallados && 
                                 usuario.permisosDetallados[permisoRequerido];

            if (!tienePermiso) {
                return res.status(403).json({ 
                    error: `No tienes permiso para: ${permisoRequerido}`,
                    permiso: permisoRequerido
                });
            }

            next();
        } catch (error) {
            console.error('Error verificando permisos:', error);
            res.status(500).json({ error: 'Error al verificar permisos' });
        }
    };
};

// Middleware para verificar múltiples permisos (al menos uno)
const checkAnyPermission = (permisosRequeridos) => {
    return async (req, res, next) => {
        try {
            const usuario = await User.findById(req.user.id);
            
            if (!usuario) {
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }

            // Los admin y jefes tienen todos los permisos
            if (usuario.tipo === 2 || usuario.tipo === 3) {
                return next();
            }

            if (!usuario.permisos) {
                return res.status(403).json({ 
                    error: 'No tienes permisos para realizar esta acción' 
                });
            }

            // Verificar si tiene al menos uno de los permisos
            const tieneAlgunPermiso = permisosRequeridos.some(permiso => 
                usuario.permisosDetallados && usuario.permisosDetallados[permiso]
            );

            if (!tieneAlgunPermiso) {
                return res.status(403).json({ 
                    error: 'No tienes los permisos necesarios para esta acción',
                    permisosRequeridos 
                });
            }

            next();
        } catch (error) {
            console.error('Error verificando permisos:', error);
            res.status(500).json({ error: 'Error al verificar permisos' });
        }
    };
};

module.exports = { checkPermission, checkAnyPermission };