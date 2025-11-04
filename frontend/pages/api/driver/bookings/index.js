// pages/api/driver/pickups/index.js
import Database from "better-sqlite3";

export default function handler(req, res) {
  const db = new Database("db/database.sqlite");

  if (req.method === "GET") {
    const { date } = req.query; // "YYYY-MM-DD"
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: "invalid_date" });
    }

    // Join bookings -> items -> donors to show pickup details
    // Adjust column names if your donors schema differs (suburb, etc.)
    const rows = db.prepare(
      `SELECT
         b.id                AS booking_id,
         b.item_id           AS item_id,
         b.scheduled_date    AS scheduled_date,
         b.time_slot         AS time_slot,
         b.status            AS booking_status,
         b.notes             AS notes,
         i.name              AS item_name,
         i.category          AS item_category,
         i.image_url         AS image_url,
         d.name              AS donor_name,
         d.address           AS donor_address,
         COALESCE(d.suburb,'')   AS donor_suburb,
         COALESCE(d.postcode,'') AS donor_postcode
       FROM bookings b
       JOIN items i   ON i.id = b.item_id
       LEFT JOIN donors d ON d.id = i.donor_id
      WHERE b.type = 'collection'
        AND b.scheduled_date = ?
        AND b.status IN ('scheduled','confirmed')
      ORDER BY b.time_slot, b.id`
    ).all(String(date));

    // Normalize to the shape the UI expects
    const pickups = rows.map(r => ({
      booking_id: r.booking_id,
      item_id: r.item_id,
      donor_name: r.donor_name,
      donor_address: r.donor_address,
      donor_suburb: r.donor_suburb,
      donor_postcode: r.donor_postcode,
      item_name: r.item_name,
      item_category: r.item_category,
      time_slot: r.time_slot || "",
      status: r.booking_status,
      notes: r.notes,
      image_url: r.image_url || null,
    }));

    return res.status(200).json({ pickups });
  }

  if (req.method === "POST") {
    const { action } = req.body || {};
    if (!action) return res.status(400).json({ error: "missing_action" });

    if (action === "collected") {
      const { bookingId } = req.body || {};
      if (!bookingId) return res.status(400).json({ error: "missing_bookingId" });

      // mark booking collected, and item as collected if desired
      const tx = db.transaction(() => {
        db.prepare(
          `UPDATE bookings SET status = 'completed' WHERE id = ?`
        ).run(bookingId);

        // Optionally also set the item's status:
        const row = db.prepare(`SELECT item_id FROM bookings WHERE id = ?`).get(bookingId);
        if (row?.item_id) {
          db.prepare(`UPDATE items SET status = 'collected' WHERE id = ?`).run(row.item_id);
        }
      });
      tx();

      return res.status(200).json({ ok: true });
    }

    if (action === "rejected") {
      const { bookingId, note } = req.body || {};
      if (!bookingId) return res.status(400).json({ error: "missing_bookingId" });

      const tx = db.transaction(() => {
        db.prepare(
          `UPDATE bookings SET status = 'cancelled', notes = COALESCE(?, notes) WHERE id = ?`
        ).run(String(note || ""), bookingId);

        const row = db.prepare(`SELECT item_id FROM bookings WHERE id = ?`).get(bookingId);
        if (row?.item_id) {
          // mark the item rejected; adjust if you prefer leaving it 'approved'
          db.prepare(`UPDATE items SET status = 'rejected' WHERE id = ?`).run(row.item_id);
        }
      });
      tx();

      return res.status(200).json({ ok: true });
    }

    if (action === "add_item") {
      const { bookingId, item } = req.body || {};
      if (!bookingId || !item?.name) {
        return res.status(400).json({ error: "missing_params" });
      }

      // Find donor via the existing booking's item
      const row = db.prepare(
        `SELECT i.donor_id
           FROM bookings b
           JOIN items i ON i.id = b.item_id
          WHERE b.id = ?`
      ).get(bookingId);

      if (!row?.donor_id) return res.status(400).json({ error: "no_donor_for_booking" });

      const tx = db.transaction(() => {
        const ins = db.prepare(
          `INSERT INTO items (donor_id, name, category, condition, accepted, status, image_url)
           VALUES (?, ?, ?, 'good', 1, 'approved', NULL)`
        ).run(row.donor_id, String(item.name), String(item.category || ""));

        // optionally attach new item to same date/slot by creating a parallel booking
        const b = db.prepare(`SELECT scheduled_date, time_slot FROM bookings WHERE id = ?`).get(bookingId);
        if (b?.scheduled_date) {
          db.prepare(
            `INSERT INTO bookings (item_id, type, scheduled_date, time_slot, status)
             VALUES (?, 'collection', ?, ?, 'scheduled')`
          ).run(ins.lastInsertRowid, b.scheduled_date, b.time_slot || null);
        }
      });
      tx();

      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: "unknown_action" });
  }

  return res.status(405).end();
}