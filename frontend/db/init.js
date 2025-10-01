// db/init.js
const Database = require('better-sqlite3');
const db = new Database('./db/database.sqlite');

// USERS TABLE
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


// DONORS TABLE
db.prepare(`
CREATE TABLE IF NOT EXISTS donors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  email TEXT,
  address TEXT,
  postcode TEXT
);
`).run();

// ITEMS TABLE
db.prepare(`
CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  donor_id INTEGER,
  name TEXT,
  category TEXT,
  condition TEXT,
  accepted BOOLEAN DEFAULT 0,
  status TEXT CHECK(status IN ('pending','approved','rejected','collected','delivered')) DEFAULT 'pending',
  image_url TEXT,
  FOREIGN KEY(donor_id) REFERENCES donors(id)
);
`).run();

// WAREHOUSES TABLE
db.prepare(`
CREATE TABLE IF NOT EXISTS warehouses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  location TEXT,
  total_capacity INTEGER NOT NULL,
  used_capacity INTEGER DEFAULT 0
);
`).run();

// BOOKINGS TABLE
db.prepare(`
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL,
  type TEXT CHECK(type IN ('collection', 'delivery')) NOT NULL,
  scheduled_date TEXT NOT NULL,
  status TEXT CHECK(status IN ('pending', 'confirmed', 'completed', 'cancelled')) DEFAULT 'pending',
  truck_capacity_used INTEGER DEFAULT 0,
  warehouse_id INTEGER,
  FOREIGN KEY(item_id) REFERENCES items(id),
  FOREIGN KEY(warehouse_id) REFERENCES warehouses(id)
);
`).run();

// ORDERS TABLE
db.prepare(`
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  caseworker_id INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  status TEXT CHECK(status IN ('pending', 'confirmed', 'delivered')) DEFAULT 'pending',
  FOREIGN KEY(caseworker_id) REFERENCES users(id)
);
`).run();

// RESERVATION TABLE
db.prepare(`
CREATE TABLE IF NOT EXISTS reservations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL,
  caseworker_name TEXT NOT NULL,
  agency TEXT,
  reserved_at TEXT DEFAULT CURRENT_TIMESTAMP,
  status TEXT CHECK(status IN ('reserved', 'delivered', 'cancelled')) DEFAULT 'reserved',
  FOREIGN KEY(item_id) REFERENCES items(id)
);
`).run();

// ORDER_ITEMS TABLE
db.prepare(`
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  item_id INTEGER NOT NULL,
  FOREIGN KEY(order_id) REFERENCES orders(id),
  FOREIGN KEY(item_id) REFERENCES items(id)
);
`).run();

console.log('✅ Database initialized with all tables.');
