// routes/auth.js
// Rutas de registro, login y logout.
// Controles OWASP aplicados aqui:
//  - A07:2021 Fallas de identificacion y autenticacion -> bcrypt, bloqueo tras
//    intentos fallidos, mensajes de error genericos.
//  - A03:2021 Inyeccion -> consultas preparadas (better-sqlite3).
//  - Validacion de entradas -> express-validator (whitelisting de formato).

const express = require('express');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const db = require('../config/db');

const router = express.Router();
const SALT_ROUNDS = 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_TIME_MS = 15 * 60 * 1000; // 15 minutos

// Limita intentos de login por IP para dificultar ataques de fuerza bruta
// (complementa, no reemplaza, el bloqueo por cuenta de abajo).
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Demasiados intentos. Intenta de nuevo mas tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
});

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Datos invalidos.', details: errors.array() });
  }
  next();
}

// --- REGISTRO ---
router.post(
  '/register',
  [
    body('name').trim().isLength({ min: 2, max: 80 }).escape(),
    body('email').trim().isEmail().normalizeEmail(),
    // Politica de contrasenas: minimo 8 caracteres, mayuscula, minuscula y numero.
    body('password')
      .isLength({ min: 8 })
      .matches(/[A-Z]/)
      .matches(/[a-z]/)
      .matches(/[0-9]/)
      .withMessage('La contrasena debe tener minimo 8 caracteres, mayuscula, minuscula y numero.'),
  ],
  handleValidation,
  (req, res) => {
    const { name, email, password } = req.body;

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      // Mensaje generico: no confirmamos si el correo existe o no para
      // evitar "enumeracion de usuarios".
      return res.status(400).json({ error: 'No fue posible completar el registro con esos datos.' });
    }

    const hash = bcrypt.hashSync(password, SALT_ROUNDS);
    const info = db
      .prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)')
      .run(name, email, hash, 'user');

    req.session.userId = info.lastInsertRowid;
    req.session.role = 'user';
    req.session.name = name;

    res.status(201).json({ message: 'Registro exitoso.', user: { name, email, role: 'user' } });
  }
);

// --- LOGIN ---
router.post(
  '/login',
  loginLimiter,
  [body('email').trim().isEmail().normalizeEmail(), body('password').notEmpty()],
  handleValidation,
  (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    // Mensaje de error IDENTICO si el usuario no existe o la clave es
    // incorrecta: evita que un atacante sepa cuales correos estan registrados.
    const genericError = { error: 'Correo o contrasena incorrectos.' };

    if (!user) return res.status(401).json(genericError);

    if (user.locked_until && user.locked_until > Date.now()) {
      return res.status(423).json({ error: 'Cuenta bloqueada temporalmente por intentos fallidos. Intenta mas tarde.' });
    }

    const passwordOk = bcrypt.compareSync(password, user.password_hash);

    if (!passwordOk) {
      const attempts = user.failed_attempts + 1;
      let lockedUntil = null;
      if (attempts >= MAX_FAILED_ATTEMPTS) {
        lockedUntil = Date.now() + LOCK_TIME_MS;
      }
      db.prepare('UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?').run(
        attempts,
        lockedUntil,
        user.id
      );
      return res.status(401).json(genericError);
    }

    // Login correcto: resetear contador de intentos fallidos
    db.prepare('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?').run(user.id);

    // Regenerar la sesion al autenticar previene "session fixation".
    req.session.regenerate((err) => {
      if (err) return res.status(500).json({ error: 'Error iniciando sesion.' });
      req.session.userId = user.id;
      req.session.role = user.role;
      req.session.name = user.name;
      res.json({ message: 'Sesion iniciada.', user: { name: user.name, email: user.email, role: user.role } });
    });
  }
);

// --- LOGOUT ---
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ message: 'Sesion cerrada.' });
  });
});

// --- SESION ACTUAL ---
router.get('/session', (req, res) => {
  if (!req.session.userId) return res.json({ authenticated: false });
  res.json({
    authenticated: true,
    user: { name: req.session.name, role: req.session.role },
  });
});

module.exports = router;
