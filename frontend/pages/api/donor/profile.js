// pages/api/donor/profile.js
import Database from "better-sqlite3";
import jwt from "jsonwebtoken";

const db = new Database("./db/database.sqlite");
const SECRET = process.env.JWT_SECRET || "supersecretkey";

function norm(s) {
  return String(s || "").trim().toUpperCase();
}

export default function handler(req, res) {
  if (req.method !== "PUT") {
    res.setHeader("Allow", ["PUT"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const token = req.cookies?.auth;
    if (!token) return res.status(401).json({ error: "Not authenticated" });
    const { id: userId } = jwt.verify(token, SECRET) || {};
    if (!userId) return res.status(401).json({ error: "Invalid auth token" });

    const { name, phone, address, suburb, postcode } = req.body || {};
    if (!name || !address || !suburb || !postcode) {
      return res.status(400).json({ error: "Missing required fields (name, address, suburb, postcode)" });
    }

    // Optional: enforce service-area here to keep data clean
    const sa = db.prepare(
      "SELECT 1 FROM service_areas WHERE postcode = ? AND UPPER(TRIM(suburb)) = ?"
    ).get(String(postcode).trim(), norm(suburb));
    if (!sa) {
      return res.status(400).json({ error: "Address not in current service area" });
    }

    // Update users table (master profile)
    db.prepare(`
      UPDATE users
      SET name = ?, phone = ?, address = ?, suburb = ?, postcode = ?
      WHERE id = ?
    `).run(String(name), String(phone || ""), String(address), String(suburb), String(postcode), userId);

    // Ensure donor row exists & keep pickup address in sync
    const donor = db.prepare("SELECT id FROM donors WHERE user_id = ?").get(userId);
    if (!donor) {
      db.prepare(`
        INSERT INTO donors (user_id, name, email, address, postcode)
        SELECT id, name, email, address, postcode FROM users WHERE id = ?
      `).run(userId);
    } else {
      db.prepare("UPDATE donors SET address = ?, postcode = ? WHERE user_id = ?")
        .run(String(address), String(postcode), userId);
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("❌ donor/profile update error:", e);
    return res.status(500).json({ error: "Failed to update profile" });
  }
}