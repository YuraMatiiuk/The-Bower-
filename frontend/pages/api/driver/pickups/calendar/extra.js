// pages/api/driver/pickups/extra.js
import Database from "better-sqlite3";

/**
 * POST /api/driver/pickups/extra
 * { date: 'YYYY-MM-DD', time_slot: '9-12'|'12-3'|'3-5', name, category, condition, donor_name, address, postcode, email? }
 */
export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { date, time_slot, name, category, condition, donor_name, address, postcode, email } = req.body || {};
  if (!date || !time_slot || !name || !category || !condition || !donor_name || !address || !postcode) {
    return res.status(400).json({ error: "missing_fields" });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: "invalid_date" });
  }

  const db = new Database("db/database.sqlite");
  const tx = db.transaction(() => {
    // find or create donor (by email if given, else by name+address)
    let donor = null;
    if (email) {
      donor = db.prepare(`SELECT id FROM donors WHERE email = ?`).get(email);
    }
    if (!donor) {
      donor = db.prepare(`SELECT id FROM donors WHERE name = ? AND address = ? AND postcode = ?`).get(donor_name, address, postcode);
    }
    let donorId;
    if (!donor) {
      const info = db.prepare(
        `INSERT INTO donors (name, email, address, postcode) VALUES (?, ?, ?, ?)`
      ).run(donor_name, email || null, address, postcode);
      donorId = info.lastInsertRowid;
    } else {
      donorId = donor.id;
    }

    const itemInfo = db.prepare(
      `INSERT INTO items (donor_id, name, category, condition, accepted, status, image_url)
       VALUES (?, ?, ?, ?, 1, 'approved', NULL)`
    ).run(donorId, name, category, condition);

    // bookings.status must be allowed by constraint; use 'confirmed'
    db.prepare(
      `INSERT INTO bookings (item_id, type, scheduled_date, status, truck_capacity_used, warehouse_id)
       VALUES (?, 'collection', ?, 'confirmed', 0, NULL)`
    ).run(itemInfo.lastInsertRowid, date);

    // store slot on item for driver UI convenience (optional)
    db.prepare(
      `UPDATE items SET collection_date=?, time_slot=? WHERE id=?`
    ).run(date, time_slot, itemInfo.lastInsertRowid);
  });

  try {
    tx();
    return res.status(201).json({ ok: true });
  } catch (e) {
    console.error("extra item error", e);
    return res.status(500).json({ error: "extra_item_failed" });
  }
}