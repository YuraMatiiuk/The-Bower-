// pages/api/driver/items/add-extra.js
import Database from "better-sqlite3";
import jwt from "jsonwebtoken";
import { parse as parseCookie } from "cookie";

const JWT_NAME = "token";
const JWT_SECRET = process.env.JWT_SECRET || "dev_fallback_secret";

function requireDriver(req) {
  const raw = req.headers.cookie || "";
  const token = parseCookie(raw || "")[JWT_NAME];
  if (!token) return null;
  try {
    const u = jwt.verify(token, JWT_SECRET);
    if (u?.role === "driver" || u?.role === "admin") return u;
    return null;
  } catch { return null; }
}

export default function handler(req, res) {
  const user = requireDriver(req);
  if (!user) return res.status(401).json({ error: "unauthorized" });
  if (req.method !== "POST") return res.status(405).end();

  const { bookingId, name, category, condition } = req.body || {};
  if (!bookingId || !name || !category || !condition) {
    return res.status(400).json({ error: "missing_fields" });
  }

  const db = new Database("db/database.sqlite");
  try {
    const tx = db.transaction((bid, nm, cat, cond) => {
      const b = db.prepare(
        `SELECT b.*, i.donor_id FROM bookings b 
         JOIN items i ON i.id=b.item_id 
         WHERE b.id=?`
      ).get(bid);
      if (!b) throw new Error("booking_not_found");

      // Create new item for the same donor
      const insItem = db.prepare(
        `INSERT INTO items (donor_id, name, category, condition, accepted, status, image_url)
         VALUES (?, ?, ?, ?, 1, 'collected', NULL)`
      ).run(b.donor_id || null, String(nm), String(cat), String(cond));
      const newItemId = insItem.lastInsertRowid;

      // Create a new booking row (same date/slot), mark completed immediately
      db.prepare(
        `INSERT INTO bookings (item_id, type, scheduled_date, status, truck_capacity_used, warehouse_id, id)
         SELECT ?, 'collection', scheduled_date, 'completed', 0, warehouse_id, NULL
         FROM bookings WHERE id=?`
      ).run(newItemId, bid);

      return { itemId: newItemId };
    });

    const out = tx(bookingId, name, category, condition);
    return res.status(201).json({ ok: true, ...out });
  } catch (e) {
    console.error("add-extra error:", e);
    return res.status(400).json({ error: "add_extra_failed" });
  } finally {
    try { db.close(); } catch {}
  }
}