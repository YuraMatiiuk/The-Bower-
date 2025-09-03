// pages/api/admin/items.js

import Database from "better-sqlite3";

const db = new Database("./db/database.sqlite");

export default function handler(req, res) {
    console.log("📥 Admin API called:", req.method, req.body);
  if (req.method === "GET") {
    try {
      const items = db.prepare(`
        SELECT items.id, items.name, items.category, items.condition, items.status,
               donors.address, donors.postcode, donors.phone,
               users.name as donor_name, users.email as donor_email
        FROM items
        JOIN donors ON items.donor_id = donors.id
        JOIN users ON donors.user_id = users.id
        WHERE items.status = 'pending'
      `).all();

      res.status(200).json(items);
    } catch (err) {
      console.error("❌ Error fetching items:", err);
      res.status(500).json({ error: "Failed to fetch items" });
    }
  } else if (req.method === "POST") {
    const { itemId, action } = req.body;

    console.log("➡️ Approve/Reject request:", itemId, action);

    if (!itemId || !["approved", "rejected"].includes(action)) {
  return res.status(400).json({ error: "Invalid request" });
}

    try {
      db.prepare("UPDATE items SET status = ? WHERE id = ?").run(action, itemId);
      console.log(`✅ Item ${itemId} marked as ${action}`);
      res.status(200).json({ message: `Item ${action}` });
    } catch (err) {
      console.error("❌ Error updating item:", err);
      res.status(500).json({ error: "Failed to update item" });
    }
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
