const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, '..', '..', 'index.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS business_profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      shop_name TEXT NOT NULL,
      tagline TEXT,
      owners_json TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS garment_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS garment_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      unit_price INTEGER NOT NULL CHECK (unit_price >= 0),
      UNIQUE (category_id, name),
      FOREIGN KEY (category_id) REFERENCES garment_categories(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      deposit_date TEXT NOT NULL,
      pickup_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'en_attente' CHECK (status IN ('en_attente', 'lave', 'livre')),
      total_amount INTEGER NOT NULL,
      paid_amount INTEGER NOT NULL DEFAULT 0,
      payment_status TEXT NOT NULL DEFAULT 'impaye' CHECK (payment_status IN ('impaye', 'partiel', 'paye')),
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      garment_type_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      unit_price INTEGER NOT NULL CHECK (unit_price >= 0),
      line_total INTEGER NOT NULL CHECK (line_total >= 0),
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (garment_type_id) REFERENCES garment_types(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      amount INTEGER NOT NULL CHECK (amount > 0),
      payment_method TEXT NOT NULL DEFAULT 'cash',
      paid_at TEXT NOT NULL,
      note TEXT,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
    CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
  `);

  const profileCount = db.prepare('SELECT COUNT(*) AS count FROM business_profile').get().count;
  if (profileCount === 0) {
    db.prepare(
      `
      INSERT INTO business_profile (
        id,
        shop_name,
        tagline,
        owners_json,
        phone,
        address
      ) VALUES (?, ?, ?, ?, ?, ?)
      `
    ).run(
      1,
      'Pressing Flow',
      'Votre pressing organise comme une vraie boutique',
      JSON.stringify(['M. Olivier Ndzi', 'Mme Sarah Mbarga']),
      '+237 6 90 00 00 00',
      'Douala - Bonamoussadi'
    );
  }

  const categoryCount = db.prepare('SELECT COUNT(*) AS count FROM garment_categories').get().count;
  if (categoryCount > 0) {
    return;
  }

  const insertCategory = db.prepare(
    'INSERT INTO garment_categories (name, description) VALUES (?, ?)'
  );
  const insertType = db.prepare(
    'INSERT INTO garment_types (category_id, name, unit_price) VALUES (?, ?, ?)'
  );

  const seed = db.transaction(() => {
    const categories = [
      {
        name: 'Hauts',
        description: 'Chemises, t-shirts, polos',
        items: [
          { name: 'Chemise', unitPrice: 1000 },
          { name: 'T-shirt', unitPrice: 700 },
          { name: 'Polo', unitPrice: 900 }
        ]
      },
      {
        name: 'Bas',
        description: 'Pantalons, jeans, shorts',
        items: [
          { name: 'Pantalon', unitPrice: 1200 },
          { name: 'Jean', unitPrice: 1300 },
          { name: 'Short', unitPrice: 800 }
        ]
      },
      {
        name: 'Traditionnel',
        description: 'Boubous et tenues traditionnelles',
        items: [
          { name: 'Boubou simple', unitPrice: 2000 },
          { name: 'Boubou brode', unitPrice: 3000 }
        ]
      },
      {
        name: 'Maison',
        description: 'Draps et linge de maison',
        items: [
          { name: 'Drap', unitPrice: 1500 },
          { name: 'Couverture', unitPrice: 2500 }
        ]
      }
    ];

    for (const category of categories) {
      const result = insertCategory.run(category.name, category.description);
      for (const item of category.items) {
        insertType.run(result.lastInsertRowid, item.name, item.unitPrice);
      }
    }
  });

  seed();
}

module.exports = {
  db,
  initDb
};
