const express = require('express');
const {
  body,
  query,
  param,
  validationResult
} = require('express-validator');

const db = require('../config/db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

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

router.get(
  '/',
  [
    query('q')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('La búsqueda no puede superar los 100 caracteres.'),

    query('category')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('La categoría no es válida.')
  ],
  handleValidation,
  (req, res) => {
    try {
      const q = req.query.q || '';
      const category = req.query.category || '';

      let sql = `
        SELECT id, name, description, price, category, stock
        FROM products
        WHERE 1 = 1
      `;

      const params = [];

      if (q) {
        sql += `
          AND (
            name LIKE ?
            OR description LIKE ?
          )
        `;

        params.push(`%${q}%`, `%${q}%`);
      }

      if (category) {
        sql += ' AND category = ?';
        params.push(category);
      }

      sql += ' ORDER BY created_at DESC';

      const products = db.prepare(sql).all(...params);

      res.json({
        count: products.length,
        products
      });

    } catch (error) {
      console.error('Error consultando productos:', error);

      res.status(500).json({
        error: 'No fue posible cargar los productos.'
      });
    }
  }
);

router.get(
  '/:id(\\d+)',
  [
    param('id')
      .isInt({ min: 1 })
      .withMessage('El identificador del producto no es válido.')
  ],
  handleValidation,
  (req, res) => {
    try {
      const product = db
        .prepare(`
          SELECT id, name, description, price, category, stock
          FROM products
          WHERE id = ?
        `)
        .get(req.params.id);

      if (!product) {
        return res.status(404).json({
          error: 'Producto no encontrado.'
        });
      }

      res.json({ product });

    } catch (error) {
      console.error('Error consultando producto:', error);

      res.status(500).json({
        error: 'No fue posible consultar el producto.'
      });
    }
  }
);

router.post(
  '/',
  requireAdmin,
  [
    body('name')
      .trim()
      .isLength({ min: 2, max: 120 })
      .withMessage('El nombre debe tener entre 2 y 120 caracteres.'),

    body('description')
      .trim()
      .isLength({ min: 2, max: 500 })
      .withMessage('La descripción debe tener entre 2 y 500 caracteres.'),

    body('price')
      .isFloat({ min: 0, max: 999999999 })
      .withMessage('El precio debe ser un número válido y no negativo.')
      .toFloat(),

    body('category')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('La categoría debe tener entre 2 y 50 caracteres.'),

    body('stock')
      .isInt({ min: 0, max: 999999999 })
      .withMessage('El inventario debe ser un número entero no negativo.')
      .toInt()
  ],
  handleValidation,
  (req, res) => {
    try {
      const {
        name,
        description,
        price,
        category,
        stock
      } = req.body;

      const info = db
        .prepare(`
          INSERT INTO products (
            name,
            description,
            price,
            category,
            stock,
            created_by
          )
          VALUES (?, ?, ?, ?, ?, ?)
        `)
        .run(
          name,
          description,
          price,
          category,
          stock,
          req.session.userId
        );

      res.status(201).json({
        message: 'Producto agregado correctamente.',
        id: info.lastInsertRowid
      });

    } catch (error) {
      console.error('Error creando producto:', error);

      res.status(500).json({
        error: 'No fue posible agregar el producto.'
      });
    }
  }
);

router.delete(
  '/:id(\\d+)',
  requireAdmin,
  [
    param('id')
      .isInt({ min: 1 })
      .withMessage('El identificador del producto no es válido.')
  ],
  handleValidation,
  (req, res) => {
    try {
      const info = db
        .prepare('DELETE FROM products WHERE id = ?')
        .run(req.params.id);

      if (info.changes === 0) {
        return res.status(404).json({
          error: 'Producto no encontrado.'
        });
      }

      res.json({
        message: 'Producto eliminado correctamente.'
      });

    } catch (error) {
      console.error('Error eliminando producto:', error);

      res.status(500).json({
        error: 'No fue posible eliminar el producto.'
      });
    }
  }
);

module.exports = router;