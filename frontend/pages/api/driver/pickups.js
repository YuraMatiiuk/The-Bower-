// pages/api/driver/pickups.js
import Database from "better-sqlite3";

const db = new Database("./db/database.sqlite"); // adjust if needed

export default function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    // Returns both collection_id and collections_id to be backward-compatible
    const rows = db.prepare(`
      SELECT
        c.id                AS collection_id,
        c.id                AS collections_id,          -- legacy alias if some UI still reads this
        c.item_id           AS item_id,
        i.name              AS item_name,
        /* if you later add a weight column on items, change NULL -> i.weight */
        NULL                AS item_weight,
        i.category          AS category,

        d.name              AS donor_name,

        /* Prefer the freshest address: donor row fallback to user profile */
        COALESCE(d.address, u.address)   AS donor_address,
        COALESCE(d.postcode, u.postcode) AS donor_postcode,

        /* Prefer phone from users (profile), fallback to donors if you add it later */
        u.phone             AS donor_phone,

        c.collection_date   AS collection_date,
        c.time_slot         AS time_slot,
        c.status            AS collection_status,
        c.driver_notes      AS driver_notes
      FROM collections c
      JOIN items  i ON c.item_id = i.id
      JOIN donors d ON i.donor_id = d.id
      JOIN users  u ON d.user_id = u.id
      WHERE c.status = 'scheduled'
      ORDER BY c.id DESC
    `).all();

    return res.status(200).json(rows);
  } catch (err) {
    console.error("❌ Error fetching pickups:", err);
    return res.status(500).json({ error: "Failed to fetch pickups", details: String(err?.message || err) });
  }
}