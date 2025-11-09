// pages/api/admin/users.js
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";

const db = new Database("./db/database.sqlite");
const ALLOWED_ROLES = ["donor", "caseworker", "driver", "admin"];

// helpers
function isNonEmpty(s) { return typeof s === "string" && s.trim().length > 0; }

export default async function handler(req, res) {
  // ---------- CREATE ----------
  if (req.method === "POST") {
    const { name, email, password, role } = req.body || {};
    if (!isNonEmpty(name) || !isNonEmpty(email) || !isNonEmpty(password) || !isNonEmpty(role)) {
      return res.status(400).json({ error: "All fields are required" });
    }
    if (!ALLOWED_ROLES.includes(role)) return res.status(400).json({ error: "Invalid role" });

    try {
      const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email.trim());
      if (existing) return res.status(409).json({ error: "User with this email already exists" });

      const hash = await bcrypt.hash(password, 10);
      db.prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)")
        .run(name.trim(), email.trim(), hash, role);
      return res.status(201).json({ message: "User created", email, role });
    } catch (err) {
      console.error("❌ Create user error:", err.message);
      return res.status(500).json({ error: "Failed to create user" });
    }
  }

  // ---------- READ ----------
  if (req.method === "GET") {
    try {
      try {
        const usersWithCreated = db.prepare(
          "SELECT id, name, email, role, created_at FROM users ORDER BY id DESC"
        ).all();
        return res.status(200).json(usersWithCreated);
      } catch {
        const users = db.prepare(
          "SELECT id, name, email, role FROM users ORDER BY id DESC"
        ).all();
        return res.status(200).json(users);
      }
    } catch (err) {
      console.error("❌ List users error:", err.message);
      return res.status(500).json({ error: "Failed to fetch users" });
    }
  }

  // ---------- UPDATE (now supports optional password change) ----------
  if (req.method === "PUT") {
    const { id, name, email, role, newPassword } = req.body || {};
    if (!id) return res.status(400).json({ error: "Missing user id" });

    try {
      const target = db.prepare("SELECT id, email FROM users WHERE id = ?").get(id);
      if (!target) return res.status(404).json({ error: "User not found" });

      // If we're updating profile fields, validate them.
      if (name !== undefined || email !== undefined || role !== undefined) {
        if (!isNonEmpty(name) || !isNonEmpty(email) || !isNonEmpty(role)) {
          return res.status(400).json({ error: "Name, email and role are required" });
        }
        if (!ALLOWED_ROLES.includes(role)) return res.status(400).json({ error: "Invalid role" });

        const dup = db.prepare("SELECT id FROM users WHERE email = ? AND id != ?")
          .get(String(email).trim(), id);
        if (dup) return res.status(409).json({ error: "Email already in use" });

        db.prepare("UPDATE users SET name = ?, email = ?, role = ? WHERE id = ?")
          .run(String(name).trim(), String(email).trim(), role, id);
      }

      // Optional password change (works like it did before)
      if (isNonEmpty(newPassword)) {
        const hash = await bcrypt.hash(String(newPassword), 10);
        db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hash, id);
      }

      return res.status(200).json({ message: "User updated" });
    } catch (err) {
      console.error("❌ Update user error:", err.message);
      return res.status(500).json({ error: "Failed to update user" });
    }
  }

  // ---------- DELETE ----------
  if (req.method === "DELETE") {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: "Missing user id" });

    try {
      const target = db.prepare("SELECT id FROM users WHERE id = ?").get(id);
      if (!target) return res.status(404).json({ error: "User not found" });

      try { db.prepare("DELETE FROM donors WHERE user_id = ?").run(id); } catch {}
      db.prepare("DELETE FROM users WHERE id = ?").run(id);
      return res.status(200).json({ message: "User deleted" });
    } catch (err) {
      console.error("❌ Delete user error:", err.message);
      return res.status(500).json({ error: "Failed to delete user" });
    }
  }

  res.setHeader("Allow", ["POST", "GET", "PUT", "DELETE"]);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}