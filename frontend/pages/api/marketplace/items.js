import Database from "better-sqlite3";

const db = new Database("./db/database.sqlite");

export default function handler(req, res) {
  if (req.method === "GET") {
    try {
      const items = db.prepare(`
        SELECT i.id, i.name, i.category, i.condition
        FROM items i
        LEFT JOIN reservations r ON i.id = r.item_id
        WHERE i.status = 'approved' AND r.id IS NULL
      `).all();

      res.status(200).json(items);
    } catch (err) {
      console.error("❌ Error fetching marketplace items:", err.message);
      res.status(500).json({ error: "Failed to fetch items" });
    }
  } else {
    res.setHeader("Allow", ["GET"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
