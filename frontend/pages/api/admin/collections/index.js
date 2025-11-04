// pages/api/admin/collections/index.js
import Database from "better-sqlite3";
import { requireAdmin } from "../../../../lib/auth";

export default function handler(req, res) {
  const admin = requireAdmin(req, res);
  if (!admin) return; // 401/403 already sent

  const db = new Database("db/database.sqlite");
  try {
    if (req.method === "GET") {
      // All bookings (both collection and delivery if you ever use both)
      const rows = db.prepare(`
        SELECT 
          b.id            AS booking_id,
          b.item_id,
          b.type,
          b.scheduled_date AS date,
          b.time_slot,
          b.status        AS booking_status,
          i.name          AS item_name,
          i.status        AS item_status,
          i.image_url,
          d.name          AS donor_name,
          d.email         AS donor_email,
          d.address       AS donor_address,
          d.postcode      AS donor_postcode
        FROM bookings b
        LEFT JOIN items i   ON i.id = b.item_id
        LEFT JOIN donors d  ON d.id = i.donor_id
        ORDER BY b.scheduled_date ASC, b.time_slot ASC, b.id ASC
      `).all();

      return res.status(200).json({ bookings: rows || [] });
    }

    if (req.method === "POST") {
      const { action, bookingId } = req.body || {};
      if (action !== "cancel") {
        return res.status(400).json({ error: "invalid_action" });
      }
      if (!bookingId) {
        return res.status(400).json({ error: "missing_booking_id" });
      }

      const getBk = db.prepare(`SELECT * FROM bookings WHERE id = ?`).get(bookingId);
      if (!getBk) return res.status(404).json({ error: "not_found" });

      // Set booking to cancelled and free the item’s collection flag if you use it
      const cancelBk = db.prepare(`UPDATE bookings SET status = 'cancelled' WHERE id = ?`);
      cancelBk.run(bookingId);

      // Optional: also clear collection date/slot on the item
      const clearItem = db.prepare(`
        UPDATE items 
        SET status = CASE WHEN status = 'scheduled' THEN 'approved' ELSE status END,
            collection_date = NULL,
            time_slot = NULL
        WHERE id = ?
      `);
      clearItem.run(getBk.item_id);

      return res.status(200).json({ ok: true });
    }

    return res.status(405).end();
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server_error" });
  } finally {
    db.close();
  }
}