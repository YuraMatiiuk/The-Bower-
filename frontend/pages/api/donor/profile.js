// pages/api/donor/profile.js
import Database from "better-sqlite3";
import jwt from "jsonwebtoken";

const db = new Database("./db/database.sqlite");
const SECRET = process.env.JWT_SECRET || "supersecretkey";

function norm(s) {
  return String(s || "").trim().toUpperCase().replace(/\s+/g, " ");
}

export default function handler(req, res) {
  // ---- GET: return current user's profile (for prefill) ----
  if (req.method === "GET") {
    try {
      const token = req.cookies?.auth;
      if (!token) return res.status(401).json({ error: "Not authenticated" });

      const { id: userId } = jwt.verify(token, SECRET) || {};
      if (!userId) return res.status(401).json({ error: "Invalid auth token" });

      const row = db
        .prepare(
          `SELECT name, email, phone, address, suburb, postcode
           FROM users
           WHERE id = ?`
        )
        .get(userId);

      // Return empty strings if null/undefined so the UI can prefill cleanly
      const out = {
        name: row?.name || "",
        email: row?.email || "",
        phone: row?.phone || "",
        address: row?.address || "",
        suburb: row?.suburb || "",
        postcode: row?.postcode || "",
      };
      return res.status(200).json(out);
    } catch (e) {
      console.error("❌ donor/profile GET error:", e);
      return res.status(500).json({ error: "Failed to load profile" });
    }
  }

  // ---- PUT: update profile (unchanged logic, with suburb_norm check) ----
  if (req.method === "PUT") {
    try {
      const token = req.cookies?.auth;
      if (!token) return res.status(401).json({ error: "Not authenticated" });

      const { id: userId } = jwt.verify(token, SECRET) || {};
      if (!userId) return res.status(401).json({ error: "Invalid auth token" });

      const { name, phone, address, suburb, postcode } = req.body || {};
      if (!name || !address || !suburb || !postcode) {
        return res
          .status(400)
          .json({ error: "Missing required fields (name, address, suburb, postcode)" });
      }

      // Use suburb_norm (matches your schema)
      const sa = db
        .prepare(
          "SELECT 1 FROM service_areas WHERE postcode = ? AND suburb_norm = ? LIMIT 1"
        )
        .get(String(postcode).trim(), norm(suburb));
      if (!sa) {
        return res.status(400).json({ error: "Address not in current service area" });
      }

      // Update users table (master profile)
      db.prepare(
        `UPDATE users
         SET name = ?, phone = ?, address = ?, suburb = ?, postcode = ?
         WHERE id = ?`
      ).run(
        String(name),
        String(phone || ""),
        String(address),
        String(suburb),
        String(postcode),
        userId
      );

      // Ensure donor row exists & keep pickup address in sync
      const donor = db.prepare("SELECT id FROM donors WHERE user_id = ?").get(userId);
      if (!donor) {
        db.prepare(
          `INSERT INTO donors (user_id, name, email, address, postcode)
           SELECT id, name, email, address, postcode FROM users WHERE id = ?`
        ).run(userId);
      } else {
        db.prepare(`UPDATE donors SET address = ?, postcode = ? WHERE user_id = ?`)
          .run(String(address), String(postcode), userId);
      }

      return res.status(200).json({ ok: true });
    } catch (e) {
      console.error("❌ donor/profile PUT error:", e);
      return res.status(500).json({ error: "Failed to update profile" });
    }
  }

  res.setHeader("Allow", ["GET", "PUT"]);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}