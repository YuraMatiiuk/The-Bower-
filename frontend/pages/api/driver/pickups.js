// pages/api/driver/pickups.js
import Database from "better-sqlite3";

const db = new Database("./db/database.sqlite");

export default function handler(req, res) {
  if (req.method === "GET") {
    try {
      console.log("📥 Driver API called: GET pickups");

      const pickups = db.prepare(`
        SELECT
          collections.id,
          items.name AS item_name,
          items.weight AS item_weight,
          items.category,
          donors.name AS donor_name,
          donors.address AS donor_address,
          collections.collection_date,
          collections.status,
          collections.driver_notes AS notes
        FROM collections
        JOIN items ON collections.item_id = items.id
        JOIN donors ON items.donor_id = donors.id
        WHERE collections.status = 'scheduled'
      `).all();

      console.log("✅ Pickups fetched:", pickups);

      res.status(200).json(pickups);
    } catch (err) {
      console.error("❌ Error fetching pickups:", err.message);
      res.status(500).json({ error: "Failed to fetch pickups", details: err.message });
    }
  } else {
    res.setHeader("Allow", ["GET"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
