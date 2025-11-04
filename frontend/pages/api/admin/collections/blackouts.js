// pages/api/admin/collections/blackouts.js
import Database from "better-sqlite3";
import { requireAdmin } from "../../../../lib/auth";

const db = new Database("./db/database.sqlite");
db.exec(`
CREATE TABLE IF NOT EXISTS collection_blackouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,            -- YYYY-MM-DD
  time_slot TEXT                  -- null means whole day
);
`);

export default function handler(req, res) {
  const admin = requireAdmin(req, res);
  if (!admin) return;

  if (req.method === "GET") {
    const blackouts = db
      .prepare(`SELECT id, date, time_slot FROM collection_blackouts ORDER BY date ASC, time_slot ASC`)
      .all();
    return res.status(200).json({ blackouts });
  }

  if (req.method === "POST") {
    const { date, time_slot } = req.body || {};
    if (!date) return res.status(400).json({ error: "date_required" });

    const info = db
      .prepare(`INSERT INTO collection_blackouts (date, time_slot) VALUES (?, ?)`)
      .run(String(date), time_slot ? String(time_slot) : null);

    return res.status(201).json({ id: info.lastInsertRowid, date, time_slot: time_slot || null });
  }

  if (req.method === "DELETE") {
    const id = Number(req.query.id);
    if (!id) return res.status(400).json({ error: "missing_id" });
    db.prepare(`DELETE FROM collection_blackouts WHERE id = ?`).run(id);
    return res.status(200).json({ ok: true, id });
  }

  return res.status(405).json({ error: "method_not_allowed" });
}