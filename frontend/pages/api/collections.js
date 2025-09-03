// pages/api/collections.js
import Database from "better-sqlite3";

const db = new Database("./db/database.sqlite");

export default function handler(req, res) {
  if (req.method === "GET") {
    try {
      const items = db.prepare(
        "SELECT id, name, category, condition FROM items WHERE status = 'approved'"
      ).all();
      res.status(200).json(items);
    } catch (err) {
      console.error("❌ Error fetching approved items:", err);
      res.status(500).json({ error: "Failed to fetch items" });
    }
  } else if (req.method === "POST") {
    const { itemId, collectionDate, timeSlot } = req.body;

    if (!itemId || !collectionDate || !timeSlot) {
      return res.status(400).json({ error: "All fields are required" });
    }

    try {
      db.prepare(
        "INSERT INTO collections (item_id, collection_date, time_slot, status) VALUES (?, ?, ?, ?)"
      ).run(itemId, collectionDate, timeSlot, "scheduled");

      res.status(200).json({ message: "Collection booked successfully" });
    } catch (err) {
      console.error("❌ Error booking collection:", err);
      res.status(500).json({ error: "Failed to book collection" });
    }
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
