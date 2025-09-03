// db/init.js
const Database = require('better-sqlite3');
const db = new Database('./db/database.sqlite');

// USERS TABLE
db.prepare(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT CHECK(role IN ('donor', 'admin', 'driver', 'caseworker')) NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`).run();

// DONORS TABLE
db.prepare(`
CREATE TABLE IF NOT EXISTS donors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  address TEXT,
  postcode TEXT,
  phone TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id)
);
`).run();

// ITEMS TABLE
db.prepare(`
CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  donor_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  condition TEXT CHECK(condition IN ('excellent', 'good', 'fair', 'poor')) NOT NULL,
  image_url TEXT,
  status TEXT CHECK(status IN ('pending', 'approved', 'rejected', 'collected', 'delivered')) DEFAULT 'pending',
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
