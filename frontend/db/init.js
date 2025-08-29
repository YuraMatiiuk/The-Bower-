const Database = require('better-sqlite3');
const db = new Database('./db/database.sqlite');

db.prepare(`
CREATE TABLE IF NOT EXISTS donors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  email TEXT,
  address TEXT,
  postcode TEXT
);
`).run();

db.prepare(`
CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  donor_id INTEGER,
  name TEXT,
  category TEXT,
  condition TEXT,
  accepted BOOLEAN,
  FOREIGN KEY(donor_id) REFERENCES donors(id)
);
`).run();

db.prepare(`
CREATE TABLE IF NOT EXISTS collections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER,
  collection_date TEXT,
  status TEXT,
  FOREIGN KEY(item_id) REFERENCES items(id)
);
`).run();

console.log('Database initialized.');
