// pages/api/admin/item-images.js
import Database from "better-sqlite3";
const db = new Database("./db/database.sqlite");

export default function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
  const id = Number(req.query?.itemId);
  if (!id) return res.status(400).json({ error: "itemId_required" });

  try {
    const primary = db.prepare(`SELECT image_url FROM items WHERE id = ?`).get(id)?.image_url;
    const extras = db.prepare(`SELECT url FROM item_images WHERE item_id = ? ORDER BY id`).all(id);
    const urls = [...(primary ? [primary] : []), ...extras.map(r => r.url)];
    const seen = new Set(); // dedupe
    const images = urls.filter(u => (u && !seen.has(u) ? (seen.add(u), true) : false));
    return res.status(200).json({ itemId: id, images });
  } catch (e) {
    console.error("item-images error:", e);
    return res.status(500).json({ error: "server_error" });
  }
}