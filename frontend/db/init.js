// db/init.js
const Database = require('better-sqlite3');
const db = new Database('./db/database.sqlite');

// Always enable FKs + good WAL mode
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

// USERS
db.prepare(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT CHECK(role IN ('donor','caseworker','driver','admin')) NOT NULL DEFAULT 'donor',
  phone TEXT,
  address TEXT,
  suburb TEXT,
  postcode TEXT
);
`).run();

// DONORS (now linked to users)
db.prepare(`
CREATE TABLE IF NOT EXISTS donors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE,                 -- link to users.id (1:1 donor profile)
  name TEXT,
  email TEXT,
  address TEXT,
  suburb TEXT,
  postcode TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
`).run();

// CATEGORIES (admin-manageable)
db.prepare(`
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);
`).run();

// ITEMS (add category_id nullable to support category table)
db.prepare(`
CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  donor_id INTEGER,
  name TEXT NOT NULL,
  category TEXT,                       -- legacy free-text (kept for now)
  category_id INTEGER,                 -- normalized category ref
  condition TEXT,                      -- validated in API ('excellent','good','fair','poor')
  accepted INTEGER NOT NULL DEFAULT 0, -- BOOLEAN-ish 0/1
  status TEXT CHECK(status IN ('pending','approved','rejected','collected','delivered')) NOT NULL DEFAULT 'pending',
  image_url TEXT,
  FOREIGN KEY(donor_id) REFERENCES donors(id) ON DELETE SET NULL,
  FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE SET NULL
);
`).run();

// WAREHOUSES
db.prepare(`
CREATE TABLE IF NOT EXISTS warehouses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  location TEXT,
  total_capacity INTEGER NOT NULL,
  used_capacity INTEGER NOT NULL DEFAULT 0
);
`).run();

// BOOKINGS (collections/deliveries)
db.prepare(`
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL,
  type TEXT CHECK(type IN ('collection','delivery')) NOT NULL,
  scheduled_date TEXT NOT NULL,
  time_slot TEXT, -- e.g. '9-12','12-3','3-5'
  status TEXT CHECK(status IN ('pending','confirmed','completed','cancelled')) NOT NULL DEFAULT 'pending',
  truck_capacity_used INTEGER NOT NULL DEFAULT 0,
  warehouse_id INTEGER,
  FOREIGN KEY(item_id) REFERENCES items(id) ON DELETE CASCADE,
  FOREIGN KEY(warehouse_id) REFERENCES warehouses(id) ON DELETE SET NULL
);
`).run();

// ORDERS
db.prepare(`
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  caseworker_id INTEGER NOT NULL, -- references users.id
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status TEXT CHECK(status IN ('pending','confirmed','delivered')) NOT NULL DEFAULT 'pending',
  FOREIGN KEY(caseworker_id) REFERENCES users(id) ON DELETE CASCADE
);
`).run();

// RESERVATIONS
db.prepare(`
CREATE TABLE IF NOT EXISTS reservations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL,
  caseworker_name TEXT NOT NULL, -- we can evolve to caseworker_id later
  agency TEXT,
  reserved_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status TEXT CHECK(status IN ('reserved','delivered','cancelled')) NOT NULL DEFAULT 'reserved',
  FOREIGN KEY(item_id) REFERENCES items(id) ON DELETE CASCADE
);
`).run();

// ORDER_ITEMS
db.prepare(`
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  item_id INTEGER NOT NULL,
  FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY(item_id) REFERENCES items(id) ON DELETE CASCADE
);
`).run();

// SERVICE AREAS (keep here so teammates have it)
db.prepare(`
CREATE TABLE IF NOT EXISTS service_areas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  postcode TEXT NOT NULL,
  suburb TEXT NOT NULL,
  suburb_norm TEXT GENERATED ALWAYS AS (UPPER(TRIM(suburb))) VIRTUAL,
  UNIQUE(postcode, suburb_norm)
);
`).run();

// Helpful indexes
db.prepare(`CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);`).run();
db.prepare(`CREATE INDEX IF NOT EXISTS idx_items_donor ON items(donor_id);`).run();
db.prepare(`CREATE INDEX IF NOT EXISTS idx_reservations_item ON reservations(item_id);`).run();
db.prepare(`CREATE INDEX IF NOT EXISTS idx_bookings_item ON bookings(item_id);`).run();

console.log('✅ Database initialized / migrated.');