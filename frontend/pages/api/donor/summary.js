// pages/api/donor/summary.js
import Database from "better-sqlite3";
import jwt from "jsonwebtoken";

const db = new Database("./db/database.sqlite");
const SECRET = process.env.JWT_SECRET || "supersecretkey";

export default function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const token = req.cookies?.auth;
    if (!token) return res.status(401).json({ error: "Not authenticated" });
    const { id: userId } = jwt.verify(token, SECRET) || {};
    if (!userId) return res.status(401).json({ error: "Invalid auth token" });

    // Profile from users (primary) and donors (address/postcode)
    const user = db.prepare("SELECT id, name, email, phone, address, suburb, postcode FROM users WHERE id = ?").get(userId) || {};
    // If donors table has latest pickup address, prefer that for display
    const donorRow = db.prepare("SELECT id, address AS donor_address, postcode AS donor_postcode FROM donors WHERE user_id = ?").get(userId) || {};
    const donorId = donorRow?.id || null;

    // Donations (items) by this donor
    const items = donorId
      ? db.prepare(`
          SELECT
            i.id,
            i.name,
            i.category,
            i.condition,
            i.status,
            i.image_url,
            COALESCE(c.collection_date, '') AS collection_date,
            COALESCE(c.time_slot, '') AS time_slot
          FROM items i
          LEFT JOIN collections c ON c.item_id = i.id
          WHERE i.donor_id = ?
          ORDER BY i.id DESC
        `).all(donorId)
      : [];

    // Build response
    const profile = {
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      address: user.address || donorRow?.donor_address || "",
      suburb: user.suburb || "",
      postcode: user.postcode || donorRow?.donor_postcode || "",
    };

    return res.status(200).json({ profile, items });
  } catch (e) {
    console.error("❌ donor/summary error:", e);
    return res.status(500).json({ error: "Failed to load donor summary" });
  }
}