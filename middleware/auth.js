// middleware/auth.js
// Middleware de autenticación y autorización.
// Seguridad OWASP A01:2021 - Control de acceso.
//
// Los permisos se verifican siempre en el servidor.
// Ocultar botones en el frontend no sustituye esta protección.

function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      error: 'Debes iniciar sesión para realizar esta acción.'
    });
  }

  next();
}

function requireAdmin(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      error: 'Debes iniciar sesión para realizar esta acción.'
    });
  }

  if (req.session.role !== 'admin') {
    return res.status(403).json({
      error: 'No tienes permisos suficientes para realizar esta acción.'
    });
  }

  next();
}

module.exports = {
  requireAuth,
  requireAdmin
};