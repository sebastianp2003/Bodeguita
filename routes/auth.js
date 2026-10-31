const express = require('express');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const db = require('../config/db');

const router = express.Router();

const SALT_ROUNDS = 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_TIME_MS = 15 * 60 * 1000;

// Limitar intentos de inicio de sesión por IP.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    error: 'Demasiados intentos. Intenta nuevamente más tarde.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Validar los datos recibidos.
function handleValidation(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Verifica los datos ingresados.',
      details: errors.array()
    });
  }

  next();
}

// Crear una sesión nueva después de autenticar.
function createAuthenticatedSession(req, res, user, statusCode = 200) {
  req.session.regenerate((err) => {
    if (err) {
      console.error('Error regenerando sesión:', err);
      return res.status(500).json({
        error: 'No fue posible iniciar la sesión.'
      });
    }

    req.session.userId = user.id;
    req.session.role = user.role;
    req.session.name = user.name;

    req.session.save((saveError) => {
      if (saveError) {
        console.error('Error guardando sesión:', saveError);
        return res.status(500).json({
          error: 'No fue posible guardar la sesión.'
        });
      }

      res.status(statusCode).json({
        message: statusCode === 201 ? 'Registro exitoso.' : 'Sesión iniciada.',
        user: {
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    });
  });
}

router.post(
  '/register',
  [
    body('name')
      .trim()
      .isLength({ min: 2, max: 80 })
      .withMessage('El nombre debe tener entre 2 y 80 caracteres.'),

    body('email')
      .trim()
      .isEmail()
      .withMessage('Ingresa un correo electrónico válido.')
      .normalizeEmail(),

    body('password')
      .isLength({ min: 8 })
      .withMessage('La contraseña debe tener al menos 8 caracteres.')
      .matches(/[A-Z]/)
      .withMessage('La contraseña debe incluir una letra mayúscula.')
      .matches(/[a-z]/)
      .withMessage('La contraseña debe incluir una letra minúscula.')
      .matches(/[0-9]/)
      .withMessage('La contraseña debe incluir un número.')
  ],
  handleValidation,
  async (req, res) => {
    try {
      const { name, email, password } = req.body;

      const existing = db
        .prepare('SELECT id FROM users WHERE email = ?')
        .get(email);

      if (existing) {
        return res.status(400).json({
          error: 'No fue posible completar el registro con esos datos.'
        });
      }

      const hash = await bcrypt.hash(password, SALT_ROUNDS);

      const info = db
        .prepare(
          'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)'
        )
        .run(name, email, hash, 'user');

      const user = {
        id: info.lastInsertRowid,
        name,
        email,
        role: 'user'
      };

      createAuthenticatedSession(req, res, user, 201);

    } catch (error) {
      console.error('Error en el registro:', error);

      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return res.status(400).json({
          error: 'No fue posible completar el registro con esos datos.'
        });
      }

      res.status(500).json({
        error: 'Ocurrió un problema al crear la cuenta.'
      });
    }
  }
);

router.post(
  '/login',
  loginLimiter,
  [
    body('email')
      .trim()
      .isEmail()
      .withMessage('Ingresa un correo electrónico válido.')
      .normalizeEmail(),

    body('password')
      .notEmpty()
      .withMessage('Ingresa tu contraseña.')
  ],
  handleValidation,
  async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = db
        .prepare('SELECT * FROM users WHERE email = ?')
        .get(email);

      const genericError = {
        error: 'Correo o contraseña incorrectos.'
      };

      if (!user) {
        return res.status(401).json(genericError);
      }

      // Comprobar si la cuenta está bloqueada.
      if (user.locked_until && user.locked_until > Date.now()) {
        return res.status(423).json({
          error: 'Cuenta bloqueada temporalmente. Intenta nuevamente más tarde.'
        });
      }

      // Si el bloqueo ya terminó, reiniciar el contador.
      if (user.locked_until && user.locked_until <= Date.now()) {
        db.prepare(
          'UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?'
        ).run(user.id);

        user.failed_attempts = 0;
        user.locked_until = null;
      }

      const passwordOk = await bcrypt.compare(
        password,
        user.password_hash
      );

      if (!passwordOk) {
        const attempts = (user.failed_attempts || 0) + 1;

        let lockedUntil = null;

        if (attempts >= MAX_FAILED_ATTEMPTS) {
          lockedUntil = Date.now() + LOCK_TIME_MS;
        }

        db.prepare(
          'UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?'
        ).run(attempts, lockedUntil, user.id);

        return res.status(401).json(genericError);
      }

      // Restablecer los intentos fallidos después de un acceso correcto.
      db.prepare(
        'UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?'
      ).run(user.id);

      createAuthenticatedSession(req, res, user);

    } catch (error) {
      console.error('Error en el inicio de sesión:', error);

      res.status(500).json({
        error: 'Ocurrió un problema al iniciar sesión.'
      });
    }
  }
);

router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error cerrando sesión:', err);

      return res.status(500).json({
        error: 'No fue posible cerrar la sesión.'
      });
    }

    res.clearCookie('connect.sid');

    res.json({
      message: 'Sesión cerrada correctamente.'
    });
  });
});

router.get('/session', (req, res) => {
  if (!req.session.userId) {
    return res.json({
      authenticated: false
    });
  }

  res.json({
    authenticated: true,
    user: {
      name: req.session.name,
      role: req.session.role
    }
  });
});

module.exports = router;