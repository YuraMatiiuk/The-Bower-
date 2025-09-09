// pages/api/admin/users.js
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";

const db = new Database("./db/database.sqlite");
const ALLOWED_ROLES = ["donor", "caseworker", "driver", "admin"];

export default async function handler(req, res) {
  if (req.method === "POST") {
    const { name, email, password, role } = req.body || {};

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: "All fields are required" });
    }
    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    try {
      const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
      if (existing) {
        return res.status(409).json({ error: "User with this email already exists" });
      }

      const hash = await bcrypt.hash(password, 10);
      db.prepare(
        "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)"
      ).run(name, email, hash, role);

      return res.status(201).json({ message: "User created", email, role });
    } catch (err) {
      console.error("❌ Create user error:", err.message);
      return res.status(500).json({ error: "Failed to create user" });
    }
  }

  if (req.method === "GET") {
    try {
      const users = db.prepare(
        "SELECT id, name, email, role, created_at FROM users ORDER BY id DESC"
      ).all();
      return res.status(200).json(users);
    } catch (err) {
      console.error("❌ List users error:", err.message);
      return res.status(500).json({ error: "Failed to fetch users" });
    }
  }

  res.setHeader("Allow", ["POST", "GET"]);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
