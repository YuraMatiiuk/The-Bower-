// pages/api/collections/slots.js
import Database from "better-sqlite3";

const db = new Database("./db/database.sqlite");
const SLOTS = ["9-12", "12-3", "3-5"];

export default function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  const date = String(req.query.date || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: "bad_date" });
  }

  const wholeBlocked = db
    .prepare(
      "SELECT 1 FROM collection_blackouts WHERE date=? AND time_slot IS NULL LIMIT 1"
    )
    .get(date);

  const baseCapRow = db
    .prepare(
      "SELECT COALESCE(SUM(capacity_per_slot),0) AS cap FROM trucks WHERE active=1"
    )
    .get();
  const baseCap = baseCapRow?.cap || 0;

  const slots = SLOTS.map((slot) => {
    const slotBlocked = db
      .prepare(
        "SELECT 1 FROM collection_blackouts WHERE date=? AND time_slot=? LIMIT 1"
      )
      .get(date, slot);
    const override = db
      .prepare(
        "SELECT capacity FROM collection_capacity_overrides WHERE date=? AND time_slot=?"
      )
      .get(date, slot);
    const cap = (override?.capacity ?? baseCap) || 0;

    let used = 0;
    if (!wholeBlocked && !slotBlocked && cap > 0) {
      used =
        db
          .prepare(
            `SELECT COUNT(*) AS n FROM bookings
             WHERE type='collection' AND scheduled_date=? AND time_slot=? AND status IN ('pending','confirmed')`
          )
          .get(date, slot)?.n || 0;
    }
    const blocked = !!wholeBlocked || !!slotBlocked || cap <= 0;
    const available = blocked ? 0 : Math.max(cap - used, 0);
    return { slot, capacity: cap, used, available, blocked };
  });

  res.status(200).json({ date, slots });
}