# Catalogo Seguro — Registro de usuarios + Catalogo de productos

Proyecto desarrollado para la actividad de Seguridad de Software (Fase 2),
aplicando buenas practicas alineadas con **OWASP Top Ten**.

## Stack

- Node.js + Express
- SQLite (better-sqlite3) — consultas preparadas, sin ORM pesado
- bcrypt — hash de contrasenas
- helmet — cabeceras de seguridad HTTP
- express-session + connect-sqlite3 — sesiones persistentes
- express-validator — validacion/sanitizacion de entradas
- express-rate-limit — mitigacion de fuerza bruta

## Como ejecutarlo

```bash
npm install
cp .env.example .env     # y edita SESSION_SECRET por una cadena aleatoria propia
npm run seed              # crea el usuario admin y productos de ejemplo
npm start
```

Abrir http://localhost:3000

Usuario admin de prueba: `admin@catalogo.test` / `Admin123!Seguro`
(cambiar esta contrasena antes de usar el proyecto fuera de un entorno de pruebas)

## Controles de seguridad aplicados (mapeo a OWASP Top Ten 2021)

| Categoria OWASP | Control implementado | Donde |
|---|---|---|
| A01 Control de acceso roto | Verificacion de rol en el **servidor** (`requireAdmin`) para crear/eliminar productos, no solo ocultar botones en el frontend | `middleware/auth.js`, `routes/products.js` |
| A02 Fallas criptograficas | Contrasenas con **bcrypt** (factor de costo 12), nunca texto plano ni hash debil (MD5/SHA1) | `routes/auth.js` |
| A03 Inyeccion (SQL) | **Consultas preparadas** (`better-sqlite3`) en todas las operaciones, incluida la busqueda con `LIKE`. Nunca se concatena input del usuario al SQL | `config/db.js`, `routes/products.js`, `routes/auth.js` |
| A03 Inyeccion (XSS) | Validacion/escape de entradas con `express-validator` (`.escape()`); en el frontend se usa `textContent` en vez de `innerHTML` para pintar datos del servidor | `routes/*.js`, `public/js/app.js` |
| A04 Diseno inseguro | Politica de contrasenas (min. 8 caracteres, mayuscula, minuscula, numero); bloqueo de cuenta tras 5 intentos fallidos | `routes/auth.js` |
| A05 Configuracion de seguridad | `helmet` agrega CSP, X-Content-Type-Options, X-Frame-Options, etc.; mensajes de error genericos (sin stack traces al cliente); `X-Powered-By` deshabilitado | `server.js` |
| A07 Fallas de autenticacion | Mensajes de error identicos para "usuario no existe" y "clave incorrecta" (anti enumeracion); `rate limiting` en login; regeneracion de sesion al autenticar (anti session fixation); cookies `httpOnly` y `sameSite` | `routes/auth.js`, `server.js` |
| A08 Fallas de integridad de software y datos | `package.json` con versiones fijadas; recomendacion de correr `npm audit` periodicamente | `package.json` |

## Relacion con la Fase 1 del trabajo

Varios de estos controles responden directamente a brechas que encontramos
al analizar sitios reales en la Fase 1: por ejemplo, Studio F no tenia
`Strict-Transport-Security` ni `Content-Security-Policy` en sus respuestas;
aqui las agregamos desde el primer dia con `helmet`.

## Estructura del proyecto

```
secure-app/
├── server.js              # punto de entrada, middlewares de seguridad
├── config/
│   ├── db.js               # conexion SQLite + definicion de tablas
│   └── seed.js              # datos de prueba
├── middleware/
│   └── auth.js              # requireAuth / requireAdmin
├── routes/
│   ├── auth.js               # registro, login, logout, sesion
│   └── products.js           # CRUD del catalogo
└── public/                  # frontend (HTML/CSS/JS plano)
```

## Backlog de Scrum sugerido (para completar en Trello/Jira)

**Sprint 1**
- Como usuario quiero registrarme con una contrasena segura
- Como usuario quiero iniciar sesion de forma segura
- Como visitante quiero ver el catalogo de productos sin necesidad de login

**Sprint 2**
- Como administrador quiero agregar productos al catalogo
- Como administrador quiero eliminar productos
- Como usuario quiero buscar productos por nombre o descripcion

**Sprint 3 (pulido y seguridad)**
- Como equipo queremos agregar cabeceras de seguridad HTTP (helmet)
- Como equipo queremos bloquear cuentas tras intentos fallidos de login
- Como equipo queremos documentar los controles OWASP aplicados
