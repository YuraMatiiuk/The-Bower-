// pages/api/collections.js
import Database from "better-sqlite3";
import jwt from "jsonwebtoken";

const db = new Database("./db/database.sqlite");
const SECRET = process.env.JWT_SECRET || "supersecretkey";

// Read the JWT from the HttpOnly cookie and return the user id (or null)
function getUserId(req) {
  try {
    const token = req.cookies?.auth;
    if (!token) return null;
    const payload = jwt.verify(token, SECRET);
    return payload.id;
  } catch {
    return null;
  }
}

export default function handler(req, res) {
  if (req.method === "GET") {
    // Return ONLY this donor's approved items to book
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const donor = db.prepare("SELECT id FROM donors WHERE user_id = ?").get(userId);
      if (!donor) return res.status(200).json([]);

      const items = db
        .prepare(
          "SELECT id, name, category, condition FROM items WHERE status = 'approved' AND donor_id = ? ORDER BY id DESC"
        )
        .all(donor.id);

      return res.status(200).json(items);
    } catch (err) {
      console.error("❌ Error fetching approved items:", err);
      return res.status(500).json({ error: "Failed to fetch items" });
    }
  } else if (req.method === "POST") {
    // Create a collection booking
    const { itemId, collectionDate, timeSlot } = req.body || {};
    if (!itemId || !collectionDate || !timeSlot) {
      return res.status(400).json({ error: "All fields are required" });
    }

    try {
      // (Optional) Verify the item belongs to the logged-in donor and is approved
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const donor = db.prepare("SELECT id FROM donors WHERE user_id = ?").get(userId);
      if (!donor) return res.status(400).json({ error: "Donor profile not found" });

      const owned = db
        .prepare("SELECT id FROM items WHERE id = ? AND donor_id = ? AND status = 'approved'")
        .get(itemId, donor.id);
      if (!owned) return res.status(403).json({ error: "You cannot book this item" });

      db.prepare(
        "INSERT INTO collections (item_id, collection_date, time_slot, status) VALUES (?, ?, ?, ?)"
      ).run(itemId, collectionDate, timeSlot, "scheduled");

      return res.status(200).json({ message: "Collection booked successfully" });
    } catch (err) {
      console.error("❌ Error booking collection:", err);
      return res.status(500).json({ error: "Failed to book collection" });
    }
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
