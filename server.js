// server.js
// Punto de entrada de Bodeguita.
// Configuración del servidor, seguridad, sesiones y rutas.

require('dotenv').config();

const path = require('path');
const express = require('express');
const session = require('express-session');
const SqliteStoreFactory = require('better-sqlite3-session-store');
const helmet = require('helmet');

const db = require('./config/db');
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');

const SqliteStore = SqliteStoreFactory(session);

const app = express();

const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

// ------------------------------------
// CONFIGURACIÓN DE SEGURIDAD
// ------------------------------------

app.disable('x-powered-by');

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"]
      }
    }
  })
);

// ------------------------------------
// PROCESAMIENTO DE SOLICITUDES
// ------------------------------------

app.use(express.json({
  limit: '50kb'
}));

app.use(express.urlencoded({
  extended: false,
  limit: '50kb'
}));

// ------------------------------------
// CONFIGURACIÓN DE SESIONES
// ------------------------------------

const sessionSecret = process.env.SESSION_SECRET;

if (isProd && (!sessionSecret || sessionSecret.length < 32)) {
  throw new Error(
    'Debes configurar SESSION_SECRET con al menos 32 caracteres en producción.'
  );
}

if (!sessionSecret) {
  console.warn(
    'ADVERTENCIA: Configura SESSION_SECRET en tu archivo .env antes de desplegar.'
  );
}

app.use(
  session({
    store: new SqliteStore({
      client: db,
      expired: {
        clear: true,
        intervalMs: 15 * 60 * 1000
      }
    }),

    name: 'connect.sid',

    secret: sessionSecret || 'SECRETO-SOLO-PARA-DESARROLLO-NO-USAR-EN-PRODUCCION',

    resave: false,
    saveUninitialized: false,

    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
      maxAge: 1000 * 60 * 60 * 2
    }
  })
);

// ------------------------------------
// RUTAS DE LA API
// ------------------------------------

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);

// ------------------------------------
// PÁGINA PRINCIPAL
// ------------------------------------

app.get('/', (req, res) => {
  if (req.session && req.session.userId) {
    return res.redirect('/index.html');
  }

  return res.redirect('/register.html');
});

// ------------------------------------
// ARCHIVOS DEL FRONTEND
// ------------------------------------

app.use(
  express.static(path.join(__dirname, 'public'), {
    index: false,
    dotfiles: 'deny'
  })
);

// ------------------------------------
// RUTAS API NO ENCONTRADAS
// ------------------------------------

app.use('/api', (req, res) => {
  res.status(404).json({
    error: 'Recurso no encontrado.'
  });
});

// ------------------------------------
// RUTAS NO ENCONTRADAS
// ------------------------------------

app.use((req, res) => {
  res.status(404).send('Página no encontrada.');
});

// ------------------------------------
// MANEJADOR DE ERRORES
// ------------------------------------

app.use((err, req, res, next) => {
  console.error('Error interno:', err);

  if (res.headersSent) {
    return next(err);
  }

  res.status(500).json({
    error: 'Ocurrió un error interno. Intenta nuevamente más tarde.'
  });
});

// ------------------------------------
// INICIAR SERVIDOR
// ------------------------------------

app.listen(PORT, () => {
  console.log('===================================');
  console.log('       BODEGUITA INICIADA');
  console.log('===================================');
  console.log(`Servidor: http://localhost:${PORT}`);
  console.log(`Entorno: ${isProd ? 'Producción' : 'Desarrollo'}`);
});