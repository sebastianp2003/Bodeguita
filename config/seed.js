// config/seed.js
// Crea un usuario administrador inicial y algunos productos de ejemplo.
// Ejecutar con: npm run seed

const bcrypt = require('bcrypt');
const db = require('./db');

const SALT_ROUNDS = 12; // factor de costo recomendado para bcrypt en 2024+

function seed() {
  const existingAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@catalogo.test');

  if (!existingAdmin) {
    const hash = bcrypt.hashSync('Admin123!Seguro', SALT_ROUNDS);
    db.prepare(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)'
    ).run('Administrador', 'admin@catalogo.test', hash, 'admin');
    console.log('Usuario admin creado -> admin@catalogo.test / Admin123!Seguro');
  } else {
    console.log('El usuario admin ya existia, no se duplico.');
  }

  const count = db.prepare('SELECT COUNT(*) AS c FROM products').get().c;
  if (count === 0) {
    const admin = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@catalogo.test');
    const insert = db.prepare(
      'INSERT INTO products (name, description, price, category, stock, created_by) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const productos = [
      ['Camiseta basica', 'Camiseta de algodon 100%, varios colores', 39900, 'ropa', 50],
      ['Jean clasico', 'Jean corte recto, talla S a XL', 129900, 'ropa', 30],
      ['Zapatillas urbanas', 'Zapatillas para uso diario, suela de goma', 189900, 'calzado', 20],
      ['Mochila escolar', 'Mochila resistente al agua, 20L', 89900, 'accesorios', 15],
      ['Gorra deportiva', 'Gorra ajustable, proteccion UV', 29900, 'accesorios', 40],
    ];
    for (const p of productos) insert.run(...p, admin.id);
    console.log(`${productos.length} productos de ejemplo insertados.`);
  } else {
    console.log('Ya existian productos, no se insertaron de nuevo.');
  }
}

seed();
