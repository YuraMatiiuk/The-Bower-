import Database from "better-sqlite3";

const db = new Database("./db/database.sqlite");

export default function handler(req, res) {
  if (req.method === "POST") {
    const { itemId, caseworkerName, agency } = req.body;

    if (!itemId || !caseworkerName) {
      return res.status(400).json({ error: "Item ID and caseworker name required" });
    }

    try {
      db.prepare(`
        INSERT INTO reservations (item_id, caseworker_name, agency)
        VALUES (?, ?, ?)
      `).run(itemId, caseworkerName, agency || null);

      res.status(200).json({ message: "Item reserved successfully" });
    } catch (err) {
      console.error("❌ Error reserving item:", err.message);
      res.status(500).json({ error: "Failed to reserve item" });
    }
  } else {
    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
