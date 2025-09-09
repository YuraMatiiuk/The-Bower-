import Database from "better-sqlite3";

const db = new Database("./db/database.sqlite");

export default function handler(req, res) {
  if (req.method === "GET") {
    const { caseworkerName } = req.query;

    if (!caseworkerName) {
      return res.status(400).json({ error: "Caseworker name required" });
    }

    try {
      const reservations = db.prepare(`
        SELECT r.id, i.name AS item_name, i.category, i.condition,
               r.status, r.agency, r.reserved_at
        FROM reservations r
        JOIN items i ON r.item_id = i.id
        WHERE r.caseworker_name = ?
      `).all(caseworkerName);

      res.status(200).json(reservations);
    } catch (err) {
      console.error("❌ Error fetching reservations:", err.message);
      res.status(500).json({ error: "Failed to fetch reservations" });
    }
  } else {
    res.setHeader("Allow", ["GET"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
