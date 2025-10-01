// pages/api/categories.js
import Database from "better-sqlite3";

const db = new Database("./db/database.sqlite");

export default function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
  try {
    const rows = db.prepare("SELECT id, name FROM categories ORDER BY name ASC").all();
    return res.status(200).json(rows);
  } catch (e) {
    console.error("❌ Categories error:", e);
    return res.status(500).json({ error: "Failed to fetch categories" });
  }
}