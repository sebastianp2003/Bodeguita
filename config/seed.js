// config/seed.js
// Inicialización de Bodeguita.
// Crea un administrador inicial y productos de demostración.
// Ejecutar con: npm run seed

require('dotenv').config();

const bcrypt = require('bcrypt');
const db = require('./db');

const SALT_ROUNDS = 12;

async function seed() {
  try {
    const adminName = process.env.ADMIN_NAME || 'Administrador';
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      throw new Error(
        'Configura ADMIN_EMAIL y ADMIN_PASSWORD en el archivo .env antes de ejecutar el seed.'
      );
    }

    if (adminPassword.length < 8 ||
        !/[A-Z]/.test(adminPassword) ||
        !/[a-z]/.test(adminPassword) ||
        !/[0-9]/.test(adminPassword)) {
      throw new Error(
        'La contraseña del administrador debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número.'
      );
    }

    let admin = db
      .prepare('SELECT id FROM users WHERE email = ?')
      .get(adminEmail);

    if (!admin) {
      const hash = await bcrypt.hash(adminPassword, SALT_ROUNDS);

      const info = db
        .prepare(`
          INSERT INTO users (name, email, password_hash, role)
          VALUES (?, ?, ?, ?)
        `)
        .run(adminName, adminEmail, hash, 'admin');

      admin = { id: info.lastInsertRowid };

      console.log('Administrador inicial creado correctamente.');
    } else {
      console.log('El administrador ya existe. No se modificaron sus datos.');
    }

    const count = db
      .prepare('SELECT COUNT(*) AS total FROM products')
      .get().total;

    if (count === 0) {
      const insert = db.prepare(`
        INSERT INTO products (
          name,
          description,
          price,
          category,
          stock,
          created_by
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      const products = [
        [
          'Camiseta básica',
          'Camiseta de algodón 100%, disponible en varios colores.',
          39900,
          'ropa',
          50
        ],
        [
          'Jean clásico',
          'Jean de corte recto, disponible en tallas S a XL.',
          129900,
          'ropa',
          30
        ],
        [
          'Zapatillas urbanas',
          'Zapatillas cómodas para uso diario con suela de goma.',
          189900,
          'calzado',
          20
        ],
        [
          'Mochila escolar',
          'Mochila resistente al agua con capacidad de 20 litros.',
          89900,
          'accesorios',
          15
        ],
        [
          'Gorra deportiva',
          'Gorra ajustable con protección UV.',
          29900,
          'accesorios',
          40
        ]
      ];

      const insertMany = db.transaction((items) => {
        for (const product of items) {
          insert.run(...product, admin.id);
        }
      });

      insertMany(products);

      console.log(`${products.length} productos de ejemplo insertados.`);
    } else {
      console.log('Ya existen productos. No se insertaron duplicados.');
    }

    console.log('Inicialización de Bodeguita completada.');

  } catch (error) {
    console.error('Error durante la inicialización:', error.message);
    process.exitCode = 1;
  } finally {
    db.close();
  }
}

seed();