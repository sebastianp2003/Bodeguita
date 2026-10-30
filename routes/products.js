// routes/products.js
// CRUD del catalogo. Lectura publica; creacion/edicion/borrado solo admin.
// Controles OWASP aplicados:
//  - A01 Control de acceso -> requireAdmin en escritura (verificado en servidor).
//  - A03 Inyeccion -> consultas preparadas, incluso en la busqueda con LIKE.
//  - Validacion de entradas -> express-validator en creacion/edicion.

const express = require('express');
const { body, query, validationResult } = require('express-validator');
const db = require('../config/db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Datos invalidos.', details: errors.array() });
  }
  next();
}

// --- LISTAR / BUSCAR (publico) ---
router.get(
  '/',
  [query('q').optional().trim().isLength({ max: 100 }).escape()],
  handleValidation,
  (req, res) => {
    const { q, category } = req.query;

    // Consulta preparada: el texto de busqueda SIEMPRE viaja como parametro
    // enlazado (?), nunca concatenado al string SQL. Esto es lo que previene
    // la inyeccion SQL aunque el usuario escriba cosas como  ' OR '1'='1
    let sql = 'SELECT id, name, description, price, category, stock FROM products WHERE 1=1';
    const params = [];

    if (q) {
      sql += ' AND (name LIKE ? OR description LIKE ?)';
      params.push(`%${q}%`, `%${q}%`);
    }
    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }
    sql += ' ORDER BY created_at DESC';

    const products = db.prepare(sql).all(...params);
    res.json({ count: products.length, products });
  }
);

// --- DETALLE (publico) ---
router.get('/:id(\\d+)', (req, res) => {
  const product = db
    .prepare('SELECT id, name, description, price, category, stock FROM products WHERE id = ?')
    .get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Producto no encontrado.' });
  res.json({ product });
});

// --- CREAR (solo admin) ---
router.post(
  '/',
  requireAdmin,
  [
    body('name').trim().isLength({ min: 2, max: 120 }).escape(),
    body('description').trim().isLength({ min: 2, max: 500 }).escape(),
    body('price').isFloat({ min: 0 }),
    body('category').trim().isLength({ min: 2, max: 50 }).escape(),
    body('stock').isInt({ min: 0 }),
  ],
  handleValidation,
  (req, res) => {
    const { name, description, price, category, stock } = req.body;
    const info = db
      .prepare(
        'INSERT INTO products (name, description, price, category, stock, created_by) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .run(name, description, price, category, stock, req.session.userId);
    res.status(201).json({ message: 'Producto creado.', id: info.lastInsertRowid });
  }
);

// --- ELIMINAR (solo admin) ---
router.delete('/:id(\\d+)', requireAdmin, (req, res) => {
  const info = db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Producto no encontrado.' });
  res.json({ message: 'Producto eliminado.' });
});

module.exports = router;
