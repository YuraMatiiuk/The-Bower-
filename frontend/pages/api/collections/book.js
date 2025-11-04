// pages/api/collections/book.js
import Database from "better-sqlite3";
import jwt from "jsonwebtoken";

const db = new Database("./db/database.sqlite");
const SECRET = process.env.JWT_SECRET || "supersecretkey";
const SLOTS = new Set(["9-12", "12-3", "3-5"]);

function getUserId(req) {
  const t = req.cookies?.auth;
  if (!t) return null;
  try {
    const p = jwt.verify(t, SECRET);
    return p?.id || null;
  } catch {
    return null;
  }
}

export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { itemId, date, timeSlot } = req.body || {};
  if (!itemId || !date || !SLOTS.has(timeSlot)) {
    return res.status(400).json({ error: "bad_input" });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
    return res.status(400).json({ error: "bad_date" });
  }

  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "unauth" });

  const donor = db
    .prepare("SELECT id FROM donors WHERE user_id = ?")
    .get(userId);
  if (!donor) return res.status(400).json({ error: "no_donor_profile" });

  const item = db
    .prepare("SELECT id, donor_id, status FROM items WHERE id = ?")
    .get(itemId);
  if (!item || item.donor_id !== donor.id) {
    return res.status(404).json({ error: "item_not_found" });
  }

  const wholeBlocked = db
    .prepare(
      "SELECT 1 FROM collection_blackouts WHERE date=? AND time_slot IS NULL LIMIT 1"
    )
    .get(date);
  const slotBlocked = db
    .prepare(
      "SELECT 1 FROM collection_blackouts WHERE date=? AND time_slot=? LIMIT 1"
    )
    .get(date, timeSlot);
  if (wholeBlocked || slotBlocked) {
    return res.status(400).json({ error: "blocked" });
  }

  const baseCapRow = db
    .prepare(
      "SELECT COALESCE(SUM(capacity_per_slot),0) AS cap FROM trucks WHERE active=1"
    )
    .get();
  const override = db
    .prepare(
      "SELECT capacity FROM collection_capacity_overrides WHERE date=? AND time_slot=?"
    )
    .get(date, timeSlot);
  const cap = (override?.capacity ?? baseCapRow?.cap) || 0;
  if (cap <= 0) return res.status(400).json({ error: "no_capacity" });

  const tx = db.transaction(() => {
    const used =
      db
        .prepare(
          `SELECT COUNT(*) AS n FROM bookings
           WHERE type='collection' AND scheduled_date=? AND time_slot=? AND status IN ('pending','confirmed')`
        )
        .get(date, timeSlot)?.n || 0;
    if (used >= cap) throw new Error("full");

    db.prepare(
      `INSERT INTO bookings (item_id, type, scheduled_date, time_slot, status)
       VALUES (?, 'collection', ?, ?, 'pending')`
    ).run(itemId, date, timeSlot);

    // keep item as approved or set a specific scheduled status if you added one
    if (item.status === "pending") {
      db.prepare("UPDATE items SET status='approved' WHERE id=?").run(itemId);
    }
  });

  try {
    tx();
    return res.status(201).json({ ok: true });
  } catch (e) {
    if (e.message === "full") return res.status(409).json({ error: "slot_full" });
    return res.status(500).json({ error: "server_error" });
  }
}