// pages/api/admin/collections/capacity.js
import Database from "better-sqlite3";
import { requireAdmin } from "../../../../lib/auth";

const db = new Database("./db/database.sqlite");
db.exec(`
CREATE TABLE IF NOT EXISTS collection_capacity_overrides (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,        -- YYYY-MM-DD
  time_slot TEXT NOT NULL,   -- e.g. '9-12'
  capacity INTEGER NOT NULL
);
`);

export default function handler(req, res) {
  const admin = requireAdmin(req, res);
  if (!admin) return;

  if (req.method === "GET") {
    const overrides = db
      .prepare(
        `SELECT id, date, time_slot, capacity
         FROM collection_capacity_overrides
         ORDER BY date ASC, time_slot ASC`
      )
      .all();
    return res.status(200).json({ overrides });
  }

  if (req.method === "POST") {
    const { date, time_slot, capacity } = req.body || {};
    if (!date || !time_slot || typeof capacity !== "number")
      return res.status(400).json({ error: "date_time_slot_capacity_required" });

    const info = db
      .prepare(
        `INSERT INTO collection_capacity_overrides (date, time_slot, capacity)
         VALUES (?, ?, ?)`
      )
      .run(String(date), String(time_slot), Number(capacity));

    return res
      .status(201)
      .json({ id: info.lastInsertRowid, date, time_slot, capacity: Number(capacity) });
  }

  if (req.method === "DELETE") {
    const id = Number(req.query.id);
    if (!id) return res.status(400).json({ error: "missing_id" });

    db.prepare(`DELETE FROM collection_capacity_overrides WHERE id = ?`).run(id);
    return res.status(200).json({ ok: true, id });
  }

  return res.status(405).json({ error: "method_not_allowed" });
}