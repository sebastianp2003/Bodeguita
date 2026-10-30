// server.js
// Punto de entrada de la aplicacion.

require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const SqliteStoreFactory = require('better-sqlite3-session-store');
const helmet = require('helmet');

const db = require('./config/db'); // misma conexion que ya usamos para todo
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');

// Manejador de sesiones basado en better-sqlite3 (la misma dependencia que
// ya usamos para el resto de la app). Evitamos asi depender del paquete
// "sqlite3" / node-gyp, que arrastraba vulnerabilidades criticas en su
// cadena de compilacion (ver npm audit -> hallazgo OWASP A06).
const SqliteStore = SqliteStoreFactory(session);

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

// --- A05:2021 Configuracion de seguridad ---
// Helmet agrega automaticamente cabeceras de seguridad HTTP:
// Content-Security-Policy, X-Content-Type-Options, X-Frame-Options,
// Strict-Transport-Security (cuando corre bajo HTTPS), etc.
// Justo las cabeceras que analizamos como "faltantes" en la Fase 1.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
  })
);

// Oculta la cabecera X-Powered-By: Express (no dar pistas gratis de la
// tecnologia usada, como vimos que SI revelaba Studio F con VTEX).
app.disable('x-powered-by');

app.use(express.json({ limit: '50kb' })); // limite de tamano contra payloads abusivos
app.use(express.urlencoded({ extended: false, limit: '50kb' }));

// --- Sesiones ---
app.use(
  session({
    store: new SqliteStore({ client: db, expired: { clear: true, intervalMs: 15 * 60 * 1000 } }),
    name: 'connect.sid',
    secret: process.env.SESSION_SECRET || 'CAMBIA_ESTE_SECRETO_EN_PRODUCCION',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true, // la cookie no es accesible desde JavaScript (mitiga robo via XSS)
      sameSite: 'lax', // mitiga CSRF basico en peticiones cross-site
      secure: isProd, // solo se envia por HTTPS en produccion
      maxAge: 1000 * 60 * 60 * 2, // 2 horas
    },
  })
);

// --- Rutas de la API ---
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);

// --- Frontend estatico ---
app.use(express.static(path.join(__dirname, 'public')));

// --- 404 para rutas de API no encontradas ---
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Recurso no encontrado.' });
});

// --- Manejador de errores centralizado ---
// A05:2021 - nunca se devuelve el stack trace ni detalles internos al
// cliente; eso facilitaria el reconocimiento del sistema a un atacante.
app.use((err, req, res, next) => {
  console.error(err); // el detalle solo queda en el log del servidor
  res.status(500).json({ error: 'Ocurrio un error interno. Intenta de nuevo mas tarde.' });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
