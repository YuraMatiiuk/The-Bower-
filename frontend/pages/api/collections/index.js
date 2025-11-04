// pages/api/collections/index.js
import Database from "better-sqlite3";
import { requireLoggedIn } from "../../../lib/auth"; // depth: pages/api/collections -> ../../../lib/auth

export default function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const me = requireLoggedIn(req, res);
  if (!me) return; // 401 already sent

  const db = new Database("db/database.sqlite");
  try {
    // We list *this donor's* booked collections (or all, if you intentionally allow admin to see their own)
    // Items are tied to donors via donors.id == items.donor_id,
    // donors.user_id points to users.id
    const rows = db
      .prepare(
        `
        SELECT
          b.id                             AS booking_id,
          b.item_id                        AS item_id,
          b.scheduled_date                 AS date,
          b.time_slot                      AS time_slot,
          b.status                         AS booking_status,

          i.name                           AS item_name,
          i.category                       AS item_category,
          i.condition                      AS item_condition,
          i.image_url                      AS image_url,
          i.status                         AS item_status,

          d.name                           AS donor_name,
          d.email                          AS donor_email,
          d.address                        AS donor_address,
          d.postcode                       AS donor_postcode
        FROM bookings b
        JOIN items   i ON i.id = b.item_id
        JOIN donors  d ON d.id = i.donor_id
        WHERE d.user_id = @uid
        ORDER BY b.scheduled_date ASC, b.time_slot ASC, b.id ASC
        `
      )
      .all({ uid: me.id });

    console.log("[collections:list]", me.email, "rows=", rows.length);

    return res.status(200).json({ ok: true, bookings: rows });
  } catch (e) {
    console.error("collections GET error:", e);
    return res.status(500).json({ ok: false, error: "server_error" });
  } finally {
    try { db.close(); } catch {}
  }
}