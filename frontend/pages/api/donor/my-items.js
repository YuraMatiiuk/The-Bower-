import Database from "better-sqlite3";
import jwt from "jsonwebtoken";

const db = new Database("./db/database.sqlite");
const SECRET = process.env.JWT_SECRET || "supersecretkey";

function getUserId(req, res) {
  const token = req.cookies?.auth;
  if (!token) {
    res.status(401).json({ error: "Not authenticated" });
    return null;
  }
  try {
    const payload = jwt.verify(token, SECRET);
    return payload.id;
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
    return null;
  }
}

export default function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
  const userId = getUserId(req, res);
  if (!userId) return;

  try {
    const donor = db.prepare("SELECT id FROM donors WHERE user_id = ?").get(userId);
    if (!donor) return res.status(200).json([]);

    const items = db.prepare(`
      SELECT id, name, category, condition, status
      FROM items
      WHERE donor_id = ?
      ORDER BY id DESC
    `).all(donor.id);

    return res.status(200).json(items);
  } catch (err) {
    console.error("❌ My-items GET error:", err.message);
    return res.status(500).json({ error: "Failed to fetch items" });
  }
}
