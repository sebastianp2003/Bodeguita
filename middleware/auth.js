// middleware/auth.js
// Controles de acceso (OWASP A01:2021 - Control de acceso roto).
// La verificacion de permisos SIEMPRE ocurre en el servidor, nunca solo
// ocultando botones en el frontend.

function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Debes iniciar sesion para realizar esta accion.' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Debes iniciar sesion para realizar esta accion.' });
  }
  if (req.session.role !== 'admin') {
    // 403, no 404: el recurso existe pero el usuario no tiene permiso.
    return res.status(403).json({ error: 'No tienes permisos suficientes para esta accion.' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
