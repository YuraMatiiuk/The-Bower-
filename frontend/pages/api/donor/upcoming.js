// pages/api/donor/upcoming.js
import Database from "better-sqlite3";
import jwt from "jsonwebtoken";

const db = new Database("./db/database.sqlite");
const SECRET = process.env.JWT_SECRET || "supersecretkey";

/**
 * Returns this donor's scheduled collections in the next 7 days.
 * Schema used:
 *   collections(id, item_id, collection_date, time_slot, status, driver_notes)
 *   items(id, donor_id, name, category, condition, image_url, status)
 *   donors(id, user_id, address, suburb, postcode)
 *   users(id, ...)
 */
export default function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const token = req.cookies?.auth;
    if (!token) return res.status(401).json({ error: "Not authenticated" });

    const payload = jwt.verify(token, SECRET);
    const userId = payload?.id;
    if (!userId) return res.status(401).json({ error: "Invalid auth token" });

    // Only show upcoming in the next 7 days and with scheduled-like statuses
    const rows = db.prepare(`
      SELECT
        c.id                AS collection_id,
        c.collection_date   AS collection_date,
        c.time_slot         AS time_slot,
        c.status            AS status,
        i.id                AS item_id,
        i.name              AS item_name,
        i.category          AS item_category,
        i.condition         AS item_condition,
        i.image_url         AS image_url,
        d.address           AS pickup_address,
        COALESCE(d.suburb, u.suburb)   AS pickup_suburb,
        COALESCE(d.postcode, u.postcode) AS pickup_postcode
      FROM collections c
      JOIN items i   ON i.id = c.item_id
      JOIN donors d  ON d.id = i.donor_id
      JOIN users  u  ON u.id = d.user_id
      WHERE d.user_id = ?
        AND c.status IN ('scheduled','assigned')
        AND DATE(c.collection_date) BETWEEN DATE('now') AND DATE('now', '+7 day')
      ORDER BY c.collection_date ASC, c.time_slot ASC, c.id ASC
    `).all(userId);

    return res.status(200).json(rows);
  } catch (e) {
    console.error("❌ /api/donor/upcoming error:", e);
    return res.status(500).json({ error: "Failed to fetch upcoming collections" });
  }
}