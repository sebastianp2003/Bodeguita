// config/db.js
// Conexión centralizada a SQLite mediante better-sqlite3.
// Seguridad OWASP A03:2021 - Prevención de inyección SQL.

const path = require('path');
const Database = require('better-sqlite3');

// Ubicación de la base de datos.
const dbPath = path.join(__dirname, '..', 'data.sqlite');

const db = new Database(dbPath);

// Configuración de SQLite.
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');
db.pragma('synchronous = NORMAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user'
      CHECK (role IN ('user', 'admin')),
    failed_attempts INTEGER NOT NULL DEFAULT 0
      CHECK (failed_attempts >= 0),
    locked_until INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    price REAL NOT NULL CHECK (price >= 0),
    category TEXT NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    created_by INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
      ON DELETE SET NULL
  );
`);

module.exports = db;