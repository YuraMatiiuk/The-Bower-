// pages/api/driver/pickups/index.js
import Database from "better-sqlite3";
import { requireRole } from "../../../../lib/auth"; // adjust if your helper name differs

export default function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  // Require "driver" role (change to requireLoggedIn if you prefer)
  const me = requireRole(req, res, ["driver", "admin"]);
  if (!me) return; // requireRole already sent 401

  const date = (req.query.date || "").toString().slice(0, 10); // YYYY-MM-DD
  if (!date) return res.status(400).json({ error: "missing_date" });

  const db = new Database("db/database.sqlite");
  try {
    // NOTE: only selecting columns that exist in your posted schema
    const rows = db
      .prepare(
        `
        SELECT
          b.id               AS booking_id,
          i.id               AS item_id,
          i.name             AS item_name,
          i.category         AS category,
          i.condition        AS condition,
          i.image_url        AS image_url,
          i.collection_date  AS collection_date,
          i.time_slot        AS time_slot,
          i.status           AS item_status,
          b.status           AS booking_status,
          d.name             AS donor_name,
          d.email            AS donor_email,
          d.address          AS donor_address,
          d.postcode         AS donor_postcode
        FROM bookings b
        JOIN items   i ON i.id = b.item_id
        LEFT JOIN donors d ON d.id = i.donor_id
        WHERE b.type = 'collection'
          AND b.scheduled_date = ?
        ORDER BY i.time_slot, i.name
        `
      )
      .all(date);

    return res.status(200).json({ pickups: rows });
  } catch (e) {
    console.error("Driver pickups error:", e);
    return res.status(500).json({ error: "server_error" });
  } finally {
    try { db.close(); } catch {}
  }
}